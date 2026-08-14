import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import type { CotacaoFormState } from './CotacaoFormFields'
import { ComparativoEstudoDashboard } from './ComparativoEstudoDashboard'
import { ComparativoCoparticipacaoDashboard } from './ComparativoCoparticipacaoDashboard'
import { ComparativoReembolsoDashboard } from './ComparativoReembolsoDashboard'
import { ComparativoDiferenciaisDashboard } from './ComparativoDiferenciaisDashboard'
import { ComparativoPropostasVisibilidadePanel } from './ComparativoPropostasVisibilidadePanel'
import { useMasterDataStore } from '../../../store/masterDataStore'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import { useComparativoConfigPersist } from './useComparativoConfigPersist'
import {
  ensureComunicarMercadoState,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import {
  filterPanesVisiveis,
  parseApresentacaoPanesOcultas,
  type PropostaViewerPane,
} from './placementPropostaApresentacao'

export type { PropostaViewerPane } from './placementPropostaApresentacao'

const BeneficiariosResumoDashboard = lazy(() =>
  import('./BeneficiariosResumoDashboard').then((m) => ({ default: m.BeneficiariosResumoDashboard }))
)
const BeneficiariosLocalidadeDashboard = lazy(() =>
  import('./BeneficiariosLocalidadeDashboard').then((m) => ({
    default: m.BeneficiariosLocalidadeDashboard,
  }))
)
const MercadoConsultadoSlideDashboard = lazy(() =>
  import('./MercadoConsultadoSlideDashboard').then((m) => ({
    default: m.MercadoConsultadoSlideDashboard,
  }))
)
const ContratoAtualDashboard = lazy(() =>
  import('./ContratoAtualDashboard').then((m) => ({ default: m.ContratoAtualDashboard }))
)

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  headerLeft?: React.ReactNode
  headerRight?: React.ReactNode
  publicMode?: boolean
  initialPane?: PropostaViewerPane
}

function PaneLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  )
}

/**
 * Viewer robusto da proposta (mesmo visual do comparativo fullscreen),
 * com seções do deck comercial — não o slide 16:9 de PPT.
 */
