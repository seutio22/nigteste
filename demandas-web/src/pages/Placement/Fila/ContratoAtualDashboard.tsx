import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import DescriptionIcon from '@mui/icons-material/Description'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import GroupsIcon from '@mui/icons-material/Groups'
import PaymentsIcon from '@mui/icons-material/Payments'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined'
import { api } from '../../../lib/api.local'
import {
  fetchOperadoraIdsComLogo,
  loadOperadoraLogoObjectUrls,
  revokeOperadoraLogoUrls,
} from './placementOperadoraLogo'
import { useMasterDataStore } from '../../../store/masterDataStore'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  buildFaixaMatrixForPage,
  buildContratoAtualPages,
  computeContratoAtualResumo,
  type ContratoAtualPagina,
  type ContratoAtualResumo,
  type ContratoPlanoColuna,
  type FaixaMatrixCell,
} from './placementContratoAtual'
import {
  CONTRATO_ATUAL_PLANOS_POR_SLIDE_OPCOES,
  CONTRATO_SLIDE_H,
  CONTRATO_SLIDE_W,
  computeContratoGridLayout,
  computeContratoGridMaxHeight,
  getContratoAtualLayoutSpec,
  type ContratoAtualLayoutSpec,
  type ContratoAtualPlanosPorSlide,
} from './placementContratoAtualLayout'
import { applyContratoSlideExportFixes } from './placementContratoAtualExport'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const SLIDE_W = CONTRATO_SLIDE_W
const SLIDE_H = CONTRATO_SLIDE_H
const FONT = SLIDE_FONT

const PRIMARY = SLIDE_COLORS.primary
const INFO = SLIDE_COLORS.info
const WHITE = SLIDE_COLORS.white
const BORDER = SLIDE_COLORS.border
const SURFACE = '#f3f5f8'
const MUTED = SLIDE_COLORS.muted

const ROW_VIDAS = 46
const ROW_FATURA = 72
const ROW_CONTRIB = 38
const ROW_COPART = 42
const ROW_ELEG_MIN = 48
const FAIXA_SECTION_H = 26

function SlideText({
  children,
  sx,
}: {
  children: React.ReactNode
  sx?: Record<string, unknown>
}) {
  return (
    <Typography
      component="span"
      sx={{
        m: 0,
        p: 0,
        display: 'block',
        lineHeight: 1.15,
        fontFamily: FONT,
        ...sx,
      }}
    >
      {children}
    </Typography>
  )
}

type Props = {
  cotacaoId: string
  disabled?: boolean
}

type GridSpec = {
  showContrib: boolean
  showCopart: boolean
  metaLine: string | null
  useFaixa: boolean
  faixaRowCount: number
  hasPerCapita: boolean
}

function gridSpec(page: ContratoAtualPagina): GridSpec {
  const matrix = buildFaixaMatrixForPage(page)
  const faixaRowCount = matrix?.rows.length ?? 0
  const useFaixa = faixaRowCount > 0
  const parts: string[] = []
  if (page.contribuicaoUnica) parts.push(page.contribuicaoUnica)
  if (page.coparticipacaoUnica) parts.push(page.coparticipacaoUnica)
  return {
    showContrib: !page.contribuicaoUnica,
    showCopart: !page.coparticipacaoUnica,
    metaLine: parts.length ? parts.join('  ·  ') : null,
    useFaixa,
    faixaRowCount,
    hasPerCapita: page.colunas.some((c) => c.tipoCusto === 'per_capita'),
  }
}

