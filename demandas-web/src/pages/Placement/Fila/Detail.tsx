import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import {
  PlacementNavForwardButton,
  placementNavBackSx,
  placementNavButtonSx,
} from './placementWorkflowNav'
import { placementWorkflowCardSx } from './placementWorkflowTheme'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { api } from '../../../lib/api.local'
import { CotacaoFormFields, type CotacaoFormState } from './CotacaoFormFields'
import { formatCentsToBRL, getStatusColor, getWorkflowStatusDisplayLabel } from './utils'
import {
  emptyMapeamentoItem,
  parseItensFromApi,
  parsePlanosBundleFromApi,
  summarizeItensNomes,
} from './placementCotacaoDetalhes'
import {
  validateIniciarProcessoNaFila,
} from './placementCotacaoSubmit'
import { buildFullCotacaoSavePayload, buildScopedSavePayload } from './placementCotacaoSavePayload'
import { parseFormularioTipoFromApi, simNaoFromApi } from './placementFormularioContrato'
import { validateEtapaBaseAtual, validateEtapaEmCotacao, validateEtapaKickOff } from './placementWorkflowAdvance'
import { PlacementCotacaoWorkflowPanel } from './PlacementCotacaoWorkflowPanel'
import { PlacementCotacaoDetailTabs } from './PlacementCotacaoDetailTabs'
import { PlacementFilaPageShell } from './PlacementFilaPageShell'
import { getWorkflowStageKey, getWorkflowStageMeta } from './placementCotacaoWorkflow'
import { patchKickOffInForm } from './placementPatchKickOff'
import { mercadoNomesComFornecedoresAtuais } from './placementMercadoQuadro'
import {
  appendValidacaoHistorico,
  ensureValidacaoPropostaState,
  parseValidacaoPropostaFromKickOff,
} from './placementValidacaoProposta'
import { formScopeForWorkflow } from './placementCotacaoFormScope'
import { isRascunhoStatus } from './placementCotacaoStatus'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'
import { useAuthStore } from '../../../store/authStore'
import { parseKickOffEstrategiaFromApi } from './placementKickOffEstrategia'
import { preferRicherKickOffWhenApplyingApi, mergeSavedKickOffIntoApiCotacao, mergeApiCotacaoIntoForm } from './placementKickOffPersist'
import { getRetreatDiscardScope, type WorkflowRetreatMode } from './placementWorkflowRetreat'
import { comunicarMercadoIsComplete } from './placementComunicarMercado'
import { normalizeEmCotacaoSubetapa } from './placementEmCotacaoWorkflow'
import { ensurePlacementBeforeUnloadFlush, flushAllPlacementPendingSaves, flushAllRegisteredPlacementDrafts } from './placementFlushRegistry'

function metricasResumoDeApi(data: any): { valorCents: number | null; vidas: number | null } {
  return {
    valorCents: typeof data?.valorEstimadoCents === 'number' ? data.valorEstimadoCents : null,
    vidas: typeof data?.vidas === 'number' ? data.vidas : null,
  }
}

