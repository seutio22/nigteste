import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import TableChartIcon from '@mui/icons-material/TableChart'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { useMasterDataStore } from '../../../store/masterDataStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureComunicarMercadoState,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import {
  ensureAguardandoOperadoraState,
  classificacaoPermitePropostaValores,
  emptyPropostaFornecedor,
  parseAguardandoOperadoraFromKickOff,
  type AguardandoOperadoraFornecedorState,
  type AguardandoOperadoraState,
  type MercadoFornecedorClassificacao,
  type PropostaFornecedorState,
} from './placementAguardandoOperadora'
import { patchKickOffInForm } from './placementPatchKickOff'
import { AguardandoFornecedorTableRow } from './AguardandoFornecedorTableRow'
import { usePlacementKickOffAutosave } from './usePlacementKickOffAutosave'
import { sanitizePercentInput } from './placementCotacaoFinanceiro'
import { MERCADO_CLASSIFICACAO_LABELS, mercadoNomesComFornecedoresAtuais } from './placementMercadoQuadro'
import { patchAguardandoProposta, PropostaFornecedorSection } from './PropostaFornecedorSection'
import { isFornecedorAtualNome } from './placementPropostaCenarioAtual'
import { PlacementDraftTextField } from './PlacementDraftTextField'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
  onOpenSlides?: () => void
  /** Oculta atalhos para abrir comparativo (ex.: já dentro da tela cheia). */
  embedded?: boolean
}

function normKey(nome: string): string {
  return nome.trim().toLowerCase()
}

