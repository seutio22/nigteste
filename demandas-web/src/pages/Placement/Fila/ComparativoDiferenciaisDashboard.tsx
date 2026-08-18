import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import TableChartIcon from '@mui/icons-material/TableChart'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  buildComparativoDiferencialColunas,
  buildComparativoDiferencialPages,
  filterDiferencialPages,
  listarColunasDiferenciais,
  type ComparativoDiferencialColuna,
  type ComparativoDiferencialPagina,
} from './placementComparativoDiferenciais'
import { getIndicadorOperadoraItem } from './placementIndicadoresOperadorasCatalogo'
import { ComparativoDiferenciaisInfografico } from './ComparativoDiferenciaisInfografico'
import { ComparativoDetalheOpcoesPanel } from './ComparativoDetalheOpcoesPanel'
import { ComparativoDetalheSidebarLayout } from './ComparativoDetalheSidebarLayout'
import { DiferencialCelulaContent } from './DiferencialCelulaContent'
import { emptyComparativoEstudoConfig } from './placementAguardandoOperadora'
import { filterComparativoColunas } from './placementComparativoVisibilidade'
import { useMasterDataStore } from '../../../store/masterDataStore'
import {
  PlacementExpandedFrame,
  PlacementSlideHeader,
  SLIDE_FONT_FAMILY,
  SlidePageFooter,
  TABLE_GRAY,
  TABLE_NAVY,
} from './placementSlideShell'
import { SLIDE_COLORS } from './placementSlideTheme'

const FONT = SLIDE_FONT_FAMILY
const TABLE_HEADER_BG = SLIDE_COLORS.mint

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange?: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  embedded?: boolean
  onNavigateToLancamento?: () => void
  /** Exibe apenas diferenciais, condições ou indicadores no comparativo. */
  secaoFiltro?: 'diferenciais' | 'condicoes' | 'indicadores'
}

