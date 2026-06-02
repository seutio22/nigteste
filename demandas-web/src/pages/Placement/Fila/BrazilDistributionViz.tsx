import React, { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import brazilMap from '@svg-maps/brazil'
import type { UfVidasRow } from './placementBeneficiariosLocalidade'
import { UF_CENTROID } from './brazilUfCentroids'
import { SLIDE_COLORS, SLIDE_FONT, vidasToColor } from './placementSlideTheme'

const { viewBox, locations } = brazilMap as {
  viewBox: string
  locations: { id: string; name: string; path: string }[]
}

const ID_TO_UF: Record<string, string> = {
  ac: 'AC', al: 'AL', ap: 'AP', am: 'AM', ba: 'BA', ce: 'CE', df: 'DF', es: 'ES', go: 'GO',
  ma: 'MA', mt: 'MT', ms: 'MS', mg: 'MG', pa: 'PA', pb: 'PB', pr: 'PR', pe: 'PE', pi: 'PI',
  rj: 'RJ', rn: 'RN', rs: 'RS', ro: 'RO', rr: 'RR', sc: 'SC', sp: 'SP', se: 'SE', to: 'TO',
}

const TOP_BARS = 6
const MIN_BUBBLE = 8
const MAX_BUBBLE = 32

type Props = {
  porUf: UfVidasRow[]
  maxVidas: number
  minVidas: number
  total: number
  highlightUf?: string
}

function ratio(vidas: number, min: number, max: number): number {
  if (max <= min) return vidas > 0 ? 1 : 0
  return (vidas - min) / (max - min)
}

function IntensityLegend({ minVidas, maxVidas }: { minVidas: number; maxVidas: number }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${SLIDE_COLORS.border}`,
        boxShadow: '0 8px 24px rgba(0,37,97,0.12)',
        fontFamily: SLIDE_FONT,
      }}
    >
      <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 7.5, fontWeight: 800, color: SLIDE_COLORS.primary, mb: 0.5 }}>
        DENSIDADE
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 8, fontWeight: 700, color: SLIDE_COLORS.muted }}>
          {minVidas}
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 99,
            background: `linear-gradient(90deg, ${vidasToColor(0)}, ${vidasToColor(0.5)}, ${vidasToColor(1)})`,
            border: `1px solid ${SLIDE_COLORS.border}`,
          }}
        />
        <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 8, fontWeight: 800, color: SLIDE_COLORS.primary }}>
          {maxVidas}
        </Typography>
      </Box>
    </Box>
  )
}

export function BrazilDistributionViz({ porUf, maxVidas, minVidas, total, highlightUf }: Props) {
  const ufByCode = useMemo(() => {
    const m = new Map<string, UfVidasRow>()
    for (const u of porUf) m.set(u.uf, u)
    return m
  }, [porUf])

  const topUf = porUf[0]

  const barDataFixed = useMemo(
    () =>
      [...porUf]
        .filter((u) => u.vidas > 0)
        .sort((a, b) => b.vidas - a.vidas)
        .slice(0, TOP_BARS)
        .map((u, i) => ({
          uf: u.uf,
          vidas: u.vidas,
          pct: total > 0 ? Math.round((u.vidas / total) * 100) : 0,
          t: TOP_BARS > 1 ? 1 - i / (TOP_BARS - 1) : 1,
        })),
    [porUf, total]
  )

  const bubbles = useMemo(
    () =>
      porUf
        .filter((u) => u.vidas > 0 && UF_CENTROID[u.uf])
        .map((u) => {
          const t = ratio(u.vidas, minVidas, maxVidas)
          const r = MIN_BUBBLE + t * (MAX_BUBBLE - MIN_BUBBLE)
          const c = UF_CENTROID[u.uf]
          const isTop = u.uf === (highlightUf ?? topUf?.uf)
          return { ...u, r, t, cx: c.x, cy: c.y, isTop }
        }),
    [porUf, minVidas, maxVidas, highlightUf, topUf?.uf]
  )

  const maxBar = barDataFixed[0]?.vidas ?? 1

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        borderRadius: 2.5,
        overflow: 'hidden',
        background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${SLIDE_COLORS.mint} 0%, ${SLIDE_COLORS.white} 55%, #eef2f6 100%)`,
        border: `1px solid ${SLIDE_COLORS.border}`,
        fontFamily: SLIDE_FONT,
      }}
    >
      {/* Mapa hero */}
      <Box sx={{ position: 'absolute', inset: 0, pt: 0.5, pb: 11, px: 1 }}>
        <svg
          viewBox={viewBox}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
          role="img"
          aria-label="Mapa do Brasil — volume de beneficiários por estado"
        >
          <defs>
            <filter id="loc-bubble-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={SLIDE_COLORS.infoLight} floodOpacity="0.65" />
            </filter>
            <filter id="loc-bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#002561" floodOpacity="0.2" />
            </filter>
            <linearGradient id="loc-uf-shine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {locations.map((loc) => {
            const uf = ID_TO_UF[loc.id] ?? loc.id.toUpperCase()
            const row = ufByCode.get(uf)
            const vidas = row?.vidas ?? 0
            const t = ratio(vidas, minVidas, maxVidas)
            const fill = vidas > 0 ? vidasToColor(t) : SLIDE_COLORS.empty
            const isHighlight = uf === (highlightUf ?? topUf?.uf) && vidas > 0
            return (
              <path
                key={loc.id}
                d={loc.path}
                fill={fill}
                stroke={isHighlight ? SLIDE_COLORS.infoLight : SLIDE_COLORS.white}
                strokeWidth={isHighlight ? 1.4 : 0.65}
                opacity={vidas > 0 ? 1 : 0.85}
              />
            )
          })}
          {bubbles.map((b) => (
            <g key={b.uf} filter={b.isTop ? 'url(#loc-bubble-glow)' : 'url(#loc-bubble-shadow)'}>
              <circle
                cx={b.cx}
                cy={b.cy}
                r={b.r + (b.isTop ? 2 : 0)}
                fill={vidasToColor(b.t)}
                fillOpacity={b.isTop ? 0.95 : 0.82}
                stroke={b.isTop ? SLIDE_COLORS.infoLight : SLIDE_COLORS.white}
                strokeWidth={b.isTop ? 2 : 1.2}
              />
              <text
                x={b.cx}
                y={b.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={b.t > 0.5 ? SLIDE_COLORS.white : SLIDE_COLORS.primary}
                fontSize={b.r > 18 ? 12 : 9}
                fontWeight={800}
                fontFamily={SLIDE_FONT}
              >
                {b.vidas}
              </text>
              {b.isTop && (
                <text
                  x={b.cx}
                  y={b.cy + b.r + 10}
                  textAnchor="middle"
                  fill={SLIDE_COLORS.primary}
                  fontSize={8}
                  fontWeight={800}
                  fontFamily={SLIDE_FONT}
                >
                  {b.uf}
                </text>
              )}
            </g>
          ))}
        </svg>
      </Box>

      {/* Painel flutuante — top estado */}
      {topUf && topUf.vidas > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${SLIDE_COLORS.primary} 0%, ${SLIDE_COLORS.info} 100%)`,
            color: SLIDE_COLORS.white,
            boxShadow: '0 10px 28px rgba(0,37,97,0.25)',
          }}
        >
          <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 7, fontWeight: 600, opacity: 0.9, letterSpacing: 0.5 }}>
            MAIOR CONCENTRAÇÃO
          </Typography>
          <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>
            {topUf.uf} · {topUf.vidas} vidas
          </Typography>
          <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 8, opacity: 0.88 }}>
            {total > 0 ? Math.round((topUf.vidas / total) * 100) : 0}% do total
          </Typography>
        </Box>
      )}

      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
        <IntensityLegend minVidas={minVidas} maxVidas={maxVidas} />
      </Box>

      {/* Barras horizontais — dock inferior */}
      <Box
        sx={{
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: 8,
          height: 108,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${SLIDE_COLORS.border}`,
          boxShadow: '0 -4px 20px rgba(0,37,97,0.08)',
          px: 1.25,
          py: 0.75,
        }}
      >
        <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 8, fontWeight: 800, color: SLIDE_COLORS.primary, mb: 0.25 }}>
          Ranking por UF
        </Typography>
        <Box sx={{ height: 82 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barDataFixed}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 2, bottom: 0 }}
              barCategoryGap="14%"
            >
              <XAxis type="number" hide domain={[0, maxBar * 1.08]} />
              <YAxis
                type="category"
                dataKey="uf"
                width={26}
                tick={{ fontFamily: SLIDE_FONT, fontSize: 9, fontWeight: 800, fill: SLIDE_COLORS.primary }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="vidas" radius={[0, 8, 8, 0]} barSize={10} isAnimationActive={false}>
                {barDataFixed.map((entry) => (
                  <Cell key={entry.uf} fill={vidasToColor(entry.t)} />
                ))}
                <LabelList
                  dataKey="vidas"
                  position="right"
                  formatter={(v: number, _n, p) => {
                    const pct = (p as { payload?: { pct?: number } })?.payload?.pct
                    return `${v} (${pct ?? 0}%)`
                  }}
                  style={{
                    fontFamily: SLIDE_FONT,
                    fontSize: 9,
                    fontWeight: 700,
                    fill: SLIDE_COLORS.primary,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  )
}
