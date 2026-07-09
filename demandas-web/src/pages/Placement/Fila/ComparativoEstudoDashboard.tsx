import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TableChartIcon from '@mui/icons-material/TableChart'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { api } from '../../../lib/api.local'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
  type ComparativoEstudoConfig,
  type ComparativoEstudoModo,
  type ComparativoFaixaAgrupamento,
  type ComparativoFaixaCelula,
  type ComparativoVisualizacao,
} from './placementAguardandoOperadora'
import {
  computeComparativoEstudo,
  buildComparativoConsolidadoPages,
  buildComparativoDetalhePages,
  buildComparativoFaixaPages,
  buildComparativoUnificadoPages,
  alignColunasFinanceirasComContrato,
  FAIXAS_ETARIAS,
  faixaLabelDisplay,
  type ComparativoColunaEstudo,
  type ComparativoConsolidadoPagina,
  type ComparativoDetalhePagina,
  type ComparativoFaixaPagina,
  type ComparativoImpacto,
  type ComparativoUnificadoPagina,
} from './placementComparativoEstudo'
import { planosReferenciaAbertura } from './placementPropostaEquivalencia'
import {
  filterComparativoColunas,
  filterContratoResumoPorVisibilidade,
  listarColunasComparativo,
  listarColunasContratoPlano,
  linhasOcultasSet,
  type ComparativoLinhaChave,
} from './placementComparativoVisibilidade'
import { ComparativoPropostasVisibilidadePanel } from './ComparativoPropostasVisibilidadePanel'
import { buildKickOffEstrategiaPatch, mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'
import { mercadoFornecedoresFromForm } from './placementComunicarMercado'
import {
  exportSlidePng,
  PlacementExpandedFrame,
  PlacementSlideFrame,
  PlacementSlideHeader,
  SLIDE_FONT_FAMILY,
  SLIDE_H,
  SLIDE_W,
  SlidePageFooter,
  TABLE_GRAY,
  TABLE_NAVY,
  TABLE_SECTION,
  TABLE_TEAL,
  TABLE_TEAL_DARK,
} from './placementSlideShell'
import { SLIDE_COLORS } from './placementSlideTheme'
import { ContratoAtualDashboard, ContratoAtualSlide } from './ContratoAtualDashboard'
import type {
  ContratoAtualLayoutSpec,
  ContratoAtualPlanosPorSlide,
} from './placementContratoAtualLayout'
import {
  getContratoAtualLayoutSpec,
  getContratoAtualWorkspaceLayoutSpec,
  planosPorSlideFromCount,
} from './placementContratoAtualLayout'
import {
  fetchOperadoraIdsComLogo,
  loadOperadoraLogoObjectUrls,
  revokeOperadoraLogoUrls,
} from './placementOperadoraLogo'
import type { ContratoAtualResumo } from './placementContratoAtual'
import { estudoTemFaixaEtariaReal } from './placementComparativoVariacao'
import type { PlacementSlideViewMode } from './placementSlidesCatalog'

import { formatCentsToBRL } from './utils'

const FONT = SLIDE_FONT_FAMILY
const TABLE_HEADER_BG = SLIDE_COLORS.mint
const TABLE_HEADER_TEXT = TABLE_NAVY
const TABLE_TOTAL_BG = `${TABLE_NAVY}12`

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  disabled?: boolean
  onChange?: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  /** `fullscreen` = página dedicada tela cheia; `workspace` = painel embutido; `embed` = slides. */
  variant?: 'embed' | 'workspace' | 'fullscreen'
  /** Quando definido pelo hub de slides, força slide compacto ou visão detalhada. */
  slidesViewMode?: PlacementSlideViewMode
  onNavigateToLancamento?: () => void
  onOpenSlides?: () => void
  /** Se a etapa permite lançamento de propostas na tela cheia. */
  lancamentoDisponivel?: boolean
}

const MODO_LABELS: Record<ComparativoEstudoModo, string> = {
  contrato_plano: 'Comparativo por plano (detalhado)',
  consolidado: 'Consolidado financeiro (recomendado)',
  detalhe_plano: 'Detalhe por plano',
  unificado: 'Completo (plano + consolidado + detalhe)',
  faixa_etaria: 'Faixa etária (horizontal)',
}

const FAIXA_CELULA_LABELS: Record<ComparativoFaixaCelula, string> = {
  unitario: 'Valor unitário',
  unitario_e_subtotal: 'Unitário + subtotal por linha',
  subtotal: 'Subtotal por linha',
}

const FAIXA_AGRUPAMENTO_LABELS: Record<ComparativoFaixaAgrupamento, string> = {
  horizontal: 'Uma página por plano (navegar slides)',
  por_plano_equivalente: 'Uma página por plano (empilhado na tela)',
}

function colsPorOperadoraFaixa(_celula: ComparativoFaixaCelula): number {
  return 1
}

function buildGrupoHeaderSpans(colunas: ComparativoColunaEstudo[], celula: ComparativoFaixaCelula) {
  const perOp = colsPorOperadoraFaixa(celula)
  const spans: { label: string; span: number }[] = []
  for (const c of colunas) {
    const label = c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'
    const last = spans[spans.length - 1]
    if (last?.label === label) last.span += perOp
    else spans.push({ label, span: perOp })
  }
  return spans
}

function FaixaValorCelula({
  cell,
  mode,
  expanded,
}: {
  cell?: { custo: string; subtotal: string }
  mode: ComparativoFaixaCelula
  expanded?: boolean
}) {
  if (mode === 'subtotal') return <>{cell?.subtotal ?? '—'}</>
  if (mode === 'unitario_e_subtotal') {
    return (
      <>
        {cell?.custo ?? '—'}
        <br />
        <Box component="span" sx={{ fontSize: expanded ? 10 : 8.5, opacity: 0.9, fontWeight: 700 }}>
          {cell?.subtotal ?? '—'}
        </Box>
      </>
    )
  }
  return <>{cell?.custo ?? '—'}</>
}

