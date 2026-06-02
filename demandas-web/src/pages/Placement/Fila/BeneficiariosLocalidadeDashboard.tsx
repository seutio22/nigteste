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
import MapIcon from '@mui/icons-material/Map'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import PublicIcon from '@mui/icons-material/Public'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import { api } from '../../../lib/api.local'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  computeLocalidadeResumo,
  type LocalidadeResumoApresentacao,
  type MunicipioRankingRow,
} from './placementBeneficiariosLocalidade'
import { BrazilDistributionViz } from './BrazilDistributionViz'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const SLIDE_W = 1280
const SLIDE_H = 720
export { SLIDE_W, SLIDE_H }
const FONT = SLIDE_FONT

const PRIMARY = SLIDE_COLORS.primary
const INFO = SLIDE_COLORS.info
const INFO_LIGHT = SLIDE_COLORS.infoLight
const WHITE = SLIDE_COLORS.white
const BORDER = SLIDE_COLORS.border
const MUTED = SLIDE_COLORS.muted
const MINT = SLIDE_COLORS.mint

const RANK_COLORS = ['#E87B35', '#009FDF', '#5B4FCF', '#3DAA86', '#6b7a80']

type Props = {
  cotacaoId: string
  disabled?: boolean
}

function IconSquare({ children, bgcolor }: { children: React.ReactNode; bgcolor: string }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '12px',
        bgcolor,
        color: WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,37,97,0.15)',
        '& svg': { fontSize: 22 },
      }}
    >
      {children}
    </Box>
  )
}