function Th({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <Box
      component="th"
      colSpan={colSpan}
      sx={{
        bgcolor: TABLE_HEADER_BG,
        color: TABLE_NAVY,
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 800,
        textAlign: 'center',
        px: 0.5,
        py: 0.45,
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
  align = 'center',
  accentTop,
  colSpan,
  zebra,
}: {
  children: React.ReactNode
  bold?: boolean
  align?: 'left' | 'center'
  accentTop?: string
  colSpan?: number
  zebra?: boolean
}) {
  return (
    <Box
      component="td"
      colSpan={colSpan}
      sx={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: bold ? 800 : 500,
        textAlign: align,
        px: 0.65,
        py: 0.55,
        border: `1px solid ${SLIDE_COLORS.border}`,
        bgcolor: zebra ? TABLE_GRAY : SLIDE_COLORS.white,
        color: TABLE_NAVY,
        verticalAlign: 'top',
        borderTop: accentTop ? `3px solid ${accentTop}` : undefined,
      }}
    >
      {children}
    </Box>
  )
}

function DiferencialHeaders({
  colunas,
  matrizLabel,
}: {
  colunas: ComparativoDiferencialColuna[]
  matrizLabel: string
}) {
  return (
    <>
      <tr>
        <Th>{matrizLabel}</Th>
        {colunas.map((c) => (
          <Th key={`g-${c.id}`}>{c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'}</Th>
        ))}
      </tr>
      <tr>
        <Th>Fornecedores</Th>
        {colunas.map((c) => (
          <Th key={`o-${c.id}`}>{c.operadora}</Th>
        ))}
      </tr>
    </>
  )
}

function IndicadoresHeaders({ colunas }: { colunas: ComparativoDiferencialColuna[] }) {
  return (
    <>
      <tr>
        <Th>ÍNDICE</Th>
        <Th>NOMENCLATURA DO ÍNDICE</Th>
        <Th>DESCRIÇÃO DO ÍNDICE</Th>
        {colunas.map((c) => (
          <Box
            component="th"
            key={`g-${c.id}`}
            sx={{
              bgcolor: TABLE_HEADER_BG,
              color: c.tabColor,
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 800,
              textAlign: 'center',
              px: 0.5,
              py: 0.45,
              border: `1px solid ${SLIDE_COLORS.border}`,
              verticalAlign: 'middle',
              borderTop: `3px solid ${c.tabColor}`,
            }}
          >
            {c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'}
          </Box>
        ))}
      </tr>
      <tr>
        <Th colSpan={3}> </Th>
        {colunas.map((c) => (
          <Box
            component="th"
            key={`o-${c.id}`}
            sx={{
              bgcolor: TABLE_HEADER_BG,
              color: TABLE_NAVY,
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 800,
              textAlign: 'center',
              px: 0.5,
              py: 0.45,
              border: `1px solid ${SLIDE_COLORS.border}`,
              verticalAlign: 'middle',
            }}
          >
            {c.operadora}
          </Box>
        ))}
      </tr>
    </>
  )
}

function DiferenciaisTabelaSlide({
  page,
  ticket,
}: {
  page: ComparativoDiferencialPagina
  ticket: string
}) {
  const isIndicadores = page.secao === 'indicadores'

  return (
    <PlacementExpandedFrame>
      <PlacementSlideHeader
        title={page.titulo}
        subtitle={`Comparativo · ${ticket}`}
        icon={<AutoAwesomeIcon sx={{ fontSize: 22, color: '#fff' }} />}
        badge={page.totalPages > 1 ? `${page.pageIndex + 1}/${page.totalPages}` : undefined}
      />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box
          component="table"
          sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
        >
          <thead>
            {isIndicadores ? (
              <IndicadoresHeaders colunas={page.colunas} />
            ) : (
              <DiferencialHeaders colunas={page.colunas} matrizLabel={page.matrizLabel} />
            )}
          </thead>
          <tbody>
            {page.linhas.map((linha, rowIdx) => {
              if (!isIndicadores) {
                return (
                  <tr key={linha.itemKey}>
                    <Td bold align="left">
                      {linha.label}
                    </Td>
                    {page.colunas.map((col) => (
                      <Td key={`${linha.itemKey}-${col.id}`} align="left" accentTop={col.tabColor}>
                        <DiferencialCelulaContent
                          celulas={linha.celulasPorColuna[col.id]}
                          tabColor={col.tabColor}
                          variant="table"
                        />
                      </Td>
                    ))}
                  </tr>
                )
              }

              const meta = getIndicadorOperadoraItem(linha.itemKey)
              const detalhado = meta?.layout === 'detalhado'
              const zebra = rowIdx % 2 === 1
              return (
                <tr key={linha.itemKey}>
                  {detalhado ? (
                    <>
                      <Td bold align="left" zebra={zebra}>
                        {meta?.indice ?? linha.label}
                      </Td>
                      <Td align="left" zebra={zebra}>
                        {meta?.nomenclatura ?? ''}
                      </Td>
                      <Td align="left" zebra={zebra}>
                        <Typography
                          sx={{
                            fontFamily: FONT,
                            fontSize: 8,
                            lineHeight: 1.35,
                            color: TABLE_NAVY,
                          }}
                        >
                          {meta?.descricao ?? ''}
                        </Typography>
                      </Td>
                    </>
                  ) : (
                    <Td bold align="left" colSpan={3} zebra={zebra}>
                      {linha.label}
                    </Td>
                  )}
                  {page.colunas.map((col) => (
                    <Td
                      key={`${linha.itemKey}-${col.id}`}
                      align="center"
                      accentTop={col.tabColor}
                      zebra={zebra}
                    >
                      <DiferencialCelulaContent
                        celulas={linha.celulasPorColuna[col.id]}
                        tabColor={col.tabColor}
                        variant="table"
                      />
                    </Td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </Box>
        <Typography
          sx={{
            display: 'block',
            mt: 1.25,
            fontFamily: FONT,
            fontSize: 8,
            color: SLIDE_COLORS.infoLight,
            lineHeight: 1.4,
          }}
        >
          {page.notasRodape}
        </Typography>
      </Box>
      <SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />
    </PlacementExpandedFrame>
  )
}

type ModoVisualizacao = 'infografico' | 'tabela'

export function ComparativoDiferenciaisDashboard({
  cotacaoId,
  form,
  embedded,
  onNavigateToLancamento,
  secaoFiltro,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const [pageIndex, setPageIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(!embedded)
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('infografico')
  const [exibirTodasPaginas, setExibirTodasPaginas] = useState(true)
  const [config, setConfig] = useState(emptyComparativoEstudoConfig)

  const colunasTodas = useMemo(
    () => buildComparativoDiferencialColunas(form, operadoras, operadorasById, config.incluirColunaAtual),
    [form, operadoras, operadorasById, config.incluirColunaAtual]
  )

  const colunas = useMemo(
    () => filterComparativoColunas(colunasTodas, config.colunasOcultas),
    [colunasTodas, config.colunasOcultas]
  )

  const colunasParaPainel = useMemo(() => listarColunasDiferenciais(colunasTodas), [colunasTodas])

  const pages = useMemo(() => {
    const raw = buildComparativoDiferencialPages(form, operadoras, operadorasById, config.incluirColunaAtual)
    const filtered = filterDiferencialPages(raw, colunas)
    if (!secaoFiltro) return filtered
    const only = filtered.filter((p) => p.secao === secaoFiltro)
    const totalPages = only.length
    return only.map((p, pageIndex) => ({ ...p, pageIndex, totalPages }))
  }, [form, operadoras, operadorasById, config.incluirColunaAtual, colunas, secaoFiltro])

  useEffect(() => {
    setPageIndex(0)
  }, [secaoFiltro])

  const currentPage = pages[pageIndex] ?? pages[0]
  const ticket = form.ticket || cotacaoId
  const paginaCompleta = exibirTodasPaginas
  const tituloSecao =
    secaoFiltro === 'condicoes'
      ? 'Comparativo de condições contratuais'
      : secaoFiltro === 'indicadores'
        ? 'Comparativo de Indicadores das Operadoras'
        : secaoFiltro === 'diferenciais'
          ? 'Comparativo de diferenciais'
          : 'Comparativo (diferenciais, condições e indicadores)'
  const editLabel =
    secaoFiltro === 'condicoes'
      ? 'Editar condições'
      : secaoFiltro === 'indicadores'
        ? 'Editar indicadores'
        : 'Editar lançamento'

  if (!colunasTodas.length) {
    return (
      <Box sx={{ p: embedded ? 0 : 3 }}>
        <Alert severity="info">
          Cadastre propostas por fornecedor na etapa Aguardando operadora e preencha diferenciais e condições em{' '}
          <strong>Lançamento</strong>.
        </Alert>
        {onNavigateToLancamento && (
          <Button sx={{ mt: 2 }} variant="contained" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
            Ir para lançamento
          </Button>
        )}
      </Box>
    )
  }

  if (!colunas.length) {
    return (
      <Box sx={{ p: embedded ? 2 : 3 }}>
        <Alert severity="warning">
          Todas as colunas estão ocultas. Abra o painel lateral e selecione ao menos um fornecedor.
        </Alert>
      </Box>
    )
  }

  if (!pages.length) {
    return (
      <Box sx={{ p: embedded ? 0 : 3 }}>
        <Alert severity="info">
          {secaoFiltro === 'condicoes'
            ? 'Nenhuma condição contratual visível na proposta. Preencha o lançamento ou reative itens ocultos.'
            : secaoFiltro === 'indicadores'
              ? 'Nenhum indicador visível na proposta. Preencha o lançamento ou reative itens ocultos.'
              : secaoFiltro === 'diferenciais'
                ? 'Nenhum diferencial visível na proposta. Preencha o lançamento ou reative itens ocultos.'
                : 'Nenhum item visível no comparativo.'}
        </Alert>
        {onNavigateToLancamento && (
          <Button sx={{ mt: 2 }} variant="contained" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
            {editLabel}
          </Button>
        )}
      </Box>
    )
  }

  const renderPage = (page: ComparativoDiferencialPagina, i: number) =>
    // Indicadores: infográfico do sistema (logos + cores) já inclui Índice/Nomenclatura/Descrição.
    // Demais seções respeitam o toggle infográfico/tabela.
    modoVisualizacao === 'tabela' && page.secao !== 'indicadores' ? (
      <DiferenciaisTabelaSlide key={`diff-tab-${page.secao}-${i}`} page={page} ticket={ticket} />
    ) : page.secao === 'indicadores' || modoVisualizacao === 'infografico' ? (
      <ComparativoDiferenciaisInfografico key={`diff-info-${page.secao}-${i}`} page={page} ticket={ticket} />
    ) : (
      <DiferenciaisTabelaSlide key={`diff-tab-${page.secao}-${i}`} page={page} ticket={ticket} />
    )

  const preview = paginaCompleta ? (
    <Stack spacing={2.5}>{pages.map((page, i) => renderPage(page, i))}</Stack>
  ) : (
    currentPage && renderPage(currentPage, pageIndex)
  )

  const inner = (
    <>
      {preview}
    </>
  )

  if (embedded) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {colunas.length} fornecedor(es) · {pages.length} slide(s)
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={modoVisualizacao}
              onChange={(_, v: ModoVisualizacao | null) => v && setModoVisualizacao(v)}
            >
              <ToggleButton value="infografico" aria-label="Infográfico">
                <ViewAgendaOutlinedIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
              <ToggleButton value="tabela" aria-label="Tabela">
                <TableChartIcon sx={{ fontSize: 16 }} />
              </ToggleButton>
            </ToggleButtonGroup>
            {!paginaCompleta && pages.length > 1 && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton size="small" disabled={pageIndex <= 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {pageIndex + 1}/{pages.length}
                </Typography>
                <IconButton
                  size="small"
                  disabled={pageIndex >= pages.length - 1}
                  onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            )}
            {onNavigateToLancamento && (
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
                {editLabel}
              </Button>
            )}
          </Stack>
        </Stack>
        {inner}
      </Box>
    )
  }

  return (
    <ComparativoDetalheSidebarLayout
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebar={
        <ComparativoDetalheOpcoesPanel
          colunas={colunasParaPainel}
          config={config}
          onConfigChange={setConfig}
          modoVisualizacao={modoVisualizacao}
          onModoVisualizacaoChange={setModoVisualizacao}
          exibirTodasPaginas={paginaCompleta}
          onExibirTodasPaginasChange={setExibirTodasPaginas}
        />
      }
      toolbar={
        onNavigateToLancamento || (!paginaCompleta && pages.length > 1) ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ bgcolor: 'background.paper', boxShadow: 1, borderRadius: 1, px: 0.75, py: 0.25 }}
          >
            {onNavigateToLancamento && (
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
                {editLabel}
              </Button>
            )}
            {!paginaCompleta && pages.length > 1 && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconButton
                  size="small"
                  disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 48, textAlign: 'center' }}>
                  {pageIndex + 1}/{pages.length}
                </Typography>
                <IconButton
                  size="small"
                  disabled={pageIndex >= pages.length - 1}
                  onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            )}
          </Stack>
        ) : undefined
      }
    >
      {inner}
    </ComparativoDetalheSidebarLayout>
  )
}
