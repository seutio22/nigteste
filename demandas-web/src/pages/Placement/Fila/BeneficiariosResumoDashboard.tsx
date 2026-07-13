import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import GroupsIcon from '@mui/icons-material/Groups'
import MaleIcon from '@mui/icons-material/Male'
import FemaleIcon from '@mui/icons-material/Female'
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman'
import ElderlyIcon from '@mui/icons-material/Elderly'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../../../lib/api.local'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  CATEGORIAS_APRESENTACAO,
  computeBeneficiariosResumo,
  formatTitularidadeResumo,
  type BeneficiariosResumoApresentacao,
} from './placementBeneficiariosResumo'
import type { PlacementPresentationMode } from './placementAnaliseBase'

export const GRUPO_ELEGIVEL_SLIDE_W = 1280
export const GRUPO_ELEGIVEL_SLIDE_H = 720
const SLIDE_W = GRUPO_ELEGIVEL_SLIDE_W
const SLIDE_H = GRUPO_ELEGIVEL_SLIDE_H
const FONT = '"Geometria", sans-serif'

/** Paleta institucional NIG (theme.ts) */
const PRIMARY = '#002561'
const INFO = '#004F75'
const INFO_LIGHT = '#009FDF'
const TEXT_PRIMARY = '#050032'
const TEXT_SECONDARY = '#6b7a80'
const BORDER = '#DCDFE3'
const SURFACE = '#f7f8f9'
const WHITE = '#ffffff'
const MINT = '#e6f2f8'

const slideText = {
  fontFamily: FONT,
}

type Props = {
  cotacaoId: string
  disabled?: boolean
  presentationMode?: PlacementPresentationMode
}

function IconSquare({
  children,
  bgcolor,
}: {
  children: React.ReactNode
  bgcolor: string
}) {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        bgcolor,
        color: WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,37,97,0.15)',
        '& svg': { fontSize: 26 },
      }}
    >
      {children}
    </Box>
  )
}

/** Fileira de métricas — layout aprovado pelo usuário */
function MetricPill({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...slideText,
        flex: 1,
        minWidth: 0,
        p: 1.5,
        borderRadius: 2,
        bgcolor: WHITE,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 2px 10px rgba(0,37,97,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        overflow: 'hidden',
      }}
    >
      <IconSquare bgcolor={accent}>{icon}</IconSquare>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 9,
            fontWeight: 700,
            color: TEXT_SECONDARY,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: PRIMARY, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ fontFamily: FONT, fontSize: 10, color: TEXT_SECONDARY, mt: 0.2 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

type TitularidadeLegendaItem = {
  code: string
  label: string
  value: number
  color: string
}

type TitularidadePieLabelProps = {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
  fill?: string
}

/** Percentual discreto no anel — pílula mint + texto institucional. */
function titularidadePieLabelSoft(props: TitularidadePieLabelProps) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, fill = PRIMARY } = props
  if (percent < 0.04) return null

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const text = `${Math.round(percent * 100)}%`
  const w = 28
  const h = 15

  return (
    <g pointerEvents="none">
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={5}
        fill={MINT}
        fillOpacity={0.96}
        stroke={fill}
        strokeOpacity={0.28}
        strokeWidth={0.8}
      />
      <text
        x={x}
        y={y + 0.5}
        fill={INFO}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700 }}
      >
        {text}
      </text>
    </g>
  )
}

function TitularidadeLegendaRow({ item }: { item: TitularidadeLegendaItem }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.6,
        px: 0.75,
        py: 0.55,
        borderRadius: 1.5,
        bgcolor: MINT,
        border: `1px solid ${item.color}20`,
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '7px',
          bgcolor: item.color,
          color: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontSize: 10,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: `0 2px 6px ${item.color}33`,
        }}
      >
        {item.code}
      </Box>
      <Typography
        noWrap
        sx={{
          fontFamily: FONT,
          fontSize: 8,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          textTransform: 'uppercase',
          lineHeight: 1.2,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.label}
      </Typography>
      <Box sx={{ flexShrink: 0, textAlign: 'right', lineHeight: 1 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: item.color }}>
          {item.value}
        </Typography>
      </Box>
    </Box>
  )
}