function MetricCard({
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
        flex: 1,
        minWidth: 0,
        p: 1.25,
        borderRadius: 2,
        bgcolor: WHITE,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 4px 16px rgba(0,37,97,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <IconSquare bgcolor={accent}>{icon}</IconSquare>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: 0.6 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: PRIMARY, lineHeight: 1.05 }}>
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ fontFamily: FONT, fontSize: 9, color: INFO, fontWeight: 600 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const accent = RANK_COLORS[Math.min(rank - 1, RANK_COLORS.length - 1)] ?? MUTED
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: rank <= 3 ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` : MINT,
        color: rank <= 3 ? WHITE : PRIMARY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 800,
        flexShrink: 0,
        boxShadow: rank <= 3 ? `0 4px 10px ${accent}55` : 'none',
      }}
    >
      {rank}
    </Box>
  )
}

function MunicipioRankCard({
  row,
  maxPct,
  variant,
}: {
  row: MunicipioRankingRow
  maxPct: number
  variant?: 'default' | 'demais' | 'total'
}) {
  const isTotal = variant === 'total'
  const isDemais = variant === 'demais'
  const barW = maxPct > 0 ? Math.max((row.percentual / maxPct) * 100, 6) : 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: isTotal ? 1 : 0.85,
        borderRadius: 1.5,
        bgcolor: isTotal ? PRIMARY : isDemais ? `${MINT}` : WHITE,
        border: isTotal ? 'none' : `1px solid ${BORDER}`,
        boxShadow: isTotal ? '0 6px 16px rgba(0,37,97,0.15)' : '0 2px 8px rgba(0,37,97,0.04)',
      }}
    >
      {row.rank > 0 && <RankBadge rank={row.rank} />}
      {row.rank === 0 && (
        <Box sx={{ width: 28, flexShrink: 0 }} />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.35 }}>
          {row.uf !== '—' && (
            <Box
              sx={{
                px: 0.75,
                py: 0.15,
                borderRadius: 0.75,
                bgcolor: isTotal ? 'rgba(255,255,255,0.2)' : `${INFO}18`,
                border: `1px solid ${isTotal ? 'rgba(255,255,255,0.3)' : `${INFO}44`}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: 8,
                  fontWeight: 800,
                  color: isTotal ? WHITE : INFO,
                }}
              >
                {row.uf}
              </Typography>
            </Box>
          )}
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: isTotal ? 10 : 9.5,
              fontWeight: isTotal || isDemais ? 800 : 600,
              color: isTotal ? WHITE : PRIMARY,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.municipio}
          </Typography>
        </Box>
        {!isTotal && (
          <Box
            sx={{
              height: 5,
              borderRadius: 99,
              bgcolor: isDemais ? `${INFO}15` : '#eef2f6',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${barW}%`,
                borderRadius: 99,
                background: `linear-gradient(90deg, ${INFO_LIGHT}, ${INFO})`,
              }}
            />
          </Box>
        )}
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: isTotal ? 16 : 14,
            fontWeight: 800,
            color: isTotal ? WHITE : PRIMARY,
            lineHeight: 1,
          }}
        >
          {row.vidas}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 9,
            fontWeight: 700,
            color: isTotal ? 'rgba(255,255,255,0.85)' : MUTED,
          }}
        >
          {row.percentual}%
        </Typography>
      </Box>
    </Box>
  )
}

function MunicipioRankingPanel({ resumo }: { resumo: LocalidadeResumoApresentacao }) {
  const maxPct = Math.max(...resumo.topMunicipios.map((m) => m.percentual), 1)
  const topUf = resumo.porUf[0]

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        bgcolor: '#fafbfc',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          background: `linear-gradient(90deg, ${PRIMARY}08 0%, ${INFO}12 100%)`,
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LocationCityIcon sx={{ fontSize: 18, color: INFO }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: PRIMARY }}>
            Top municípios
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: MUTED }}>
          {resumo.operadoraLabel}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.65,
        }}
      >
        {resumo.topMunicipios.slice(0, 8).map((row) => (
          <MunicipioRankCard key={`${row.uf}-${row.municipio}`} row={row} maxPct={maxPct} />
        ))}
        <MunicipioRankCard
          row={{
            rank: 0,
            uf: '—',
            municipio: 'Demais localidades',
            vidas: resumo.demaisLocalidades.vidas,
            percentual: resumo.demaisLocalidades.percentual,
          }}
          maxPct={100}
          variant="demais"
        />
      </Box>

      <Box sx={{ p: 1, pt: 0 }}>
        <MunicipioRankCard
          row={{
            rank: 0,
            uf: topUf?.uf ?? '—',
            municipio: 'Total na base',
            vidas: resumo.total,
            percentual: 100,
          }}
          maxPct={100}
          variant="total"
        />
      </Box>
    </Paper>
  )
}

export function LocalidadeSlide({ resumo }: { resumo: LocalidadeResumoApresentacao }) {
  const topMun = resumo.topMunicipios[0]
  const topUf = resumo.porUf[0]
  const ufsAtivos = resumo.porUf.filter((u) => u.vidas > 0).length

  return (
    <Box
      data-slide-inner
      sx={{
        fontFamily: FONT,
        width: '100%',
        maxWidth: SLIDE_W,
        height: SLIDE_H,
        maxHeight: SLIDE_H,
        mx: 'auto',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: '0 12px 36px rgba(0,37,97,0.14)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: WHITE,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${PRIMARY} 0%, ${INFO} 50%, ${INFO_LIGHT} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapIcon sx={{ fontSize: 26, color: WHITE }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: WHITE, lineHeight: 1.05 }}>
              Distribuição por Localidade
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.88)' }}>
              Geografia da base · apresentação ao cliente
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1.25 }}>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <MetricCard
            icon={<GroupsIcon />}
            label="Beneficiários"
            value={String(resumo.total)}
            accent={PRIMARY}
          />
          <MetricCard
            icon={<PublicIcon />}
            label="Estados"
            value={String(ufsAtivos)}
            sub="com vidas na base"
            accent={INFO}
          />
          <MetricCard
            icon={<EmojiEventsIcon />}
            label="Top UF"
            value={topUf ? `${topUf.uf}` : '—'}
            sub={topUf ? `${topUf.vidas} vidas` : undefined}
            accent="#E87B35"
          />
          <MetricCard
            icon={<LocationCityIcon />}
            label="Top município"
            value={topMun ? topMun.municipio.slice(0, 14) + (topMun.municipio.length > 14 ? '…' : '') : '—'}
            sub={topMun ? `${topMun.uf} · ${topMun.percentual}%` : undefined}
            accent="#5B4FCF"
          />
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1.25 }}>
          <Box sx={{ width: '38%', minWidth: 0, minHeight: 0 }}>
            <MunicipioRankingPanel resumo={resumo} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <BrazilDistributionViz
              porUf={resumo.porUf}
              maxVidas={resumo.maxUfVidas}
              minVidas={resumo.minUfVidas}
              total={resumo.total}
              highlightUf={topUf?.uf}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export function BeneficiariosLocalidadeDashboard({ cotacaoId, disabled }: Props) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ReturnType<typeof computeLocalidadeResumo> | null>(null)
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
        setErrorMsg('Importe a base de beneficiários na etapa anterior para gerar a distribuição por localidade.')
        return
      }
      setResumo(computeLocalidadeResumo(list))
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
    const t = window.setTimeout(() => setSlideReady(true), 500)
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
      link.download = `distribuicao-localidade-${cotacaoId.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      setErrorMsg('Não foi possível gerar o slide. Aguarde o carregamento e tente novamente.')
    } finally {
      setExporting(false)
    }
  }

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
          <Typography variant="body2" color="text.secondary">
            Slide 16:9 · mapa dinâmico, ranking de municípios e métricas geográficas.
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

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <Box ref={exportRef} data-export-root sx={{ width: '100%', maxWidth: SLIDE_W, flexShrink: 0 }}>
          <LocalidadeSlide resumo={resumo} />
        </Box>
      </Box>
    </Box>
  )
}