function LegendCell({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: string }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 0.85,
        px: 1.25,
        borderBottom: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: SURFACE,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '10px',
          background: accent
            ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`
            : `linear-gradient(135deg, ${SLIDE_COLORS.mint} 0%, ${WHITE} 100%)`,
          color: accent ? WHITE : INFO,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,37,97,0.08)',
          '& svg': { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 700, color: PRIMARY, lineHeight: 1.15 }}>
        {label}
      </Typography>
    </Box>
  )
}

function FaixaLegendLabel({ text, h }: { text: string; h: number }) {
  return (
    <Box
      data-contrato-cell
      sx={{
        height: h,
        minHeight: h,
        display: 'flex',
        alignItems: 'center',
        pl: 2.5,
        pr: 1,
        borderBottom: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: SURFACE,
        boxSizing: 'border-box',
        lineHeight: 1.15,
      }}
    >
      <SlideText sx={{ fontSize: 8, fontWeight: 700, color: PRIMARY }}>{text}</SlideText>
    </Box>
  )
}

function DataCell({
  children,
  h,
  zebra,
  compact,
  clip,
}: {
  children: React.ReactNode
  h: number
  zebra?: number
  compact?: boolean
  clip?: boolean
}) {
  return (
    <Box
      data-contrato-cell
      {...(clip ? { 'data-clip': '1' } : {})}
      sx={{
        minHeight: h,
        height: h,
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: compact ? 0.35 : 0.5,
        borderBottom: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: zebra != null ? (zebra % 2 === 0 ? WHITE : '#f8f9fb') : WHITE,
        boxSizing: 'border-box',
        lineHeight: 1.15,
        overflow: clip ? 'hidden' : 'visible',
      }}
    >
      {children}
    </Box>
  )
}

function ElegibilidadeCell({ col }: { col: ContratoPlanoColuna }) {
  const linhas = col.elegibilidadeLinhas.filter(Boolean)
  if (linhas.length === 0) {
    const txt = col.elegibilidade.trim()
    return (
      <SlideText
        sx={{
          fontSize: 9,
          color: txt && txt !== '—' ? PRIMARY : MUTED,
          textAlign: 'center',
          width: '100%',
        }}
      >
        {txt && txt !== '—' ? txt : 'Sem cargo na base'}
      </SlideText>
    )
  }
  const vis = linhas.slice(0, 3)
  const rest = linhas.length - vis.length
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, justifyContent: 'center' }}>
      {vis.map((linha) => (
        <Box
          key={linha}
          sx={{
            fontFamily: FONT,
            fontSize: 7.5,
            fontWeight: 600,
            px: 0.75,
            py: 0.2,
            borderRadius: 99,
            bgcolor: `${col.tabColor}18`,
            color: PRIMARY,
            border: `1px solid ${col.tabColor}55`,
          }}
        >
          {linha}
        </Box>
      ))}
      {rest > 0 && (
        <Typography sx={{ fontFamily: FONT, fontSize: 7, color: MUTED, width: '100%', textAlign: 'center' }}>
          +{rest}
        </Typography>
      )}
    </Box>
  )
}

function CopartCell({ col }: { col: ContratoPlanoColuna }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
      {col.temCoparticipacao ? (
        <CheckCircleIcon sx={{ color: '#3DAA86', fontSize: 18 }} />
      ) : (
        <CancelIcon sx={{ color: '#cbd5e1', fontSize: 18 }} />
      )}
      <Typography sx={{ fontFamily: FONT, fontSize: 7.5, fontWeight: 600, color: PRIMARY, lineHeight: 1.2, textAlign: 'center' }}>
        {col.coparticipacao}
      </Typography>
    </Box>
  )
}

function FaixaPremioCell({
  cell,
  accent,
  layout,
  dense,
}: {
  cell: FaixaMatrixCell
  accent: string
  layout: ContratoAtualLayoutSpec
  dense?: boolean
}) {
  const tight = dense ?? layout.compact
  const vidasLabel = cell.vidas === 1 ? 'vida' : 'vidas'
  const vidasText = tight ? `${cell.vidas}v` : `${cell.vidas} ${vidasLabel}`

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        px: tight ? 0.2 : 0.35,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tight ? 0.2 : 0.3,
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <SlideText
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
            fontSize: layout.faixaCustoFont,
            fontWeight: 800,
            color: INFO,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cell.custo}
        </SlideText>
        {cell.vidas > 0 && (
          <SlideText
            sx={{
              flex: '0 0 auto',
              fontSize: layout.faixaVidasFont,
              fontWeight: 600,
              color: accent,
              whiteSpace: 'nowrap',
            }}
          >
            {vidasText}
          </SlideText>
        )}
      </Box>
    </Box>
  )
}

function PlanoTab({
  col,
  logoUrl,
  layout,
}: {
  col: ContratoPlanoColuna
  logoUrl?: string | null
  layout: ContratoAtualLayoutSpec
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !logoFailed

  return (
    <Box
      sx={{
        borderRadius: '14px 14px 0 0',
        overflow: 'hidden',
        borderRight: `1px solid ${BORDER}`,
        borderTop: `1px solid ${BORDER}`,
        borderLeft: `1px solid ${BORDER}`,
        borderBottom: 'none',
        minHeight: layout.tabH + layout.logoWellH,
        height: layout.tabH + layout.logoWellH,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          minHeight: layout.logoWellH,
          maxHeight: layout.logoWellH,
          bgcolor: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 0.75,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {showLogo ? (
          <Box
            component="img"
            src={logoUrl!}
            alt={col.operadora}
            onError={() => setLogoFailed(true)}
            sx={{
              maxHeight: layout.logoWellH - 10,
              maxWidth: '92%',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: layout.compact ? 7.5 : 8.5,
              fontWeight: 800,
              color: PRIMARY,
              letterSpacing: 0.3,
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          >
            {col.operadora}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          py: layout.compact ? 0.5 : 0.65,
          px: 0.5,
          background: `linear-gradient(160deg, ${col.tabColor} 0%, ${col.tabColor}dd 55%, ${col.tabColor}99 100%)`,
          color: WHITE,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.2,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -16,
            right: -16,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: layout.compact ? 6.5 : 7,
            fontWeight: 600,
            opacity: 0.92,
            letterSpacing: 0.4,
            position: 'relative',
          }}
        >
          {col.produto.toUpperCase()}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: layout.compact ? 9.5 : 11,
            fontWeight: 800,
            lineHeight: 1.05,
            position: 'relative',
          }}
        >
          {col.planoLabel}
        </Typography>
        {col.acomodacao ? (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: layout.compact ? 6.5 : 7,
              fontWeight: 600,
              opacity: 0.88,
              position: 'relative',
            }}
          >
            {col.acomodacao === 'Apartamento' ? 'Apartamento' : 'Enfermaria'}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

/** Quadro consolidado da página — soma dos planos exibidos */
function TotalConsolidadoBar({
  page,
  layout,
}: {
  page: ContratoAtualPagina
  layout: ContratoAtualLayoutSpec
}) {
  const n = page.colunas.length
  return (
    <Box
      sx={{
        mt: 1.25,
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: `${layout.legendW}px repeat(${n}, minmax(0, 1fr))`,
        columnGap: 0,
      }}
    >
      <Box
        sx={{
          gridColumn: '1 / 2',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${INFO} 100%)`,
            color: WHITE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { fontSize: 16 },
          }}
        >
          <SummarizeOutlinedIcon />
        </Box>
        <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: PRIMARY, lineHeight: 1.15 }}>
          Total do comparativo
        </Typography>
      </Box>
      <Box
        sx={{
          gridColumn: `2 / ${2 + n}`,
          py: 1.25,
          px: 2,
          borderRadius: 2.5,
          background: `linear-gradient(90deg, ${PRIMARY}08 0%, ${INFO}14 50%, ${SLIDE_COLORS.infoLight}18 100%)`,
          border: `2px solid ${INFO}44`,
          boxShadow: '0 6px 20px rgba(0,37,97,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: 10, color: MUTED, fontWeight: 600 }}>
          Soma de {n} plano{n > 1 ? 's' : ''} nesta página
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 700 }}>
              VIDAS
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: PRIMARY, lineHeight: 1 }}>
              {page.totalVidas}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 1,
              height: 36,
              bgcolor: BORDER,
              alignSelf: 'center',
            }}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 700 }}>
              FATURA ESTIMADA
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: INFO, lineHeight: 1 }}>
              {page.totalFatura}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/** Rodapé do plano: total integrado à coluna, cor da aba */