function ColunaHeaders({ colunas, expanded }: { colunas: ComparativoColunaEstudo[]; expanded?: boolean }) {
  return (
    <>
      <tr>
        <Th expanded={expanded}>SAÚDE</Th>
        {colunas.map((c) => (
          <Th key={`g-${c.id}`} expanded={expanded}>
            {c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'}
          </Th>
        ))}
      </tr>
      <tr>
        <Th expanded={expanded}>Operadoras</Th>
        {colunas.map((c) => (
          <Th key={`o-${c.id}`} expanded={expanded}>
            {c.operadora}
          </Th>
        ))}
      </tr>
      <tr>
        <Th expanded={expanded}>Planos &gt;</Th>
        {colunas.map((c) => (
          <Th key={`p-${c.id}`} expanded={expanded}>
            {c.planoLabel}
          </Th>
        ))}
      </tr>
    </>
  )
}

function Th({
  children,
  colSpan,
  rowSpan,
  expanded,
}: {
  children: React.ReactNode
  colSpan?: number
  rowSpan?: number
  expanded?: boolean
}) {
  return (
    <Box
      component="th"
      colSpan={colSpan}
      rowSpan={rowSpan}
      sx={{
        bgcolor: TABLE_HEADER_BG,
        color: TABLE_HEADER_TEXT,
        fontFamily: FONT,
        fontSize: expanded ? 10 : 8,
        fontWeight: 800,
        textAlign: 'center',
        px: 0.5,
        py: 0.6,
        border: `1px solid ${SLIDE_COLORS.border}`,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </Box>
  )
}

function Td({
  children,
  bold,
  bg,
  color,
  align = 'center',
  colSpan,
  expanded,
  totalRow,
}: {
  children: React.ReactNode
  bold?: boolean
  bg?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  colSpan?: number
  expanded?: boolean
  /** Linha de totais — fundo claro e texto navy em vez de fundo escuro com texto branco. */
  totalRow?: boolean
}) {
  const resolvedBg = totalRow ? TABLE_TOTAL_BG : bg ?? TABLE_GRAY
  const resolvedColor = totalRow ? TABLE_NAVY : color ?? TABLE_NAVY
  return (
    <Box
      component="td"
      colSpan={colSpan}
      sx={{
        fontFamily: FONT,
        fontSize: expanded ? 11 : 9.5,
        fontWeight: bold ? 700 : 500,
        textAlign: align,
        px: 0.5,
        py: 0.45,
        border: `1px solid ${SLIDE_COLORS.border}`,
        bgcolor: resolvedBg,
        color: resolvedColor,
        verticalAlign: 'middle',
        ...(totalRow ? { borderTop: `2px solid ${TABLE_NAVY}` } : {}),
      }}
    >
      {children}
    </Box>
  )
}

const EXPANDED_COL_MIN_W = 200
const EXPANDED_LEGEND_W = 180

function comparativoExpandedMinWidth(colCount: number): number {
  return EXPANDED_LEGEND_W + Math.max(colCount, 1) * EXPANDED_COL_MIN_W
}

function ComparativoSlideShell({
  expanded,
  footer,
  minWidth,
  children,
}: {
  expanded?: boolean
  footer?: React.ReactNode
  minWidth?: number
  children: React.ReactNode
}) {
  if (expanded) {
    return (
      <PlacementExpandedFrame footer={footer} minWidth={minWidth}>
        {children}
      </PlacementExpandedFrame>
    )
  }
  return <PlacementSlideFrame footer={footer}>{children}</PlacementSlideFrame>
}

function ComparativoUnificadoBloco({
  page,
  ticket,
  notas,
  linhasOcultas,
  expanded,
  logoUrls,
  layout,
  slideSubtitle,
  colunasEstudo,
}: {
  page: ComparativoUnificadoPagina
  ticket: string
  notas: string
  linhasOcultas?: ComparativoLinhaChave[]
  expanded?: boolean
  logoUrls: Map<string, string>
  layout: ContratoAtualLayoutSpec
  slideSubtitle: string
  colunasEstudo: ComparativoColunaEstudo[]
}) {
  const resumoSlice = useMemo<ContratoAtualResumo>(
    () => ({
      allColunas: page.contrato.colunas,
      pages: [page.contrato],
      totalVidas: page.contrato.totalVidas,
      totalFatura: page.contrato.totalFatura,
    }),
    [page]
  )
  const presentationMode = expanded ? 'workspace' : 'page'

  return (
    <Stack gap={expanded ? 3 : 2} sx={{ width: '100%' }}>
      <ContratoAtualSlide
        resumo={resumoSlice}
        pageIndex={0}
        logoUrls={logoUrls}
        layout={layout}
        slideTitle="Comparativo de Propostas"
        slideSubtitle={slideSubtitle}
        modoComparativoPropostas
        presentationMode={presentationMode}
        linhasOcultas={linhasOcultas}
        colunasEstudo={colunasEstudo}
        notasConsolidado={notas}
      />
      <DetalhePlanoSlide
        page={page.detalhe}
        ticket={ticket}
        linhasOcultas={linhasOcultas}
        expanded={expanded}
      />
    </Stack>
  )
}

function ConsolidadoSlide({
  page,
  ticket,
  notas,
  linhasOcultas,
  expanded,
}: {
  page: ComparativoConsolidadoPagina
  ticket: string
  notas: string
  linhasOcultas?: ComparativoLinhaChave[]
  expanded?: boolean
}) {
  const ocultas = linhasOcultasSet(linhasOcultas)
  const linhas = page.linhas.filter((linha) => {
    if (!ocultas.has('variacao_financeira')) return true
    return linha.tipo !== 'resultado' && linha.id !== 'sec-res'
  })
  return (
    <ComparativoSlideShell
      expanded={expanded}
      minWidth={comparativoExpandedMinWidth(page.colunas.length)}
      footer={<SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />}
    >
      <PlacementSlideHeader
        title="Consolidado Financeiro"
        subtitle={`Comparativo de propostas · ${ticket}`}
        icon={<TableChartIcon sx={{ fontSize: 22, color: '#fff' }} />}
      />
      <Box sx={{ flex: 1, minHeight: 0, px: expanded ? 2 : 1, py: expanded ? 1.5 : 0.75, overflow: expanded ? 'visible' : 'hidden' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            minWidth: expanded ? comparativoExpandedMinWidth(page.colunas.length) : undefined,
            borderCollapse: 'collapse',
            tableLayout: expanded ? 'auto' : 'fixed',
          }}
        >
          <thead>
            <tr>
              <Th expanded={expanded}>OPERADORAS</Th>
              {page.colunas.map((c) => (
                <Th key={c.id} expanded={expanded}>
                  {c.operadora}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) =>
              linha.tipo === 'section' ? (
                <tr key={linha.id}>
                  <Td bold bg={TABLE_SECTION} align="left" colSpan={page.colunas.length + 1} expanded={expanded}>
                    {linha.label}
                  </Td>
                </tr>
              ) : (
                <tr key={linha.id}>
                  <Td bold align="left" expanded={expanded}>
                    {linha.label}
                  </Td>
                  {linha.valores.map((val, i) => {
                    const col = page.colunas[i]
                    const isResult = linha.tipo === 'resultado' && col?.grupo === 'mercado'
                    const economia = isResult && val.startsWith('-')
                    const aumento = isResult && val !== '—' && !val.startsWith('-') && linha.id === 'res-pct'
                    return (
                      <Td
                        key={`${linha.id}-${i}`}
                        bold={linha.tipo === 'resultado'}
                        expanded={expanded}
                        color={
                          isResult
                            ? economia
                              ? TABLE_TEAL_DARK
                              : aumento
                                ? '#c62828'
                                : TABLE_NAVY
                            : TABLE_NAVY
                        }
                      >
                        {val}
                      </Td>
                    )
                  })}
                </tr>
              )
            )}
          </tbody>
        </Box>
        {notas && (
          <Typography sx={{ fontFamily: FONT, fontSize: expanded ? 9 : 7, color: TABLE_TEAL_DARK, mt: 0.75, lineHeight: 1.3 }}>
            {notas}
          </Typography>
        )}
      </Box>
    </ComparativoSlideShell>
  )
}

function ImpactoRows({
  colunas,
  impactos,
  labelColSpan = 1,
  celulasPorColuna = 1,
  linhasOcultas,
  expanded,
}: {
  colunas: ComparativoColunaEstudo[]
  impactos: ComparativoImpacto[]
  labelColSpan?: number
  celulasPorColuna?: number
  linhasOcultas?: ComparativoLinhaChave[]
  expanded?: boolean
}) {
  if (linhasOcultasSet(linhasOcultas).has('variacao_financeira')) return null
  const mercadoCols = colunas.filter((c) => c.grupo === 'mercado')
  if (!mercadoCols.length) return null
  let impactIdx = 0
  const renderValor = (c: ComparativoColunaEstudo, field: string, val: string, economia?: boolean) => {
    if (celulasPorColuna === 2) {
      return (
        <Td
          key={`${field}-${c.id}`}
          colSpan={2}
          expanded={expanded}
          color={economia ? TABLE_TEAL_DARK : val !== '—' ? '#c62828' : TABLE_NAVY}
        >
          {val}
        </Td>
      )
    }
    return (
      <Td key={`${field}-${c.id}`} expanded={expanded} color={economia ? TABLE_TEAL_DARK : val !== '—' ? '#c62828' : TABLE_NAVY}>
        {val}
      </Td>
    )
  }
  return (
    <>
      <tr>
        <Td bold bg={TABLE_SECTION} align="left" colSpan={colunas.length * celulasPorColuna + labelColSpan} expanded={expanded}>
          RESULTADO FINANCEIRO SEM REAJUSTE
        </Td>
      </tr>
      {(['variacaoPct', 'impactoMensal', 'impactoAnual'] as const).map((field) => (
        <tr key={field}>
          <Td bold align="left" colSpan={labelColSpan} expanded={expanded}>
            {field === 'variacaoPct'
              ? 'Variação (%)'
              : field === 'impactoMensal'
                ? 'Impacto Mensal (R$)'
                : 'Impacto Anual (R$)'}
          </Td>
          {colunas.map((c) => {
            if (c.grupo === 'atual') {
              if (celulasPorColuna === 2) {
                return (
                  <Td key={`${field}-${c.id}`} colSpan={2} expanded={expanded}>
                    —
                  </Td>
                )
              }
              return <Td key={`${field}-${c.id}`} expanded={expanded}>—</Td>
            }
            const imp = impactos[impactIdx++]
            const val = imp?.[field] ?? '—'
            return renderValor(c, field, val, imp?.economia)
          })}
        </tr>
      ))}
    </>
  )
}

function DetalhePlanoSlide({
  page,
  ticket,
  linhasOcultas,
  expanded,
}: {
  page: ComparativoDetalhePagina
  ticket: string
  linhasOcultas?: ComparativoLinhaChave[]
  expanded?: boolean
}) {
  const ocultas = linhasOcultasSet(linhasOcultas)
  const rows = [
    { label: 'Reembolso Consulta', key: 'reembolsoConsulta' as const },
    { label: 'Acomodação', key: 'acomodacao' as const },
    { label: 'Eventos Reembolsáveis', key: 'eventosReembolsaveis' as const },
    { label: 'Abrangência', key: 'abrangencia' as const },
    { label: 'Coparticipação', key: 'coparticipacao' as const },
  ].filter((row) => !(row.key === 'coparticipacao' && ocultas.has('coparticipacao')))

  return (
    <ComparativoSlideShell
      expanded={expanded}
      minWidth={comparativoExpandedMinWidth(page.colunas.length)}
      footer={<SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />}
    >
      <PlacementSlideHeader
        title="Comparativo por Plano"
        subtitle={`Características e custos · ${ticket}`}
        icon={<TableChartIcon sx={{ fontSize: 22, color: '#fff' }} />}
      />
      <Box sx={{ flex: 1, minHeight: 0, px: expanded ? 2 : 1, py: expanded ? 1.5 : 0.75, overflow: expanded ? 'visible' : 'hidden' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            minWidth: expanded ? comparativoExpandedMinWidth(page.colunas.length) : undefined,
            borderCollapse: 'collapse',
            tableLayout: expanded ? 'auto' : 'fixed',
          }}
        >
          <thead>
            <ColunaHeaders colunas={page.colunas} expanded={expanded} />
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <Td bold align="left" expanded={expanded}>
                  {row.label}
                </Td>
                {page.colunas.map((c) => (
                  <Td key={`${row.key}-${c.id}`} expanded={expanded}>
                    {c[row.key]}
                  </Td>
                ))}
              </tr>
            ))}
            <tr>
              <Td bold totalRow align="left" expanded={expanded}>
                Total Geral Mês
              </Td>
              {page.colunas.map((c) => (
                <Td key={`tm-${c.id}`} bold totalRow expanded={expanded}>
                  {c.totalMensalCents != null ? formatCentsToBRL(c.totalMensalCents) : '—'}
                </Td>
              ))}
            </tr>
            <tr>
              <Td bold totalRow align="left" expanded={expanded}>
                Total Geral Ano
              </Td>
              {page.colunas.map((c) => (
                <Td key={`ta-${c.id}`} bold totalRow expanded={expanded}>
                  {c.totalAnualCents != null ? formatCentsToBRL(c.totalAnualCents) : '—'}
                </Td>
              ))}
            </tr>
            <ImpactoRows colunas={page.colunas} impactos={page.impactos} linhasOcultas={linhasOcultas} expanded={expanded} />
          </tbody>
        </Box>
      </Box>
    </ComparativoSlideShell>
  )
}

