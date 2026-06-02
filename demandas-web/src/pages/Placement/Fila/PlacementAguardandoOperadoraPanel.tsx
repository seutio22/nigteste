import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
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
import TableChartIcon from '@mui/icons-material/TableChart'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useMasterDataStore } from '../../../store/masterDataStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
  type AguardandoOperadoraFornecedorState,
  type AguardandoOperadoraState,
} from './placementAguardandoOperadora'
import { buildKickOffEstrategiaPatch, mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'
import { sanitizePercentInput } from './placementCotacaoFinanceiro'
import { api } from '../../../lib/api.local'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
}

function normKey(nome: string): string {
  return nome.trim().toLowerCase()
}

export function PlacementAguardandoOperadoraPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  disabled,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

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

  const aguardandoOperadora = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById,
        comunicarMercado
      ),
    [form, operadoras, operadorasById, comunicarMercado]
  )

  const [fornecedorAtivo, setFornecedorAtivo] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    if (!fornecedorAtivo && fornecedores.length) {
      setFornecedorAtivo(fornecedores[0])
    }
  }, [fornecedores, fornecedorAtivo])

  const fornKey = normKey(fornecedorAtivo)
  const fornAguardando = aguardandoOperadora.fornecedores[fornKey]
  const fornComunicar = comunicarMercado.fornecedores[fornKey]

  function persistAguardando(next: AguardandoOperadoraState, options?: { immediate?: boolean }) {
    const kickOff = buildKickOffEstrategiaPatch(
      form.kickOffEstrategia,
      { aguardandoOperadora: next },
      fornecedores
    )
    const nextForm: CotacaoFormState = {
      ...form,
      kickOffEstrategia: kickOff,
    }
    formRef.current = nextForm
    onChange(nextForm)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const runSave = async () => {
      if (!cotacaoId) return
      setSaveState('saving')
      try {
        const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, {
          kickOffEstrategia: kickOff,
        })
        onPersisted?.(mergeSavedKickOffIntoApiCotacao(updated, kickOff))
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }
    if (options?.immediate) void runSave()
    else saveTimerRef.current = setTimeout(() => void runSave(), 700)
  }

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    []
  )

  function patchFornecedor(part: Partial<AguardandoOperadoraFornecedorState>) {
    if (!fornKey) return
    const next = ensureAguardandoOperadoraState(
      aguardandoOperadora,
      form,
      operadoras,
      operadorasById,
      comunicarMercado
    )
    next.fornecedores[fornKey] = { ...next.fornecedores[fornKey], ...part }
    persistAguardando(next, { immediate: part.retornoRecebido !== undefined })
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
      <Alert severity="info">
        Registre o retorno de cada operadora. As datas de envio e previsão vêm da etapa «Comunicar mercado»; o
        grupo de produção e as comissões são definidos por fornecedor abaixo. Alterações salvas automaticamente.
      </Alert>

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
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fornecedores.map((nome) => {
              const key = normKey(nome)
              const cm = comunicarMercado.fornecedores[key]
              const ag = aguardandoOperadora.fornecedores[key]
              return (
                <TableRow
                  key={nome}
                  selected={fornecedorAtivo === nome}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setFornecedorAtivo(nome)}
                >
                  <TableCell>{nome}</TableCell>
                  <TableCell>{cm?.dataEnvio ? cm.dataEnvio.slice(0, 10) : '—'}</TableCell>
                  <TableCell>
                    {cm?.dataPrevisaoRetorno?.slice(0, 10) ||
                      comunicarMercado.prazoRetorno?.slice(0, 10) ||
                      '—'}
                  </TableCell>
                  <TableCell>{ag?.dataRetornoEfetiva?.slice(0, 10) || '—'}</TableCell>
                  <TableCell>{cm?.grupoProducao?.trim() || '—'}</TableCell>
                  <TableCell>{ag?.retornoRecebido ? 'Retorno recebido' : 'Aguardando'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>

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
              <TextField
                label="Grupo de produção"
                fullWidth
                size="small"
                value={fornComunicar?.grupoProducao ?? ''}
                disabled
                helperText="Sinalizado em Comunicar mercado"
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
            <Grid item xs={12}>
              <TextField
                label="Observações do retorno"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={fornAguardando.observacoes}
                disabled={disabled}
                onChange={(e) => patchFornecedor({ observacoes: e.target.value })}
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
        </>
      )}
    </Stack>
  )
}