function PlanoFooter({ col }: { col: ContratoPlanoColuna }) {
  return (
    <Box
      sx={{
        height: ROW_FATURA,
        minHeight: ROW_FATURA,
        maxHeight: ROW_FATURA,
        background: `linear-gradient(180deg, ${WHITE} 0%, ${col.tabColor}12 100%)`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderTop: `3px solid ${col.tabColor}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.2,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 14, color: col.tabColor }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 700 }}>
          Fatura estimada
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, color: PRIMARY, lineHeight: 1 }}>
        {col.faturaEstimada}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 7.5, color: MUTED, fontWeight: 600 }}>
        {col.vidas} vidas ativas
      </Typography>
    </Box>
  )
}

function ComparativoGrid({
  page,
  logoUrls,
  layout,
}: {
  page: ContratoAtualPagina
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
}) {
  const spec = gridSpec(page)
  const matrix = buildFaixaMatrixForPage(page)
  const cols = page.colunas
  const visibleCols = cols.length
  const elegH = Math.max(
    ROW_ELEG_MIN,
    Math.max(...cols.map((c) => (c.elegibilidadeLinhas.length > 2 ? 58 : ROW_ELEG_MIN)), ROW_ELEG_MIN)
  )
  const tabRowH = layout.tabH + layout.logoWellH
  const heightSpec = {
    useFaixa: spec.useFaixa,
    faixaRowCount: spec.faixaRowCount,
    showContrib: spec.showContrib,
    showCopart: spec.showCopart,
    hasPerCapita: spec.useFaixa && spec.hasPerCapita,
    elegH,
  }
  const gridMaxHeight = computeContratoGridMaxHeight({
    hasMetaLine: !!spec.metaLine,
    showPageIndicator: page.totalPages > 1,
  })
  const { faixaRowH, gridHeight, gridScale } = computeContratoGridLayout(
    layout,
    heightSpec,
    tabRowH,
    gridMaxHeight,
    elegH
  )
  const scaledGridHeight = Math.ceil(gridHeight * gridScale)
  const cellCompact = layout.compact || cols.length >= 4

  const gridCols = `${layout.legendW}px repeat(${visibleCols}, minmax(0, 1fr))`

  let row = 1
  const tabRow = row++
  const elegRow = row++
  const contribRow = spec.showContrib ? row++ : 0
  const copartRow = spec.showCopart ? row++ : 0
  const vidasRow = row++
  const perCapitaRow = spec.useFaixa && spec.hasPerCapita ? row++ : 0
  const faixaSectionRow = spec.useFaixa ? row++ : 0
  const faixaStartRow = spec.useFaixa ? row : 0
  const faixaEndRow = spec.useFaixa ? faixaStartRow + spec.faixaRowCount - 1 : 0
  const footerRow = spec.useFaixa ? faixaEndRow + 1 : row++
  const premioRow = !spec.useFaixa ? row++ : 0
  const classicFooterRow = !spec.useFaixa ? row : footerRow

  const rowHeights: string[] = [`${tabRowH}px`, `${elegH}px`]
  if (spec.showContrib) rowHeights.push(`${ROW_CONTRIB}px`)
  if (spec.showCopart) rowHeights.push(`${ROW_COPART}px`)
  rowHeights.push(`${ROW_VIDAS}px`)
  if (perCapitaRow) rowHeights.push(`${faixaRowH}px`)
  if (faixaSectionRow) rowHeights.push(`${FAIXA_SECTION_H}px`)
  if (spec.useFaixa) {
    for (let i = 0; i < spec.faixaRowCount; i++) rowHeights.push(`${faixaRowH}px`)
    rowHeights.push(`${ROW_FATURA}px`)
  } else {
    rowHeights.push('40px', `${ROW_FATURA}px`)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        flexShrink: 0,
        width: '100%',
        bgcolor: WHITE,
        borderRadius: 3,
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflow: 'visible',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(0,37,97,0.06)',
      }}
    >
      {spec.metaLine && (
        <Box
          sx={{
            mb: 1,
            px: 1.25,
            py: 0.6,
            borderRadius: 2,
            bgcolor: WHITE,
            border: `1px solid ${BORDER}`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <HealthAndSafetyIcon sx={{ fontSize: 16, color: INFO }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: INFO }}>
            {spec.metaLine}
          </Typography>
        </Box>
      )}

      <Box
        data-contrato-grid-wrap
        sx={{
          height: scaledGridHeight,
          width: '100%',
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        <Box
          data-contrato-grid
          sx={{
            height: gridHeight,
            width: gridScale < 1 ? `${100 / gridScale}%` : '100%',
            maxWidth: gridScale < 1 ? `${100 / gridScale}%` : '100%',
            display: 'grid',
            gridTemplateColumns: gridCols,
            gridTemplateRows: rowHeights.join(' '),
            columnGap: 0,
            bgcolor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 2,
            transform: gridScale < 1 ? `scale(${gridScale})` : undefined,
            transformOrigin: 'top center',
            boxSizing: 'border-box',
          }}
        >
        {/* Abas coloridas */}
        <Box sx={{ gridColumn: 1, gridRow: tabRow, alignSelf: 'stretch', bgcolor: SURFACE }} />
        {cols.map((col, i) => (
          <Box key={col.id} sx={{ gridColumn: i + 2, gridRow: tabRow, minWidth: 0, alignSelf: 'stretch' }}>
            <PlanoTab
              key={`${col.id}-${col.operadoraId}-${logoUrls.get(col.operadoraId) ?? 'txt'}`}
              col={col}
              logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null}
              layout={layout}
            />
          </Box>
        ))}

        {/* Elegibilidade */}
        <Box sx={{ gridColumn: 1, gridRow: elegRow, display: 'flex', alignSelf: 'stretch' }}>
          <LegendCell icon={<BadgeOutlinedIcon />} label="Elegibilidade (base)" />
        </Box>
        {cols.map((col, i) => (
          <Box key={`el-${col.id}`} sx={{ gridColumn: i + 2, gridRow: elegRow, minWidth: 0 }}>
            <DataCell h={elegH} compact={cellCompact}>
              <ElegibilidadeCell col={col} />
            </DataCell>
          </Box>
        ))}

        {/* Contribuição */}
        {spec.showContrib && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: contribRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<PaymentsIcon />} label="Contribuição" />
            </Box>
            {cols.map((col, i) => (
              <Box key={`ct-${col.id}`} sx={{ gridColumn: i + 2, gridRow: contribRow, minWidth: 0 }}>
                <DataCell h={ROW_CONTRIB} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 8.5, fontWeight: 600, color: PRIMARY, textAlign: 'center', lineHeight: 1.25 }}>
                    {col.contribuicao}
                  </Typography>
                </DataCell>
              </Box>
            ))}

          </>
        )}

        {/* Coparticipação */}
        {spec.showCopart && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: copartRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<HealthAndSafetyIcon />} label="Coparticipação" />
            </Box>
            {cols.map((col, i) => (
              <Box key={`cp-${col.id}`} sx={{ gridColumn: i + 2, gridRow: copartRow, minWidth: 0 }}>
                <DataCell h={ROW_COPART} compact={cellCompact}>
                  <CopartCell col={col} />
                </DataCell>
              </Box>
            ))}

          </>
        )}

        {/* Vidas */}
        <Box sx={{ gridColumn: 1, gridRow: vidasRow, display: 'flex', alignSelf: 'stretch' }}>
          <LegendCell icon={<GroupsIcon />} label="Vidas ativas" />
        </Box>
        {cols.map((col, i) => (
          <Box key={`vd-${col.id}`} sx={{ gridColumn: i + 2, gridRow: vidasRow, minWidth: 0 }}>
            <DataCell h={ROW_VIDAS} compact={cellCompact}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, justifyContent: 'center', width: '100%' }}>
                <SlideText sx={{ fontSize: 18, fontWeight: 800, color: col.tabColor }}>
                  {col.vidas}
                </SlideText>
                <SlideText sx={{ fontSize: 8, color: MUTED }}>ativos</SlideText>
              </Box>
            </DataCell>
          </Box>
        ))}

        {/* Per capita (quando há mistura com faixa) */}
        {perCapitaRow > 0 && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: perCapitaRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<MonetizationOnIcon />} label="Per capita" />
            </Box>
            {cols.map((col, i) => (
              <Box key={`pc-${col.id}`} sx={{ gridColumn: i + 2, gridRow: perCapitaRow, minWidth: 0 }}>
                <DataCell h={faixaRowH} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: layout.compact ? 8 : 9, fontWeight: 800, color: col.tipoCusto === 'per_capita' ? INFO : MUTED }}>
                    {col.tipoCusto === 'per_capita' ? (col.premioPerCapita ?? '—') : '—'}
                  </Typography>
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Seção faixas — título na legenda */}
        {faixaSectionRow > 0 && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: faixaSectionRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<MonetizationOnIcon />} label="Faixas etárias" accent={INFO} />
            </Box>
            {cols.map((col, i) => (
              <Box
                key={`fs-${col.id}`}
                sx={{
                  gridColumn: i + 2,
                  gridRow: faixaSectionRow,
                  minHeight: FAIXA_SECTION_H,
                  minWidth: 0,
                  borderBottom: `1px solid ${BORDER}`,
                  borderRight: `1px solid ${BORDER}`,
                  bgcolor: `${col.tabColor}0d`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, color: col.tabColor, letterSpacing: 0.4 }}>
                  PRÊMIO POR FAIXA
                </Typography>
              </Box>
            ))}
          </>
        )}

        {/* Linhas de faixa — mesma linha entre planos */}
        {matrix?.rows.map((fxRow, idx) => {
          const gridRow = faixaStartRow + idx
          return (
            <React.Fragment key={fxRow.key}>
              <Box sx={{ gridColumn: 1, gridRow, alignSelf: 'stretch' }}>
                <FaixaLegendLabel text={fxRow.labelDisplay} h={faixaRowH} />
              </Box>
              {cols.map((col, i) => {
                const cell = col.tipoCusto === 'faixa_etaria' ? matrix.getCell(col.id, fxRow.key) : null
                return (
                  <Box key={`${col.id}-${fxRow.key}`} sx={{ gridColumn: i + 2, gridRow, minWidth: 0 }}>
                    <DataCell h={faixaRowH} zebra={idx} compact={cellCompact} clip>
                      {cell ? (
                        <FaixaPremioCell cell={cell} accent={col.tabColor} layout={layout} dense={cellCompact} />
                      ) : (
                        <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED }}>—</Typography>
                      )}
                    </DataCell>
                  </Box>
                )
              })}
            </React.Fragment>
          )
        })}

        {/* Per capita clássico (sem faixa) */}
        {!spec.useFaixa && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: premioRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<MonetizationOnIcon />} label="Prêmio per capita" accent={INFO} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`pr-${col.id}`} sx={{ gridColumn: i + 2, gridRow: premioRow, minWidth: 0 }}>
                <DataCell h={40} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: INFO }}>
                    {col.premioPerCapita ?? '—'}
                  </Typography>
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Rodapé por plano — total na coluna */}
        <Box sx={{ gridColumn: 1, gridRow: spec.useFaixa ? footerRow : classicFooterRow, bgcolor: SURFACE, borderRight: `1px solid ${BORDER}` }} />
        {cols.map((col, i) => (
          <Box key={`ft-${col.id}`} sx={{ gridColumn: i + 2, gridRow: spec.useFaixa ? footerRow : classicFooterRow, minWidth: 0 }}>
            <PlanoFooter col={col} />
          </Box>
        ))}
        </Box>
      </Box>

      <TotalConsolidadoBar page={page} layout={layout} />
    </Paper>
  )
}

function ContratoAtualSlide({
  resumo,
  pageIndex,
  logoUrls,
  layout,
}: {
  resumo: ContratoAtualResumo
  pageIndex: number
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
}) {
  const page = resumo.pages[pageIndex]
  if (!page) return null

  return (
    <Box
      data-slide-inner
      data-page-index={pageIndex}
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
          minHeight: 60,
          maxHeight: 60,
          background: `linear-gradient(90deg, ${PRIMARY} 0%, ${INFO} 50%, ${SLIDE_COLORS.infoLight} 100%)`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DescriptionIcon sx={{ fontSize: 22, color: WHITE }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: WHITE, lineHeight: 1.05 }}>
            Contrato Atual
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.88)' }}>
            Comparativo de planos · apresentação ao cliente
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', px: 1.5, pt: 1, pb: 0.5, overflow: 'hidden' }}>
        <ComparativoGrid page={page} logoUrls={logoUrls} layout={layout} />
      </Box>

      {page.totalPages > 1 && (
        <Box
          sx={{
            flexShrink: 0,
            height: 28,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: `1px solid ${BORDER}`,
            bgcolor: SURFACE,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 10, color: MUTED, fontWeight: 600 }}>
            Página {page.pageIndex + 1} de {page.totalPages}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export function ContratoAtualDashboard({ cotacaoId, disabled }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const exportRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ContratoAtualResumo | null>(null)
  const [planosPorSlide, setPlanosPorSlide] = useState<ContratoAtualPlanosPorSlide>(3)
  const [pageIndex, setPageIndex] = useState(0)
  const [slideReady, setSlideReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())
  const [idsComLogo, setIdsComLogo] = useState<Set<string>>(new Set())

  const layout = useMemo(() => getContratoAtualLayoutSpec(planosPorSlide), [planosPorSlide])

  const pagesExibidas = useMemo(() => {
    if (!resumo?.allColunas.length) return []
    return buildContratoAtualPages(resumo.allColunas, planosPorSlide)
  }, [resumo?.allColunas, planosPorSlide])

  useEffect(() => {
    setPageIndex(0)
  }, [planosPorSlide, resumo?.allColunas.length])

  useEffect(() => {
    if (pageIndex >= pagesExibidas.length && pagesExibidas.length > 0) {
      setPageIndex(pagesExibidas.length - 1)
    }
  }, [pageIndex, pagesExibidas.length])

  const loadLogosForPage = useCallback(
    async (page: ContratoAtualPagina | undefined, comLogo: Set<string>) => {
      if (!page) return
      const ids = page.colunas.map((c) => c.operadoraId).filter(Boolean)
      const urls = await loadOperadoraLogoObjectUrls(ids, comLogo)
      setLogoUrls((prev) => {
        revokeOperadoraLogoUrls(prev)
        return urls
      })
    },
    []
  )

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    setSlideReady(false)
    setErrorMsg(null)
    try {
      const [cotacao, benResp] = await Promise.all([
        api.get(`/placement/cotacoes/${cotacaoId}`) as Promise<Record<string, unknown>>,
        api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`) as Promise<{
          beneficiarios?: PlacementBeneficiario[]
        }>,
      ])
      const list = benResp?.beneficiarios ?? []
      const opMap = new Map(operadoras.map((o) => [o.id, o.nome]))
      const computed = computeContratoAtualResumo(cotacao, list, opMap)
      if (computed.pages.every((p) => p.colunas.length === 0)) {
        setResumo(null)
        setErrorMsg(
          'Cadastre os planos do contrato vigente (Contrato e apólice) ou importe beneficiários com plano, cargo e custo na etapa 1.'
        )
        return
      }
      setResumo(computed)
      setPageIndex(0)
      const comLogo = await fetchOperadoraIdsComLogo()
      setIdsComLogo(comLogo)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar dados do contrato.')
      setResumo(null)
    } finally {
      setLoading(false)
    }
  }, [cotacaoId, operadoras, loadLogosForPage])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!pagesExibidas.length) return
    const page = pagesExibidas[pageIndex]
    void loadLogosForPage(page, idsComLogo)
  }, [pagesExibidas, pageIndex, idsComLogo, loadLogosForPage])

  useEffect(() => {
    return () => revokeOperadoraLogoUrls(logoUrls)
  }, [logoUrls])

  useEffect(() => {
    if (!pagesExibidas.length) {
      setSlideReady(false)
      return
    }
    const t = window.setTimeout(() => setSlideReady(true), 500)
    return () => window.clearTimeout(t)
  }, [pagesExibidas, pageIndex, logoUrls, planosPorSlide])

  async function exportSlideElement(el: HTMLElement, filename: string) {
    const root = el.closest('[data-export-root]') as HTMLElement | null
    const prevRootWidth = root?.style.width ?? ''
    const prevRootMaxWidth = root?.style.maxWidth ?? ''

    if (root) {
      root.style.width = `${SLIDE_W}px`
      root.style.maxWidth = `${SLIDE_W}px`
    }

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: SLIDE_W,
        height: SLIDE_H,
        windowWidth: SLIDE_W,
        windowHeight: SLIDE_H,
        onclone: (doc) => {
          const cloneRoot = doc.querySelector('[data-export-root]') as HTMLElement | null
          const slide = doc.querySelector('[data-slide-inner]') as HTMLElement | null
          if (cloneRoot) {
            cloneRoot.style.width = `${SLIDE_W}px`
            cloneRoot.style.maxWidth = `${SLIDE_W}px`
            cloneRoot.style.height = `${SLIDE_H}px`
          }
          if (slide) {
            slide.style.width = `${SLIDE_W}px`
            slide.style.height = `${SLIDE_H}px`
            slide.style.maxHeight = `${SLIDE_H}px`
            slide.style.maxWidth = `${SLIDE_W}px`
            slide.style.overflow = 'hidden'
          }
          applyContratoSlideExportFixes(doc)
        },
      })
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      if (root) {
        root.style.width = prevRootWidth
        root.style.maxWidth = prevRootMaxWidth
      }
    }
  }

  async function handleExportPng() {
    if (!exportRef.current) return
    setExporting(true)
    setErrorMsg(null)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 900))
      const slide = exportRef.current.querySelector('[data-slide-inner]') as HTMLElement | null
      if (!slide) throw new Error('slide missing')
      const suffix = pagesExibidas.length > 1 ? `-p${pageIndex + 1}` : ''
      await exportSlideElement(slide, `contrato-atual-${cotacaoId.slice(0, 8)}${suffix}.png`)
    } catch {
      setErrorMsg('Não foi possível gerar o slide. Aguarde o carregamento e tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportAllPages() {
    if (!pagesExibidas.length || pagesExibidas.length <= 1) {
      void handleExportPng()
      return
    }
    setExporting(true)
    setErrorMsg(null)
    const prev = pageIndex
    try {
      for (let i = 0; i < pagesExibidas.length; i++) {
        setPageIndex(i)
        await new Promise((r) => setTimeout(r, 600))
        const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
        if (slide) {
          await exportSlideElement(slide, `contrato-atual-${cotacaoId.slice(0, 8)}-p${i + 1}.png`)
        }
      }
    } catch {
      setErrorMsg('Erro ao exportar uma ou mais páginas.')
    } finally {
      setPageIndex(prev)
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
    return <Alert severity="warning">{errorMsg ?? 'Sem dados para o contrato atual.'}</Alert>
  }

  const totalPages = pagesExibidas.length

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <SlideshowIcon sx={{ color: INFO, fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            Comparativo por plano — ajuste quantos planos cabem no slide.
          </Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="contrato-planos-slide">Planos/slide</InputLabel>
            <Select
              labelId="contrato-planos-slide"
              label="Planos/slide"
              value={planosPorSlide}
              onChange={(e) => setPlanosPorSlide(Number(e.target.value) as ContratoAtualPlanosPorSlide)}
              disabled={exporting}
            >
              {CONTRATO_ATUAL_PLANOS_POR_SLIDE_OPCOES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {resumo && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT }}>
              {resumo.allColunas.length} plano{resumo.allColunas.length !== 1 ? 's' : ''} no contrato
              {totalPages > 1
                ? ` · ${totalPages} slides (use as setas ou exporte todas as páginas)`
                : null}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {totalPages > 1 && (
            <>
              <IconButton
                size="small"
                disabled={pageIndex <= 0 || exporting}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="caption" sx={{ fontFamily: FONT, fontWeight: 700 }}>
                {pageIndex + 1} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                disabled={pageIndex >= totalPages - 1 || exporting}
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}
          <Button
            size="small"
            variant="contained"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={disabled || exporting || !slideReady}
            onClick={() => void handleExportPng()}
            sx={{ bgcolor: INFO, fontFamily: FONT, '&:hover': { bgcolor: PRIMARY } }}
          >
            {exporting ? 'Gerando…' : 'Baixar página (PNG)'}
          </Button>
          {totalPages > 1 && (
            <Button
              size="small"
              variant="outlined"
              disabled={disabled || exporting || !slideReady}
              onClick={() => void handleExportAllPages()}
              sx={{ fontFamily: FONT }}
            >
              Baixar todas
            </Button>
          )}
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <Box
          ref={exportRef}
          data-export-root
          sx={{ width: SLIDE_W, maxWidth: '100%', flexShrink: 0 }}
        >
          <ContratoAtualSlide
            resumo={{ ...resumo, pages: pagesExibidas }}
            pageIndex={pageIndex}
            logoUrls={logoUrls}
            layout={layout}
          />
        </Box>
      </Box>
    </Box>
  )
}
