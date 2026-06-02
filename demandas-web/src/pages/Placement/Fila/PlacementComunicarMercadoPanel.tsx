import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import TableChartIcon from '@mui/icons-material/TableChart'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import { useMaillingStore } from '../../../store/maillingStore'
import { api } from '../../../lib/api.local'
import { copyRichHtmlToClipboard } from '../../../utils/copyRichHtmlClipboard'
import { embedEmailImagesForOutlookClipboard } from '../../../utils/embedEmailImagesForOutlookClipboard'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  buildComunicarMercadoHtml,
  buildComunicarMercadoSubject,
  buildComunicarMercadoTopicos,
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
  type ComunicarMercadoFornecedorState,
  type ComunicarMercadoState,
  buildKickOffAberturaLabelsForComunicarMercado,
  replicarConteudoEmailParaDemais,
  isTopicoCabecalhoFornecedor,
  type ComunicarMercadoSinistralidade,
} from './placementComunicarMercado'
import { ComunicarMercadoLocalidadeCapture } from './ComunicarMercadoLocalidadeCapture'
import { readImageFileAsDataUri } from './placementSlideCapture'
import { buildKickOffEstrategiaPatch } from './placementKickOffPersist'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  analistaResponsavelNome?: string
  disabled?: boolean
}

function normKey(nome: string): string {
  return nome.trim().toLowerCase()
}

export function PlacementComunicarMercadoPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  analistaResponsavelNome,
  disabled,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const condicoes = usePlacementStore((s) => s.condicoes)
  const filiais = usePlacementStore((s) => s.filiais)
  const corretores = usePlacementStore((s) => s.corretoresParceiros)
  const placementSlice = usePlacementStore((s) => ({
    condicoes: s.condicoes,
    prospects: s.prospects,
    filiais: s.filiais,
    tiposContratacao: s.tiposContratacao,
    modalidadesContrato: s.modalidadesContrato,
    prazosVigenciaContrato: s.prazosVigenciaContrato,
    projetos: s.projetos,
    pedidos: s.pedidos,
    temperaturas: s.temperaturas,
  }))
  const maillingStore = useMaillingStore()

  const [beneficiarios, setBeneficiarios] = useState<PlacementBeneficiario[]>([])
  const [subfaturas, setSubfaturas] = useState<
    { razaoSocial: string; cnpj: string; vidas?: number | null; cidade?: string | null; uf?: string | null }[]
  >([])
  const [fornecedorAtivo, setFornecedorAtivo] = useState('')
  const [copiadoAssunto, setCopiadoAssunto] = useState(false)
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  const [erroCopia, setErroCopia] = useState<string | null>(null)
  const [replicadoMsg, setReplicadoMsg] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const tableRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef(form)
  formRef.current = form

  const fornecedores = useMemo(
    () => mercadoFornecedoresFromForm(form, operadoras, operadorasById),
    [form, operadoras, operadorasById]
  )

  const comunicarMercado = useMemo(
    () =>
      ensureComunicarMercadoState(
        parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      ),
    [form, operadoras, operadorasById]
  )

  const condicao = condicoes.find((c) => c.id === form.condicaoId)
  const filial = filiais.find((f) => f.id === form.filialId)
  const corretorNome = corretores.find((c) => c.id === form.corretorParceiroId)?.nome

  const labels = useMemo(
    () =>
      buildKickOffAberturaLabelsForComunicarMercado(form, operadoras, placementSlice, {
        analistaResponsavelNome,
        corretorNome,
      }),
    [form, operadoras, placementSlice, analistaResponsavelNome, corretorNome]
  )

  useEffect(() => {
    if (!fornecedorAtivo && fornecedores.length) {
      setFornecedorAtivo(fornecedores[0])
    }
  }, [fornecedores, fornecedorAtivo])

  useEffect(() => {
    if (!cotacaoId) return
    let cancelled = false
    void (async () => {
      try {
        const [benResp, subResp] = await Promise.all([
          api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`) as Promise<{
            beneficiarios?: PlacementBeneficiario[]
          }>,
          api.get(`/placement/cotacoes/${cotacaoId}/subfaturas`) as Promise<{ subfaturas?: unknown[] }>,
        ])
        if (cancelled) return
        setBeneficiarios(Array.isArray(benResp?.beneficiarios) ? benResp.beneficiarios : [])
        const subs = Array.isArray(subResp?.subfaturas) ? subResp.subfaturas : []
        setSubfaturas(
          subs.map((s: any) => ({
            razaoSocial: String(s?.razaoSocial ?? ''),
            cnpj: String(s?.cnpj ?? ''),
            vidas: s?.vidas ?? null,
            cidade: s?.cidade ?? null,
            uf: s?.uf ?? null,
          }))
        )
      } catch {
        if (!cancelled) {
          setBeneficiarios([])
          setSubfaturas([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cotacaoId])

  useEffect(() => {
    void maillingStore.syncFromApi?.()
  }, [])

  const fornKey = normKey(fornecedorAtivo)
  const fornState = comunicarMercado.fornecedores[fornKey]

  const destinatariosMailling = useMemo(() => {
    const needle = fornecedorAtivo.trim().toLowerCase()
    const contacts = maillingStore.contacts ?? []
    const filtered = needle
      ? contacts.filter((c) => {
          const area = String(c.area ?? '').toLowerCase()
          const nome = String(c.nome ?? '').toLowerCase()
          return area.includes(needle) || nome.includes(needle)
        })
      : contacts
    return [...new Set(filtered.map((c) => c.email).filter(Boolean))].slice(0, 30)
  }, [maillingStore.contacts, fornecedorAtivo])

  const buildInput = (state: ComunicarMercadoState) => ({
    form,
    fornecedorNome: fornecedorAtivo,
    operadoras,
    operadorasById,
    labels,
    condicao,
    filial,
    corretorNome,
    subfaturas,
    beneficiarios,
    analistaResponsavelNome,
    comunicarMercado: state,
  })

  const topicos = useMemo(() => {
    if (!fornecedorAtivo) return []
    return buildComunicarMercadoTopicos(buildInput(comunicarMercado))
  }, [
    fornecedorAtivo,
    form,
    operadoras,
    operadorasById,
    labels,
    condicao,
    filial,
    corretorNome,
    subfaturas,
    beneficiarios,
    analistaResponsavelNome,
    comunicarMercado,
  ])

  const assunto = useMemo(() => {
    if (!fornecedorAtivo) return ''
    return buildComunicarMercadoSubject(buildInput(comunicarMercado))
  }, [fornecedorAtivo, comunicarMercado, form, labels, operadoras, operadorasById, condicao, filial, corretorNome, subfaturas, beneficiarios, analistaResponsavelNome])

  const topicosCorpo = useMemo(
    () => topicos.filter((t) => t.grupo !== 'Sinistralidade' && t.grupo !== 'Localidades'),
    [topicos]
  )

  const sinistralidade = comunicarMercado.conteudoCompartilhado.sinistralidade
  const localidades = comunicarMercado.conteudoCompartilhado.localidades

  const htmlPreview = useMemo(() => {
    if (!fornecedorAtivo) return ''
    return buildComunicarMercadoHtml(buildInput(comunicarMercado))
  }, [fornecedorAtivo, comunicarMercado, form, labels, operadoras, operadorasById, condicao, filial, corretorNome, subfaturas, beneficiarios, analistaResponsavelNome])

  const comunicadosCount = useMemo(
    () => fornecedores.filter((nome) => comunicarMercado.fornecedores[normKey(nome)]?.enviado).length,
    [fornecedores, comunicarMercado]
  )

  const activeIndex = fornecedores.indexOf(fornecedorAtivo)

  const flushSave = useCallback(
    async (kickOff: NonNullable<CotacaoFormState['kickOffEstrategia']>) => {
      if (!cotacaoId) return
      setSaveState('saving')
      try {
        const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, {
          kickOffEstrategia: kickOff,
        })
        onPersisted?.(updated)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    },
    [cotacaoId, onPersisted]
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    []
  )

  function persistComunicarMercado(next: ComunicarMercadoState, options?: { immediate?: boolean }) {
    const kickOff = buildKickOffEstrategiaPatch(
      form.kickOffEstrategia,
      { comunicarMercado: next },
      fornecedores
    )
    const nextForm: CotacaoFormState = {
      ...form,
      kickOffEstrategia: kickOff,
    }
    formRef.current = nextForm
    onChange(nextForm)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (options?.immediate) {
      void flushSave(kickOff)
    } else {
      saveTimerRef.current = setTimeout(() => void flushSave(kickOff), 700)
    }
  }

  function patchFornecedorByKey(
    key: string,
    part: Partial<ComunicarMercadoFornecedorState>,
    options?: { immediate?: boolean }
  ) {
    const next = ensureComunicarMercadoState(comunicarMercado, form, operadoras, operadorasById)
    next.fornecedores[key] = { ...next.fornecedores[key], ...part }
    persistComunicarMercado(next, { immediate: options?.immediate ?? part.enviado !== undefined })
  }

  function patchFornecedor(part: Partial<ComunicarMercadoFornecedorState>, options?: { immediate?: boolean }) {
    if (!fornKey) return
    patchFornecedorByKey(fornKey, part, options)
  }

  function goToFornecedor(offset: number) {
    if (activeIndex < 0) return
    const nextIdx = activeIndex + offset
    if (nextIdx >= 0 && nextIdx < fornecedores.length) {
      setFornecedorAtivo(fornecedores[nextIdx])
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function toggleComunicado(key: string, nome: string, checked: boolean) {
    const st = comunicarMercado.fornecedores[key]
    patchFornecedorByKey(
      key,
      {
        enviado: checked,
        ...(checked && !st?.dataEnvio ? { dataEnvio: new Date().toISOString().slice(0, 10) } : {}),
      },
      { immediate: true }
    )
    if (checked) {
      const idx = fornecedores.indexOf(nome)
      const proximo = fornecedores.slice(idx + 1).find((n) => !comunicarMercado.fornecedores[normKey(n)]?.enviado)
      if (proximo) setFornecedorAtivo(proximo)
    }
  }

  function patchTopico(id: string, valor: string) {
    if (!fornKey) return
    const next = ensureComunicarMercadoState(comunicarMercado, form, operadoras, operadorasById)
    if (isTopicoCabecalhoFornecedor(id)) {
      next.fornecedores[fornKey] = {
        ...next.fornecedores[fornKey],
        topicosOverrides: { ...next.fornecedores[fornKey].topicosOverrides, [id]: valor },
      }
    } else {
      next.conteudoCompartilhado = {
        ...next.conteudoCompartilhado,
        topicosOverrides: { ...next.conteudoCompartilhado.topicosOverrides, [id]: valor },
      }
    }
    persistComunicarMercado(next)
  }

  function patchSinistralidade(part: Partial<ComunicarMercadoSinistralidade>) {
    const next = ensureComunicarMercadoState(comunicarMercado, form, operadoras, operadorasById)
    next.conteudoCompartilhado = {
      ...next.conteudoCompartilhado,
      sinistralidade: { ...next.conteudoCompartilhado.sinistralidade, ...part },
    }
    persistComunicarMercado(next)
  }

  function patchLocalidades(part: { incluirNoEmail?: boolean; imagemDataUri?: string }) {
    const next = ensureComunicarMercadoState(comunicarMercado, form, operadoras, operadorasById)
    next.conteudoCompartilhado = {
      ...next.conteudoCompartilhado,
      localidades: { ...next.conteudoCompartilhado.localidades, ...part },
    }
    persistComunicarMercado(next)
  }

  function handleReplicarConteudo() {
    if (!fornecedorAtivo) return
    const next = replicarConteudoEmailParaDemais(comunicarMercado, fornecedorAtivo)
    persistComunicarMercado(next)
    setReplicadoMsg(
      'Conteúdo replicado para os demais fornecedores (cabeçalho e dados de cada operadora permanecem individuais).'
    )
    setTimeout(() => setReplicadoMsg(null), 4000)
  }

  async function handleSinistralidadeUpload(file: File | null) {
    if (!file) return
    try {
      const dataUri = await readImageFileAsDataUri(file)
      patchSinistralidade({ imagemDataUri: dataUri })
    } catch {
      setErroCopia('Erro ao carregar imagem de sinistralidade.')
    }
  }

  function patchPrazoRetorno(prazoRetorno: string) {
    const next = ensureComunicarMercadoState(comunicarMercado, form, operadoras, operadorasById)
    next.prazoRetorno = prazoRetorno
    persistComunicarMercado(next)
  }

  async function handleCopyAssunto() {
    try {
      await navigator.clipboard.writeText(assunto)
      setCopiadoAssunto(true)
      setTimeout(() => setCopiadoAssunto(false), 2000)
    } catch {
      setErroCopia('Não foi possível copiar o assunto.')
    }
  }

  async function handleCopyEmail() {
    setErroCopia(null)
    try {
      const html = await embedEmailImagesForOutlookClipboard(htmlPreview)
      await copyRichHtmlToClipboard(html)
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (err: unknown) {
      setErroCopia(err instanceof Error ? err.message : 'Erro ao copiar e-mail.')
    }
  }

  if (!fornecedores.length) {
    return (
      <Alert severity="warning">
        Nenhum fornecedor no mercado analisado. Volte ao Kick off e informe ao menos uma operadora em
        «Mercado analisado» (ou selecione operadoras sugeridas na abertura).
      </Alert>
    )
  }

  return (
    <Stack gap={2}>
      <Alert severity="info">
        Registre envio e previsão na tabela abaixo, marque «Comunicado» e monte o e-mail do fornecedor
        selecionado. As alterações são salvas automaticamente.
      </Alert>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">
          {comunicadosCount} de {fornecedores.length} fornecedores comunicados
        </Typography>
        <Chip
          size="small"
          color={
            saveState === 'error' ? 'error' : saveState === 'saved' ? 'success' : saveState === 'saving' ? 'info' : 'default'
          }
          label={
            saveState === 'saving'
              ? 'Salvando…'
              : saveState === 'saved'
                ? 'Salvo'
                : saveState === 'error'
                  ? 'Erro ao salvar'
                  : 'Alterações pendentes'
          }
        />
      </Stack>

      <LinearProgress
        variant="determinate"
        value={fornecedores.length ? (comunicadosCount / fornecedores.length) * 100 : 0}
        sx={{ height: 6, borderRadius: 1 }}
      />

      <Paper ref={tableRef} variant="outlined" sx={{ overflow: 'auto' }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChartIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Envios ao mercado
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fornecedor</TableCell>
              <TableCell sx={{ minWidth: 140 }}>Data envio</TableCell>
              <TableCell sx={{ minWidth: 140 }}>Previsão retorno</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Grupo produção</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>
                Comunicado
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fornecedores.map((nome) => {
              const key = normKey(nome)
              const st = comunicarMercado.fornecedores[key]
              const selected = fornecedorAtivo === nome
              return (
                <TableRow
                  key={nome}
                  hover
                  selected={selected}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: st?.enviado ? 'success.50' : undefined,
                  }}
                  onClick={() => {
                    setFornecedorAtivo(nome)
                    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      {st?.enviado ? <CheckCircleIcon fontSize="small" color="success" /> : null}
                      <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 400 }}>
                        {nome}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                      value={st?.dataEnvio?.slice(0, 10) ?? ''}
                      onChange={(e) => patchFornecedorByKey(key, { dataEnvio: e.target.value })}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      disabled={disabled}
                      value={
                        st?.dataPrevisaoRetorno?.slice(0, 10) ||
                        comunicarMercado.prazoRetorno?.slice(0, 10) ||
                        ''
                      }
                      onChange={(e) => patchFornecedorByKey(key, { dataPrevisaoRetorno: e.target.value })}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Grupo"
                      disabled={disabled}
                      value={st?.grupoProducao ?? ''}
                      onChange={(e) => patchFornecedorByKey(key, { grupoProducao: e.target.value })}
                    />
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Marcar como comunicado ao mercado">
                      <Checkbox
                        checked={st?.enviado === true}
                        disabled={disabled}
                        icon={<MarkEmailReadIcon fontSize="small" />}
                        checkedIcon={<MarkEmailReadIcon fontSize="small" color="success" />}
                        onChange={(e) => toggleComunicado(key, nome, e.target.checked)}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Prazo padrão (assunto)"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={comunicarMercado.prazoRetorno?.slice(0, 10) ?? ''}
                disabled={disabled}
                onChange={(e) => patchPrazoRetorno(e.target.value)}
                helperText="Fallback quando não houver previsão por fornecedor"
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {fornecedorAtivo && fornState && (
        <>
          <Paper
            elevation={1}
            sx={{
              position: 'sticky',
              top: 8,
              zIndex: 2,
              p: 1.5,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              gap={1}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {fornecedorAtivo} · fornecedor {activeIndex + 1} de {fornecedores.length}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                <Tooltip title="Fornecedor anterior">
                  <span>
                    <IconButton size="small" disabled={activeIndex <= 0} onClick={() => goToFornecedor(-1)}>
                      <KeyboardArrowUpIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Próximo fornecedor">
                  <span>
                    <IconButton
                      size="small"
                      disabled={activeIndex >= fornecedores.length - 1}
                      onClick={() => goToFornecedor(1)}
                    >
                      <KeyboardArrowDownIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button size="small" variant="text" onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  Ir para envios
                </Button>
                <Button size="small" variant="text" onClick={() => emailRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  Ir para e-mail
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Box ref={emailRef}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Assunto"
                  fullWidth
                  size="small"
                  value={assunto}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Tópicos do e-mail (corpo compartilhado)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Preencha primeiro o corpo compartilhado; cabeçalho do fornecedor destino é individual.
          </Typography>

          <Stack gap={1.5}>
            {topicosCorpo.map((t) => (
              <TextField
                key={t.id}
                label={`${t.grupo} · ${t.rotulo}`}
                fullWidth
                size="small"
                multiline={t.valor.length > 80 || t.valor.includes('\n')}
                minRows={t.valor.length > 80 ? 2 : 1}
                value={t.valor}
                disabled={disabled}
                onChange={(e) => patchTopico(t.id, e.target.value)}
              />
            ))}
          </Stack>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Cabeçalho do fornecedor destino
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Razão social (fornecedor destino)"
                fullWidth
                size="small"
                value={fornState.razaoSocial}
                disabled={disabled}
                onChange={(e) => patchFornecedor({ razaoSocial: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="CNPJ (fornecedor destino)"
                fullWidth
                size="small"
                value={fornState.cnpj}
                disabled={disabled}
                onChange={(e) => patchFornecedor({ cnpj: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Atividade econômica principal"
                fullWidth
                size="small"
                value={fornState.atividadeEconomica}
                disabled={disabled}
                onChange={(e) => patchFornecedor({ atividadeEconomica: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Município/UF do CNPJ"
                fullWidth
                size="small"
                value={fornState.municipioUf}
                disabled={disabled}
                onChange={(e) => patchFornecedor({ municipioUf: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Destinatários (Mailling)"
                select
                fullWidth
                size="small"
                SelectProps={{ multiple: true }}
                value={fornState.destinatariosEmails}
                disabled={disabled}
                onChange={(e) =>
                  patchFornecedor({
                    destinatariosEmails:
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : (e.target.value as string[]),
                  })
                }
                helperText="Filtrados pelo nome/área do fornecedor no Mailling"
              >
                {destinatariosMailling.map((email) => (
                  <MenuItem key={email} value={email}>
                    {email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentPasteGoIcon />}
              disabled={disabled || fornecedores.length < 2}
              onClick={handleReplicarConteudo}
            >
              Replicar conteúdo para demais fornecedores
            </Button>
            {replicadoMsg ? (
              <Typography variant="caption" color="success.main">
                {replicadoMsg}
              </Typography>
            ) : null}
          </Stack>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Sinistralidade e reajuste
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Preencha por último, antes do preview — conteúdo compartilhado entre todos os fornecedores.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Sinistralidade da apólice e período avaliado"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={sinistralidade.sinistralidadePeriodo}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ sinistralidadePeriodo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Estimativa de reajuste"
                fullWidth
                size="small"
                value={sinistralidade.estimativaReajuste}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ estimativaReajuste: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Índice de reajuste financeiro"
                fullWidth
                size="small"
                value={sinistralidade.indiceReajusteFinanceiro}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ indiceReajusteFinanceiro: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Justificativa dos picos"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={sinistralidade.justificativaPicos}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ justificativaPicos: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Maiores usuários"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={sinistralidade.maioresUsuarios}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ maioresUsuarios: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Maiores usuários mês a mês"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={sinistralidade.maioresUsuariosMesAMes}
                disabled={disabled}
                onChange={(e) => patchSinistralidade({ maioresUsuariosMesAMes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" size="small" component="label" startIcon={<UploadFileIcon />} disabled={disabled}>
                Anexar imagem / relatório de sinistralidade
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => void handleSinistralidadeUpload(e.target.files?.[0] ?? null)}
                />
              </Button>
              {sinistralidade.imagemDataUri ? (
                <Box
                  component="img"
                  src={sinistralidade.imagemDataUri}
                  alt="Sinistralidade"
                  sx={{ display: 'block', mt: 1, maxWidth: 320, maxHeight: 180, borderRadius: 1 }}
                />
              ) : null}
            </Grid>
          </Grid>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Gráfico de localidades
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Último bloco antes do preview do e-mail.
          </Typography>
          <ComunicarMercadoLocalidadeCapture
            beneficiarios={beneficiarios}
            incluirNoEmail={localidades.incluirNoEmail}
            imagemDataUri={localidades.imagemDataUri}
            disabled={disabled}
            onChange={(part) => patchLocalidades(part)}
          />

          <Divider />

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Preview do e-mail
            </Typography>
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                maxHeight: 420,
                overflow: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => void handleCopyAssunto()}
              disabled={disabled || !assunto}
            >
              {copiadoAssunto ? 'Assunto copiado!' : 'Copiar assunto'}
            </Button>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={() => void handleCopyEmail()}
              disabled={disabled || !htmlPreview}
            >
              {copiadoEmail ? 'E-mail copiado!' : 'Copiar e-mail (Outlook)'}
            </Button>
            {fornState.destinatariosEmails.length > 0 && (
              <Button
                variant="text"
                onClick={() =>
                  void navigator.clipboard.writeText(fornState.destinatariosEmails.join('; '))
                }
              >
                Copiar destinatários ({fornState.destinatariosEmails.length})
              </Button>
            )}
          </Stack>

          {erroCopia && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {erroCopia}
            </Alert>
          )}
        </>
      )}
    </Stack>
  )
}
