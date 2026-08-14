import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import PaymentsIcon from '@mui/icons-material/Payments'
import EditNoteIcon from '@mui/icons-material/EditNote'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  buildComparativoReembolsoColunas,
  buildComparativoReembolsoPagesAlinhadas,
  comparacaoReembolsoCelula,
  valorReembolsoLinha,
  type ComparativoReembColuna,
  type ComparativoReembolsoPagina,
} from './placementComparativoReembolso'
import { ReembolsoSelo } from './ReembolsoSelo'
import { ReembolsoComparacaoIcon } from './ReembolsoComparacaoIcon'
import { ComparativoReembolsoInfografico } from './ComparativoReembolsoInfografico'
import { ComparativoDetalheOpcoesPanel } from './ComparativoDetalheOpcoesPanel'
import { ComparativoDetalheSidebarLayout } from './ComparativoDetalheSidebarLayout'
import { useComparativoConfigPersist } from './useComparativoConfigPersist'
import { ComparativoEstudosSwitcher } from './ComparativoEstudosSwitcher'
import {
  filterComparativoColunas,
  listarColunasContratoPlano,
} from './placementComparativoVisibilidade'
import { planosReferenciaAbertura } from './placementPropostaEquivalencia'
import { useMasterDataStore } from '../../../store/masterDataStore'
import {
  PlacementSlideHeader,
  SLIDE_FONT_FAMILY,
  SlidePageFooter,
  TABLE_GRAY,
  TABLE_NAVY,
} from './placementSlideShell'
import { SLIDE_COLORS } from './placementSlideTheme'

