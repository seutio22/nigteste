import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import AddIcon from '@mui/icons-material/Add'
import UndoIcon from '@mui/icons-material/Undo'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { CotacaoFormState } from './CotacaoFormFields'
import { usePlacementStore, type PlacementAnalista } from '../../../store/placementStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { patchKickOffInForm } from './placementPatchKickOff'
import { mercadoNomesComFornecedoresAtuais } from './placementMercadoQuadro'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { placementWorkflowCardSx } from './placementWorkflowTheme'
import { usePlacementKickOffAutosave } from './usePlacementKickOffAutosave'
import {
  appendValidacaoHistorico,
  createValidacaoAjusteLivre,
  ensureValidacaoPropostaState,
  parseValidacaoPropostaFromKickOff,
  secaoLabel,
  validacaoPropostaItensComAjuste,
  validacaoPropostaItensPendentes,
  validacaoPropostaPodeAprovar,
  validacaoPropostaPodeDevolver,
  type ValidacaoPropostaItem,
  type ValidacaoPropostaItemStatus,
  type ValidacaoPropostaState,
} from './placementValidacaoProposta'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
  /** Chamado após devolver → Consolidando dados. */
  onDevolver?: () => Promise<void>
  /** Chamado após aprovar → Proposta enviada. */
  onAprovar?: () => Promise<void>
}

const STATUS_OPTIONS: { value: ValidacaoPropostaItemStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'ok', label: 'OK' },
  { value: 'ajuste', label: 'Ajuste' },
]

export function PlacementValidacaoPropostaPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  disabled,
  onDevolver,
  onAprovar,
}: Props) {
  const patchWorkflowStatus = usePlacementCotacaoStore((s) => s.patchWorkflowStatus)
  const placementAnalistas = usePlacementStore((s) => s.analistas)
  const syncAnalistas = usePlacementStore((s) => s.syncAnalistas)
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

  const formRef = useRef(form)
  formRef.current = form
  const [actionError, setActionError] = useState<string | null>(null)
  const [novoLabel, setNovoLabel] = useState('')
  const [novoComentario, setNovoComentario] = useState('')

  useEffect(() => {
    void syncAnalistas(true)
  }, [syncAnalistas])

  const fornecedores = useMemo(
    () => mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById),
    [form, operadoras, operadorasById]
  )
  const fornecedoresRef = useRef(fornecedores)
  fornecedoresRef.current = fornecedores

  const { scheduleSave, saveState, flushPendingSave } = usePlacementKickOffAutosave({
    cotacaoId,
    onPersisted,
  })
  const saving = saveState === 'saving'

  const state = useMemo(
    () =>
      ensureValidacaoPropostaState(
        parseValidacaoPropostaFromKickOff(form.kickOffEstrategia),
        form
      ),
    [form]
  )

  const ordenados = useMemo(
    () => [...placementAnalistas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [placementAnalistas]
  )

  const validadorSelecionado =
    ordenados.find((a) => a.id === state.analistaValidadorId) ?? null

  const responsavelId = form.analistaResponsavelId
  const analistasParaValidar = useMemo(
    () => ordenados.filter((a) => !responsavelId || a.id !== responsavelId),
    [ordenados, responsavelId]
  )

  const applyState = useCallback(
    (patcher: (current: ValidacaoPropostaState) => ValidacaoPropostaState, immediate?: boolean) => {
      const current = ensureValidacaoPropostaState(
        parseValidacaoPropostaFromKickOff(formRef.current.kickOffEstrategia),
        formRef.current
      )
      const nextVp = patcher(current)
      const nextForm = patchKickOffInForm(
        formRef.current,
        { validacaoProposta: nextVp },
        fornecedoresRef.current
      )
      formRef.current = nextForm
      onChange(nextForm)
      scheduleSave(nextForm.kickOffEstrategia!, immediate)
    },
    [onChange, scheduleSave]
  )

  // Garante flush do debounce ao sair da etapa/tela.
  useEffect(
    () => () => {
      void flushPendingSave()
    },
    [flushPendingSave]
  )

  // Seed itens na primeira abertura da etapa
  useEffect(() => {
    const parsed = parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
    if (parsed.itens.length > 0) return
    applyState((cur) => ensureValidacaoPropostaState(cur, form), true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotacaoId])

  const pendentes = validacaoPropostaItensPendentes(state).length
  const ajustes = validacaoPropostaItensComAjuste(state).length
  const oks = state.itens.filter((i) => i.status === 'ok').length

  const updateItem = (id: string, patch: Partial<ValidacaoPropostaItem>) => {
    applyState(
      (cur) => ({
        ...cur,
        itens: cur.itens.map((it) =>
          it.id === id
            ? { ...it, ...patch, updatedAt: new Date().toISOString() }
            : it
        ),
      }),
      // Status OK/ajuste precisa ir à API antes de avançar etapa.
      patch.status != null
    )
  }

  const handleDesignar = async (analista: PlacementAnalista | null) => {
    setActionError(null)
    if (!analista?.id) {
      setActionError('Selecione o analista validador.')
      return
    }
    applyState(
      (cur) =>
        appendValidacaoHistorico(
          { ...cur, analistaValidadorId: analista.id },
          {
            acao: 'designar',
            detalhe: `Validador: ${analista.nome}`,
          }
        ),
      true
    )
  }

  const handleAddAjusteLivre = () => {
    setActionError(null)
    if (!novoLabel.trim() || !novoComentario.trim()) {
      setActionError('Informe o título e o comentário do ajuste adicional.')
      return
    }
    applyState((cur) => ({
      ...cur,
      itens: [...cur.itens, createValidacaoAjusteLivre(novoLabel, novoComentario)],
    }))
    setNovoLabel('')
    setNovoComentario('')
  }

  const handleDevolver = async () => {
    setActionError(null)
    const check = validacaoPropostaPodeDevolver(state)
    if (!check.ok) {
      setActionError(check.message ?? 'Não é possível devolver.')
      return
    }
    applyState(
      (cur) =>
        appendValidacaoHistorico(
          { ...cur, decisao: 'devolver' },
          {
            acao: 'devolver',
            detalhe: `${validacaoPropostaItensComAjuste(cur).length} ajuste(s) para o analista responsável`,
          }
        ),
      true
    )
    try {
      if (onDevolver) {
        await onDevolver()
      } else {
        await patchWorkflowStatus(cotacaoId, { status: 'Consolidando dados' })
        onChange({ ...formRef.current, status: 'Consolidando dados' })
      }
    } catch (e: any) {
      setActionError(e?.message ?? 'Falha ao devolver para Consolidando dados.')
    }
  }

  const handleAprovar = async () => {
    setActionError(null)
    const check = validacaoPropostaPodeAprovar(state)
    if (!check.ok) {
      setActionError(check.message ?? 'Não é possível aprovar.')
      return
    }
    applyState(
      (cur) =>
        appendValidacaoHistorico(
          { ...cur, decisao: 'aprovado' },
          { acao: 'aprovar', detalhe: 'Validação aprovada — proposta liberada' }
        ),
      true
    )
    try {
      if (onAprovar) {
        await onAprovar()
      } else {
        await patchWorkflowStatus(cotacaoId, { status: 'Proposta enviada' })
        onChange({ ...formRef.current, status: 'Proposta enviada' })
      }
    } catch (e: any) {
      setActionError(e?.message ?? 'Falha ao avançar para Proposta enviada.')
    }
  }

  const bySecao = useMemo(() => {
    const map = new Map<string, ValidacaoPropostaItem[]>()
    for (const it of state.itens) {
      const k = secaoLabel(it.secao)
      const list = map.get(k) || []
      list.push(it)
      map.set(k, list)
    }
    return [...map.entries()]
  }, [state.itens])

  return (
    <Paper variant="outlined" sx={{ ...placementWorkflowCardSx, p: 2.5, mb: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Validação do consolidado (proposta)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Foque nos dados consolidados para apresentar a proposta — condições, diferenciais,
              indicadores e ajustes adicionais. Esta etapa não revisa os dados de abertura do
              processo. Com ajustes, devolva para Consolidando dados.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`${oks} OK`} color="success" variant="outlined" />
            <Chip size="small" label={`${pendentes} pendente(s)`} color="default" variant="outlined" />
            <Chip
              size="small"
              label={`${ajustes} ajuste(s)`}
              color={ajustes ? 'warning' : 'default'}
              variant="outlined"
            />
            {saving ? <Chip size="small" label="Salvando…" /> : null}
          </Stack>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <PersonSearchIcon color="action" />
            <Autocomplete
              sx={{ flex: 1, minWidth: 220 }}
              options={analistasParaValidar}
              getOptionLabel={(o) => o.nome}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={validadorSelecionado}
              onChange={(_, v) => void handleDesignar(v)}
              disabled={disabled}
              noOptionsText="Cadastre analistas em Dados → Placement → Analista"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Analista validador (Placement)"
                  placeholder="Selecione na lista Placement"
                  size="small"
                  helperText="Catálogo Dados → Placement → Analista"
                />
              )}
            />
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => void syncAnalistas(true)}
              sx={{ textTransform: 'none' }}
            >
              Atualizar lista
            </Button>
          </Stack>
          {responsavelId && validadorSelecionado?.id === responsavelId ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              O validador deve ser diferente do analista responsável pelo processo.
            </Alert>
          ) : null}
        </Paper>

        {actionError && (
          <Alert severity="error" onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {bySecao.map(([secao, itens]) => (
          <Box key={secao}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {secao}
            </Typography>
            <Stack spacing={1.25}>
              {itens.map((it) => (
                <Paper key={it.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {it.label}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Avaliação</InputLabel>
                        <Select
                          label="Avaliação"
                          value={it.status}
                          disabled={disabled}
                          onChange={(e) =>
                            updateItem(it.id, {
                              status: e.target.value as ValidacaoPropostaItemStatus,
                            })
                          }
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        fullWidth
                        label={
                          it.status === 'ajuste'
                            ? 'Descreva o ajuste necessário'
                            : 'Comentário (opcional)'
                        }
                        value={it.comentario}
                        disabled={disabled}
                        required={it.status === 'ajuste'}
                        onChange={(e) => updateItem(it.id, { comentario: e.target.value })}
                      />
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Item adicional da proposta
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Use para apontar ajustes no consolidado que não estão na lista acima (ex.: slide,
            comparação, texto da proposta).
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              label="Título do ajuste"
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              disabled={disabled}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Descrição"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              disabled={disabled}
              sx={{ flex: 2 }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAjusteLivre}
              disabled={disabled}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Incluir
            </Button>
          </Stack>
        </Box>

        {state.historico.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Histórico
            </Typography>
            <Stack spacing={0.75}>
              {state.historico.slice(0, 8).map((h) => (
                <Typography key={h.id} variant="caption" color="text.secondary">
                  {new Date(h.at).toLocaleString('pt-BR')} — {h.acao}
                  {h.detalhe ? `: ${h.detalhe}` : ''}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UndoIcon />}
            disabled={disabled || saving}
            onClick={() => void handleDevolver()}
            sx={{ textTransform: 'none' }}
          >
            Devolver para consolidar
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            disabled={disabled || saving}
            onClick={() => void handleAprovar()}
            sx={{ textTransform: 'none' }}
          >
            Aprovar e enviar proposta
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
