import { useEffect, useMemo, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import {

  Alert,

  Box,

  Button,

  Container,

  Paper,

  Stack,

  Typography,

} from '@mui/material'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'

import SaveIcon from '@mui/icons-material/Save'

import PlayArrowIcon from '@mui/icons-material/PlayArrow'

import { PrimaryActionButton } from '../../../components/PrimaryActionButton'

import { useMasterDataStore } from '../../../store/masterDataStore'

import { useAuthStore } from '../../../store/authStore'

import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'

import { CotacaoFormFields, EMPTY_COTACAO_FORM, type CotacaoFormState } from './CotacaoFormFields'

import { api } from '../../../lib/api.local'

import {

  buildPlacementDetalhesApiFields,

  validateIniciarProcessoNaFila,

} from './placementCotacaoSubmit'

import { PLACEMENT_STATUS_RASCUNHO } from './placementCotacaoStatus'

import {

  buildContratoApoliceApiFields,

  isFormularioTipoDisponivel,

  type PlacementFormularioTipo,

} from './placementFormularioContrato'

import {

  FormularioTipoBadge,

  FormularioTipoPickerPage,

  parseFormularioTipoFromSearch,

} from './FormularioTipoPicker'



export default function PlacementFilaNewPage() {

  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()

  const { user } = useAuthStore()

  const { analistas, syncFromApi } = useMasterDataStore()

  const addCotacao = usePlacementCotacaoStore((s) => s.addCotacao)



  const tipoFromUrl = parseFormularioTipoFromSearch(searchParams.get('tipo'))

  const tipoDisponivel =

    tipoFromUrl != null && isFormularioTipoDisponivel(tipoFromUrl) ? tipoFromUrl : null



  const [form, setForm] = useState<CotacaoFormState>(() => ({

    ...EMPTY_COTACAO_FORM,

    formularioTipo: tipoDisponivel ?? '',

  }))

  const [submitting, setSubmitting] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)



  useEffect(() => {

    syncFromApi?.()

  }, [syncFromApi])



  useEffect(() => {

    if (tipoDisponivel && form.formularioTipo !== tipoDisponivel) {

      setForm((f) => ({ ...f, formularioTipo: tipoDisponivel }))

    }

  }, [tipoDisponivel, form.formularioTipo])



  const defaultAnalistaId = useMemo(() => {

    if (!user) return ''

    const byEmail = analistas.find(

      (a) => a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase()

    )

    if (byEmail) return byEmail.id

    const byName = analistas.find(

      (a) => a.nome && user.name && a.nome.toLowerCase() === user.name.toLowerCase()

    )

    return byName?.id ?? ''

  }, [analistas, user])



  useEffect(() => {

    if (defaultAnalistaId && !form.analistaId) {

      setForm((f) => ({ ...f, analistaId: defaultAnalistaId }))

    }

  }, [defaultAnalistaId]) // eslint-disable-line react-hooks/exhaustive-deps



  function selecionarFormulario(tipo: PlacementFormularioTipo) {

    setSearchParams({ tipo })

  }



  function buildPayload(status: string) {

    const detalhesApi = buildPlacementDetalhesApiFields(form)

    return {

      ticket: form.ticket?.trim() || undefined,

      status,

      analistaId: form.analistaId || null,

      userId: user?.id ?? null,

      clienteId: form.clienteTipo === 'casa' ? form.clienteId || null : null,

      prospectId: form.clienteTipo === 'prospect' ? form.prospectId || null : null,

      condicaoId: form.clienteTipo === 'casa' ? form.condicaoId || null : null,

      filialId: form.filialId || null,

      corretorParceiroId: form.corretorParceiroId?.trim() || null,

      projetoId: form.projetoId?.trim() || null,

      pedidoId: form.pedidoId?.trim() || null,

      solicitante: form.solicitante?.trim() || null,

      temperaturaId: form.temperaturaId?.trim() || null,

      ...detalhesApi,

      dataInicio: form.dataInicio || null,

      dataLimite: form.dataLimite || null,

      descricao: form.descricao?.trim() || null,

      observacoes: form.observacoes?.trim() || null,

      vigenciaApolice: form.vigenciaApolice?.trim() || null,

      tipoContratacaoId: form.tipoContratacaoId?.trim() || null,

      modalidadeContratoId: form.modalidadeContratoId?.trim() || null,

      prazoVigenciaContratoId: form.prazoVigenciaContratoId?.trim() || null,

      breakEven: form.breakEven?.trim() || null,

      ...buildContratoApoliceApiFields(form),

      operadorasSugestaoIds:

        form.operadorasSugestaoIds?.length > 0 ? form.operadorasSugestaoIds : null,

      analistaResponsavelId: form.analistaResponsavelId?.trim() || null,

    }

  }



  async function persistSubfaturas(cotacaoId: string) {

    for (const d of form.subfaturasDraft) {

      const createdSub = (await api.post(`/placement/cotacoes/${cotacaoId}/subfaturas`, {

        cnpj: d.cnpj,

        razaoSocial: d.razaoSocial,

        cidade: d.cidade,

        uf: d.uf,

        vidas: d.vidas,

      })) as { id: string }

      for (const pa of d.pendingAnexos) {

        const fd = new FormData()

        fd.append('file', pa.file)

        await api.postFormData(`/placement/subfaturas/${createdSub.id}/anexos`, fd)

      }

    }

  }



  async function handleSaveDraft() {

    setErrorMsg(null)

    if (!tipoDisponivel) {

      setErrorMsg('Escolha o formulário antes de salvar.')

      return

    }

    if (!user?.id) {

      setErrorMsg('É necessário estar autenticado para salvar um rascunho.')

      return

    }

    setSubmitting(true)

    try {

      const created = await addCotacao(buildPayload(PLACEMENT_STATUS_RASCUNHO))

      await persistSubfaturas(created.id)

      navigate(`/placement/fila/${created.id}`)

    } catch (err: any) {

      console.error('❌ rascunho:', err)

      setErrorMsg(err?.message ?? 'Erro ao salvar rascunho.')

    } finally {

      setSubmitting(false)

    }

  }



  async function handleStartProcess() {

    setErrorMsg(null)

    if (!tipoDisponivel) {

      setErrorMsg('Escolha o formulário antes de iniciar o processo.')

      return

    }

    const filaErr = validateIniciarProcessoNaFila(form)

    if (filaErr) {

      setErrorMsg(filaErr)

      return

    }

    setSubmitting(true)

    try {

      const created = await addCotacao(buildPayload('Aberta'))

      await persistSubfaturas(created.id)

      navigate(`/placement/fila/${created.id}`)

    } catch (err: any) {

      console.error('❌ addCotacao:', err)

      setErrorMsg(err?.message ?? 'Erro ao iniciar cotação na fila.')

    } finally {

      setSubmitting(false)

    }

  }



  const escolhendoFormulario = !tipoDisponivel



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

        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>

          <Box>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>

              {escolhendoFormulario ? 'Nova cotação' : 'Nova cotação placement'}

            </Typography>

            <Typography variant="body2" color="text.secondary">

              {escolhendoFormulario

                ? 'Selecione o formulário para carregar os campos da cotação.'

                : 'Salve como rascunho para continuar depois (só você vê) ou inicie o processo na fila para montar a proposta ao cliente.'}

            </Typography>

          </Box>

          {tipoDisponivel && <FormularioTipoBadge tipo={tipoDisponivel} />}

        </Stack>

      </Paper>



      {errorMsg && (

        <Alert severity="error" sx={{ mb: 2 }}>

          {errorMsg}

        </Alert>

      )}



      {escolhendoFormulario ? (

        <Paper sx={{ p: 3 }}>

          <FormularioTipoPickerPage onSelect={selecionarFormulario} />

        </Paper>

      ) : (

        <>

          <CotacaoFormFields

            value={form}

            onChange={setForm}

            disabled={submitting}

            formMode="create"

          />



          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>

            <Button

              variant="outlined"

              startIcon={<SaveIcon />}

              onClick={handleSaveDraft}

              disabled={submitting}

            >

              {submitting ? 'Salvando…' : 'Salvar rascunho'}

            </Button>

            <PrimaryActionButton

              startIcon={<PlayArrowIcon />}

              onClick={handleStartProcess}

              disabled={submitting}

            >

              {submitting ? 'Iniciando…' : 'Iniciar processo na fila'}

            </PrimaryActionButton>

          </Stack>

        </>

      )}

    </Container>

  )

}

