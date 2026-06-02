import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { api } from '../../../lib/api.local'
import { CotacaoFormFields, type CotacaoFormState } from './CotacaoFormFields'
import { formatCentsToBRL, getStatusColor } from './utils'
import {
  emptyMapeamentoItem,
  parseItensFromApi,
  parsePlanosBundleFromApi,
  summarizeItensNomes,
} from './placementCotacaoDetalhes'
import {
  buildPlacementDetalhesApiFields,
  validateIniciarProcessoNaFila,
} from './placementCotacaoSubmit'
import { buildContratoApoliceApiFields, parseFormularioTipoFromApi, simNaoFromApi } from './placementFormularioContrato'
import { validateEtapaBaseAtual, validateEtapaEmCotacao, validateEtapaKickOff } from './placementWorkflowAdvance'
import { PlacementCotacaoWorkflowPanel } from './PlacementCotacaoWorkflowPanel'
import { PlacementCotacaoDetailTabs } from './PlacementCotacaoDetailTabs'
import { getWorkflowStageKey } from './placementCotacaoWorkflow'
import { formScopeForWorkflow } from './placementCotacaoFormScope'
import { isRascunhoStatus, PLACEMENT_STATUS_RASCUNHO } from './placementCotacaoStatus'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'
import { useAuthStore } from '../../../store/authStore'
import { parseKickOffEstrategiaFromApi } from './placementKickOffEstrategia'
import { getRetreatDiscardScope, type WorkflowRetreatMode } from './placementWorkflowRetreat'
import { comunicarMercadoIsComplete } from './placementComunicarMercado'
import { normalizeEmCotacaoSubetapa } from './placementEmCotacaoWorkflow'

function metricasResumoDeApi(data: any): { valorCents: number | null; vidas: number | null } {
  return {
    valorCents: typeof data?.valorEstimadoCents === 'number' ? data.valorEstimadoCents : null,
    vidas: typeof data?.vidas === 'number' ? data.vidas : null,
  }
}