function FaixaEtariaSlide({
  page,
  ticket,
  linhasOcultas,
  expanded,
}: {
  page: ComparativoFaixaPagina
  ticket: string
  linhasOcultas?: ComparativoLinhaChave[]
  expanded?: boolean
}) {
  const ocultas = linhasOcultasSet(linhasOcultas)
  const ocultarFaixas = ocultas.has('faixas_etarias')
  const celula = page.faixaCelula
  const grupoSpans = buildGrupoHeaderSpans(page.colunas, celula)
  const colHeader =
    celula === 'subtotal' ? 'Subtotal' : celula === 'unitario_e_subtotal' ? 'Unit. + Subtotal' : 'Valor Unitário'
  const pageLabel =
    page.grupoLabel
      ? `${page.grupoLabel} · todos os fornecedores · Pág. ${page.pageIndex + 1}/${page.totalPages}`
      : `Pág. ${page.pageIndex + 1}/${page.totalPages}`

  return (
    <ComparativoSlideShell
      expanded={expanded}
      minWidth={comparativoExpandedMinWidth(page.colunas.length)}
      footer={<SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />}
    >
      <PlacementSlideHeader
        title="Comparativo Faixa Etária"
        subtitle={`${pageLabel} · ${ticket}`}
        icon={<TableChartIcon sx={{ fontSize: 22, color: '#fff' }} />}
        badge={page.totalGrupos > 1 ? `Plano ${page.grupoIndex + 1}/${page.totalGrupos}` : undefined}
      />
      <Box sx={{ flex: 1, minHeight: 0, px: expanded ? 2 : 1, py: expanded ? 1.5 : 0.75, overflow: expanded ? 'visible' : 'hidden' }}>
        {ocultarFaixas ? (
          <Typography sx={{ fontFamily: FONT, fontSize: 10, color: TABLE_GRAY, py: 2, textAlign: 'center' }}>
            Faixas etárias ocultas nesta visualização.
          </Typography>
        ) : (
        <Box
          component="table"
          sx={{
            width: '100%',
            minWidth: expanded ? comparativoExpandedMinWidth(page.colunas.length) : undefined,
            borderCollapse: 'collapse',
            tableLayout: expanded ? 'auto' : 'fixed',
          }}
        >
          <thead>
            <tr>
              <Th rowSpan={2} expanded={expanded}>
                Faixa Etária
              </Th>
              <Th rowSpan={2} expanded={expanded}>
                Vidas
              </Th>
              {grupoSpans.map((g, i) => (
                <Th key={`${g.label}-${i}`} colSpan={g.span} expanded={expanded}>
                  {g.label}
                </Th>
              ))}
            </tr>
            <tr>
              {page.colunas.map((c) => (
                <Th key={`h-${c.id}`} expanded={expanded}>
                  {colHeader}
                  <br />
                  <Box component="span" sx={{ fontSize: expanded ? 9 : 7, color: TABLE_TEAL_DARK, fontWeight: 600 }}>
                    {c.operadora} · {c.planoLabel}
                  </Box>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAIXAS_ETARIAS.map((fx) => {
              const vidas = page.vidasGrupo[fx.key]
              const anyVal = page.colunas.some((c) => c.faixas.some((f) => f.key === fx.key && f.custo !== '—'))
              if (!vidas && !anyVal) return null
              return (
                <tr key={fx.key}>
                  <Td bold align="left" expanded={expanded}>
                    {faixaLabelDisplay(fx.label)}
                  </Td>
                  <Td expanded={expanded}>{vidas || '—'}</Td>
                  {page.colunas.map((c) => {
                    const cell = c.faixas.find((f) => f.key === fx.key)
                    return (
                      <Td key={`${c.id}-${fx.key}`} expanded={expanded}>
                        <FaixaValorCelula cell={cell} mode={celula} expanded={expanded} />
                      </Td>
                    )
                  })}
                </tr>
              )
            })}
            <tr>
              <Td bold bg={TABLE_SECTION} align="left" expanded={expanded}>
                Subtotal
              </Td>
              <Td bold bg={TABLE_SECTION} expanded={expanded}>
                {Object.values(page.vidasGrupo).reduce((s, n) => s + n, 0) || '—'}
              </Td>
              {page.colunas.map((c) => (
                <Td key={`sub-${c.id}`} bold bg={TABLE_SECTION} expanded={expanded}>
                  {c.totalMensalCents != null ? formatCentsToBRL(c.totalMensalCents) : '—'}
                </Td>
              ))}
            </tr>
            <tr>
              <Td bold totalRow align="left" expanded={expanded}>
                Total Geral Mês
              </Td>
              <Td bold totalRow expanded={expanded} />
              {page.colunas.map((c) => (
                <Td key={`tm-${c.id}`} bold totalRow expanded={expanded}>
                  {c.totalMensalCents != null ? formatCentsToBRL(c.totalMensalCents) : '—'}
                </Td>
              ))}
            </tr>
            <ImpactoRows
              colunas={page.colunas}
              impactos={page.impactos}
              labelColSpan={2}
              linhasOcultas={linhasOcultas}
              expanded={expanded}
            />
          </tbody>
        </Box>
        )}
      </Box>
    </ComparativoSlideShell>
  )
}

export function ComparativoEstudoDashboard({
  cotacaoId,
  form,
  disabled,
  onChange,
  onPersisted,
  variant = 'embed',
  slidesViewMode,
  onNavigateToLancamento,
  onOpenSlides,
  lancamentoDisponivel = true,
}: Props) {
  const resolvedVariant =
    slidesViewMode === 'compacto' ? 'embed' : slidesViewMode === 'detalhado' ? 'workspace' : variant
  const isFullscreen = resolvedVariant === 'fullscreen'
  const isWorkspace = resolvedVariant === 'workspace'
  const isExpandedLayout = isFullscreen || isWorkspace
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const exportRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [beneficiarios, setBeneficiarios] = useState<PlacementBeneficiario[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [slideReady, setSlideReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())
  const [idsComLogo, setIdsComLogo] = useState<Set<string>>(new Set())

  const agState = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      ),
    [form, operadoras, operadorasById]
  )

  const config = agState.comparativoConfig
  const visualizacaoEfetiva: ComparativoVisualizacao =
    slidesViewMode === 'compacto'
      ? 'slide'
      : slidesViewMode === 'detalhado'
        ? 'pagina_completa'
        : config.visualizacao
  const isExpandedView = isFullscreen || isWorkspace || visualizacaoEfetiva === 'pagina_completa'

  const estudo = useMemo(
    () => computeComparativoEstudo(form, operadoras, beneficiarios, operadorasById, config),
    [form, operadoras, beneficiarios, operadorasById, config]
  )

  const referencias = useMemo(
    () => planosReferenciaAbertura(form, operadoras, operadorasById),
    [form, operadoras, operadorasById]
  )

  const estudoVisivel = useMemo(() => {
    const contratoPlanoResumo = filterContratoResumoPorVisibilidade(
      estudo.contratoPlanoResumo,
      config.colunasOcultas
    )
    const colunas = alignColunasFinanceirasComContrato(
      filterComparativoColunas(estudo.colunas, config.colunasOcultas),
      contratoPlanoResumo.allColunas
    )
    const temFiltroColunas = (config.colunasOcultas?.length ?? 0) > 0
    if (!temFiltroColunas) {
      return { ...estudo, colunas, contratoPlanoResumo }
    }
    return {
      ...estudo,
      colunas,
      contratoPlanoResumo,
      consolidadoPages: buildComparativoConsolidadoPages(colunas, config.colunasPorSlide),
      detalhePages: buildComparativoDetalhePages(colunas, config.colunasPorSlide),
      faixaPages: buildComparativoFaixaPages(colunas, config.colunasPorSlide, {
        agrupamento: config.faixaAgrupamento,
        faixaCelula: config.faixaCelula,
        referencias,
      }),
    }
  }, [estudo, config.colunasOcultas, config.colunasPorSlide, config.faixaAgrupamento, config.faixaCelula, referencias])

  const colunasParaPainel = useMemo(() => {
    if (estudo.contratoPlanoResumo.allColunas.length) {
      return listarColunasContratoPlano(estudo.contratoPlanoResumo.allColunas)
    }
    return listarColunasComparativo(estudo.colunas)
  }, [estudo.contratoPlanoResumo.allColunas, estudo.colunas])

  const paginaCompleta = isFullscreen || isWorkspace || visualizacaoEfetiva === 'pagina_completa'

  const temFaixaReal = useMemo(
    () => estudoTemFaixaEtariaReal(estudoVisivel.contratoPlanoResumo.allColunas),
    [estudoVisivel.contratoPlanoResumo.allColunas]
  )

  const unificadoPages = useMemo(
    () =>
      buildComparativoUnificadoPages(
        estudoVisivel.contratoPlanoResumo.allColunas,
        estudoVisivel.consolidadoPages,
        estudoVisivel.detalhePages
      ),
    [
      estudoVisivel.contratoPlanoResumo.allColunas,
      estudoVisivel.consolidadoPages,
      estudoVisivel.detalhePages,
    ]
  )

  const modoEfetivo: ComparativoEstudoModo = useMemo(() => {
    if (config.modoSlide === 'faixa_etaria' && (!temFaixaReal || !estudoVisivel.faixaPages.length)) {
      return 'contrato_plano'
    }
    return config.modoSlide
  }, [config.modoSlide, temFaixaReal, estudoVisivel.faixaPages.length])

  const pages = useMemo(() => {
    if (modoEfetivo === 'contrato_plano') return estudoVisivel.contratoPlanoResumo.pages
    if (modoEfetivo === 'unificado') return unificadoPages
    if (modoEfetivo === 'consolidado') return estudoVisivel.consolidadoPages
    if (modoEfetivo === 'detalhe_plano') return estudoVisivel.detalhePages
    return estudoVisivel.faixaPages
  }, [modoEfetivo, estudoVisivel, unificadoPages])

  const colunasVisiveis =
    modoEfetivo === 'contrato_plano'
      ? estudoVisivel.contratoPlanoResumo.allColunas.length
      : estudoVisivel.colunas.length

  useEffect(() => {
    if (modoEfetivo !== 'unificado') return
    void fetchOperadoraIdsComLogo().then(setIdsComLogo)
  }, [modoEfetivo])

  useEffect(() => {
    if (modoEfetivo !== 'unificado' || !unificadoPages.length) return
    const page = unificadoPages[pageIndex] ?? unificadoPages[0]
    if (!page) return
    const ids = page.contrato.colunas.map((c) => c.operadoraId).filter(Boolean)
    void loadOperadoraLogoObjectUrls(ids, idsComLogo).then((urls) => {
      setLogoUrls((prev) => {
        revokeOperadoraLogoUrls(prev)
        return urls
      })
    })
  }, [modoEfetivo, unificadoPages, pageIndex, idsComLogo])

  useEffect(() => {
    return () => revokeOperadoraLogoUrls(logoUrls)
  }, [logoUrls])

  useEffect(() => {
    setPageIndex(0)
  }, [config.modoSlide, config.colunasPorSlide, config.faixaAgrupamento, config.faixaCelula, config.colunasOcultas, config.visualizacao, estudoVisivel.colunas.length])

  const faixaEmpilhado =
    modoEfetivo === 'faixa_etaria' &&
    (config.faixaAgrupamento === 'por_plano_equivalente' || paginaCompleta)

  const empilharPaginas = paginaCompleta || faixaEmpilhado

  const faixaGruposCount = estudoVisivel.faixaPages[0]?.totalGrupos ?? 0

  useEffect(() => {
    if (pageIndex >= pages.length && pages.length) setPageIndex(pages.length - 1)
  }, [pageIndex, pages.length])

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    try {
      const resp = (await api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`)) as {
        beneficiarios?: PlacementBeneficiario[]
      }
      setBeneficiarios(resp?.beneficiarios ?? [])
    } catch {
      setBeneficiarios([])
    } finally {
      setLoading(false)
    }
  }, [cotacaoId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!pages.length) {
      setSlideReady(false)
      return
    }
    const t = window.setTimeout(() => setSlideReady(true), 500)
    return () => window.clearTimeout(t)
  }, [pages, pageIndex, config])

  useEffect(() => {
    return () => {
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
    }
  }, [])

  const persistConfig = useCallback(
    (next: ComparativoEstudoConfig) => {
      if (!onChange) return
      const fornecedores = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
      const agAtual = ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      )
      const nextAg = { ...agAtual, comparativoConfig: next }
      const kickOff = buildKickOffEstrategiaPatch(form.kickOffEstrategia, { aguardandoOperadora: nextAg }, fornecedores)
      onChange({ ...form, kickOffEstrategia: kickOff })
      if (!cotacaoId) return
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
      configSaveTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, { kickOffEstrategia: kickOff })
            onPersisted?.(mergeSavedKickOffIntoApiCotacao(updated, kickOff))
          } catch {
            /* ignore */
          }
        })()
      }, 450)
    },
    [onChange, form, operadoras, operadorasById, cotacaoId, onPersisted]
  )

  useEffect(() => {
    if (!onChange || config.modoSlide !== 'faixa_etaria') return
    if (!temFaixaReal || !estudoVisivel.faixaPages.length) {
      persistConfig({ ...config, modoSlide: 'contrato_plano' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.modoSlide, temFaixaReal, estudoVisivel.faixaPages.length, onChange])

  const unificadoLayoutForPage = useCallback(
    (colCount: number) =>
      isExpandedView
        ? getContratoAtualWorkspaceLayoutSpec(Math.max(colCount, 2))
        : getContratoAtualLayoutSpec(planosPorSlideFromCount(colCount || config.colunasPorSlide)),
    [isExpandedView, config.colunasPorSlide]
  )

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleExport() {
    const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
    if (!slide) return
    setExporting(true)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 800))
      const suffix = pages.length > 1 ? `-p${pageIndex + 1}` : ''
      await exportSlidePng(slide, `comparativo-${config.modoSlide}-${cotacaoId.slice(0, 8)}${suffix}.png`)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportAll() {
    if (empilharPaginas) {
      setExporting(true)
      try {
        await new Promise((r) => setTimeout(r, slideReady ? 400 : 800))
        const slides = exportRef.current?.querySelectorAll('[data-slide-inner]') ?? []
        for (let i = 0; i < slides.length; i++) {
          await exportSlidePng(
            slides[i] as HTMLElement,
            `comparativo-${config.modoSlide}-${cotacaoId.slice(0, 8)}-p${i + 1}.png`
          )
        }
      } finally {
        setExporting(false)
      }
      return
    }
    if (pages.length <= 1) {
      void handleExport()
      return
    }
    setExporting(true)
    const prev = pageIndex
    try {
      for (let i = 0; i < pages.length; i++) {
        setPageIndex(i)
        await new Promise((r) => setTimeout(r, 600))
        const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
        if (slide) {
          await exportSlidePng(
            slide,
            `comparativo-${config.modoSlide}-${cotacaoId.slice(0, 8)}-p${i + 1}.png`
          )
        }
      }
    } finally {
      setPageIndex(prev)
      setExporting(false)
    }
  }

  if (loading && !isExpandedLayout) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const semDadosComparativo =
    !estudo.colunas.length && !estudo.contratoPlanoResumo.allColunas.length

  const currentPage = pages[pageIndex]
  const nenhumaColunaVisivel =
    !semDadosComparativo &&
    (modoEfetivo === 'contrato_plano'
      ? !estudoVisivel.contratoPlanoResumo.allColunas.length
      : !estudoVisivel.colunas.length)

  const ticketLabel = form.ticket || cotacaoId

  if (!isExpandedLayout && semDadosComparativo) {
    return (
      <Alert severity="info">
        Cadastre propostas por fornecedor (Aguardando operadora) e/ou planos do contrato atual na abertura para
        gerar o comparativo.
      </Alert>
    )
  }

  if (!isExpandedLayout && nenhumaColunaVisivel) {
    return (
      <Stack gap={2}>
        <Alert severity="warning">
          Todas as colunas estão ocultas. Selecione ao menos uma operadora/plano no painel abaixo.
        </Alert>
        <ComparativoPropostasVisibilidadePanel
          colunas={colunasParaPainel}
          config={config}
          disabled={disabled || !onChange}
          onChange={persistConfig}
        />
      </Stack>
    )
  }

  const contratoPresentationMode = isFullscreen || isWorkspace ? 'workspace' : paginaCompleta ? 'page' : 'slide'

  const comparativoCanvas = loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress size={32} />
    </Box>
  ) : semDadosComparativo ? (
    <Alert severity="info">
      Cadastre propostas por fornecedor (Aguardando operadora) e/ou planos do contrato atual na abertura para
      gerar o comparativo. Use a aba «Lançar propostas» quando estiver na etapa correta.
    </Alert>
  ) : nenhumaColunaVisivel ? (
    <Alert severity="warning">
      Todas as colunas estão ocultas. Selecione ao menos uma operadora/plano no painel lateral.
    </Alert>
  ) : (
    <Box
      sx={{
        overflow: isExpandedView ? 'visible' : 'auto',
        display: 'flex',
        justifyContent: isExpandedView ? 'flex-start' : 'center',
        width: '100%',
        minWidth: isExpandedView ? 'max-content' : undefined,
      }}
    >
      {modoEfetivo === 'contrato_plano' ? (
        <ContratoAtualDashboard
          cotacaoId={cotacaoId}
          disabled={disabled}
          resumoOverride={estudoVisivel.contratoPlanoResumo}
          colunasEstudo={estudoVisivel.colunas}
          notasConsolidado={config.notasRodape}
          exibicaoComparativo="plano_completo"
          initialPlanosPorSlide={config.colunasPorSlide as ContratoAtualPlanosPorSlide}
          hideLayoutControls
          presentationMode={contratoPresentationMode}
          linhasOcultas={config.linhasOcultas}
          slideTitle="Comparativo de Propostas"
          slideSubtitle={`Plano equivalente · todos os fornecedores · ${ticketLabel}`}
          exportFilePrefix={`comparativo-propostas-${cotacaoId.slice(0, 8)}`}
          emptyMessage="Cadastre propostas por fornecedor e vincule equivalências aos planos do contrato."
        />
      ) : modoEfetivo === 'unificado' ? (
        <Box
          ref={exportRef}
          data-export-root
          sx={{
            width: isExpandedView ? 'max-content' : SLIDE_W,
            minWidth: isExpandedView ? '100%' : undefined,
            maxWidth: '100%',
            flexShrink: 0,
          }}
        >
          {empilharPaginas ? (
            <Stack gap={isExpandedView ? 4 : 3} sx={{ width: '100%' }}>
              {unificadoPages.map((page, i) => (
                <ComparativoUnificadoBloco
                  key={`uni-${i}`}
                  page={page}
                  ticket={ticketLabel}
                  notas={config.notasRodape}
                  linhasOcultas={config.linhasOcultas}
                  expanded={isExpandedView}
                  logoUrls={logoUrls}
                  layout={unificadoLayoutForPage(page.contrato.colunas.length)}
                  slideSubtitle={`Mesmas colunas · ${ticketLabel} · bloco ${i + 1}/${unificadoPages.length}`}
                  colunasEstudo={estudoVisivel.colunas}
                />
              ))}
            </Stack>
          ) : (
            currentPage && (
              <ComparativoUnificadoBloco
                page={currentPage as ComparativoUnificadoPagina}
                ticket={ticketLabel}
                notas={config.notasRodape}
                linhasOcultas={config.linhasOcultas}
                expanded={isExpandedView}
                logoUrls={logoUrls}
                layout={unificadoLayoutForPage(
                  (currentPage as ComparativoUnificadoPagina).contrato.colunas.length
                )}
                slideSubtitle={`Mesmas colunas · ${ticketLabel} · bloco ${pageIndex + 1}/${pages.length}`}
                colunasEstudo={estudoVisivel.colunas}
              />
            )
          )}
        </Box>
      ) : (
        <Box
          ref={exportRef}
          data-export-root
          sx={{
            width: isExpandedView ? 'max-content' : SLIDE_W,
            minWidth: isExpandedView ? '100%' : undefined,
            maxWidth: '100%',
            flexShrink: 0,
          }}
        >
          {modoEfetivo === 'consolidado' && (
            <ContratoAtualDashboard
              cotacaoId={cotacaoId}
              disabled={disabled}
              resumoOverride={estudoVisivel.contratoPlanoResumo}
              colunasEstudo={estudoVisivel.colunas}
              notasConsolidado={config.notasRodape}
              exibicaoComparativo="consolidado_financeiro"
              initialPlanosPorSlide={config.colunasPorSlide as ContratoAtualPlanosPorSlide}
              hideLayoutControls
              presentationMode={contratoPresentationMode}
              linhasOcultas={config.linhasOcultas}
              slideTitle="Consolidado Financeiro"
              slideSubtitle={`Comparativo de propostas · ${ticketLabel}`}
              exportFilePrefix={`comparativo-consolidado-${cotacaoId.slice(0, 8)}`}
              emptyMessage="Cadastre propostas por fornecedor e vincule equivalências aos planos do contrato."
            />
          )}
          {modoEfetivo === 'detalhe_plano' &&
            (empilharPaginas ? (
              <Stack gap={isExpandedView ? 3 : 2} sx={{ width: '100%' }}>
                {pages.map((page, i) => (
                  <DetalhePlanoSlide
                    key={`det-${i}`}
                    page={page as ComparativoDetalhePagina}
                    ticket={form.ticket || cotacaoId}
                    linhasOcultas={config.linhasOcultas}
                    expanded={isExpandedView}
                  />
                ))}
              </Stack>
            ) : (
              currentPage && (
                <DetalhePlanoSlide
                  page={currentPage as ComparativoDetalhePagina}
                  ticket={form.ticket || cotacaoId}
                  linhasOcultas={config.linhasOcultas}
                  expanded={isExpandedView}
                />
              )
            ))}
          {modoEfetivo === 'faixa_etaria' &&
            (empilharPaginas ? (
              <Stack gap={isExpandedView ? 3 : 2} sx={{ width: '100%' }}>
                {pages.map((page, i) => (
                  <FaixaEtariaSlide
                    key={`faixa-${i}-${(page as ComparativoFaixaPagina).grupoIndex}-${(page as ComparativoFaixaPagina).pageIndex}`}
                    page={page as ComparativoFaixaPagina}
                    ticket={form.ticket || cotacaoId}
                    linhasOcultas={config.linhasOcultas}
                    expanded={isExpandedView}
                  />
                ))}
              </Stack>
            ) : (
              currentPage && (
                <FaixaEtariaSlide
                  page={currentPage as ComparativoFaixaPagina}
                  ticket={form.ticket || cotacaoId}
                  linhasOcultas={config.linhasOcultas}
                  expanded={isExpandedView}
                />
              )
            ))}
        </Box>
      )}
    </Box>
  )

  const comparativoPreview = comparativoCanvas

  const configPanel = (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {isWorkspace ? 'Opções do comparativo' : isFullscreen ? 'Filtros e opções' : 'Configuração do comparativo'}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{isWorkspace ? 'Modo de exibição' : 'Modo de slide'}</InputLabel>
          <Select
            label={isWorkspace ? 'Modo de exibição' : 'Modo de slide'}
            value={config.modoSlide}
            disabled={disabled || !onChange}
            onChange={(e) =>
              persistConfig({ ...config, modoSlide: e.target.value as ComparativoEstudoModo })
            }
          >
            {(Object.entries(MODO_LABELS) as [ComparativoEstudoModo, string][]).map(([v, l]) => (
              <MenuItem key={v} value={v} disabled={v === 'faixa_etaria' && !temFaixaReal}>
                {l}
                {v === 'faixa_etaria' && !temFaixaReal ? ' — indisponível' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {config.modoSlide === 'faixa_etaria' && temFaixaReal && (
          <>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Células por faixa</InputLabel>
              <Select
                label="Células por faixa"
                value={config.faixaCelula}
                disabled={disabled || !onChange}
                onChange={(e) =>
                  persistConfig({ ...config, faixaCelula: e.target.value as ComparativoFaixaCelula })
                }
              >
                {(Object.entries(FAIXA_CELULA_LABELS) as [ComparativoFaixaCelula, string][]).map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Agrupamento faixa etária</InputLabel>
              <Select
                label="Agrupamento faixa etária"
                value={config.faixaAgrupamento}
                disabled={disabled || !onChange}
                onChange={(e) =>
                  persistConfig({
                    ...config,
                    faixaAgrupamento: e.target.value as ComparativoFaixaAgrupamento,
                  })
                }
              >
                {(Object.entries(FAIXA_AGRUPAMENTO_LABELS) as [ComparativoFaixaAgrupamento, string][]).map(
                  ([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </>
        )}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{isWorkspace ? 'Colunas por bloco' : 'Colunas/slide'}</InputLabel>
          <Select
            label={isWorkspace ? 'Colunas por bloco' : 'Colunas/slide'}
            value={config.colunasPorSlide}
            disabled={disabled || !onChange}
            onChange={(e) =>
              persistConfig({ ...config, colunasPorSlide: Number(e.target.value) as ComparativoEstudoConfig['colunasPorSlide'] })
            }
          >
            {[3, 4, 5, 6, 7].map((n) => (
              <MenuItem key={n} value={n}>
                {n} colunas
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={config.incluirColunaAtual}
              disabled={disabled || !onChange}
              onChange={(e) => persistConfig({ ...config, incluirColunaAtual: e.target.checked })}
            />
          }
          label="Incluir coluna ATUAL"
        />
        {!isWorkspace && !isFullscreen && !slidesViewMode && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="small"
              variant={config.visualizacao === 'pagina_completa' ? 'contained' : 'outlined'}
              disabled={disabled || !onChange}
              startIcon={<ViewAgendaOutlinedIcon />}
              onClick={() => persistConfig({ ...config, visualizacao: 'pagina_completa' })}
            >
              Página completa
            </Button>
            <Button
              size="small"
              variant={config.visualizacao === 'slide' ? 'contained' : 'outlined'}
              disabled={disabled || !onChange}
              startIcon={<SlideshowIcon />}
              onClick={() => persistConfig({ ...config, visualizacao: 'slide' })}
            >
              Slide
            </Button>
          </Stack>
        )}
      </Stack>
      {onChange && (
        <TextField
          label="Notas de rodapé"
          fullWidth
          size="small"
          multiline
          minRows={2}
          sx={{ mt: 2 }}
          value={config.notasRodape}
          disabled={disabled}
          onChange={(e) => persistConfig({ ...config, notasRodape: e.target.value })}
        />
      )}
    </Paper>
  )

  if (isFullscreen || isWorkspace) {
    const sidebar = (
      <Stack gap={2}>
        <ComparativoPropostasVisibilidadePanel
          colunas={colunasParaPainel}
          config={config}
          disabled={disabled || !onChange}
          onChange={persistConfig}
        />
        {configPanel}
      </Stack>
    )

    return (
      <Box
        sx={{
          height: isFullscreen ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0,
            position: isFullscreen ? 'relative' : 'sticky',
            top: isFullscreen ? undefined : 0,
            zIndex: 20,
            px: 2,
            py: 1.25,
            borderRadius: isFullscreen ? 0 : 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: isFullscreen ? 0 : 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <IconButton
              size="small"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              <ViewSidebarOutlinedIcon />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              {!isFullscreen && (
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Comparativo de propostas
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {MODO_LABELS[modoEfetivo]} · {colunasVisiveis} coluna(s) · {pages.length} bloco(s)
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              disabled={disabled || refreshing}
              onClick={() => void handleRefresh()}
            >
              Atualizar
            </Button>
            {onNavigateToLancamento && lancamentoDisponivel && (
              <Button
                variant="contained"
                size="small"
                startIcon={<EditNoteIcon />}
                disabled={disabled}
                onClick={onNavigateToLancamento}
              >
                Lançar propostas
              </Button>
            )}
            {onOpenSlides && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SlideshowIcon />}
                disabled={disabled}
                onClick={onOpenSlides}
              >
                Slides tela cheia
              </Button>
            )}
          </Stack>
        </Paper>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            minHeight: isFullscreen ? 0 : undefined,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: sidebarOpen ? { xs: '100%', md: 360 } : 0,
              flexShrink: 0,
              overflow: 'auto',
              borderRight: sidebarOpen ? 1 : 0,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'width 0.2s ease',
              display: { xs: sidebarOpen ? 'block' : 'none', md: sidebarOpen ? 'block' : 'none' },
              p: sidebarOpen ? 2 : 0,
            }}
          >
            {sidebar}
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: isFullscreen ? 0 : { xs: 480, md: '72vh' },
              overflow: 'auto',
              p: { xs: 1.5, md: 2.5 },
              bgcolor: 'grey.50',
            }}
          >
            <Box sx={{ width: 'max-content', minWidth: '100%' }}>{comparativoPreview}</Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Stack gap={2}>
      {modoEfetivo === 'unificado' && (
        <Alert severity="info" icon={<TableChartIcon fontSize="inherit" />}>
          Modo <strong>completo</strong>: cada bloco exibe as <strong>mesmas colunas</strong> no comparativo por
          plano (com consolidado financeiro logo abaixo da fatura mensal estimada) e no detalhe por plano. Ajuste
          «Colunas por bloco» para controlar quantas colunas aparecem juntas.
        </Alert>
      )}

      {modoEfetivo === 'contrato_plano' && (
        <Alert severity="info" icon={<TableChartIcon fontSize="inherit" />}>
          Comparativo <strong>detalhado por plano</strong>: faixas etárias, vidas e coberturas por coluna. O
          consolidado financeiro fica integrado abaixo da fatura. Para visão resumida, use o modo{' '}
          <strong>Consolidado financeiro</strong>.
        </Alert>
      )}

      {modoEfetivo === 'consolidado' && (
        <Alert severity="success" icon={<TableChartIcon fontSize="inherit" />}>
          Visão padrão: <strong>consolidado financeiro</strong> com colunas de operadoras, fatura mensal estimada e
          totais (custos e resultado) em tamanho ampliado.
        </Alert>
      )}

      {configPanel}

      <ComparativoPropostasVisibilidadePanel
        colunas={colunasParaPainel}
        config={config}
        disabled={disabled || !onChange}
        onChange={persistConfig}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <TableChartIcon sx={{ color: SLIDE_COLORS.info, fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            {MODO_LABELS[modoEfetivo]} · {colunasVisiveis} coluna(s) visível(is) ·{' '}
            {empilharPaginas
              ? `${faixaGruposCount > 0 && modoEfetivo === 'faixa_etaria' ? `${faixaGruposCount} seção(ões) · ` : ''}${pages.length} bloco(s) na página`
              : `${pages.length} slide(s)`}
          </Typography>
        </Stack>
        {modoEfetivo !== 'contrato_plano' && (
          <Stack direction="row" gap={1} alignItems="center">
            {!empilharPaginas && pages.length > 1 && (
              <>
                <IconButton size="small" disabled={pageIndex <= 0 || exporting} onClick={() => setPageIndex((p) => p - 1)}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {pageIndex + 1} / {pages.length}
                </Typography>
                <IconButton
                  size="small"
                  disabled={pageIndex >= pages.length - 1 || exporting}
                  onClick={() => setPageIndex((p) => p + 1)}
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
              onClick={() => void handleExport()}
              sx={{ bgcolor: SLIDE_COLORS.info, '&:hover': { bgcolor: SLIDE_COLORS.primary } }}
            >
              Baixar slide
            </Button>
            {pages.length > 1 && (
              <Button size="small" variant="outlined" disabled={disabled || exporting} onClick={() => void handleExportAll()}>
                Baixar todas
              </Button>
            )}
          </Stack>
        )}
        {modoEfetivo !== 'contrato_plano' && empilharPaginas && pages.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            disabled={disabled || exporting}
            onClick={() => void handleExportAll()}
          >
            Baixar todas as seções
          </Button>
        )}
      </Box>

      {comparativoPreview}
    </Stack>
  )
}
