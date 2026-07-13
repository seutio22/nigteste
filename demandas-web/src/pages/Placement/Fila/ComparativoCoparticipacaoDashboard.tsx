import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import TableChartIcon from '@mui/icons-material/TableChart'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import {
  buildComparativoCoparticipacaoColunas,
  buildComparativoCoparticipacaoPages,
  valorCopartLinha,
  type ComparativoCopartColuna,
  type ComparativoCoparticipacaoPagina,
} from './placementComparativoCoparticipacao'
import { CoparticipacaoSelo } from './CoparticipacaoSelo'
import { ComparativoCoparticipacaoInfografico } from './ComparativoCoparticipacaoInfografico'
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
const TABLE_HEADER_BG = SLIDE_COLORS.mint

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onNavigateToLancamento?: () => void
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

function CopartHeaders({ colunas }: { colunas: ComparativoCopartColuna[] }) {
  return (
    <>
      <tr>
        <Th>SAÚDE</Th>
        {colunas.map((c) => (
          <Th key={`g-${c.id}`}>{c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.'}</Th>
        ))}
      </tr>
      <tr>
        <Th>Operadoras</Th>
        {colunas.map((c) => (
          <Th key={`o-${c.id}`}>{c.operadora}</Th>
        ))}
      </tr>
      <tr>
        <Th>Planos &gt;</Th>
        {colunas.map((c) => (
          <Th key={`p-${c.id}`}>{c.planoLabel}</Th>
        ))}
      </tr>
    </>
  )
}

function CoparticipacaoSlide({
  page,
  ticket,
}: {
  page: ComparativoCoparticipacaoPagina
  ticket: string
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <PlacementSlideHeader
        title="Comparativo de Coparticipação"
        subtitle={`Detalhamento por procedimento · ${ticket}`}
        icon={<HealthAndSafetyIcon sx={{ fontSize: 22, color: '#fff' }} />}
      />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box
          component="table"
          sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
        >
          <thead>
            <CopartHeaders colunas={page.colunas} />
          </thead>
          <tbody>
            {page.linhas.map((linha) => (
              <tr key={linha.id}>
                <Td bold align="left">
                  {linha.label}
                </Td>
                {page.colunas.map((col) => (
                  <Td key={`${linha.id}-${col.id}`}>
                    {linha.tipo === 'selo' ? (
                      <CoparticipacaoSelo
                        valor={valorCopartLinha(col, linha)}
                        temCoparticipacao={col.copart.possui}
                        fontSize={10}
                      />
                    ) : (
                      valorCopartLinha(col, linha)
                    )}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
      <SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />
    </Paper>
  )
}

type ModoVisualizacaoCopart = 'infografico' | 'tabela'

export function ComparativoCoparticipacaoDashboard({
  cotacaoId,
  form,
  onNavigateToLancamento,
  lancamentoDisponivel,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const [pageIndex, setPageIndex] = useState(0)
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacaoCopart>('infografico')

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
  const colunas = useMemo(
    () =>
      buildComparativoCoparticipacaoColunas(
        form,
        operadoras,
        operadorasById,
        config.incluirColunaAtual
      ),
    [form, operadoras, operadorasById, config.incluirColunaAtual]
  )

  const pages = useMemo(
    () => buildComparativoCoparticipacaoPages(colunas, config.colunasPorSlide),
    [colunas, config.colunasPorSlide]
  )

  const currentPage = pages[pageIndex] ?? pages[0]
  const ticket = form.ticket || cotacaoId

  if (!colunas.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Cadastre propostas por fornecedor e informe a coparticipação (Sim/Não e detalhes) em{' '}
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Comparativo de coparticipação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mesmas colunas do comparativo financeiro · infográfico ou tabela por procedimento
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={modoVisualizacao}
              onChange={(_, v: ModoVisualizacaoCopart | null) => v && setModoVisualizacao(v)}
            >
              <ToggleButton value="infografico">
                <ViewAgendaOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Infográfico
              </ToggleButton>
              <ToggleButton value="tabela">
                <TableChartIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Tabela slide
              </ToggleButton>
            </ToggleButtonGroup>
            {lancamentoDisponivel && onNavigateToLancamento && (
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={onNavigateToLancamento}>
                Editar coparticipação
              </Button>
            )}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Colunas/slide</InputLabel>
              <Select label="Colunas/slide" value={config.colunasPorSlide} disabled>
                <MenuItem value={config.colunasPorSlide}>{config.colunasPorSlide}</MenuItem>
              </Select>
            </FormControl>
            {pages.length > 1 && (
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
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: { xs: 2, md: 3 } }}>
        {modoVisualizacao === 'infografico' ? (
          config.visualizacao === 'pagina_completa' ? (
            <Stack spacing={3}>
              {pages.map((page, i) => (
                <ComparativoCoparticipacaoInfografico key={`copart-info-${i}`} page={page} ticket={ticket} />
              ))}
            </Stack>
          ) : (
            currentPage && <ComparativoCoparticipacaoInfografico page={currentPage} ticket={ticket} />
          )
        ) : config.visualizacao === 'pagina_completa' ? (
          <Stack spacing={3}>
            {pages.map((page, i) => (
              <CoparticipacaoSlide key={`copart-page-${i}`} page={page} ticket={ticket} />
            ))}
          </Stack>
        ) : (
          currentPage && <CoparticipacaoSlide page={currentPage} ticket={ticket} />
        )}
      </Box>
    </Box>
  )
}