export function PlacementPropostaViewer({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  headerLeft,
  headerRight,
  publicMode,
  initialPane,
}: Props) {
  const startPane: PropostaViewerPane = initialPane ?? (publicMode ? 'grupo_elegivel' : 'comparativo')
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

  const aguardandoOperadora = useMemo(() => {
    const comunicar = ensureComunicarMercadoState(
      parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
      form,
      operadoras,
      operadorasById
    )
    return ensureAguardandoOperadoraState(
      parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
      form,
      operadoras,
      operadorasById,
      comunicar
    )
  }, [form, operadoras, operadorasById])

  const panesVisiveis = useMemo(
    () => filterPanesVisiveis(parseApresentacaoPanesOcultas(aguardandoOperadora.apresentacaoPanesOcultas)),
    [aguardandoOperadora.apresentacaoPanesOcultas]
  )

  const { config: comparativoConfig, persistConfig } = useComparativoConfigPersist({
    cotacaoId,
    form,
    operadoras,
    operadorasById,
    onChange,
    onPersisted,
  })
  const contratoOrientacao =
    comparativoConfig.contratoOrientacao === 'vertical' ? 'vertical' : 'horizontal'

  const [pane, setPane] = useState<PropostaViewerPane>(() => {
    const allowed = new Set(panesVisiveis.map((p) => p.id))
    return allowed.has(startPane) ? startPane : panesVisiveis[0]?.id ?? 'comparativo'
  })
  const [contratoSidebarOpen, setContratoSidebarOpen] = useState(true)

  useEffect(() => {
    const allowed = new Set(panesVisiveis.map((p) => p.id))
    if (!allowed.has(pane)) {
      setPane(panesVisiveis[0]?.id ?? 'comparativo')
    }
  }, [panesVisiveis, pane])

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2.5 },
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
          {headerLeft}
          {publicMode ? (
            <Chip size="small" label="Apresentação pública" color="primary" variant="outlined" />
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={pane}
            onChange={(_, v: PropostaViewerPane | null) => v && setPane(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            {panesVisiveis.map((p) => (
              <ToggleButton key={p.id} value={p.id} sx={{ textTransform: 'none', px: 1.25 }}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {headerRight}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {pane === 'comparativo' ? (
          <ComparativoEstudoDashboard
            variant="fullscreen"
            cotacaoId={cotacaoId}
            form={form}
            onChange={onChange}
            onPersisted={onPersisted}
            onNavigateToCoparticipacao={() => setPane('coparticipacao')}
            onNavigateToReembolso={() => setPane('reembolso')}
            lancamentoDisponivel={false}
          />
        ) : pane === 'coparticipacao' ? (
          <ComparativoCoparticipacaoDashboard
            cotacaoId={cotacaoId}
            form={form}
            onChange={onChange}
            onPersisted={onPersisted}
            onNavigateToReembolso={() => setPane('reembolso')}
            lancamentoDisponivel={false}
          />
        ) : pane === 'reembolso' ? (
          <ComparativoReembolsoDashboard
            cotacaoId={cotacaoId}
            form={form}
            onChange={onChange}
            onPersisted={onPersisted}
            onNavigateToCoparticipacao={() => setPane('coparticipacao')}
            lancamentoDisponivel={false}
          />
        ) : pane === 'diferenciais' || pane === 'condicoes' || pane === 'indicadores' ? (
          <ComparativoDiferenciaisDashboard
            cotacaoId={cotacaoId}
            form={form}
            onChange={onChange}
            onPersisted={onPersisted}
            secaoFiltro={
              pane === 'condicoes' ? 'condicoes' : pane === 'indicadores' ? 'indicadores' : 'diferenciais'
            }
          />
        ) : (
          <Box sx={{ height: '100%', overflow: 'auto', p: { xs: 2, md: 3 } }}>
            <Suspense fallback={<PaneLoading />}>
              {pane === 'grupo_elegivel' ? (
                <BeneficiariosResumoDashboard cotacaoId={cotacaoId} presentationMode="page" />
              ) : pane === 'localidades' ? (
                <BeneficiariosLocalidadeDashboard
                  cotacaoId={cotacaoId}
                  presentationMode="page"
                />
              ) : pane === 'mercado' ? (
                <MercadoConsultadoSlideDashboard
                  form={form}
                  operadoras={operadoras}
                  operadorasById={operadorasById}
                  quadroMercado={aguardandoOperadora.quadroMercado}
                  disabled
                  showToggles={false}
                  presentationMode="page"
                />
              ) : pane === 'contrato_atual' ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    m: { xs: -2, md: -3 },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      px: 2,
                      py: 1,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Tooltip
                      title={
                        contratoSidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'
                      }
                    >
                      <IconButton
                        size="small"
                        color={contratoSidebarOpen ? 'primary' : 'default'}
                        onClick={() => setContratoSidebarOpen((v) => !v)}
                      >
                        <ViewSidebarOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: contratoSidebarOpen ? { xs: '100%', md: 360 } : 0,
                        flexShrink: 0,
                        overflow: 'auto',
                        borderRight: contratoSidebarOpen ? 1 : 0,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        display: contratoSidebarOpen ? 'block' : 'none',
                        p: contratoSidebarOpen ? 2 : 0,
                      }}
                    >
                      <ComparativoPropostasVisibilidadePanel
                        colunas={[]}
                        hideColunasSection
                        showOrientacao
                        orientacao={contratoOrientacao}
                        config={comparativoConfig}
                        onChange={persistConfig}
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'auto',
                        p: { xs: 1.5, md: 2.5 },
                        bgcolor: 'grey.50',
                      }}
                    >
                      <ContratoAtualDashboard
                        cotacaoId={cotacaoId}
                        presentationMode="workspace"
                        layoutOrientacao={contratoOrientacao}
                        linhasOcultas={comparativoConfig.linhasOcultas}
                        vidasColunaUnica={comparativoConfig.vidasColunaUnica}
                        custoPlanoExibicao={comparativoConfig.custoPlanoExibicao}
                      />
                    </Box>
                  </Box>
                </Box>
              ) : null}
            </Suspense>
          </Box>
        )}
      </Box>
    </Box>
  )
}