const FONT = SLIDE_FONT_FAMILY
const TABLE_HEADER_BG = '#E8F4FC'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange?: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  onNavigateToLancamento?: () => void
  onNavigateToCoparticipacao?: () => void
  lancamentoDisponivel?: boolean
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
}: {
  children: React.ReactNode
  bold?: boolean
  align?: 'left' | 'center'
}) {
  return (
    <Box
      component="td"
      sx={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: bold ? 700 : 500,
        textAlign: align,
        px: 0.5,
        py: 0.45,
        border: `1px solid ${SLIDE_COLORS.border}`,
        bgcolor: TABLE_GRAY,
        color: TABLE_NAVY,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </Box>
  )
}

function ReembHeaders({ colunas }: { colunas: ComparativoReembColuna[] }) {
  return (
    <>
      <tr>
        <Th>SAÚDE</Th>
        {colunas.map((c) => (
          <Th key={`g-${c.id}`}>
            {c.placeholder ? '—' : c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'}
          </Th>
        ))}
      </tr>
      <tr>
        <Th>Operadoras</Th>
        {colunas.map((c) => (
          <Th key={`o-${c.id}`}>{c.placeholder ? '—' : c.operadora}</Th>
        ))}
      </tr>
      <tr>
        <Th>Planos &gt;</Th>
        {colunas.map((c) => (
          <Th key={`p-${c.id}`}>{c.placeholder ? '—' : c.planoLabel}</Th>
        ))}
      </tr>
    </>
  )
}

function ReembolsoSlide({
  page,
  ticket,
}: {
  page: ComparativoReembolsoPagina
  ticket: string
}) {
  const colAtual = page.colunas.find((c) => c.grupo === 'atual' && !c.placeholder)

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <PlacementSlideHeader
        title="Comparativo de Reembolso"
        subtitle={
          page.grupoLabel
            ? `${page.grupoLabel} · detalhamento por procedimento · ${ticket}`
            : `Detalhamento por procedimento · ${ticket}`
        }
        icon={<PaymentsIcon sx={{ fontSize: 22, color: '#fff' }} />}
      />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box
          component="table"
          sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
        >
          <thead>
            <ReembHeaders colunas={page.colunas} />
          </thead>
          <tbody>
            {page.linhas.map((linha) => (
              <tr key={linha.id}>
                <Td bold align="left">
                  {linha.label}
                </Td>
                {page.colunas.map((col) => {
                  const texto = valorReembolsoLinha(col, linha)
                  const comparacao = comparacaoReembolsoCelula(col, linha, colAtual)
                  if (!col.placeholder && linha.tipo === 'selo') {
                    return (
                      <Td key={`${linha.id}-${col.id}`}>
                        <ReembolsoSelo
                          valor={texto}
                          temReembolso={col.temReembolso}
                          fontSize={10}
                        />
                      </Td>
                    )
                  }
                  return (
                    <Td key={`${linha.id}-${col.id}`}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.4,
                        }}
                      >
                        <ReembolsoComparacaoIcon comparacao={comparacao} size={14} />
                        <span>{texto}</span>
                      </Box>
                    </Td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />
    </Paper>
  )
}

type ModoVisualizacaoReemb = 'infografico' | 'tabela'

export function ComparativoReembolsoDashboard({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  onNavigateToLancamento,
  onNavigateToCoparticipacao,
  lancamentoDisponivel,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const [pageIndex, setPageIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacaoReemb>('infografico')
  const [exibirTodasPaginas, setExibirTodasPaginas] = useState(
    () => form.kickOffEstrategia?.aguardandoOperadora?.comparativoConfig?.visualizacao !== 'slide'
  )

  const {
    config,
    persistConfig,
    canPersist,
    estudos,
    ativoId,
    selectEstudo,
  } = useComparativoConfigPersist({
    cotacaoId,
    form,
    operadoras,
    operadorasById,
    onChange,
    onPersisted,
  })

  const colunasTodas = useMemo(
    () =>
      buildComparativoReembolsoColunas(
        form,
        operadoras,
        operadorasById,
        config.incluirColunaAtual
      ),
    [form, operadoras, operadorasById, config.incluirColunaAtual]
  )

  const colunas = useMemo(
    () => filterComparativoColunas(colunasTodas, config.colunasOcultas),
    [colunasTodas, config.colunasOcultas]
  )

  const referencias = useMemo(
    () => planosReferenciaAbertura(form, operadoras, operadorasById),
    [form, operadoras, operadorasById]
  )

  const colunasParaPainel = useMemo(
    () => listarColunasContratoPlano(colunasTodas),
    [colunasTodas]
  )

  const pages = useMemo(
    () =>
      buildComparativoReembolsoPagesAlinhadas(
        colunasTodas,
        config.colunasOcultas,
        referencias
      ),
    [colunasTodas, config.colunasOcultas, referencias]
  )

  const currentPage = pages[pageIndex] ?? pages[0]
  const ticket = form.ticket || cotacaoId
  const paginaCompleta = exibirTodasPaginas || config.visualizacao === 'pagina_completa'

  if (!colunasTodas.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Cadastre propostas por fornecedor e informe o reembolso (Sim/Não e detalhes) em{' '}
          <strong>Lançar propostas</strong> para gerar o comparativo.
        </Alert>
        {lancamentoDisponivel && onNavigateToLancamento && (
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            startIcon={<EditNoteIcon />}
            onClick={onNavigateToLancamento}
          >
            Ir para lançamento de propostas
          </Button>
        )}
      </Box>
    )
  }

  if (!colunas.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Todas as colunas estão ocultas. Abra o painel lateral e selecione ao menos uma operadora/plano.
        </Alert>
      </Box>
    )
  }

  const preview =
    modoVisualizacao === 'infografico' ? (
      paginaCompleta ? (
        <Stack spacing={3}>
          {pages.map((page, i) => (
            <ComparativoReembolsoInfografico key={`reemb-info-${i}`} page={page} ticket={ticket} />
          ))}
        </Stack>
      ) : (
        currentPage && <ComparativoReembolsoInfografico page={currentPage} ticket={ticket} />
      )
    ) : paginaCompleta ? (
      <Stack spacing={3}>
        {pages.map((page, i) => (
          <ReembolsoSlide key={`reemb-page-${i}`} page={page} ticket={ticket} />
        ))}
      </Stack>
    ) : (
      currentPage && <ReembolsoSlide page={currentPage} ticket={ticket} />
    )

  return (
    <ComparativoDetalheSidebarLayout
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebar={
        <Stack spacing={1.5}>
          <ComparativoEstudosSwitcher
            mode="present"
            estudos={estudos}
            ativoId={ativoId}
            disabled={!canPersist}
            onSelect={selectEstudo}
          />
          <ComparativoDetalheOpcoesPanel
            colunas={colunasParaPainel}
            config={config}
            disabled={!canPersist}
            onConfigChange={canPersist ? persistConfig : undefined}
            modoVisualizacao={modoVisualizacao}
            onModoVisualizacaoChange={setModoVisualizacao}
            exibirTodasPaginas={paginaCompleta}
            onExibirTodasPaginasChange={setExibirTodasPaginas}
          />
        </Stack>
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
              Comparativo de reembolso
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {colunas.length} coluna(s) · {pages.length} plano(s) equivalente(s)
              {modoVisualizacao === 'infografico' ? ' · infográfico' : ' · tabela'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {lancamentoDisponivel && onNavigateToLancamento && (
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
                Editar reembolso
              </Button>
            )}
            {onNavigateToCoparticipacao && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<HealthAndSafetyIcon />}
                onClick={onNavigateToCoparticipacao}
              >
                Comparativo coparticipação
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
      {preview}
    </ComparativoDetalheSidebarLayout>
  )
}