export default function PlacementFilaDetailPage({ fullscreen = false }: { fullscreen?: boolean }) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { analistas: analistasCadastro, operadoras, operadorasById, syncFromApi: syncMasterData } =
    useMasterDataStore()
  const placementAnalistas = usePlacementStore((s) => s.analistas)
  const { user } = useAuthStore()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.getById(id ?? ''))
  const updateCotacao = usePlacementCotacaoStore((s) => s.updateCotacao)
  const patchWorkflowStatus = usePlacementCotacaoStore((s) => s.patchWorkflowStatus)
  const iniciarProcesso = usePlacementCotacaoStore((s) => s.iniciarProcesso)
  const removeCotacao = usePlacementCotacaoStore((s) => s.removeCotacao)

  const [form, setForm] = useState<CotacaoFormState | null>(null)
  /** Sempre o form mais recente (inclui patches sync antes do re-render) — usado na validação de avanço. */
  const formRef = useRef<CotacaoFormState | null>(null)
  formRef.current = form
  const [loading, setLoading] = useState(true)
  const [formSaving, setFormSaving] = useState(false)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [metricasCabecalho, setMetricasCabecalho] = useState<{
    valorCents: number | null
    vidas: number | null
  }>({ valorCents: null, vidas: null })
  const [emCotacaoSubetapa, setEmCotacaoSubetapa] = useState<string>('beneficiarios')
  const [beneficiariosTotal, setBeneficiariosTotal] = useState(0)
  const [editingAbertura, setEditingAbertura] = useState(false)
  const [analistaResponsavelMeta, setAnalistaResponsavelMeta] = useState<{
    id: string
    nome: string
    coordenadorAnalista: string
    gerenteAnalista: string
  } | null>(null)

  const workflowStageKey = useMemo(
    () => getWorkflowStageKey(form?.status ?? 'Aberta'),
    [form?.status]
  )

  const analistaCadastroNome = useMemo(() => {
    if (!form?.analistaId) return undefined
    return analistasCadastro.find((a) => a.id === form.analistaId)?.nome
  }, [analistasCadastro, form?.analistaId])

  const analistaResponsavelNome = useMemo(
    () => analistaResponsavelMeta?.nome,
    [analistaResponsavelMeta?.nome]
  )

  useEffect(() => {
    ensurePlacementBeforeUnloadFlush()
    return () => {
      flushAllRegisteredPlacementDrafts()
    }
  }, [])

  useEffect(() => {
    void syncMasterData?.({ entities: ['operadoras', 'produtos', 'analistas', 'clientes'] })
  }, [syncMasterData])

  const voltarParaFila = useCallback(() => {
    flushAllRegisteredPlacementDrafts()
    navigate('/placement/fila')
  }, [navigate])

  const voltarParaCotacao = useCallback(() => {
    if (id) navigate(`/placement/fila/${id}`)
    else voltarParaFila()
  }, [id, navigate, voltarParaFila])

  const abrirSlidesTelaCheia = useCallback(() => {
    if (id) navigate(`/placement/fila/${id}/slides`)
  }, [id, navigate])

  const abrirComparativoTelaCheia = useCallback(() => {
    if (id) navigate(`/placement/fila/${id}/comparativo`)
  }, [id, navigate])

  const abrirEtapaTelaCheia = useCallback(() => {
    if (id) navigate(`/placement/fila/${id}/etapa`)
  }, [id, navigate])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)

    const seed = cotacaoFromStore
    if (seed) {
      setForm(toFormState(seed))
      setAnalistaResponsavelMeta(seed.analistaResponsavel ?? null)
      setMetricasCabecalho(metricasResumoDeApi(seed))
      setLoading(false)
    }

    api
      .get(`/placement/cotacoes/${id}`)
      .then((data: any) => {
        if (cancelled) return
        setForm((prev) => {
          const next = toFormState(data)
          if (!prev) return next
          return {
            ...next,
            kickOffEstrategia: preferRicherKickOffWhenApplyingApi(
              next.kickOffEstrategia,
              prev.kickOffEstrategia
            ),
          }
        })
        setAnalistaResponsavelMeta(data?.analistaResponsavel ?? null)
        setMetricasCabecalho(metricasResumoDeApi(data))
        setEmCotacaoSubetapa(String(data?.emCotacaoSubetapa ?? 'beneficiarios'))
        if (typeof data?._count?.beneficiarios === 'number') {
          setBeneficiariosTotal(data._count.beneficiarios)
        }
        setLoading(false)
      })
      .catch((err: any) => {
        if (cancelled) return
        console.error('❌ GET cotacao:', err)
        if (!seed) {
          setErrorMsg('Não foi possível carregar a cotação.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, cotacaoFromStore?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const headerStatusColor = useMemo(
    () => getStatusColor(form?.status ?? 'Aberta'),
    [form?.status]
  )

  const patchForm = useCallback((next: CotacaoFormState | ((prev: CotacaoFormState | null) => CotacaoFormState | null)) => {
    if (typeof next === 'function') {
      setForm((prev) => {
        const resolved = next(prev)
        formRef.current = resolved
        return resolved
      })
      return
    }
    formRef.current = next
    setForm(next)
  }, [])

  const getLatestForm = useCallback((): CotacaoFormState => {
    return formRef.current ?? form!
  }, [form])

  const isDraft = isRascunhoStatus(form?.status)

  function applyLightCotacaoPatch(data: any) {
    setForm((prev) => {
      if (!prev) return prev
      let kickOffEstrategia = prev.kickOffEstrategia
      if (data.kickOffEstrategia === null) {
        kickOffEstrategia = undefined
      } else if (data.kickOffEstrategia !== undefined) {
        const apiKickOff = parseKickOffEstrategiaFromApi(data.kickOffEstrategia)
        kickOffEstrategia = preferRicherKickOffWhenApplyingApi(apiKickOff, prev.kickOffEstrategia)
      }
      return {
        ...prev,
        status: data.status ?? prev.status,
        kickOffEstrategia,
      }
    })
    if (data.emCotacaoSubetapa != null) {
      setEmCotacaoSubetapa(String(data.emCotacaoSubetapa))
    }
    if (data.valorEstimadoCents !== undefined || data.vidas !== undefined) {
      setMetricasCabecalho(metricasResumoDeApi(data))
    }
  }

  function applyCotacaoFromApi(data: any) {
    setForm((prev) => {
      const next = toFormState(data)
      if (!prev) return next
      return mergeApiCotacaoIntoForm(prev, next, data)
    })
    setAnalistaResponsavelMeta(data?.analistaResponsavel ?? null)
    setMetricasCabecalho(metricasResumoDeApi(data))
  }

  async function handleDesignarAnalista(analistaResponsavelId: string) {
    if (!id || !form) return
    setFormSaving(true)
    setErrorMsg(null)
    try {
      await flushAllPlacementPendingSaves()
      const updated = await updateCotacao(
        id,
        { analistaResponsavelId },
        { light: true }
      )
      setForm((prev) => (prev ? { ...prev, analistaResponsavelId } : prev))
      const pa = placementAnalistas.find((a) => a.id === analistaResponsavelId)
      if (pa) {
        setAnalistaResponsavelMeta({
          id: pa.id,
          nome: pa.nome,
          coordenadorAnalista: pa.coordenadorAnalista ?? '',
          gerenteAnalista: pa.gerenteAnalista ?? '',
        })
      }
      applyLightCotacaoPatch(updated)
    } catch (err: any) {
      console.error('❌ designar analista:', err)
      setErrorMsg(err?.message ?? 'Erro ao designar analista.')
      throw err
    } finally {
      setFormSaving(false)
    }
  }

  async function handleDesignarValidador(analistaValidadorId: string) {
    if (!id || !form) return
    setFormSaving(true)
    setErrorMsg(null)
    try {
      await flushAllPlacementPendingSaves()
      const baseForm = formRef.current ?? form
      const fornecedores = mercadoNomesComFornecedoresAtuais(baseForm, operadoras, operadorasById)
      const vp = ensureValidacaoPropostaState(
        parseValidacaoPropostaFromKickOff(baseForm.kickOffEstrategia),
        baseForm
      )
      const nextVp = appendValidacaoHistorico(
        { ...vp, analistaValidadorId },
        {
          acao: 'designar',
          detalhe: `Validador designado na consolidação`,
        }
      )
      const nextForm = patchKickOffInForm(baseForm, { validacaoProposta: nextVp }, fornecedores)
      formRef.current = nextForm
      setForm(nextForm)
      const updated = await updateCotacao(
        id,
        { kickOffEstrategia: nextForm.kickOffEstrategia } as any,
        { light: true }
      )
      applyLightCotacaoPatch(
        mergeSavedKickOffIntoApiCotacao(updated, nextForm.kickOffEstrategia!)
      )
    } catch (err: any) {
      console.error('❌ designar validador:', err)
      setErrorMsg(err?.message ?? 'Erro ao designar validador.')
      throw err
    } finally {
      setFormSaving(false)
    }
  }

  async function handleSave() {
    if (!id || !form) return
    setFormSaving(true)
    setErrorMsg(null)
    if (!isDraft) {
      const scope = formScopeForWorkflow(workflowStageKey, false)
      const filaErr =
        scope === 'em_cotacao'
          ? validateEtapaEmCotacao(form)
          : scope === 'estrategia'
            ? validateEtapaKickOff(form)
            : scope === 'base_atual'
              ? validateEtapaBaseAtual(form)
              : editingAbertura
                ? validateEtapaBaseAtual(form)
                : null
      if (filaErr) {
        setErrorMsg(filaErr)
        setFormSaving(false)
        return
      }
    } else if (form.dataLimite?.trim() && form.dataInicio?.trim() && form.dataLimite < form.dataInicio) {
      setErrorMsg('A data limite deve ser igual ou posterior à data de início.')
      setFormSaving(false)
      return
    }
    try {
      await flushAllPlacementPendingSaves()
      const scope = formScopeForWorkflow(workflowStageKey, isDraft)
      const payload = buildScopedSavePayload(form, { scope, editingAbertura, isDraft })
      const updated = await updateCotacao(id, payload, { light: !isDraft && !editingAbertura && scope !== 'base_atual' && scope !== 'all' })
      if (!isDraft && !editingAbertura && scope !== 'base_atual' && scope !== 'all') {
        applyLightCotacaoPatch(updated)
      } else {
        applyCotacaoFromApi(updated)
      }
    } catch (err: any) {
      console.error('❌ updateCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao salvar.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleIniciarProcesso() {
    if (!id || !form) return
    setFormSaving(true)
    setErrorMsg(null)
    const filaErr = validateIniciarProcessoNaFila(form)
    if (filaErr) {
      setErrorMsg(filaErr)
      setFormSaving(false)
      return
    }
    try {
      await flushAllPlacementPendingSaves()
      const updated = await iniciarProcesso(id, {
        ...buildFullCotacaoSavePayload(form, true),
        userId: user?.id ?? null,
      })
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ iniciarProcesso:', err)
      setErrorMsg(err?.message ?? 'Erro ao iniciar o processo.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleAvancarEtapa(nextStatus: PlacementCotacaoWorkflowStatus) {
    if (!id || !form) return
    setErrorMsg(null)
    if (
      workflowStageKey === 'validacao' &&
      nextStatus === 'Kick off' &&
      beneficiariosTotal < 1
    ) {
      setErrorMsg(
        'Importe a base de beneficiários na Análise antes de avançar para Kick off.'
      )
      return
    }
    if (
      workflowStageKey === 'validacao' &&
      nextStatus === 'Kick off' &&
      !form.analistaResponsavelId?.trim()
    ) {
      setErrorMsg(
        'Designe o analista responsável (catálogo Placement) antes de avançar para Kick off.'
      )
      return
    }
    if (
      workflowStageKey === 'em_cotacao' &&
      nextStatus === 'Aguardando operadora' &&
      beneficiariosTotal < 1
    ) {
      setErrorMsg(
        'Importe a base de beneficiários (subetapa 1 de Solicitação Mercado) antes de avançar para Aguardando operadora.'
      )
      return
    }
    if (
      workflowStageKey === 'em_cotacao' &&
      nextStatus === 'Aguardando operadora' &&
      normalizeEmCotacaoSubetapa(emCotacaoSubetapa) !== 'comunicar_mercado'
    ) {
      setErrorMsg(
        'Conclua a subetapa «Comunicar mercado» (última de Solicitação Mercado) antes de avançar para Aguardando operadora.'
      )
      return
    }
    if (
      workflowStageKey === 'em_cotacao' &&
      nextStatus === 'Aguardando operadora' &&
      !comunicarMercadoIsComplete(form, operadoras, operadorasById)
    ) {
      setErrorMsg(
        'Marque todos os fornecedores do mercado analisado como «comunicado ao mercado» antes de avançar.'
      )
      return
    }

    // Ao entrar na Validação proposta, garante itens seedados a partir do consolidado
    let formToAdvance = formRef.current ?? form
    if (workflowStageKey === 'consolidando_dados' && nextStatus === 'Validação proposta') {
      const fornecedores = mercadoNomesComFornecedoresAtuais(formToAdvance, operadoras, operadorasById)
      const vp = ensureValidacaoPropostaState(
        parseValidacaoPropostaFromKickOff(formToAdvance.kickOffEstrategia),
        formToAdvance
      )
      formToAdvance = patchKickOffInForm(formToAdvance, { validacaoProposta: vp }, fornecedores)
      formRef.current = formToAdvance
      setForm(formToAdvance)
    }

    const prevStatus = form.status
    setForm((prev) => (prev ? { ...prev, status: nextStatus } : prev))
    setWorkflowSaving(true)

    try {
      await flushAllPlacementPendingSaves()
      if (workflowStageKey === 'estrategia') {
        const payload = buildScopedSavePayload(formToAdvance, { scope: 'estrategia', isDraft: false })
        await updateCotacao(id, payload, { light: true })
      }
      if (
        workflowStageKey === 'consolidando_dados' &&
        nextStatus === 'Validação proposta' &&
        formToAdvance.kickOffEstrategia
      ) {
        await updateCotacao(
          id,
          { kickOffEstrategia: formToAdvance.kickOffEstrategia } as any,
          { light: true }
        )
      }
      // Persiste avaliações OK/ajuste antes do PATCH (evita API ler itens ainda «pendente»).
      if (
        workflowStageKey === 'validacao_proposta' &&
        nextStatus === 'Proposta enviada' &&
        formToAdvance.kickOffEstrategia
      ) {
        await updateCotacao(
          id,
          { kickOffEstrategia: formToAdvance.kickOffEstrategia } as any,
          { light: true }
        )
      }
      const updated = await patchWorkflowStatus(id, { status: nextStatus })
      const returnedStatus = String(updated.status ?? '').trim().toLowerCase()
      const expectedStatus = String(nextStatus).trim().toLowerCase()
      if (returnedStatus !== expectedStatus) {
        const msg = `Não foi possível avançar para «${nextStatus}» (a API retornou «${updated.status}»).`
        setForm((prev) => (prev ? { ...prev, status: prevStatus } : prev))
        setErrorMsg(msg)
        throw new Error(msg)
      }
      applyLightCotacaoPatch(updated)
    } catch (err: any) {
      console.error('❌ avancar etapa:', err)
      setForm((prev) => (prev ? { ...prev, status: prevStatus } : prev))
      setErrorMsg(err?.message ?? 'Erro ao avançar etapa.')
      throw err
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function handleVoltarEtapa(
    prevStatus: PlacementCotacaoWorkflowStatus,
    mode: WorkflowRetreatMode
  ) {
    if (!id || !form) return
    setWorkflowSaving(true)
    setErrorMsg(null)
    const curStatus = form.status
    const scope = getRetreatDiscardScope(form.status)

    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        status: prevStatus,
        kickOffEstrategia:
          mode === 'discard' && scope.kickOffEstrategia ? undefined : prev.kickOffEstrategia,
      }
    })
    if (mode === 'discard' && scope.emCotacaoSubetapa) {
      setEmCotacaoSubetapa('beneficiarios')
    }

    try {
      if (mode === 'discard' && scope.beneficiarios) {
        await api.delete(`/placement/cotacoes/${id}/beneficiarios`)
        setBeneficiariosTotal(0)
      }

      await flushAllPlacementPendingSaves()
      const updated = await patchWorkflowStatus(id, {
        status: prevStatus,
        discard:
          mode === 'discard'
            ? {
                kickOffEstrategia: scope.kickOffEstrategia || undefined,
                emCotacaoSubetapa: scope.emCotacaoSubetapa || undefined,
              }
            : undefined,
      })
      const returnedStatus = String(updated.status ?? '').trim().toLowerCase()
      const expectedStatus = String(prevStatus).trim().toLowerCase()
      if (returnedStatus !== expectedStatus) {
        const msg = `Não foi possível voltar para «${prevStatus}» (a API retornou «${updated.status}»).`
        setForm((prev) => (prev ? { ...prev, status: curStatus } : prev))
        setErrorMsg(msg)
        throw new Error(msg)
      }
      applyLightCotacaoPatch(updated)
    } catch (err: any) {
      console.error('❌ voltar etapa:', err)
      setForm((prev) => (prev ? { ...prev, status: curStatus } : prev))
      setErrorMsg(err?.message ?? 'Erro ao voltar etapa.')
      throw err
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function handleEncerrarProcesso(status: 'Perdida' | 'Cancelada' | 'Fechada') {
    if (!id || !form) return
    const prevStatus = form.status
    setForm((prev) => (prev ? { ...prev, status } : prev))
    setWorkflowSaving(true)
    setErrorMsg(null)
    try {
      await flushAllPlacementPendingSaves()
      const updated = await patchWorkflowStatus(id, { status })
      applyLightCotacaoPatch(updated)
    } catch (err: any) {
      console.error('❌ encerrar:', err)
      setForm((prev) => (prev ? { ...prev, status: prevStatus } : prev))
      setErrorMsg(err?.message ?? 'Erro ao encerrar.')
      throw err
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await removeCotacao(id)
      flushAllRegisteredPlacementDrafts()
      navigate('/placement/fila')
    } catch (err: any) {
      console.error('❌ removeCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao excluir.')
    }
  }

  const stageMeta = getWorkflowStageMeta(form?.status ?? 'Aberta')

  const atalhosTelaCheia = !isDraft && id && (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {!fullscreen && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<OpenInFullIcon />}
          onClick={abrirEtapaTelaCheia}
          disabled={formSaving}
        >
          Etapa tela cheia
        </Button>
      )}
      <Button
        variant="outlined"
        size="small"
        startIcon={<SlideshowIcon />}
        onClick={abrirSlidesTelaCheia}
        disabled={formSaving}
      >
        Slides
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<OpenInFullIcon />}
        onClick={abrirComparativoTelaCheia}
        disabled={formSaving}
      >
        Comparativo
      </Button>
    </Stack>
  )

  const painelWorkflow =
    !isDraft && form ? (
      <PlacementCotacaoWorkflowPanel
        embedded={!fullscreen}
        status={form.status}
        form={form}
        getLatestForm={getLatestForm}
        saving={workflowSaving}
        beneficiariosTotal={beneficiariosTotal}
        analistaResponsavel={analistaResponsavelMeta}
        analistaValidadorId={
          parseValidacaoPropostaFromKickOff(form.kickOffEstrategia).analistaValidadorId
        }
        onDesignarAnalista={handleDesignarAnalista}
        onDesignarValidador={handleDesignarValidador}
        onAdvance={handleAvancarEtapa}
        onRetreat={handleVoltarEtapa}
        onEncerrar={handleEncerrarProcesso}
      />
    ) : null

  const corpoEtapa =
    loading || !form ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: fullscreen ? 8 : 6 }}>
        <CircularProgress />
      </Box>
    ) : (
      <>
        {fullscreen ? painelWorkflow : null}

        {id && (
          <PlacementCotacaoDetailTabs
            form={form}
            onChange={patchForm}
            cotacaoId={id}
            workflowStageKey={workflowStageKey}
            disabled={formSaving}
            emCotacaoSubetapa={emCotacaoSubetapa}
            onEmCotacaoSubetapaChange={setEmCotacaoSubetapa}
            onBeneficiariosTotalChange={setBeneficiariosTotal}
            onAberturaEditingChange={setEditingAbertura}
            analistaCadastroNome={analistaCadastroNome}
            analistaResponsavelNome={analistaResponsavelNome}
            onPersisted={applyCotacaoFromApi}
            onOpenSlides={abrirSlidesTelaCheia}
          />
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Button
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmDelete(true)}
            disabled={formSaving}
            sx={{
              ...placementNavButtonSx,
              borderColor: 'error.light',
              color: 'error.main',
              '&:hover': { borderColor: 'error.main', bgcolor: 'error.light' },
            }}
          >
            Excluir
          </Button>
          <Stack direction="row" spacing={1}>
            {isDraft && (
              <PlacementNavForwardButton
                startIcon={<PlayArrowIcon />}
                onClick={handleIniciarProcesso}
                disabled={formSaving}
              >
                {formSaving ? 'Iniciando…' : 'Iniciar processo'}
              </PlacementNavForwardButton>
            )}
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={formSaving}
              sx={placementNavBackSx}
            >
              {formSaving ? 'Salvando…' : isDraft ? 'Salvar rascunho' : 'Salvar alterações'}
            </Button>
          </Stack>
        </Box>
      </>
    )

  if (fullscreen) {
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
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={voltarParaCotacao}
              sx={{ minWidth: 0 }}
            >
              Voltar
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {stageMeta?.label ?? 'Etapa'} · tela cheia
                </Typography>
                <Chip
                  size="small"
                  label={getWorkflowStatusDisplayLabel(form?.status) || '—'}
                  color={headerStatusColor.chip}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" noWrap>
                {form?.ticket || id || '—'}
                {metricasCabecalho.vidas != null ? ` · ${metricasCabecalho.vidas} vidas` : ''}
              </Typography>
            </Box>
          </Stack>
          {atalhosTelaCheia}
        </Box>

        {errorMsg && (
          <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {isDraft && (
          <Alert severity="info" sx={{ mx: 2, mt: 1 }}>
            Rascunho — complete os dados e use «Iniciar processo» para abrir a cotação.
          </Alert>
        )}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: { xs: 2, md: 3 }, py: 2 }}>
          {corpoEtapa}
        </Box>

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
          <DialogTitle>Excluir cotação?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Esta ação não pode ser desfeita. Tem certeza que deseja excluir a cotação{' '}
              <strong>{form?.ticket}</strong>?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button color="error" onClick={handleDelete} variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  return (
    <PlacementFilaPageShell>
      <Paper
        elevation={0}
        sx={{
          ...placementWorkflowCardSx,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            height: 4,
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.primary.light} 100%)`,
          }}
        />
        <Box sx={{ px: { xs: 1.5, md: 2 }, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
              <Tooltip title="Voltar para a fila">
                <IconButton
                  onClick={voltarParaFila}
                  aria-label="Voltar para a fila"
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0, 37, 97, 0.28)',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {form?.ticket || '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cotação placement · {form ? summarizeItensNomes(form.itens) || 'sem produto' : '—'} ·{' '}
                  {form
                    ? new Set(form.itens.map((i) => i.fornecedorId).filter(Boolean)).size
                    : 0}{' '}
                  fornecedor(es)
                  {metricasCabecalho.vidas != null && (
                    <> · {metricasCabecalho.vidas} vidas (total registrado)</>
                  )}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {atalhosTelaCheia}
              <Chip
                label={getWorkflowStatusDisplayLabel(form?.status) || '—'}
                color={headerStatusColor.chip}
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {metricasCabecalho.valorCents != null
                  ? formatCentsToBRL(metricasCabecalho.valorCents)
                  : '—'}
              </Typography>
            </Stack>
          </Stack>
        </Box>
        {!loading && painelWorkflow}
      </Paper>

      {isDraft && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Rascunho — não aparece na fila operacional. Complete os dados e use «Iniciar processo» para
          abrir a cotação e seguir o workflow de proposta.
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {loading || !form ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        corpoEtapa
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Excluir cotação?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta ação não pode ser desfeita. Tem certeza que deseja excluir
            a cotação <strong>{form?.ticket}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDelete} variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </PlacementFilaPageShell>
  )
}

export function toFormState(data: any): CotacaoFormState {
  const prospectId = data?.prospectId ?? data?.prospect?.id ?? ''
  const clienteId = data?.clienteId ?? data?.cliente?.id ?? ''
  const condicaoId =
    prospectId ? '' : String(data?.condicaoId ?? data?.condicao?.id ?? '')
  const grupoEconomico =
    data?.cliente?.grupoEconomico ??
    data?.condicao?.grupoEconomico ??
    data?.prospect?.grupoEconomico ??
    ''

  let itens = parseItensFromApi(data.itensMapeamento)
  if (!itens.length) {
    const ramo = data?.ramo ?? ''
    const opIds = Array.isArray(data?.operadorasIds) ? data.operadorasIds : []
    if (ramo || opIds.length > 0) {
      itens = [
        {
          ...emptyMapeamentoItem(),
          produtoNome: ramo || '',
          fornecedorId: opIds.length ? String(opIds[0]) : '',
        },
      ]
    } else {
      itens = [emptyMapeamentoItem()]
    }
  }
  const planosBundle = parsePlanosBundleFromApi(data.planosCobertura, data as Record<string, unknown>)

  return {
    ticket: data?.ticket ?? '',
    status: data?.status ?? 'Aberta',
    analistaId: data?.analistaId ?? data?.analista?.id ?? '',
    analistaResponsavelId: String(
      data?.analistaResponsavelId ?? data?.analistaResponsavel?.id ?? ''
    ),
    clienteTipo: prospectId ? 'prospect' : 'casa',
    grupoEconomico,
    clienteId,
    condicaoId,
    filialId: String(data?.filialId ?? data?.filial?.id ?? ''),
    corretorParceiroId: String(data?.corretorParceiroId ?? data?.corretorParceiro?.id ?? ''),
    projetoId: String(data?.projetoId ?? data?.projeto?.id ?? ''),
    pedidoId: String(data?.pedidoId ?? data?.pedido?.id ?? ''),
    solicitante: data?.solicitante != null ? String(data.solicitante) : '',
    temperaturaId: String(data?.temperaturaId ?? data?.temperatura?.id ?? ''),
    prospectId,
    operadorasSugestaoIds: Array.isArray(data?.operadorasSugestaoIds)
      ? data.operadorasSugestaoIds.map((id: unknown) => String(id))
      : [],
    itens,
    planos: planosBundle.planos,
    coparticipacaoDetalhePorPlanos: planosBundle.coparticipacaoDetalhePorPlanos,
    upgradeDowngradePorPlano: planosBundle.upgradeDowngradePorPlano,
    reembolsoPorPlano: planosBundle.reembolsoPorPlano,
    coberturasEspeciais: planosBundle.coberturasEspeciais,
    dadosFinanceiros: planosBundle.dadosFinanceiros,
    dataInicio: data?.dataInicio ? String(data.dataInicio).slice(0, 10) : '',
    dataLimite: data?.dataLimite ? String(data.dataLimite).slice(0, 10) : '',
    descricao: data?.descricao ?? '',
    observacoes: data?.observacoes ?? '',
    vigenciaApolice: data?.vigenciaApolice ? String(data.vigenciaApolice).slice(0, 10) : '',
    tipoContratacaoId: String(data?.tipoContratacaoId ?? data?.tipoContratacao?.id ?? ''),
    modalidadeContratoId: String(data?.modalidadeContratoId ?? data?.modalidadeContrato?.id ?? ''),
    prazoVigenciaContratoId: String(data?.prazoVigenciaContratoId ?? data?.prazoVigenciaContrato?.id ?? ''),
    breakEven: data?.breakEven != null ? String(data.breakEven) : '',
    formularioTipo: parseFormularioTipoFromApi(data?.formularioTipo),
    multaRescisaoContratual: simNaoFromApi(data?.multaRescisaoContratual),
    multaRescisaoValor: data?.multaRescisaoValor != null ? String(data.multaRescisaoValor) : '',
    multaRescisaoRegra: data?.multaRescisaoRegra != null ? String(data.multaRescisaoRegra) : '',
    multaRescisaoAvisoPrevio:
      data?.multaRescisaoAvisoPrevio != null ? String(data.multaRescisaoAvisoPrevio) : '',
    possuiConvencaoColetiva: simNaoFromApi(data?.possuiConvencaoColetiva),
    convencaoColetivaDetalhe:
      data?.convencaoColetivaDetalhe != null ? String(data.convencaoColetivaDetalhe) : '',
    subfaturasDraft: [],
    kickOffEstrategia: parseKickOffEstrategiaFromApi(data?.kickOffEstrategia),
  }
}