function TitularidadeBreakdownChips({ resumo }: { resumo: string }) {
  const chips = resumo.split(' · ').filter(Boolean)
  const chipColor = (token: string) => {
    if (token.startsWith('T')) return PRIMARY
    if (token.startsWith('D')) return INFO
    if (token.startsWith('A')) return '#ed6c02'
    return TEXT_SECONDARY
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35 }}>
      {chips.map((chip) => (
        <Box
          key={chip}
          sx={{
            px: 0.55,
            py: 0.15,
            borderRadius: 0.75,
            bgcolor: `${chipColor(chip)}14`,
            border: `1px solid ${chipColor(chip)}33`,
            lineHeight: 1,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 7.5, fontWeight: 800, color: chipColor(chip), lineHeight: 1.2 }}>
            {chip}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function TitularidadeStatusRow({
  label,
  total,
  resumo,
}: {
  label: string
  total: number
  resumo: string | null
}) {
  return (
    <Box
      sx={{
        px: 0.75,
        py: 0.75,
        borderRadius: 1.5,
        bgcolor: SURFACE,
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{
            fontFamily: FONT,
            fontSize: 7.5,
            fontWeight: 700,
            color: INFO,
            lineHeight: 1.2,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 800,
            color: PRIMARY,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {total}
        </Typography>
      </Box>
      {resumo ? (
        <Box sx={{ mt: 0.5 }}>
          <TitularidadeBreakdownChips resumo={resumo} />
        </Box>
      ) : null}
    </Box>
  )
}

export function TitularidadeDonut({
  titulares,
  dependentes,
  agregados,
  naoClassificados = 0,
  categoriasPorTitularidade,
}: {
  titulares: number
  dependentes: number
  agregados: number
  naoClassificados?: number
  categoriasPorTitularidade?: BeneficiariosResumoApresentacao['categoriasPorTitularidade']
}) {
  const AGREGADO_COLOR = '#ed6c02'
  const NAO_CLASS_COLOR = '#9aa5ab'
  const data = [
    { name: 'Titulares (T)', value: titulares, fill: PRIMARY },
    { name: 'Dependentes (D)', value: dependentes, fill: INFO_LIGHT },
    ...(agregados > 0
      ? [{ name: 'Agregados (A)', value: agregados, fill: AGREGADO_COLOR }]
      : []),
    ...(naoClassificados > 0
      ? [{ name: 'Não classificado', value: naoClassificados, fill: NAO_CLASS_COLOR }]
      : []),
  ].filter((d) => d.value > 0)
  const total = titulares + dependentes + agregados + naoClassificados
  const temGrafico = data.length > 0
  const statusComTitularidade = CATEGORIAS_APRESENTACAO.filter(
    (cat) => cat.key !== 'demais' && categoriasPorTitularidade?.[cat.key] != null
  )
    .map((cat) => ({
      key: cat.key,
      label: cat.label.replace(/¹|²/g, '').trim(),
      total:
        categoriasPorTitularidade![cat.key].titulares +
        categoriasPorTitularidade![cat.key].dependentes +
        categoriasPorTitularidade![cat.key].agregados +
        categoriasPorTitularidade![cat.key].naoClassificada,
      resumo: formatTitularidadeResumo(categoriasPorTitularidade![cat.key]),
    }))
    .filter((item) => item.total > 0)

  const legendaItens: TitularidadeLegendaItem[] = [
    { code: 'T', label: 'Titular', value: titulares, color: PRIMARY },
    { code: 'D', label: 'Dependente', value: dependentes, color: INFO_LIGHT },
    { code: 'A', label: 'Agregado', value: agregados, color: AGREGADO_COLOR },
    ...(naoClassificados > 0
      ? [{ code: '?', label: 'Não classificado', value: naoClassificados, color: NAO_CLASS_COLOR }]
      : []),
  ]

  return (
    <Paper
      elevation={0}
      sx={{
        ...slideText,
        p: 1.25,
        borderRadius: 2,
        border: `1px solid ${BORDER}`,
        bgcolor: WHITE,
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        boxSizing: 'border-box',
        overflow: 'visible',
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 10,
          fontWeight: 700,
          color: PRIMARY,
          letterSpacing: 0.5,
          mb: 0.5,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        TITULARIDADE
      </Typography>
      <Box sx={{ width: '100%', height: 104, flexShrink: 0, position: 'relative' }} data-chart="titularidade">
        {temGrafico ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={44}
                paddingAngle={2}
                isAnimationActive={false}
                stroke={WHITE}
                strokeWidth={2}
                label={titularidadePieLabelSoft}
                labelLine={false}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _name: string, entry: { payload?: { name?: string } }) => {
                  const pct = total > 0 ? Math.round((Number(v) / total) * 100) : 0
                  return [`${v} (${pct}%)`, entry?.payload?.name ?? 'vidas']
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: SURFACE,
              borderRadius: 1,
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 10, color: TEXT_SECONDARY, textAlign: 'center', px: 1 }}>
              Sem titularidade classificada na base
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.45, width: '100%', mt: 0.65, minWidth: 0 }}>
        {legendaItens.map((item) => (
          <TitularidadeLegendaRow key={item.code} item={item} />
        ))}
      </Box>
      {statusComTitularidade.length > 0 && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${BORDER}`,
            width: '100%',
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <Typography
            noWrap
            sx={{
              fontFamily: FONT,
              fontSize: 7.5,
              fontWeight: 700,
              color: PRIMARY,
              mb: 0.6,
              textAlign: 'center',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Status × Titularidade
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.45 }}>
            {statusComTitularidade.map((item) => (
              <TitularidadeStatusRow
                key={item.key}
                label={item.label}
                total={item.total}
                resumo={item.resumo}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )
}

export function CategoriasStrip({
  categorias,
}: {
  categorias: BeneficiariosResumoApresentacao['categorias']
}) {
  const comDados = CATEGORIAS_APRESENTACAO.filter((c) => categorias[c.key] > 0)

  return (
    <Box sx={{ ...slideText }}>
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          color: PRIMARY,
          letterSpacing: 0.6,
          mb: 1,
        }}
      >
        DESCRIÇÃO DOS BENEFICIÁRIOS
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {comDados.map((cat) => (
          <Box
            key={cat.key}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: MINT,
              border: `1px solid ${INFO}33`,
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: PRIMARY }}>
              {categorias[cat.key]}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: INFO, lineHeight: 1.2 }}>
              {cat.label.replace(/¹|²/g, '').trim()}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 8, color: TEXT_SECONDARY, mt: 0.75 }}>
        ¹ Titulares e/ou dependentes · ² Transtorno do Espectro Autista
      </Typography>
    </Box>
  )
}

export function FaixasEtariasChart({
  faixas,
  maxVal,
}: {
  faixas: BeneficiariosResumoApresentacao['faixasEtarias']
  maxVal: number
}) {
  const barPct = (n: number) => (maxVal > 0 && n > 0 ? (n / maxVal) * 100 : 0)
  const faixaTotal = (f: (typeof faixas)[number]) => f.masculino + f.feminino + f.semSexo

  return (
    <Box data-chart="pyramid" sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: PRIMARY }}>♂ Masculino</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: INFO }}>Feminino ♀</Typography>
      </Box>
      {faixas.map((f) => {
        const total = faixaTotal(f)
        return (
        <Box
          key={f.key}
          sx={{
            display: 'grid',
            gridTemplateColumns: '22px 1fr 54px 1fr 22px',
            alignItems: 'center',
            gap: 0.5,
            height: 17,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: PRIMARY, textAlign: 'right' }}>
            {f.masculino > 0 ? f.masculino : f.semSexo > 0 && f.feminino === 0 ? total : ''}
          </Typography>
          <Box sx={{ height: 10, bgcolor: '#eef2f6', borderRadius: '3px 0 0 3px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
            <Box sx={{ height: '100%', width: `${barPct(f.masculino)}%`, maxWidth: '100%', bgcolor: PRIMARY, borderRadius: '3px 0 0 3px' }} />
            {f.semSexo > 0 && f.masculino === 0 && f.feminino === 0 ? (
              <Box sx={{ height: '100%', width: `${barPct(f.semSexo)}%`, maxWidth: '100%', bgcolor: TEXT_SECONDARY, borderRadius: '3px 0 0 3px' }} />
            ) : null}
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'center', bgcolor: SURFACE, borderRadius: 0.5, py: 0.2 }}>
            {f.label}
            {total > 0 ? ` · ${total}` : ''}
          </Typography>
          <Box sx={{ height: 10, bgcolor: '#eef2f6', borderRadius: '0 3px 3px 0', overflow: 'hidden', minWidth: 0, display: 'flex' }}>
            <Box sx={{ height: '100%', width: `${barPct(f.feminino)}%`, maxWidth: '100%', bgcolor: INFO_LIGHT, borderRadius: '0 3px 3px 0' }} />
            {f.semSexo > 0 && (f.masculino > 0 || f.feminino > 0) ? (
              <Box sx={{ height: '100%', width: `${barPct(f.semSexo)}%`, maxWidth: '100%', bgcolor: TEXT_SECONDARY, opacity: 0.55 }} />
            ) : null}
          </Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: INFO }}>
            {f.feminino > 0 ? f.feminino : ''}
          </Typography>
        </Box>
        )
      })}
    </Box>
  )
}

export function PlanosChart({
  planos,
  total,
}: {
  planos: BeneficiariosResumoApresentacao['planos']
  total: number
}) {
  const accents = [INFO, PRIMARY, INFO_LIGHT, '#4a6fa5', '#5a7fa8']

  return (
    <Box data-chart="planos" sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.9 }}>
      {planos.slice(0, 5).map((p, i) => {
        const pct = total > 0 ? Math.round((p.quantidade / total) * 100) : 0
        return (
          <Box key={p.plano} sx={{ flexShrink: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 0.25 }}>
              <Typography
                sx={{
                  fontFamily: FONT,
                  flex: 1,
                  minWidth: 0,
                  fontSize: 8,
                  fontWeight: 600,
                  color: TEXT_PRIMARY,
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {p.plano}
              </Typography>
              <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: accents[i % accents.length] }}>
                  {p.quantidade}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 8, color: TEXT_SECONDARY }}>{pct}%</Typography>
              </Box>
            </Box>
            <Box sx={{ height: 5, borderRadius: 2, bgcolor: BORDER, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: accents[i % accents.length], minWidth: pct > 0 ? 4 : 0 }} />
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export function GrupoElegivelSlide({
  resumo,
  presentationMode = 'slide',
}: {
  resumo: BeneficiariosResumoApresentacao
  presentationMode?: PlacementPresentationMode
}) {
  const isPage = presentationMode === 'page'
  const maxPyramid = Math.max(...resumo.faixasEtarias.flatMap((f) => [f.masculino, f.feminino, f.semSexo]), 1)

  return (
    <Box
      data-slide-inner={isPage ? undefined : true}
      sx={{
        ...slideText,
        width: '100%',
        maxWidth: isPage ? 'none' : SLIDE_W,
        height: isPage ? 'auto' : SLIDE_H,
        maxHeight: isPage ? 'none' : SLIDE_H,
        minHeight: isPage ? 420 : undefined,
        mx: isPage ? 0 : 'auto',
        overflow: isPage ? 'visible' : 'hidden',
        borderRadius: 2,
        boxShadow: isPage ? 'none' : '0 12px 36px rgba(0,37,97,0.14)',
        border: isPage ? `1px solid ${BORDER}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SURFACE,
        boxSizing: 'border-box',
      }}
    >
      {/* Cabeçalho refinado */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${PRIMARY} 0%, ${INFO} 50%, ${INFO_LIGHT} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GroupsIcon sx={{ fontSize: 28, color: WHITE }} />
          </Box>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: 28,
              fontWeight: 800,
              color: WHITE,
              letterSpacing: 0.5,
              lineHeight: 1.1,
            }}
          >
            Grupo Elegível
          </Typography>
        </Box>
        <Paper
          elevation={0}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: 99,
            bgcolor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: WHITE }}>
            {resumo.total} beneficiários
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          flex: isPage ? 'none' : 1,
          minHeight: isPage ? undefined : 0,
          p: isPage ? { xs: 2, md: 2.5 } : 1.75,
          display: 'flex',
          flexDirection: 'column',
          gap: isPage ? 2 : 1.25,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: isPage ? 'wrap' : 'nowrap' }}>
          <MetricPill
            accent={PRIMARY}
            icon={<MaleIcon />}
            label="Masculino"
            value={`${resumo.pctMasculino}%`}
            sub={`${resumo.sexoM} vidas`}
          />
          <MetricPill
            accent={INFO}
            icon={<FemaleIcon />}
            label="Feminino"
            value={`${resumo.pctFeminino}%`}
            sub={`${resumo.sexoF} vidas`}
          />
          <MetricPill
            accent="#3d6b9e"
            icon={
              <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: '#fff' }}>Ø</Typography>
            }
            label="Média de idade"
            value={resumo.mediaIdade != null ? String(resumo.mediaIdade) : '—'}
            sub="anos"
          />
          <MetricPill
            accent="#6b4fa8"
            icon={<PregnantWomanIcon />}
            label="Pot. gestacional"
            value={String(resumo.potencialGestacional)}
            sub="F · 19–38 anos"
          />
          <MetricPill
            accent="#b45309"
            icon={<ElderlyIcon />}
            label="59+ anos"
            value={String(resumo.acima59)}
          />
        </Box>

        {/* Composição — altura automática */}
        <Paper
          elevation={0}
          sx={{ flexShrink: 0, p: 1.5, borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: WHITE }}
        >
          <CategoriasStrip categorias={resumo.categorias} />
        </Paper>

        {/* Gráficos + titularidade */}
        <Box
          sx={{
            display: 'flex',
            gap: isPage ? 2 : 1.25,
            flex: isPage ? 'none' : 1,
            minHeight: isPage ? 320 : 0,
            flexDirection: isPage ? { xs: 'column', lg: 'row' } : 'row',
          }}
        >
          <Box sx={{ width: isPage ? { xs: '100%', lg: 200 } : 168, flexShrink: 0 }}>
            <TitularidadeDonut
              titulares={resumo.titulares}
              dependentes={resumo.dependentes}
              agregados={resumo.agregados}
              naoClassificados={resumo.titularidadeNaoClassificada}
              categoriasPorTitularidade={resumo.categoriasPorTitularidade}
            />
          </Box>
          <Paper
            elevation={0}
            sx={{
              flex: 1.1,
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              bgcolor: WHITE,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: PRIMARY, mb: 0.75, flexShrink: 0 }}>
              FAIXAS ETÁRIAS · QUANTIDADE
            </Typography>
            <FaixasEtariasChart faixas={resumo.faixasEtarias} maxVal={maxPyramid} />
          </Paper>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              bgcolor: WHITE,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: PRIMARY, mb: 0.75, flexShrink: 0 }}>
              PLANOS
            </Typography>
            {resumo.planos.length === 0 ? (
              <Typography sx={{ fontFamily: FONT, fontSize: 10, color: TEXT_SECONDARY }}>Sem plano na base</Typography>
            ) : (
              <PlanosChart planos={resumo.planos} total={resumo.total} />
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}

export function BeneficiariosResumoDashboard({
  cotacaoId,
  disabled,
  presentationMode = 'slide',
}: Props) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resumo, setResumo] = useState<BeneficiariosResumoApresentacao | null>(null)
  const [slideReady, setSlideReady] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    setSlideReady(false)
    setErrorMsg(null)
    try {
      const resp = (await api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`)) as {
        beneficiarios?: PlacementBeneficiario[]
      }
      const list = resp?.beneficiarios ?? []
      if (list.length === 0) {
        setResumo(null)
        setErrorMsg('Importe a base de beneficiários na etapa anterior para gerar a apresentação.')
        return
      }
      setResumo(computeBeneficiariosResumo(list))
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar beneficiários.')
      setResumo(null)
    } finally {
      setLoading(false)
    }
  }, [cotacaoId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!resumo) {
      setSlideReady(false)
      return
    }
    const t = window.setTimeout(() => setSlideReady(true), 600)
    return () => window.clearTimeout(t)
  }, [resumo])

  async function handleExportPng() {
    if (!exportRef.current) return
    setExporting(true)
    setErrorMsg(null)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 900))
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: SLIDE_W,
        height: SLIDE_H,
        onclone: (doc) => {
          const root = doc.querySelector('[data-export-root]') as HTMLElement | null
          const slide = doc.querySelector('[data-slide-inner]') as HTMLElement | null
          if (root) {
            root.style.width = `${SLIDE_W}px`
            root.style.height = `${SLIDE_H}px`
            root.style.maxWidth = `${SLIDE_W}px`
            root.style.overflow = 'hidden'
          }
          if (slide) {
            slide.style.width = `${SLIDE_W}px`
            slide.style.height = `${SLIDE_H}px`
            slide.style.fontFamily = FONT
          }
          doc.querySelectorAll('svg').forEach((svg) => {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          })
        },
      })
      const link = document.createElement('a')
      link.download = `grupo-elegivel-${cotacaoId.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setErrorMsg('Não foi possível gerar o slide. Aguarde o carregamento e tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const isPage = presentationMode === 'page'

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress sx={{ color: INFO }} />
      </Box>
    )
  }

  if (!resumo) {
    return <Alert severity="warning">{errorMsg ?? 'Nenhum beneficiário na base.'}</Alert>
  }

  return (
    <Box sx={{ fontFamily: FONT }}>
      {!isPage && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SlideshowIcon sx={{ color: INFO, fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: FONT }}>
              Slide 16:9 · Grupo Elegível — exporte em PNG para o PowerPoint.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={disabled || exporting || !slideReady}
            onClick={() => void handleExportPng()}
            sx={{ bgcolor: INFO, fontFamily: FONT, '&:hover': { bgcolor: PRIMARY } }}
          >
            {exporting ? 'Gerando slide…' : slideReady ? 'Baixar slide (PNG)' : 'Preparando…'}
          </Button>
        </Box>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ overflowX: isPage ? 'visible' : 'auto', pb: isPage ? 0 : 1, display: 'flex', justifyContent: isPage ? 'stretch' : 'center' }}>
        <Box ref={exportRef} data-export-root sx={{ width: '100%', maxWidth: isPage ? 'none' : SLIDE_W, flexShrink: 0 }}>
          <GrupoElegivelSlide resumo={resumo} presentationMode={presentationMode} />
        </Box>
      </Box>
    </Box>
  )
}
