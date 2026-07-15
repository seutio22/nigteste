import React, { useMemo, useState } from 'react'
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
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="th"
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
}: {
  children: React.ReactNode
  bold?: boolean
  align?: 'left' | 'center'
  accentTop?: string
}) {
  return (
    <Box
      component="td"
      sx={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: bold ? 800 : 500,
        textAlign: align,
        px: 0.65,
        py: 0.55,
        border: `1px solid ${SLIDE_COLORS.border}`,
        bgcolor: TABLE_GRAY,
        color: TABLE_NAVY,
        verticalAlign: 'top',
        borderTop: accentTop ? `3px solid ${accentTop}` : undefined,
      }}
    >
      {children}
    </Box>
  )
}

function DiferencialHeaders({ colunas }: { colunas: ComparativoDiferencialColuna[] }) {
  return (
    <>
      <tr>
        <Th>DIFERENCIAIS</Th>
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

function DiferenciaisTabelaSlide({
  page,
  ticket,
}: {
  page: ComparativoDiferencialPagina
  ticket: string
}) {
  return (
    <PlacementExpandedFrame>
      <PlacementSlideHeader
        title={page.titulo}
        subtitle={`Comparativo de diferenciais · ${ticket}`}
        icon={<AutoAwesomeIcon sx={{ fontSize: 22, color: '#fff' }} />}
        badge={page.totalPages > 1 ? `${page.pageIndex + 1}/${page.totalPages}` : undefined}
      />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box
          component="table"
          sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
        >
          <thead>
            <DiferencialHeaders colunas={page.colunas} />
          </thead>
          <tbody>
            {page.linhas.map((linha) => (
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
            ))}
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
    return filterDiferencialPages(raw, colunas)
  }, [form, operadoras, operadorasById, config.incluirColunaAtual, colunas])

  const currentPage = pages[pageIndex] ?? pages[0]
  const ticket = form.ticket || cotacaoId
  const paginaCompleta = exibirTodasPaginas

  if (!colunasTodas.length) {
    return (
      <Box sx={{ p: embedded ? 0 : 3 }}>
        <Alert severity="info">
          Cadastre propostas por fornecedor na etapa Aguardando operadora e preencha os diferenciais em{' '}
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

  const preview =
    modoVisualizacao === 'infografico' ? (
      paginaCompleta ? (
        <Stack spacing={2.5}>
          {pages.map((page, i) => (
            <ComparativoDiferenciaisInfografico key={`diff-info-${i}`} page={page} ticket={ticket} />
          ))}
        </Stack>
      ) : (
        currentPage && <ComparativoDiferenciaisInfografico page={currentPage} ticket={ticket} />
      )
    ) : paginaCompleta ? (
      <Stack spacing={2.5}>
        {pages.map((page, i) => (
          <DiferenciaisTabelaSlide key={`diff-tab-${i}`} page={page} ticket={ticket} />
        ))}
      </Stack>
    ) : (
      currentPage && <DiferenciaisTabelaSlide page={currentPage} ticket={ticket} />
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
                Editar
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.5}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Comparativo de diferenciais
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {colunas.length} fornecedor(es) · {pages.length} slide(s)
              {modoVisualizacao === 'infografico' ? ' · infográfico' : ' · tabela'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {onNavigateToLancamento && (
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
                Editar diferenciais
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
        </Stack>
      }
    >
      {inner}
    </ComparativoDetalheSidebarLayout>
  )
}