export default function PlacementFilaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { analistas: analistasCadastro, operadoras, operadorasById } = useMasterDataStore()
  const { user } = useAuthStore()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.getById(id ?? ''))
  const updateCotacao = usePlacementCotacaoStore((s) => s.updateCotacao)
  const iniciarProcesso = usePlacementCotacaoStore((s) => s.iniciarProcesso)
  const removeCotacao = usePlacementCotacaoStore((s) => s.removeCotacao)

  const [form, setForm] = useState<CotacaoFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
        setForm(toFormState(data))
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

  const isDraft = isRascunhoStatus(form?.status)

  function applyCotacaoFromApi(data: any) {
    setForm(toFormState(data))
    setAnalistaResponsavelMeta(data?.analistaResponsavel ?? null)
    setMetricasCabecalho(metricasResumoDeApi(data))
  }

  function buildUpdatePayload() {
    const detalhesApi = buildPlacementDetalhesApiFields(form!)
    return {
      ticket: form!.ticket?.trim() || undefined,
      status: isDraft ? PLACEMENT_STATUS_RASCUNHO : form!.status,
      analistaId: form!.analistaId || null,
      clienteId: form!.clienteTipo === 'casa' ? form!.clienteId || null : null,
      prospectId: form!.clienteTipo === 'prospect' ? form!.prospectId || null : null,
      condicaoId: form!.clienteTipo === 'casa' ? form!.condicaoId || null : null,
      filialId: form!.filialId || null,
      corretorParceiroId: form!.corretorParceiroId?.trim() || null,
      projetoId: form!.projetoId?.trim() || null,
      pedidoId: form!.pedidoId?.trim() || null,
      solicitante: form!.solicitante?.trim() || null,
      temperaturaId: form!.temperaturaId?.trim() || null,
      ...detalhesApi,
      dataInicio: form!.dataInicio || null,
      dataLimite: form!.dataLimite || null,
      descricao: form!.descricao?.trim() || null,
      observacoes: form!.observacoes?.trim() || null,
      vigenciaApolice: form!.vigenciaApolice?.trim() || null,
      tipoContratacaoId: form!.tipoContratacaoId?.trim() || null,
      modalidadeContratoId: form!.modalidadeContratoId?.trim() || null,
      prazoVigenciaContratoId: form!.prazoVigenciaContratoId?.trim() || null,
      breakEven: form!.breakEven?.trim() || null,
      ...buildContratoApoliceApiFields(form!),
      operadorasSugestaoIds:
        form!.operadorasSugestaoIds?.length > 0 ? form!.operadorasSugestaoIds : null,
      analistaResponsavelId: form!.analistaResponsavelId?.trim() || null,
      ...(form!.kickOffEstrategia ? { kickOffEstrategia: form!.kickOffEstrategia } : {}),
    }
  }

  async function handleDesignarAnalista(analistaResponsavelId: string) {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    try {
      const updated = await updateCotacao(id, {
        ...buildUpdatePayload(),
        analistaResponsavelId,
      })
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ designar analista:', err)
      setErrorMsg(err?.message ?? 'Erro ao designar analista.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    if (!isDraft) {
      const scope = formScopeForWorkflow(workflowStageKey, false)
      const filaErr =
        scope === 'em_cotacao'
          ? validateEtapaEmCotacao(form)
          : scope === 'kick_off'
            ? validateEtapaKickOff(form)
            : scope === 'base_atual'
              ? validateEtapaBaseAtual(form)
              : editingAbertura
                ? validateEtapaBaseAtual(form)
                : null
      if (filaErr) {
        setErrorMsg(filaErr)
        setSaving(false)
        return
      }
    } else if (form.dataLimite?.trim() && form.dataInicio?.trim() && form.dataLimite < form.dataInicio) {
      setErrorMsg('A data limite deve ser igual ou posterior à data de início.')
      setSaving(false)
      return
    }
    try {
      const updated = await updateCotacao(id, buildUpdatePayload())
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ updateCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleIniciarProcesso() {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    const filaErr = validateIniciarProcessoNaFila(form)
    if (filaErr) {
      setErrorMsg(filaErr)
      setSaving(false)
      return
    }
    try {
      const updated = await iniciarProcesso(id, {
        ...buildUpdatePayload(),
        userId: user?.id ?? null,
      })
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ iniciarProcesso:', err)
      setErrorMsg(err?.message ?? 'Erro ao iniciar o processo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvancarEtapa(nextStatus: PlacementCotacaoWorkflowStatus) {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    if (
      workflowStageKey === 'em_cotacao' &&
      nextStatus === 'Aguardando operadora' &&
      beneficiariosTotal < 1
    ) {
      setErrorMsg(
        'Importe a base de beneficiários (etapa 1 de Em cotação) antes de avançar para Aguardando operadora.'
      )
      setSaving(false)
      return
    }
    if (
      workflowStageKey === 'em_cotacao' &&
      nextStatus === 'Aguardando operadora' &&
      normalizeEmCotacaoSubetapa(emCotacaoSubetapa) !== 'comunicar_mercado'
    ) {
      setErrorMsg(
        'Conclua a etapa «Comunicar mercado» (última subetapa de Em cotação) antes de avançar para Aguardando operadora.'
      )
      setSaving(false)
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
      setSaving(false)
      return
    }
    try {
      const updated = await updateCotacao(id, {
        ...buildUpdatePayload(),
        status: nextStatus,
      })
      const returnedStatus = String(updated.status ?? '').trim().toLowerCase()
      const expectedStatus = String(nextStatus).trim().toLowerCase()
      if (returnedStatus !== expectedStatus) {
        const msg = `Não foi possível avançar para «${nextStatus}» (a API retornou «${updated.status}»).`
        setErrorMsg(msg)
        throw new Error(msg)
      }
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ avancar etapa:', err)
      setErrorMsg(err?.message ?? 'Erro ao avançar etapa.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleVoltarEtapa(
    prevStatus: PlacementCotacaoWorkflowStatus,
    mode: WorkflowRetreatMode
  ) {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    try {
      const scope = getRetreatDiscardScope(form.status)

      if (mode === 'discard' && scope.beneficiarios) {
        await api.delete(`/placement/cotacoes/${id}/beneficiarios`)
        setBeneficiariosTotal(0)
      }

      const patch: Record<string, unknown> = {
        ...buildUpdatePayload(),
        status: prevStatus,
      }

      if (mode === 'discard') {
        if (scope.kickOffEstrategia) {
          patch.kickOffEstrategia = null
        }
        if (scope.emCotacaoSubetapa) {
          patch.emCotacaoSubetapa = 'beneficiarios'
          setEmCotacaoSubetapa('beneficiarios')
        }
      }

      const updated = await updateCotacao(id, patch as Parameters<typeof updateCotacao>[1])
      const returnedStatus = String(updated.status ?? '').trim().toLowerCase()
      const expectedStatus = String(prevStatus).trim().toLowerCase()
      if (returnedStatus !== expectedStatus) {
        const msg = `Não foi possível voltar para «${prevStatus}» (a API retornou «${updated.status}»).`
        setErrorMsg(msg)
        throw new Error(msg)
      }
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ voltar etapa:', err)
      setErrorMsg(err?.message ?? 'Erro ao voltar etapa.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleEncerrarProcesso(status: 'Perdida' | 'Cancelada' | 'Fechada') {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    try {
      const updated = await updateCotacao(id, {
        ...buildUpdatePayload(),
        status,
      })
      applyCotacaoFromApi(updated)
    } catch (err: any) {
      console.error('❌ encerrar:', err)
      setErrorMsg(err?.message ?? 'Erro ao encerrar.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await removeCotacao(id)
      navigate('/placement/fila')
    } catch (err: any) {
      console.error('❌ removeCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao excluir.')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="text"
          onClick={() => navigate('/placement/fila')}
        >
          Voltar para Fila
        </Button>
      </Stack>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={form?.status ?? '—'}
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
        <>
          {!isDraft && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <PlacementCotacaoWorkflowPanel
                status={form.status}
                form={form}
                saving={saving}
                analistaResponsavel={analistaResponsavelMeta}
                onDesignarAnalista={handleDesignarAnalista}
                onAdvance={handleAvancarEtapa}
                onRetreat={handleVoltarEtapa}
                onEncerrar={handleEncerrarProcesso}
              />
            </Paper>
          )}

          {id && (
            <PlacementCotacaoDetailTabs
              form={form}
              onChange={setForm}
              cotacaoId={id}
              workflowStageKey={workflowStageKey}
              disabled={saving}
              emCotacaoSubetapa={emCotacaoSubetapa}
              onEmCotacaoSubetapaChange={setEmCotacaoSubetapa}
              onBeneficiariosTotalChange={setBeneficiariosTotal}
              onAberturaEditingChange={setEditingAbertura}
              analistaCadastroNome={analistaCadastroNome}
              analistaResponsavelNome={analistaResponsavelNome}
              onPersisted={applyCotacaoFromApi}
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              Excluir
            </Button>
            <Stack direction="row" spacing={1}>
              {isDraft && (
                <PrimaryActionButton
                  startIcon={<PlayArrowIcon />}
                  onClick={handleIniciarProcesso}
                  disabled={saving}
                >
                  {saving ? 'Iniciando…' : 'Iniciar processo'}
                </PrimaryActionButton>
              )}
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando…' : isDraft ? 'Salvar rascunho' : 'Salvar alterações'}
              </Button>
            </Stack>
          </Box>
        </>
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
    </Container>
  )
}

function toFormState(data: any): CotacaoFormState {
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
    subfaturasDraft: [],
    kickOffEstrategia: parseKickOffEstrategiaFromApi(data?.kickOffEstrategia),
  }
}
