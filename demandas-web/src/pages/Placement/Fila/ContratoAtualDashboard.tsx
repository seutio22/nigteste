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
import { CoparticipacaoSelo } from './CoparticipacaoSelo'
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
  contratoPageFromColunas,
  custoMedioColuna,
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
  getContratoAtualWorkspaceLayoutSpec,
  getContratoTypography,
  planosPorSlideFromCount,
  type ContratoAtualLayoutSpec,
  type ContratoAtualPlanosPorSlide,
  type ContratoGridTypography,
} from './placementContratoAtualLayout'
import { applyContratoSlideExportFixes } from './placementContratoAtualExport'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'
import type { PlacementPresentationMode } from './placementAnaliseBase'
import type { ComparativoLinhaChave } from './placementComparativoVisibilidade'
import { linhasOcultasSet } from './placementComparativoVisibilidade'
import {
  buildConsolidadoForContratoPage,
  buildComparativoOperadoraConsolidadoPage,
  aggregateContratoColunasPorCenario,
  buildConsolidadoLinhas,
  buildOperadoraSlotsFromColunas,
  alignPageToOperadoraSlots,
  colunaSlotKey,
  type ComparativoColunaEstudo,
  type ComparativoConsolidadoLinha,
} from './placementComparativoEstudo'
import { enrichColunasOperadoraGlobal } from './placementComparativoVariacao'

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
/** Painel único fatura + variação no comparativo de propostas (px). */
const COMPARATIVO_FATURA_PANEL = 100
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

export type ComparativoExibicao = 'plano_completo' | 'consolidado_financeiro'

export type ContratoAtualLayoutOrientacao = 'horizontal' | 'vertical'

type Props = {
  cotacaoId: string
  disabled?: boolean
  /** Quando informado, não busca contrato na API (ex.: comparativo de propostas). */
  resumoOverride?: ContratoAtualResumo | null
  slideTitle?: string
  slideSubtitle?: string
  exportFilePrefix?: string
  emptyMessage?: string
  /** Sincroniza planos/slide com config externa (ex.: comparativo). */
  initialPlanosPorSlide?: ContratoAtualPlanosPorSlide
  /** Oculta seletor de planos/slide quando embutido em outro painel. */
  hideLayoutControls?: boolean
  presentationMode?: PlacementPresentationMode
  linhasOcultas?: ComparativoLinhaChave[]
  /** Colunas do estudo comparativo — habilita consolidado financeiro integrado abaixo da fatura. */
  colunasEstudo?: ComparativoColunaEstudo[]
  notasConsolidado?: string
  /** consolidado_financeiro: só cabeçalho das colunas + fatura + consolidado (padrão). plano_completo: grid detalhado. */
  exibicaoComparativo?: ComparativoExibicao
  /** Compacta a linha de vidas na legenda do custo. */
  vidasColunaUnica?: boolean
  /** Custo médio ou custo total do plano na linha de custo. */
  custoPlanoExibicao?: 'medio' | 'total'
  /**
   * Orientação controlada (ex.: comparativo). Sem valor, o dashboard gerencia localmente.
   * horizontal = colunas lado a lado; vertical = blocos empilhados por grupo/página.
   */
  layoutOrientacao?: ContratoAtualLayoutOrientacao
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

function LegendCell({
  icon,
  label,
  detail,
  accent,
  typo,
}: {
  icon: React.ReactNode
  label: string
  /** Linha auxiliar (ex.: «105 vidas» quando a linha de vidas foi omitida). */
  detail?: string
  accent?: string
  typo?: ContratoGridTypography
}) {
  const legendSize = typo?.legend ?? 9.5
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
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.1 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: legendSize, fontWeight: 700, color: PRIMARY, lineHeight: 1.15 }}>
          {label}
        </Typography>
        {detail ? (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: Math.max(8, legendSize - 0.5),
              fontWeight: 700,
              color: MUTED,
              lineHeight: 1.1,
            }}
          >
            {detail}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function FaixaLegendLabel({ text, h, typo }: { text: string; h: number; typo?: ContratoGridTypography }) {
  const labelSize = typo?.faixaLabel ?? 8
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
      <SlideText sx={{ fontSize: labelSize, fontWeight: 700, color: PRIMARY }}>{text}</SlideText>
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

function ElegibilidadeCell({ col, typo }: { col: ContratoPlanoColuna; typo: ContratoGridTypography }) {
  const linhas = col.elegibilidadeLinhas.filter(Boolean)
  if (linhas.length === 0) {
    const txt = col.elegibilidade.trim()
    return (
      <SlideText
        sx={{
          fontSize: typo.body,
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
            fontSize: typo.chip,
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
        <Typography sx={{ fontFamily: FONT, fontSize: typo.micro, color: MUTED, width: '100%', textAlign: 'center' }}>
          +{rest}
        </Typography>
      )}
    </Box>
  )
}

function CopartCell({ col, typo }: { col: ContratoPlanoColuna; typo: ContratoGridTypography }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <CoparticipacaoSelo
        valor={col.coparticipacao}
        temCoparticipacao={col.temCoparticipacao}
        fontSize={typo.copart}
      />
    </Box>
  )
}

function FaixaPremioCell({
  cell,
  accent,
  layout,
  dense,
  showSubtotal = false,
}: {
  cell: FaixaMatrixCell
  accent: string
  layout: ContratoAtualLayoutSpec
  dense?: boolean
  showSubtotal?: boolean
}) {
  const tight = dense ?? layout.compact
  const vidasLabel = cell.vidas === 1 ? 'vida' : 'vidas'
  const vidasText = tight ? `${cell.vidas}v` : `${cell.vidas} ${vidasLabel}`
  const showSub = showSubtotal && cell.subtotal !== '—'

  if (showSub) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.15,
          overflow: 'hidden',
          px: tight ? 0.15 : 0.25,
        }}
      >
        <SlideText
          sx={{
            fontSize: layout.faixaCustoFont,
            fontWeight: 800,
            color: INFO,
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {cell.custo}
          {cell.vidas > 0 && (
            <Box component="span" sx={{ fontSize: layout.faixaVidasFont, fontWeight: 600, color: accent, ml: 0.35 }}>
              · {vidasText}
            </Box>
          )}
        </SlideText>
        <SlideText
          sx={{
            fontSize: Math.max(7.5, layout.faixaCustoFont * 0.88),
            fontWeight: 700,
            color: PRIMARY,
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {cell.subtotal}
        </SlideText>
      </Box>
    )
  }

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
  omitOperadora = false,
}: {
  col: ContratoPlanoColuna
  logoUrl?: string | null
  layout: ContratoAtualLayoutSpec
  /** Em seções empilhadas: só plano, sem logo/nome do fornecedor. */
  omitOperadora?: boolean
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = !omitOperadora && Boolean(logoUrl) && !logoFailed
  const typo = getContratoTypography(layout)
  const tabH = omitOperadora ? layout.tabH : layout.tabH + layout.logoWellH

  return (
    <Box
      sx={{
        borderRadius: omitOperadora ? 0 : '14px 14px 0 0',
        overflow: 'hidden',
        borderRight: `1px solid ${BORDER}`,
        borderTop: `1px solid ${BORDER}`,
        borderLeft: `1px solid ${BORDER}`,
        borderBottom: 'none',
        minHeight: tabH,
        height: tabH,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {!omitOperadora && (
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
                fontSize: typo.tabOperadora,
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
      )}
      <Box
        sx={{
          flex: 1,
          py: layout.compact ? 0.65 : 0.85,
          px: 0.65,
          background: `linear-gradient(180deg, ${col.tabColor}22 0%, ${col.tabColor}10 55%, ${WHITE} 100%)`,
          borderTop: `3px solid ${col.tabColor}`,
          color: PRIMARY,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.35,
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
            bgcolor: `${col.tabColor}18`,
          },
        }}
      >
        {!omitOperadora && (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabProduto,
              fontWeight: 600,
              color: INFO,
              letterSpacing: 0.4,
              position: 'relative',
            }}
          >
            {col.produto.toUpperCase()}
          </Typography>
        )}
        {!omitOperadora && col.grupo && (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabGrupo,
              fontWeight: 800,
              color: col.tabColor,
              letterSpacing: 0.6,
              position: 'relative',
            }}
          >
            {col.grupo === 'atual' ? '● ATUAL' : '● MERCADO'}
          </Typography>
        )}
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: typo.tabPlano,
            fontWeight: 800,
            color: PRIMARY,
            lineHeight: 1.15,
            position: 'relative',
          }}
        >
          {col.planoLabel}
        </Typography>
        {col.acomodacao ? (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabAcomodacao,
              fontWeight: 600,
              color: MUTED,
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
  const typo = getContratoTypography(layout)
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
        <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarTitle, fontWeight: 800, color: PRIMARY, lineHeight: 1.15 }}>
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
        <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarMeta, color: MUTED, fontWeight: 600 }}>
          Soma de {n} plano{n > 1 ? 's' : ''} nesta página
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarLabel, color: MUTED, fontWeight: 700 }}>
              VIDAS
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarValue, fontWeight: 800, color: PRIMARY, lineHeight: 1 }}>
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
            <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarLabel, color: MUTED, fontWeight: 700 }}>
              FATURA ESTIMADA
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: typo.totalBarValue, fontWeight: 800, color: INFO, lineHeight: 1 }}>
              {page.totalFatura}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/** Rodapé do plano: total integrado à coluna, cor da aba */
