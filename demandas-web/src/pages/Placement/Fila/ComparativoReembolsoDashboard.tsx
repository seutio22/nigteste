import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
} from '@mui/material'
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
  SLIDE_FONT_FAMILY,
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
  /** Oculta atalhos de navegação duplicados (ex.: tela cheia com menu superior). */
  hideToolbarActions?: boolean
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

function ReembolsoTabela({
  page,
}: {
  page: ComparativoReembolsoPagina
}) {
  const colAtual = page.colunas.find((c) => c.grupo === 'atual' && !c.placeholder)

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Box sx={{ px: 1.5, py: 1 }}>
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
  hideToolbarActions: _hideToolbarActions = false,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacaoReemb>('infografico')

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
      <Stack spacing={1.5}>
        {pages.map((page, i) => (
          <ComparativoReembolsoInfografico key={`reemb-info-${i}`} page={page} />
        ))}
      </Stack>
    ) : (
      <Stack spacing={1.5}>
        {pages.map((page, i) => (
          <ReembolsoTabela key={`reemb-page-${i}`} page={page} />
        ))}
      </Stack>
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
            exibirTodasPaginas
            onExibirTodasPaginasChange={() => undefined}
            showSlideOptions={false}
          />
        </Stack>
      }
    >
      {preview}
    </ComparativoDetalheSidebarLayout>
  )
}