export const PlacementAguardandoOperadoraPanel = React.memo(function PlacementAguardandoOperadoraPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  disabled,
  onOpenSlides,
  embedded = false,
}: Props) {
  const navigate = useNavigate()
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

  const kickOffRaw = form.kickOffEstrategia

  const fornecedores = useMemo(
    () => mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById),
    [form.itens, form.operadorasSugestaoIds, kickOffRaw?.mercadoAnalisado, operadoras, operadorasById]
  )

  const comunicarMercado = useMemo(
    () =>
      ensureComunicarMercadoState(
        parseComunicarMercadoFromKickOff(kickOffRaw),
        form,
        operadoras,
        operadorasById
      ),
    [kickOffRaw, form, operadoras, operadorasById]
  )

  const aguardandoOperadora = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(kickOffRaw),
        form,
        operadoras,
        operadorasById,
        comunicarMercado
      ),
    [kickOffRaw, form, operadoras, operadorasById, comunicarMercado]
  )

  const [fornecedorAtivo, setFornecedorAtivo] = useState('')
  const lancamentoSectionRef = useRef<HTMLDivElement>(null)
  const propostaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPropostaRef = useRef<PropostaFornecedorState | null>(null)
  const formRef = useRef(form)
  formRef.current = form
  const operadorasRef = useRef(operadoras)
  operadorasRef.current = operadoras
  const operadorasByIdRef = useRef(operadorasById)
  operadorasByIdRef.current = operadorasById
  const fornecedoresRef = useRef(fornecedores)
  fornecedoresRef.current = fornecedores
  const comunicarMercadoRef = useRef(comunicarMercado)
  comunicarMercadoRef.current = comunicarMercado

  const { saveState, scheduleSave } = usePlacementKickOffAutosave({ cotacaoId, onPersisted, debounceMs: 700 })

  useEffect(() => {
    if (!fornecedorAtivo && fornecedores.length) {
      setFornecedorAtivo(fornecedores[0])
    }
  }, [fornecedores, fornecedorAtivo])

  const fornKey = normKey(fornecedorAtivo)
  const fornAguardando = aguardandoOperadora.fornecedores[fornKey]
  const fornComunicar = comunicarMercado.fornecedores[fornKey]
  const fornProposta = aguardandoOperadora.propostas[fornKey]
  const permitePropostaValores = fornAguardando
    ? classificacaoPermitePropostaValores(fornAguardando.classificacaoMercado)
    : false

  const persistAguardando = useCallback(
    (next: AguardandoOperadoraState, options?: { immediate?: boolean }) => {
      const f = formRef.current
      const nextForm = patchKickOffInForm(f, { aguardandoOperadora: next }, fornecedoresRef.current)
      const kickOff = nextForm.kickOffEstrategia!
      formRef.current = nextForm
      onChange(nextForm)
      scheduleSave(kickOff, options?.immediate)
    },
    [onChange, scheduleSave]
  )

  useEffect(
    () => () => {
      if (propostaDebounceRef.current) clearTimeout(propostaDebounceRef.current)
    },
    []
  )

  function patchFornecedor(part: Partial<AguardandoOperadoraFornecedorState>) {
    if (!fornKey) return
    const next = ensureAguardandoOperadoraState(
      aguardandoOperadora,
      formRef.current,
      operadorasRef.current,
      operadorasByIdRef.current,
      comunicarMercadoRef.current
    )
    next.fornecedores[fornKey] = { ...next.fornecedores[fornKey], ...part }
    persistAguardando(next, { immediate: part.retornoRecebido !== undefined })
  }

  function patchProposta(
    nextOrUpdater:
      | PropostaFornecedorState
      | ((prev: PropostaFornecedorState) => PropostaFornecedorState)
  ) {
    if (!fornKey) return

    const ag = ensureAguardandoOperadoraState(
      parseAguardandoOperadoraFromKickOff(formRef.current.kickOffEstrategia),
      formRef.current,
      operadorasRef.current,
      operadorasByIdRef.current,
      comunicarMercadoRef.current
    )
    const current = ag.propostas[fornKey] ?? emptyPropostaFornecedor()
    const proposta =
      typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater
    pendingPropostaRef.current = proposta

    const nextForm = patchKickOffInForm(
      formRef.current,
      { aguardandoOperadora: patchAguardandoProposta(ag, fornKey, proposta) },
      fornecedoresRef.current
    )
    formRef.current = nextForm
    onChange(nextForm)

    if (propostaDebounceRef.current) clearTimeout(propostaDebounceRef.current)
    propostaDebounceRef.current = setTimeout(() => {
      scheduleSave(formRef.current.kickOffEstrategia!)
    }, 400)
  }

  function abrirComparativoTelaCheia() {
    navigate(`/placement/fila/${cotacaoId}/comparativo`)
  }

  if (!fornecedores.length) {
    return (
      <Alert severity="warning">
        Nenhum fornecedor no mercado analisado. Conclua o Kick off e a etapa «Comunicar mercado» antes de
        registrar retornos.
      </Alert>
    )
  }

  return (
    <Stack gap={2}>
      {!embedded && (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Alert severity="info" sx={{ flex: 1, minWidth: 280 }}>
            Registre o retorno de cada operadora e lance as propostas abaixo. O comparativo abre em página dedicada,
            com espaço amplo para analisar todas as colunas.
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<OpenInFullIcon />}
              onClick={abrirComparativoTelaCheia}
              disabled={disabled}
            >
              Abrir comparativo em tela cheia
            </Button>
            {onOpenSlides && (
              <Button variant="outlined" startIcon={<SlideshowIcon />} onClick={onOpenSlides} disabled={disabled}>
                Slides
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {saveState !== 'idle' && (
        <Chip
          size="small"
          sx={{ alignSelf: 'flex-start' }}
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
                  : ''
          }
        />
      )}

      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChartIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Acompanhamento por fornecedor
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fornecedor</TableCell>
              <TableCell>Envio</TableCell>
              <TableCell>Previsão retorno</TableCell>
              <TableCell>Retorno efetivo</TableCell>
              <TableCell>Grupo produção</TableCell>
              <TableCell>Comissão apresentada</TableCell>
              <TableCell>Quadro</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fornecedores.map((nome) => {
              const key = normKey(nome)
              return (
                <AguardandoFornecedorTableRow
                  key={nome}
                  nome={nome}
                  selected={fornecedorAtivo === nome}
                  cm={comunicarMercado.fornecedores[key]}
                  ag={aguardandoOperadora.fornecedores[key]}
                  prazoRetorno={comunicarMercado.prazoRetorno}
                  onSelect={() => setFornecedorAtivo(nome)}
                />
              )
            })}
          </TableBody>
        </Table>
      </Paper>

      <Box ref={lancamentoSectionRef}>
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" flexWrap="wrap" gap={1}>
        {fornecedores.map((nome) => {
          const recebido = aguardandoOperadora.fornecedores[normKey(nome)]?.retornoRecebido
          return (
            <Chip
              key={nome}
              label={nome}
              color={fornecedorAtivo === nome ? 'primary' : 'default'}
              variant={fornecedorAtivo === nome ? 'filled' : 'outlined'}
              icon={recebido ? <CheckCircleIcon /> : undefined}
              onClick={() => setFornecedorAtivo(nome)}
              disabled={disabled}
            />
          )
        })}
        </Stack>
        {!embedded && (
          <Button size="small" variant="text" startIcon={<OpenInFullIcon />} onClick={abrirComparativoTelaCheia}>
            Abrir comparativo
          </Button>
        )}
      </Stack>

      {fornecedorAtivo && fornAguardando && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Data de envio"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={fornComunicar?.dataEnvio?.slice(0, 10) ?? ''}
                disabled
                helperText="Registrada em Comunicar mercado"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Previsão de retorno"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={
                  fornComunicar?.dataPrevisaoRetorno?.slice(0, 10) ||
                  comunicarMercado.prazoRetorno?.slice(0, 10) ||
                  ''
                }
                disabled
                helperText="Registrada em Comunicar mercado"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Retorno efetivo"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={fornAguardando.dataRetornoEfetiva?.slice(0, 10) ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  patchFornecedor({
                    dataRetornoEfetiva: e.target.value,
                    ...(e.target.value ? { retornoRecebido: true } : {}),
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <PlacementDraftTextField
                label="Grupo de produção"
                fullWidth
                size="small"
                value={fornAguardando.grupoProducao}
                disabled={disabled}
                onCommit={(v) => patchFornecedor({ grupoProducao: v })}
                helperText={
                  fornComunicar?.grupoProducao?.trim() && !fornAguardando.grupoProducao?.trim()
                    ? `Sugerido em Comunicar mercado: ${fornComunicar.grupoProducao}`
                    : 'Editável nesta etapa'
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Comissão agenciamento (%)"
                fullWidth
                size="small"
                value={fornAguardando.comissaoAgenciamento}
                disabled={disabled}
                onChange={(e) =>
                  patchFornecedor({ comissaoAgenciamento: sanitizePercentInput(e.target.value) })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Comissão vitalício (%)"
                fullWidth
                size="small"
                value={fornAguardando.comissaoVitalicio}
                disabled={disabled}
                onChange={(e) =>
                  patchFornecedor({ comissaoVitalicio: sanitizePercentInput(e.target.value) })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="classificacao-mercado">Classificação no quadro</InputLabel>
                <Select
                  labelId="classificacao-mercado"
                  label="Classificação no quadro"
                  value={fornAguardando.classificacaoMercado}
                  disabled={disabled}
                  onChange={(e) => {
                    const classificacaoMercado = e.target.value as MercadoFornecedorClassificacao
                    patchFornecedor({ classificacaoMercado })
                    if (!classificacaoPermitePropostaValores(classificacaoMercado)) {
                      patchProposta((prev) => ({ ...prev, incluirNoComparativo: false }))
                    }
                  }}
                >
                  {(Object.entries(MERCADO_CLASSIFICACAO_LABELS) as [MercadoFornecedorClassificacao, string][]).map(
                    ([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <PlacementDraftTextField
                label="Observações do retorno"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={fornAguardando.observacoes}
                disabled={disabled}
                onCommit={(v) => patchFornecedor({ observacoes: v })}
              />
            </Grid>
          </Grid>

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={fornAguardando.retornoRecebido}
                disabled={disabled}
                onChange={(e) => {
                  const checked = e.target.checked
                  patchFornecedor({
                    retornoRecebido: checked,
                    ...(checked && !fornAguardando.dataRetornoEfetiva
                      ? { dataRetornoEfetiva: new Date().toISOString().slice(0, 10) }
                      : {}),
                  })
                }}
              />
            }
            label="Marcar retorno da operadora como recebido"
          />

          {fornProposta && permitePropostaValores && (
            <PropostaFornecedorSection
              fornecedorNome={fornecedorAtivo}
              proposta={fornProposta}
              form={form}
              operadoras={operadoras}
              operadorasById={operadorasById}
              isFornecedorAtual={
                fornAguardando?.classificacaoMercado === 'fornecedor_atual' ||
                isFornecedorAtualNome(fornecedorAtivo, form, operadoras, operadorasById)
              }
              disabled={disabled}
              onChange={patchProposta}
            />
          )}

          {fornAguardando && !permitePropostaValores && (
            <Alert severity="warning">
              Fornecedor classificado como{' '}
              <strong>{MERCADO_CLASSIFICACAO_LABELS[fornAguardando.classificacaoMercado]}</strong>. Não é necessário
              cadastrar proposta nem custos — ele aparece apenas no quadro de mercado.
            </Alert>
          )}
        </>
      )}
      </Box>
    </Stack>
  )
})