function PlanoFooter({
  col,
  modoComparativoPropostas = false,
  layout,
}: {
  col: ContratoPlanoColuna
  modoComparativoPropostas?: boolean
  layout?: ContratoAtualLayoutSpec
}) {
  const typo = layout ? getContratoTypography(layout) : getContratoTypography(getContratoAtualLayoutSpec(3))
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
        gap: 0.35,
        boxSizing: 'border-box',
        overflow: 'hidden',
        px: 0.5,
      }}
    >
      <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, color: MUTED, fontWeight: 700, letterSpacing: 0.3 }}>
        FATURA MENSAL ESTIMADA
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaValue, fontWeight: 800, color: PRIMARY, lineHeight: 1 }}>
        {col.faturaEstimada}
      </Typography>
      {!modoComparativoPropostas && (
        <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, color: MUTED, fontWeight: 600 }}>
          {col.vidas} vidas ativas
        </Typography>
      )}
    </Box>
  )
}

/** Painel fatura + variação — comparativo de propostas (substitui o rodapé do grid). */
function VariacaoComparativoPanel({
  page,
  layout,
  anexarConsolidado = false,
}: {
  page: ContratoAtualPagina
  layout: ContratoAtualLayoutSpec
  anexarConsolidado?: boolean
  /** @deprecated mantido só por compatibilidade nas chamadas. */
  vidasColunaUnica?: boolean
}) {
  const cols = page.colunas
  const typo = getContratoTypography(layout)
  if (!cols.some((c) => c.variacao)) return null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${layout.legendW}px repeat(${cols.length}, minmax(0, 1fr))`,
        columnGap: 0,
        flexShrink: 0,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: anexarConsolidado ? 'none' : `1px solid ${BORDER}`,
        borderRadius: anexarConsolidado ? 0 : '0 0 8px 8px',
        overflow: 'hidden',
        bgcolor: SURFACE,
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 1,
          minHeight: COMPARATIVO_FATURA_PANEL,
          borderRight: `1px solid ${BORDER}`,
          bgcolor: SURFACE,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          boxSizing: 'border-box',
        }}
      >
        <MonetizationOnIcon sx={{ fontSize: 16, color: INFO, flexShrink: 0 }} />
        <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, fontWeight: 800, color: PRIMARY, lineHeight: 1.25 }}>
          Fatura mensal estimada
          <br />
          <span style={{ fontWeight: 600, color: MUTED }}>Variação vs cenário base (demais colunas)</span>
        </Typography>
      </Box>
      {cols.map((col) => {
        const v = col.variacao
        const isRef = v?.isReferencia
        const accent = isRef ? PRIMARY : v?.economia ? '#1b8a5a' : v?.neutro ? MUTED : '#c62828'
        const bg = isRef
          ? `${PRIMARY}10`
          : v?.economia
            ? '#e8f5e9'
            : v?.neutro
              ? WHITE
              : '#ffebee'

        return (
          <Box
            key={`var-${col.id}`}
            sx={{
              minHeight: COMPARATIVO_FATURA_PANEL,
              py: 0.75,
              px: 0.5,
              borderRight: `1px solid ${BORDER}`,
              borderTop: `3px solid ${isRef ? PRIMARY : col.tabColor}`,
              bgcolor: bg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.3,
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: typo.faturaMicro,
                color: MUTED,
                fontWeight: 700,
                letterSpacing: 0.3,
                lineHeight: 1,
              }}
            >
              FATURA MENSAL ESTIMADA
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaValue, fontWeight: 800, color: PRIMARY, lineHeight: 1.1 }}>
              {col.faturaEstimada}
            </Typography>
            {isRef ? (
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 800, color: PRIMARY, mt: 0.25 }}>
                Cenário base
              </Typography>
            ) : v?.variacaoPct && !v.neutro ? (
              <>
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaVarPct, fontWeight: 800, color: accent, lineHeight: 1.1, mt: 0.15 }}>
                  {v.variacaoPct}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaVarDetail, fontWeight: 700, color: accent, lineHeight: 1.2 }}>
                  {v.economia ? 'Economia' : 'Acréscimo'} · {v.impactoMensal ?? '—'}/mês
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaVarDetail, fontWeight: 600, color: accent, opacity: 0.9, lineHeight: 1.1 }}>
                  {v.impactoAnual ?? '—'}/ano
                </Typography>
              </>
            ) : v && !v.isReferencia ? (
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 600, color: MUTED }}>
                Igual à base
              </Typography>
            ) : null}
          </Box>
        )
      })}
    </Box>
  )
}

const CONSOLIDADO_SECTION_BG = '#e8f4f0'
const CONSOLIDADO_RESULT_ECONOMY = '#1b8a5a'
const CONSOLIDADO_RESULT_INCREASE = '#c62828'

function consolidadoValorFontSize(
  linha: ComparativoConsolidadoLinha,
  typo: ContratoGridTypography
): number {
  if (linha.tipo === 'resultado') {
    return linha.id === 'res-pct' ? typo.faturaVarPct : typo.premio
  }
  if (linha.id === 'vidas') return typo.vidasNum
  return typo.faturaValue
}

function consolidadoLinhaAltura(
  linha: ComparativoConsolidadoLinha,
  layout: ContratoAtualLayoutSpec,
  cols: ContratoPlanoColuna[]
): number {
  const compacto = layout.compact || cols.length >= 4
  if (linha.tipo === 'section') return compacto ? 28 : 32
  if (linha.tipo === 'resultado') return compacto ? 38 : 44
  if (linha.id === 'vidas') return compacto ? 36 : 42
  return compacto ? 40 : 46
}

/** Linhas do consolidado financeiro — coluna a coluna, logo abaixo da fatura mensal estimada. */
function ConsolidadoFinanceiroIntegradoPanel({
  page,
  layout,
  linhas,
  linhasOcultas,
  notas,
  anexadoAoGrid = false,
  vidasColunaUnica = false,
}: {
  page: ContratoAtualPagina
  layout: ContratoAtualLayoutSpec
  linhas: ComparativoConsolidadoLinha[]
  linhasOcultas?: Set<ComparativoLinhaChave>
  notas?: string
  anexadoAoGrid?: boolean
  vidasColunaUnica?: boolean
}) {
  const cols = page.colunas
  const typo = getContratoTypography(layout)
  const ocultas = linhasOcultas ?? new Set<ComparativoLinhaChave>()
  const linhasVisiveis = linhas.filter((linha) => {
    if (vidasColunaUnica && linha.id === 'vidas') return false
    if (!ocultas.has('variacao_financeira')) return true
    return linha.tipo !== 'resultado' && linha.id !== 'sec-res'
  })
  if (!linhasVisiveis.length) return null

  const gridCols = `${layout.legendW}px repeat(${cols.length}, minmax(0, 1fr))`

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderTop: anexadoAoGrid ? `1px solid ${BORDER}` : 'none',
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        bgcolor: WHITE,
      }}
    >
      {linhasVisiveis.map((linha, rowIdx) => {
        const isSection = linha.tipo === 'section'
        const h = consolidadoLinhaAltura(linha, layout, cols)
        const isLast = rowIdx === linhasVisiveis.length - 1 && !notas

        if (isSection) {
          return (
            <Box
              key={linha.id}
              sx={{
                minHeight: h,
                px: 1.25,
                py: 0.5,
                bgcolor: CONSOLIDADO_SECTION_BG,
                borderTop: rowIdx === 0 ? `1px solid ${BORDER}` : 'none',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <SummarizeOutlinedIcon sx={{ fontSize: 16, color: INFO, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, fontWeight: 800, color: PRIMARY, letterSpacing: 0.4 }}>
                {linha.label}
              </Typography>
            </Box>
          )
        }

        return (
          <Box
            key={linha.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              minHeight: h,
              borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
            }}
          >
            <Box
              sx={{
                px: 1.25,
                py: 0.5,
                borderRight: `1px solid ${BORDER}`,
                bgcolor: SURFACE,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, fontWeight: 700, color: PRIMARY, lineHeight: 1.2 }}>
                {linha.label}
              </Typography>
            </Box>
            {cols.map((col, i) => {
              const val = linha.valores[i] ?? '—'
              const isResult = linha.tipo === 'resultado' && col.grupo === 'mercado'
              const economia = isResult && val.startsWith('-')
              const aumento = isResult && val !== '—' && !val.startsWith('-') && linha.id === 'res-pct'
              const accent = isResult
                ? economia
                  ? CONSOLIDADO_RESULT_ECONOMY
                  : aumento
                    ? CONSOLIDADO_RESULT_INCREASE
                    : PRIMARY
                : PRIMARY
              const valorFont = consolidadoValorFontSize(linha, typo)

              return (
                <Box
                  key={`${linha.id}-${col.id}`}
                  sx={{
                    py: 0.6,
                    px: 0.5,
                    borderRight: i < cols.length - 1 ? `1px solid ${BORDER}` : 'none',
                    bgcolor: isResult ? (economia ? '#e8f5e9' : aumento ? '#ffebee' : WHITE) : WHITE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: FONT,
                      fontSize: valorFont,
                      fontWeight: linha.tipo === 'resultado' || linha.id === 'mensal' || linha.id === 'anual' ? 800 : 700,
                      color: accent,
                      lineHeight: 1.1,
                    }}
                  >
                    {val}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )
      })}
      {notas && (
        <Box sx={{ px: 1.25, py: 0.75, borderTop: `1px solid ${BORDER}`, bgcolor: SURFACE }}>
          <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, color: INFO, lineHeight: 1.3 }}>
            {notas}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

/** Cabeçalho das colunas (operadora / plano) — usado no modo consolidado financeiro. */
function ComparativoCoparticipacaoRow({
  page,
  layout,
  unrestrictedLayout = false,
  ocultas,
}: {
  page: ContratoAtualPagina
  layout: ContratoAtualLayoutSpec
  unrestrictedLayout?: boolean
  ocultas: Set<ComparativoLinhaChave>
}) {
  if (ocultas.has('coparticipacao')) return null
  const cols = page.colunas
  const minColW = layout.minColWidth ?? 200
  const gridCols = unrestrictedLayout
    ? `${layout.legendW}px repeat(${cols.length}, minmax(${minColW}px, 1fr))`
    : `${layout.legendW}px repeat(${cols.length}, minmax(0, 1fr))`
  const typo = getContratoTypography(layout)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gridTemplateRows: `${ROW_COPART}px`,
        columnGap: 0,
        bgcolor: SURFACE,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        width: '100%',
        minWidth: unrestrictedLayout ? layout.legendW + cols.length * minColW : undefined,
      }}
    >
      <Box sx={{ gridColumn: 1, display: 'flex', alignSelf: 'stretch' }}>
        <LegendCell icon={<HealthAndSafetyIcon />} label="Coparticipação" typo={typo} />
      </Box>
      {cols.map((col, i) => (
        <Box key={`copart-bar-${col.id}`} sx={{ gridColumn: i + 2, minWidth: 0 }}>
          <DataCell h={ROW_COPART}>
            <CoparticipacaoSelo
              valor={col.coparticipacao}
              temCoparticipacao={col.temCoparticipacao}
              fontSize={typo.copart}
            />
          </DataCell>
        </Box>
      ))}
    </Box>
  )
}

function ComparativoColunasHeader({
  page,
  logoUrls,
  layout,
  unrestrictedLayout = false,
}: {
  page: ContratoAtualPagina
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
  unrestrictedLayout?: boolean
}) {
  const cols = page.colunas
  const tabRowH = layout.tabH + layout.logoWellH
  const minColW = layout.minColWidth ?? 200
  const gridCols = unrestrictedLayout
    ? `${layout.legendW}px repeat(${cols.length}, minmax(${minColW}px, 1fr))`
    : `${layout.legendW}px repeat(${cols.length}, minmax(0, 1fr))`

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gridTemplateRows: `${tabRowH}px`,
        columnGap: 0,
        bgcolor: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
        width: '100%',
        minWidth: unrestrictedLayout ? layout.legendW + cols.length * minColW : undefined,
      }}
    >
      <Box sx={{ gridColumn: 1, bgcolor: SURFACE, borderRight: `1px solid ${BORDER}` }} />
      {cols.map((col, i) => (
        <Box key={col.id} sx={{ gridColumn: i + 2, minWidth: 0, alignSelf: 'stretch' }}>
          <PlanoTab
            key={`${col.id}-${col.operadoraId}-${logoUrls.get(col.operadoraId) ?? 'txt'}`}
            col={col}
            logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null}
            layout={layout}
          />
        </Box>
      ))}
    </Box>
  )
}

function ComparativoGrid({
  page,
  logoUrls,
  layout,
  modoComparativoPropostas = false,
  linhasOcultas,
  unrestrictedLayout = false,
  colunasEstudo,
  notasConsolidado,
  exibicaoComparativo = 'plano_completo',
  embeddedInStack = false,
  omitFinanceiro = false,
  sectionLabel,
  stackPosition = 'only',
  vidasColunaUnica = false,
  omitirOperadoraNasSecoesEmpilhadas = false,
  custoPlanoExibicao = 'medio',
}: {
  page: ContratoAtualPagina
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
  modoComparativoPropostas?: boolean
  linhasOcultas?: Set<ComparativoLinhaChave>
  unrestrictedLayout?: boolean
  colunasEstudo?: ComparativoColunaEstudo[]
  notasConsolidado?: string
  exibicaoComparativo?: ComparativoExibicao
  /** Seção empilhada no mesmo quadro — sem Paper próprio. */
  embeddedInStack?: boolean
  omitFinanceiro?: boolean
  sectionLabel?: string
  stackPosition?: 'first' | 'middle' | 'last' | 'only'
  vidasColunaUnica?: boolean
  omitirOperadoraNasSecoesEmpilhadas?: boolean
  custoPlanoExibicao?: 'medio' | 'total'
}) {
  const ocultas = linhasOcultas ?? new Set<ComparativoLinhaChave>()
  const cols = page.colunas
  const omitOperadoraHeader =
    omitirOperadoraNasSecoesEmpilhadas &&
    embeddedInStack &&
    (stackPosition === 'middle' || stackPosition === 'last')
  /** Valor de vidas da seção (planos empilhados: cada bloco tem o seu). */
  const vidasUnicasValor = cols[0]?.vidas ?? 0
  /** Omite a linha de vidas e embute o número na legenda do custo (reduz linhas, sem buraco). */
  const compactarVidas = vidasColunaUnica
  const vidasLegendDetail = compactarVidas ? `${vidasUnicasValor} vidas` : undefined

  if (modoComparativoPropostas && exibicaoComparativo === 'consolidado_financeiro') {
    const consolidado = colunasEstudo?.length
      ? buildConsolidadoForContratoPage(colunasEstudo, cols.map((c) => c.id))
      : null
    const mostrarVariacao =
      !ocultas.has('variacao_financeira') && cols.some((c) => c.variacao)
    const mostrarConsolidado = !!consolidado?.linhas.length

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
          overflow: 'visible',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(0,37,97,0.06)',
        }}
      >
        <ComparativoColunasHeader
          page={page}
          logoUrls={logoUrls}
          layout={layout}
          unrestrictedLayout={unrestrictedLayout}
        />
        <ComparativoCoparticipacaoRow
          page={page}
          layout={layout}
          unrestrictedLayout={unrestrictedLayout}
          ocultas={ocultas}
        />
        {mostrarVariacao && (
          <VariacaoComparativoPanel
            page={page}
            layout={layout}
            anexarConsolidado={mostrarConsolidado}
            vidasColunaUnica={vidasColunaUnica}
          />
        )}
        {mostrarConsolidado && consolidado && (
          <ConsolidadoFinanceiroIntegradoPanel
            page={page}
            layout={layout}
            linhas={consolidado.linhas}
            linhasOcultas={ocultas}
            notas={notasConsolidado}
            anexadoAoGrid={!mostrarVariacao}
            vidasColunaUnica={vidasColunaUnica}
          />
        )}
      </Paper>
    )
  }

  const specBase = gridSpec(page)
  const ocultarFaixas = ocultas.has('faixas_etarias')
  const showCopartRow =
    !page.coparticipacaoUnica &&
    (modoComparativoPropostas
      ? !ocultas.has('coparticipacao')
      : specBase.showCopart && !ocultas.has('coparticipacao'))
  const spec = {
    ...specBase,
    showContrib: specBase.showContrib && !ocultas.has('contribuicao'),
    showCopart: showCopartRow,
    useFaixa: specBase.useFaixa && !ocultarFaixas,
    metaLine: (() => {
      const parts: string[] = []
      if (page.contribuicaoUnica && !ocultas.has('contribuicao')) parts.push(page.contribuicaoUnica)
      if (page.coparticipacaoUnica && !ocultas.has('coparticipacao')) {
        // Faixa do topo: resumo único (ex.: «Sem coparticipação»), alinhado ao contrato atual.
        parts.push(page.coparticipacaoUnica)
      }
      return parts.length ? parts.join('  ·  ') : null
    })(),
  }
  const exibirCustoMedio = !spec.useFaixa && specBase.useFaixa
  const exibirCustoTotal = !spec.useFaixa && custoPlanoExibicao === 'total'
  const premioRowLabel = exibirCustoTotal
    ? 'Custo total'
    : exibirCustoMedio
      ? 'Custo médio'
      : 'Prêmio per capita'
  const matrix = buildFaixaMatrixForPage(page)
  const visibleCols = cols.length
  const showElegibilidade = !modoComparativoPropostas
  const elegH = showElegibilidade
    ? Math.max(
        ROW_ELEG_MIN,
        Math.max(...cols.map((c) => (c.elegibilidadeLinhas.length > 2 ? 58 : ROW_ELEG_MIN)), ROW_ELEG_MIN)
      )
    : 0
  const tabRowH = omitOperadoraHeader ? layout.tabH : layout.tabH + layout.logoWellH
  const heightSpec = {
    useFaixa: spec.useFaixa,
    faixaRowCount: spec.useFaixa ? spec.faixaRowCount : 0,
    showContrib: spec.showContrib,
    showCopart: spec.showCopart,
    hasPerCapita: spec.useFaixa && spec.hasPerCapita,
    elegH,
  }
  const gridMaxHeight = unrestrictedLayout
    ? 8000
    : computeContratoGridMaxHeight({
        hasMetaLine: !!spec.metaLine,
        showPageIndicator: page.totalPages > 1,
      })
  const { faixaRowH, gridHeight: gridHeightFull, gridScale } = computeContratoGridLayout(
    layout,
    { ...heightSpec, elegH: showElegibilidade ? elegH : 0 },
    tabRowH,
    gridMaxHeight,
    showElegibilidade ? elegH : 0
  )
  const effectiveGridScale =
    unrestrictedLayout || (modoComparativoPropostas && exibicaoComparativo === 'plano_completo')
      ? 1
      : gridScale
  const faturaNoGrid = !modoComparativoPropostas
  const vidasHeightAdjust = compactarVidas ? ROW_VIDAS : 0
  const gridHeight =
    (faturaNoGrid ? gridHeightFull : gridHeightFull - ROW_FATURA) - vidasHeightAdjust
  const scaledGridHeight = unrestrictedLayout ? gridHeight : Math.ceil(gridHeight * effectiveGridScale)
  const cellCompact =
    unrestrictedLayout || (modoComparativoPropostas && exibicaoComparativo === 'plano_completo')
      ? false
      : layout.compact || cols.length >= 4
  const minColW = layout.minColWidth ?? 200
  const typo = getContratoTypography(layout)

  const gridCols = unrestrictedLayout
    ? `${layout.legendW}px repeat(${visibleCols}, minmax(${minColW}px, 1fr))`
    : `${layout.legendW}px repeat(${visibleCols}, minmax(0, 1fr))`
  const gridMinWidth = unrestrictedLayout ? layout.legendW + visibleCols * minColW : undefined

  const stackTopOpen = embeddedInStack && (stackPosition === 'middle' || stackPosition === 'last')
  const stackGridRadius = embeddedInStack ? 0 : modoComparativoPropostas ? '8px 8px 0 0' : 2

  let row = 1
  const tabRow = row++
  const elegRow = showElegibilidade ? row++ : 0
  const contribRow = spec.showContrib ? row++ : 0
  const copartRow = spec.showCopart ? row++ : 0
  const vidasRow = compactarVidas ? 0 : row++
  const perCapitaRow = spec.useFaixa && spec.hasPerCapita ? row++ : 0
  const faixaSectionRow = spec.useFaixa ? row++ : 0
  const faixaStartRow = spec.useFaixa ? row : 0
  const faixaEndRow = spec.useFaixa ? faixaStartRow + spec.faixaRowCount - 1 : 0
  const premioRow = !spec.useFaixa ? row++ : 0
  const footerRow = spec.useFaixa ? faixaEndRow + 1 : row++

  const rowHeights: string[] = [`${tabRowH}px`]
  if (showElegibilidade) rowHeights.push(`${elegH}px`)
  if (spec.showContrib) rowHeights.push(`${ROW_CONTRIB}px`)
  if (spec.showCopart) rowHeights.push(`${ROW_COPART}px`)
  if (!compactarVidas) rowHeights.push(`${ROW_VIDAS}px`)
  if (perCapitaRow) rowHeights.push(`${faixaRowH}px`)
  if (faixaSectionRow) rowHeights.push(`${FAIXA_SECTION_H}px`)
  if (spec.useFaixa) {
    for (let i = 0; i < spec.faixaRowCount; i++) rowHeights.push(`${faixaRowH}px`)
    if (faturaNoGrid) rowHeights.push(`${ROW_FATURA}px`)
  } else {
    rowHeights.push('40px')
    if (faturaNoGrid) rowHeights.push(`${ROW_FATURA}px`)
  }

  const financeiroBloco =
    !omitFinanceiro &&
    modoComparativoPropostas &&
    (() => {
      const consolidado = colunasEstudo?.length
        ? buildConsolidadoForContratoPage(
            colunasEstudo,
            page.colunas.map((c) => c.id)
          )
        : null
      const mostrarVariacao =
        !ocultas.has('variacao_financeira') && page.colunas.some((c) => c.variacao)
      const mostrarConsolidado = !!consolidado?.linhas.length

      return (
        <>
          {mostrarVariacao && (
            <VariacaoComparativoPanel
              page={page}
              layout={layout}
              anexarConsolidado={mostrarConsolidado}
              vidasColunaUnica={vidasColunaUnica}
            />
          )}
          {mostrarConsolidado && consolidado && (
            <ConsolidadoFinanceiroIntegradoPanel
              page={page}
              layout={layout}
              linhas={consolidado.linhas}
              linhasOcultas={ocultas}
              notas={notasConsolidado}
              anexadoAoGrid={!mostrarVariacao}
              vidasColunaUnica={vidasColunaUnica}
            />
          )}
        </>
      )
    })()

  const gridBody = (
    <>
      {spec.metaLine && !embeddedInStack && (
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
          <Typography sx={{ fontFamily: FONT, fontSize: typo.metaLine, fontWeight: 600, color: INFO }}>
            {spec.metaLine}
          </Typography>
        </Box>
      )}

      <Box
        data-contrato-grid-wrap
        sx={{
          height: scaledGridHeight,
          width: '100%',
          minWidth: gridMinWidth,
          flexShrink: 0,
          overflow: 'visible',
        }}
      >
        <Box
          data-contrato-grid
          sx={{
            height: gridHeight,
            width: effectiveGridScale < 1 ? `${100 / effectiveGridScale}%` : '100%',
            minWidth: gridMinWidth,
            maxWidth: effectiveGridScale < 1 ? `${100 / effectiveGridScale}%` : '100%',
            display: 'grid',
            gridTemplateColumns: gridCols,
            gridTemplateRows: rowHeights.join(' '),
            columnGap: 0,
            bgcolor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderTop: stackTopOpen ? 'none' : `1px solid ${BORDER}`,
            borderRadius: stackGridRadius,
            transform: effectiveGridScale < 1 ? `scale(${effectiveGridScale})` : undefined,
            transformOrigin: 'top left',
            boxSizing: 'border-box',
          }}
        >
        {/* Abas coloridas */}
        <Box
          sx={{
            gridColumn: 1,
            gridRow: tabRow,
            alignSelf: 'stretch',
            bgcolor: SURFACE,
            borderRight: `1px solid ${BORDER}`,
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: 1.25,
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          {sectionLabel ? (
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: typo.tabPlano,
                fontWeight: 800,
                color: PRIMARY,
                lineHeight: 1.2,
              }}
            >
              {sectionLabel}
            </Typography>
          ) : null}
        </Box>
        {cols.map((col, i) => (
          <Box key={col.id} sx={{ gridColumn: i + 2, gridRow: tabRow, minWidth: 0, alignSelf: 'stretch' }}>
            <PlanoTab
              key={`${col.id}-${col.operadoraId}-${logoUrls.get(col.operadoraId) ?? 'txt'}`}
              col={col}
              logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null}
              layout={layout}
              omitOperadora={omitOperadoraHeader}
            />
          </Box>
        ))}

        {/* Elegibilidade — omitida no comparativo de propostas */}
        {showElegibilidade && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: elegRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<BadgeOutlinedIcon />} label="Elegibilidade (base)" typo={typo} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`el-${col.id}`} sx={{ gridColumn: i + 2, gridRow: elegRow, minWidth: 0 }}>
                <DataCell h={elegH} compact={cellCompact}>
                  <ElegibilidadeCell col={col} typo={typo} />
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Contribuição */}
        {spec.showContrib && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: contribRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<PaymentsIcon />} label="Contribuição" typo={typo} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`ct-${col.id}`} sx={{ gridColumn: i + 2, gridRow: contribRow, minWidth: 0 }}>
                <DataCell h={ROW_CONTRIB} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: typo.contrib, fontWeight: 600, color: PRIMARY, textAlign: 'center', lineHeight: 1.25 }}>
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
              <LegendCell icon={<HealthAndSafetyIcon />} label="Coparticipação" typo={typo} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`cp-${col.id}`} sx={{ gridColumn: i + 2, gridRow: copartRow, minWidth: 0 }}>
                <DataCell h={ROW_COPART} compact={cellCompact}>
                  <CopartCell col={col} typo={typo} />
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Vidas por coluna — omitida quando compactarVidas (número vai na legenda do custo) */}
        {vidasRow > 0 && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: vidasRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<GroupsIcon />} label="Vidas ativas" typo={typo} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`vd-${col.id}`} sx={{ gridColumn: i + 2, gridRow: vidasRow, minWidth: 0 }}>
                <DataCell h={ROW_VIDAS} compact={cellCompact}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, justifyContent: 'center', width: '100%' }}>
                    <SlideText sx={{ fontSize: typo.vidasNum, fontWeight: 800, color: col.tabColor }}>
                      {col.vidas}
                    </SlideText>
                    <SlideText sx={{ fontSize: typo.vidasSuffix, color: MUTED }}>ativos</SlideText>
                  </Box>
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Per capita (quando há mistura com faixa) */}
        {perCapitaRow > 0 && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: perCapitaRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell icon={<MonetizationOnIcon />} label="Per capita" typo={typo} />
            </Box>
            {cols.map((col, i) => (
              <Box key={`pc-${col.id}`} sx={{ gridColumn: i + 2, gridRow: perCapitaRow, minWidth: 0 }}>
                <DataCell h={faixaRowH} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: typo.perCapita, fontWeight: 800, color: col.tipoCusto === 'per_capita' ? INFO : MUTED }}>
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
              <LegendCell
                icon={<MonetizationOnIcon />}
                label="Faixas etárias"
                detail={vidasLegendDetail}
                accent={INFO}
                typo={typo}
              />
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
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faixaSection, fontWeight: 700, color: col.tabColor, letterSpacing: 0.4 }}>
                  PRÊMIO POR FAIXA
                </Typography>
              </Box>
            ))}
          </>
        )}

        {/* Linhas de faixa — mesma linha entre planos */}
        {spec.useFaixa &&
          matrix?.rows.map((fxRow, idx) => {
          const gridRow = faixaStartRow + idx
          return (
            <React.Fragment key={fxRow.key}>
              <Box sx={{ gridColumn: 1, gridRow, alignSelf: 'stretch' }}>
                <FaixaLegendLabel text={fxRow.labelDisplay} h={faixaRowH} typo={typo} />
              </Box>
              {cols.map((col, i) => {
                const cell = col.tipoCusto === 'faixa_etaria' ? matrix.getCell(col.id, fxRow.key) : null
                return (
                  <Box key={`${col.id}-${fxRow.key}`} sx={{ gridColumn: i + 2, gridRow, minWidth: 0 }}>
                    <DataCell h={faixaRowH} zebra={idx} compact={cellCompact} clip>
                      {cell ? (
                        <FaixaPremioCell
                          cell={cell}
                          accent={col.tabColor}
                          layout={layout}
                          dense={cellCompact}
                          showSubtotal={modoComparativoPropostas}
                        />
                      ) : (
                        <Typography sx={{ fontFamily: FONT, fontSize: typo.dash, color: MUTED }}>—</Typography>
                      )}
                    </DataCell>
                  </Box>
                )
              })}
            </React.Fragment>
          )
        })}

        {/* Per capita / custo médio (quando faixas etárias estão ocultas) */}
        {!spec.useFaixa && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: premioRow, display: 'flex', alignSelf: 'stretch' }}>
              <LegendCell
                icon={<MonetizationOnIcon />}
                label={premioRowLabel}
                detail={vidasLegendDetail}
                accent={INFO}
                typo={typo}
              />
            </Box>
            {cols.map((col, i) => (
              <Box key={`pr-${col.id}`} sx={{ gridColumn: i + 2, gridRow: premioRow, minWidth: 0 }}>
                <DataCell h={40} compact={cellCompact}>
                  <Typography sx={{ fontFamily: FONT, fontSize: typo.premio, fontWeight: 800, color: INFO }}>
                    {exibirCustoTotal
                      ? col.faturaEstimada?.trim() || '—'
                      : custoMedioColuna(col) ?? '—'}
                  </Typography>
                </DataCell>
              </Box>
            ))}
          </>
        )}

        {/* Rodapé por plano — total na coluna (omitido no comparativo: painel unificado abaixo) */}
        {faturaNoGrid && (
          <>
            <Box sx={{ gridColumn: 1, gridRow: footerRow, bgcolor: SURFACE, borderRight: `1px solid ${BORDER}` }} />
            {cols.map((col, i) => (
              <Box key={`ft-${col.id}`} sx={{ gridColumn: i + 2, gridRow: footerRow, minWidth: 0 }}>
                <PlanoFooter col={col} modoComparativoPropostas={modoComparativoPropostas} layout={layout} />
              </Box>
            ))}
          </>
        )}
        </Box>
      </Box>

      {!modoComparativoPropostas && !embeddedInStack && <TotalConsolidadoBar page={page} layout={layout} />}
      {!embeddedInStack && financeiroBloco}
    </>
  )

  if (embeddedInStack || unrestrictedLayout) return gridBody

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
      {gridBody}
    </Paper>
  )
}

export function ComparativoPlanosEmpilhadosUnificado({
  resumo,
  colunasEstudo,
  logoUrls,
  layout,
  linhasOcultas,
  notasConsolidado,
  vidasColunaUnica = false,
  omitirOperadoraNasSecoesEmpilhadas = true,
  custoPlanoExibicao = 'medio',
}: {
  resumo: ContratoAtualResumo
  colunasEstudo: ComparativoColunaEstudo[]
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
  linhasOcultas?: ComparativoLinhaChave[]
  notasConsolidado?: string
  vidasColunaUnica?: boolean
  omitirOperadoraNasSecoesEmpilhadas?: boolean
  custoPlanoExibicao?: 'medio' | 'total'
}) {
  const ocultas = useMemo(() => linhasOcultasSet(linhasOcultas), [linhasOcultas])

  const slots = useMemo(
    () => buildOperadoraSlotsFromColunas(resumo.allColunas),
    [resumo.allColunas]
  )

  const alignedPages = useMemo(
    () => resumo.pages.map((p) => alignPageToOperadoraSlots(p, slots)),
    [resumo.pages, slots]
  )

  const financeiroPage = useMemo(() => {
    // Totais por cenário (não soma Sem COPAY + Com COPAY da mesma operadora).
    const aggCols = enrichColunasOperadoraGlobal(
      aggregateContratoColunasPorCenario(resumo.allColunas)
    )
    // Mesma ordem das colunas do quadro empilhado.
    const aligned = alignPageToOperadoraSlots(
      contratoPageFromColunas(aggCols, 0, 1, 'Total por cenário'),
      slots
    )
    return aligned
  }, [resumo.allColunas, slots])

  const consolidadoOperadora = useMemo(() => {
    const page = buildComparativoOperadoraConsolidadoPage(colunasEstudo)
    if (!page) return null
    // Alinha valores do consolidado à ordem das colunas do rodapé (slots / cenários).
    const byKey = new Map(page.colunas.map((c) => [colunaSlotKey(c), c]))
    const colunasAlinhadas: ComparativoColunaEstudo[] = financeiroPage.colunas.map((slotCol) => {
      const key = colunaSlotKey(slotCol)
      return (
        byKey.get(key) ?? {
          id: `empty-est-${key}`,
          grupo: slotCol.grupo ?? 'mercado',
          operadora: slotCol.operadora,
          planoLabel: slotCol.planoLabel,
          subtitulo: '—',
          reembolsoConsulta: '—',
          reembolso: '—',
          temReembolsoConsulta: false,
          acomodacao: '—',
          eventosReembolsaveis: '—',
          abrangencia: '—',
          coparticipacao: '—',
          tipoCusto: 'per_capita',
          vidas: 0,
          totalMensalCents: null,
          totalAnualCents: null,
          faixas: [],
          tabColor: slotCol.tabColor,
          planoReferenciaId: slotCol.id,
          planoReferenciaLabel: '—',
          cenarioId: slotCol.cenarioId,
          cenarioTitulo: slotCol.cenarioTitulo,
          cenarioOrdem: slotCol.cenarioOrdem,
        }
      )
    })
    const referencia = colunasAlinhadas.find((c) => c.grupo === 'atual')
    return {
      ...page,
      colunas: colunasAlinhadas,
      linhas: buildConsolidadoLinhas(colunasAlinhadas, referencia),
    }
  }, [colunasEstudo, financeiroPage.colunas])

  const mostrarVariacao =
    !ocultas.has('variacao_financeira') && financeiroPage.colunas.some((c) => c.variacao)
  const mostrarConsolidado = !!consolidadoOperadora?.linhas.length
  const totalSecoes = alignedPages.length

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
        overflow: 'visible',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(0,37,97,0.06)',
      }}
    >
      {alignedPages.map((page, idx) => {
        const stackPosition: 'first' | 'middle' | 'last' | 'only' =
          totalSecoes <= 1 ? 'only' : idx === 0 ? 'first' : idx === totalSecoes - 1 ? 'last' : 'middle'

        return (
          <ComparativoGrid
            key={`emp-unif-${idx}-${page.grupoLabel ?? idx}`}
            page={page}
            logoUrls={logoUrls}
            layout={layout}
            modoComparativoPropostas
            linhasOcultas={ocultas}
            unrestrictedLayout
            colunasEstudo={colunasEstudo}
            embeddedInStack
            omitFinanceiro
            stackPosition={stackPosition}
            vidasColunaUnica={vidasColunaUnica}
            omitirOperadoraNasSecoesEmpilhadas={omitirOperadoraNasSecoesEmpilhadas}
            custoPlanoExibicao={custoPlanoExibicao}
          />
        )
      })}

      {mostrarVariacao && (
        <VariacaoComparativoPanel
          page={financeiroPage}
          layout={layout}
          anexarConsolidado={mostrarConsolidado}
          vidasColunaUnica={vidasColunaUnica}
        />
      )}
      {mostrarConsolidado && consolidadoOperadora && (
        <ConsolidadoFinanceiroIntegradoPanel
          page={financeiroPage}
          layout={layout}
          linhas={consolidadoOperadora.linhas}
          linhasOcultas={ocultas}
          notas={notasConsolidado}
          anexadoAoGrid={!mostrarVariacao}
          vidasColunaUnica={vidasColunaUnica}
        />
      )}
    </Paper>
  )
}

function ResumoFinanceiroTodosPlanos({
  resumo,
  colunasEstudo,
  logoUrls,
  linhasOcultas,
  notasConsolidado,
  vidasColunaUnica = false,
}: {
  resumo: ContratoAtualResumo
  colunasEstudo: ComparativoColunaEstudo[]
  logoUrls: Map<string, string>
  linhasOcultas?: ComparativoLinhaChave[]
  notasConsolidado?: string
  vidasColunaUnica?: boolean
}) {
  const ocultas = useMemo(() => linhasOcultasSet(linhasOcultas), [linhasOcultas])

  const slots = useMemo(
    () => buildOperadoraSlotsFromColunas(resumo.allColunas),
    [resumo.allColunas]
  )

  const financeiroPage = useMemo(() => {
    const aggCols = enrichColunasOperadoraGlobal(
      aggregateContratoColunasPorCenario(resumo.allColunas)
    )
    return alignPageToOperadoraSlots(
      contratoPageFromColunas(aggCols, 0, 1, 'Todos os planos'),
      slots
    )
  }, [resumo.allColunas, slots])

  const consolidadoOperadora = useMemo(() => {
    const page = buildComparativoOperadoraConsolidadoPage(colunasEstudo)
    if (!page) return null
    const byKey = new Map(page.colunas.map((c) => [colunaSlotKey(c), c]))
    const colunasAlinhadas: ComparativoColunaEstudo[] = financeiroPage.colunas.map((slotCol) => {
      const key = colunaSlotKey(slotCol)
      return (
        byKey.get(key) ?? {
          id: `empty-est-${key}`,
          grupo: slotCol.grupo ?? 'mercado',
          operadora: slotCol.operadora,
          planoLabel: slotCol.planoLabel,
          subtitulo: '—',
          reembolsoConsulta: '—',
          reembolso: '—',
          temReembolsoConsulta: false,
          acomodacao: '—',
          eventosReembolsaveis: '—',
          abrangencia: '—',
          coparticipacao: '—',
          tipoCusto: 'per_capita',
          vidas: 0,
          totalMensalCents: null,
          totalAnualCents: null,
          faixas: [],
          tabColor: slotCol.tabColor,
          planoReferenciaId: slotCol.id,
          planoReferenciaLabel: '—',
          cenarioId: slotCol.cenarioId,
          cenarioTitulo: slotCol.cenarioTitulo,
          cenarioOrdem: slotCol.cenarioOrdem,
        }
      )
    })
    const referencia = colunasAlinhadas.find((c) => c.grupo === 'atual')
    return {
      ...page,
      colunas: colunasAlinhadas,
      linhas: buildConsolidadoLinhas(colunasAlinhadas, referencia),
    }
  }, [colunasEstudo, financeiroPage.colunas])

  const layout = useMemo(
    () => getContratoAtualWorkspaceLayoutSpec(Math.max(financeiroPage.colunas.length, 1)),
    [financeiroPage.colunas.length]
  )

  const mostrarVariacao =
    !ocultas.has('variacao_financeira') && financeiroPage.colunas.some((c) => c.variacao)
  const mostrarConsolidado = !!consolidadoOperadora?.linhas.length
  if (!mostrarVariacao && !mostrarConsolidado) return null

  return (
    <Box sx={{ width: '100%', mt: 0.5 }}>
      <ComparativoColunasHeader
        page={financeiroPage}
        logoUrls={logoUrls}
        layout={layout}
        unrestrictedLayout
      />
      {mostrarVariacao && (
        <VariacaoComparativoPanel
          page={financeiroPage}
          layout={layout}
          anexarConsolidado={mostrarConsolidado}
          vidasColunaUnica={vidasColunaUnica}
        />
      )}
      {mostrarConsolidado && consolidadoOperadora && (
        <ConsolidadoFinanceiroIntegradoPanel
          page={financeiroPage}
          layout={layout}
          linhas={consolidadoOperadora.linhas}
          linhasOcultas={ocultas}
          notas={notasConsolidado}
          anexadoAoGrid={!mostrarVariacao}
          vidasColunaUnica={vidasColunaUnica}
        />
      )}
    </Box>
  )
}

export function ContratoAtualSlide({
  resumo,
  pageIndex,
  logoUrls,
  layout,
  slideTitle = 'Contrato Atual',
  slideSubtitle = 'Comparativo de planos · apresentação ao cliente',
  modoComparativoPropostas = false,
  presentationMode = 'slide',
  linhasOcultas,
  colunasEstudo,
  notasConsolidado,
  exibicaoComparativo = 'plano_completo',
  hideSlideHeader = false,
  sectionLabel,
  hidePageFooter = false,
  vidasColunaUnica = false,
  custoPlanoExibicao = 'medio',
  omitFinanceiro = false,
}: {
  resumo: ContratoAtualResumo
  pageIndex: number
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
  slideTitle?: string
  slideSubtitle?: string
  modoComparativoPropostas?: boolean
  presentationMode?: PlacementPresentationMode
  linhasOcultas?: ComparativoLinhaChave[]
  colunasEstudo?: ComparativoColunaEstudo[]
  notasConsolidado?: string
  exibicaoComparativo?: ComparativoExibicao
  /** Oculta o cabeçalho gradiente (uso em blocos empilhados). */
  hideSlideHeader?: boolean
  /** Rótulo compacto quando o cabeçalho principal fica no topo da página. */
  sectionLabel?: string
  hidePageFooter?: boolean
  vidasColunaUnica?: boolean
  custoPlanoExibicao?: 'medio' | 'total'
  omitFinanceiro?: boolean
}) {
  const isPage = presentationMode === 'page'
  const isWorkspace = presentationMode === 'workspace'
  const isExpanded = isPage || isWorkspace
  const somenteConsolidado = exibicaoComparativo === 'consolidado_financeiro'
  const linhasOcultasSetMemo = useMemo(() => linhasOcultasSet(linhasOcultas), [linhasOcultas])
  const page = resumo.pages[pageIndex]
  if (!page) return null

  const subtitleLine =
    modoComparativoPropostas && page.grupoLabel && !hideSlideHeader
      ? `${page.grupoLabel} · todos os fornecedores · ${slideSubtitle}`
      : slideSubtitle

  const planoNoGrid = sectionLabel ?? page.grupoLabel

  return (
    <Box
      data-slide-inner={isExpanded ? undefined : true}
      data-page-index={pageIndex}
      sx={{
        fontFamily: FONT,
        width: '100%',
        maxWidth: isExpanded ? 'none' : SLIDE_W,
        minWidth: isWorkspace
          ? layout.legendW + page.colunas.length * (layout.minColWidth ?? 200)
          : undefined,
        height: isExpanded || somenteConsolidado ? 'auto' : SLIDE_H,
        maxHeight: isExpanded || somenteConsolidado ? 'none' : SLIDE_H,
        mx: isExpanded ? 0 : 'auto',
        overflow: isExpanded ? 'visible' : 'hidden',
        borderRadius: isExpanded ? 0 : 2,
        boxShadow: isExpanded ? 'none' : '0 12px 36px rgba(0,37,97,0.14)',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        boxSizing: 'border-box',
        mb: 0,
      }}
    >
      {!hideSlideHeader ? (
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
              {slideTitle}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 10, color: 'rgba(255,255,255,0.88)' }}>
              {subtitleLine}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', px: isExpanded ? 0 : 1.5, pt: isExpanded ? 0 : 1, pb: isExpanded ? 0 : 0.5, overflow: isExpanded ? 'visible' : 'hidden' }}>
        <ComparativoGrid
          page={page}
          logoUrls={logoUrls}
          layout={layout}
          modoComparativoPropostas={modoComparativoPropostas}
          linhasOcultas={linhasOcultasSetMemo}
          unrestrictedLayout={isExpanded && modoComparativoPropostas}
          colunasEstudo={colunasEstudo}
          notasConsolidado={notasConsolidado}
          exibicaoComparativo={exibicaoComparativo}
          vidasColunaUnica={vidasColunaUnica}
          custoPlanoExibicao={custoPlanoExibicao}
          sectionLabel={planoNoGrid}
          omitFinanceiro={omitFinanceiro}
        />
      </Box>

      {page.totalPages > 1 && !hidePageFooter && (
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

export function ContratoAtualDashboard({
  cotacaoId,
  disabled,
  resumoOverride,
  slideTitle,
  slideSubtitle,
  exportFilePrefix = 'contrato-atual',
  emptyMessage,
  initialPlanosPorSlide,
  hideLayoutControls,
  presentationMode = 'slide',
  linhasOcultas,
  colunasEstudo,
  notasConsolidado,
  exibicaoComparativo = 'plano_completo',
  vidasColunaUnica = false,
  custoPlanoExibicao = 'medio',
  layoutOrientacao: layoutOrientacaoProp,
}: Props) {
  const isPage = presentationMode === 'page'
  const isWorkspace = presentationMode === 'workspace'
  const isExpanded = isPage || isWorkspace
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const exportRef = useRef<HTMLDivElement>(null)
  const usesOverride = resumoOverride !== undefined
  const [loading, setLoading] = useState(!usesOverride)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ContratoAtualResumo | null>(
    usesOverride ? (resumoOverride ?? null) : null
  )
  const [planosPorSlide, setPlanosPorSlide] = useState<ContratoAtualPlanosPorSlide>(
    initialPlanosPorSlide ?? (isPage ? 5 : 3),
  )
  const [orientacaoLocal, setOrientacaoLocal] = useState<ContratoAtualLayoutOrientacao>('horizontal')
  const layoutOrientacao = layoutOrientacaoProp ?? orientacaoLocal
  const isVertical = layoutOrientacao === 'vertical'
  const [pageIndex, setPageIndex] = useState(0)
  const [slideReady, setSlideReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())
  const [idsComLogo, setIdsComLogo] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (initialPlanosPorSlide != null) setPlanosPorSlide(initialPlanosPorSlide)
  }, [initialPlanosPorSlide])

  useEffect(() => {
    if (layoutOrientacaoProp != null) setOrientacaoLocal(layoutOrientacaoProp)
  }, [layoutOrientacaoProp])

  /**
   * Vertical: um plano por bloco, empilhados com scroll.
   * - Comparativo (override): cada página já é um plano equivalente (ATUAL × mercado) — empilha essas páginas.
   * - Contrato atual: cada coluna é um plano — um bloco por coluna.
   * Horizontal expandido: todos os planos lado a lado num único bloco.
   */
  const pagesExibidas = useMemo(() => {
    if (!resumo?.allColunas.length) return []
    if (isVertical) {
      if (usesOverride && resumo.pages.length) return resumo.pages
      return resumo.allColunas.map((col, i) =>
        contratoPageFromColunas([col], i, resumo.allColunas.length, col.planoLabel)
      )
    }
    if (isExpanded) {
      return [contratoPageFromColunas(resumo.allColunas, 0, 1)]
    }
    if (usesOverride && resumo.pages.length) return resumo.pages
    return buildContratoAtualPages(resumo.allColunas, planosPorSlide)
  }, [resumo?.allColunas, resumo?.pages, planosPorSlide, usesOverride, isExpanded, isVertical])

  const layout = useMemo(() => {
    if (isVertical) {
      const maxCols = Math.max(...pagesExibidas.map((p) => p.colunas.length), 2)
      return isExpanded
        ? getContratoAtualWorkspaceLayoutSpec(maxCols)
        : getContratoAtualLayoutSpec(planosPorSlideFromCount(maxCols))
    }
    if (isExpanded) {
      const all =
        resumo?.allColunas.length ??
        pagesExibidas[0]?.colunas.length ??
        1
      return getContratoAtualWorkspaceLayoutSpec(all)
    }
    if (usesOverride) {
      const page = pagesExibidas[pageIndex] ?? pagesExibidas[0]
      return getContratoAtualLayoutSpec(planosPorSlideFromCount(page?.colunas.length ?? 3))
    }
    return getContratoAtualLayoutSpec(planosPorSlide)
  }, [
    usesOverride,
    pagesExibidas,
    pageIndex,
    planosPorSlide,
    isExpanded,
    isVertical,
    resumo?.allColunas.length,
  ])

  useEffect(() => {
    setPageIndex(0)
  }, [planosPorSlide, resumo?.allColunas.length, layoutOrientacao])

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

  useEffect(() => {
    if (resumoOverride === undefined) return
    setLoading(false)
    setErrorMsg(null)
    if (!resumoOverride?.allColunas.length) {
      setResumo(null)
      return
    }
    setResumo(resumoOverride)
    setPageIndex(0)
    void fetchOperadoraIdsComLogo().then(setIdsComLogo)
  }, [resumoOverride])

  const load = useCallback(async () => {
    if (usesOverride || !cotacaoId) return
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
  }, [cotacaoId, operadoras, loadLogosForPage, usesOverride])

  useEffect(() => {
    if (usesOverride) return
    void load()
  }, [load, usesOverride])

  useEffect(() => {
    if (!pagesExibidas.length) return
    if (isVertical || isExpanded) {
      const ids = pagesExibidas.flatMap((p) => p.colunas.map((c) => c.operadoraId).filter(Boolean))
      void loadOperadoraLogoObjectUrls(ids, idsComLogo).then((urls) => {
        setLogoUrls((prev) => {
          revokeOperadoraLogoUrls(prev)
          return urls
        })
      })
      return
    }
    const page = pagesExibidas[pageIndex]
    void loadLogosForPage(page, idsComLogo)
  }, [pagesExibidas, pageIndex, idsComLogo, loadLogosForPage, isVertical, isExpanded])

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
      await exportSlideElement(slide, `${exportFilePrefix}-${cotacaoId.slice(0, 8)}${suffix}.png`)
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
          await exportSlideElement(slide, `${exportFilePrefix}-${cotacaoId.slice(0, 8)}-p${i + 1}.png`)
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
    return (
      <Alert severity="warning">
        {errorMsg ?? emptyMessage ?? 'Sem dados para o contrato atual.'}
      </Alert>
    )
  }

  const totalPages = pagesExibidas.length
  const indicesRender = isVertical
    ? pagesExibidas.map((_, i) => i)
    : isExpanded
      ? [0]
      : [pageIndex]
  const showSlideToolbar = !isExpanded && !isVertical

  return (
    <Box sx={{ fontFamily: FONT }}>
      {showSlideToolbar && (
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
              {hideLayoutControls
                ? 'Comparativo por plano — colunas alinhadas por equivalência.'
                : 'Comparativo por plano — ajuste quantos planos cabem no slide.'}
            </Typography>
            {!hideLayoutControls && (
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
            )}
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
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: isExpanded || isVertical ? 'flex-start' : 'center', width: '100%' }}>
        <Box
          ref={exportRef}
          data-export-root
          sx={{
            width: isExpanded || isVertical ? '100%' : SLIDE_W,
            minWidth: isExpanded || isVertical ? '100%' : undefined,
            maxWidth: '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: isVertical ? 1.5 : 0,
          }}
        >
          {indicesRender.map((idx) => {
            const colCount = pagesExibidas[idx]?.colunas.length ?? planosPorSlide
            const pageLayout = isVertical
              ? getContratoAtualWorkspaceLayoutSpec(Math.max(colCount, 1))
              : isExpanded
                ? layout
                : usesOverride
                  ? getContratoAtualLayoutSpec(planosPorSlideFromCount(colCount))
                  : layout
            return (
              <ContratoAtualSlide
                key={idx}
                resumo={{ ...resumo, pages: pagesExibidas }}
                pageIndex={idx}
                logoUrls={logoUrls}
                layout={pageLayout}
                slideTitle={slideTitle}
                slideSubtitle={slideSubtitle}
                modoComparativoPropostas={usesOverride}
                presentationMode={isVertical ? 'workspace' : presentationMode}
                linhasOcultas={linhasOcultas}
                colunasEstudo={colunasEstudo}
                notasConsolidado={notasConsolidado}
                exibicaoComparativo={exibicaoComparativo}
                hideSlideHeader={isExpanded}
                hidePageFooter={isExpanded}
                vidasColunaUnica={vidasColunaUnica}
                custoPlanoExibicao={custoPlanoExibicao}
                omitFinanceiro={
                  usesOverride && exibicaoComparativo === 'plano_completo' && !!colunasEstudo?.length
                }
              />
            )
          })}
          {usesOverride &&
            exibicaoComparativo === 'plano_completo' &&
            colunasEstudo?.length &&
            resumo && (
              <ResumoFinanceiroTodosPlanos
                resumo={resumo}
                colunasEstudo={colunasEstudo}
                logoUrls={logoUrls}
                linhasOcultas={linhasOcultas}
                notasConsolidado={notasConsolidado}
                vidasColunaUnica={vidasColunaUnica}
              />
            )}
        </Box>
      </Box>
    </Box>
  )
}
