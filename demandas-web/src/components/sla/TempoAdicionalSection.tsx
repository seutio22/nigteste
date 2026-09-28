import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { resolveLinkedAnalistaId } from '../../utils/dashboardUserScope'
import { resolveItemAnalistaId } from '../../pages/produtividadeMatching'
import { parseHmsToSeconds } from '../../pages/produtividadeJornada'
import type { SlaTicketPageKey } from '../../pages/slaData'
import {
  TEMPO_ADICIONAL_MOTIVOS,
  TEMPO_ADICIONAL_STATUS_LABEL,
  createTempoAdicional,
  deleteTempoAdicional,
  getMotivoLabel,
  listTemposAdicionais,
  somarAdicionais,
  type TempoAdicionalRow,
} from '../../pages/tempoAdicional'

type Props = {
  pageKey: SlaTicketPageKey
  item: any
  tempoPrevistoSeconds: number | null
  regraProdutividadeId: string | null
  fmtHoras: (seconds: number) => string
}

const STATUS_COLOR = {
  pendente: 'warning',
  aprovado: 'success',
  rejeitado: 'default',
} as const

function fmtData(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function TempoAdicionalSection({ pageKey, item, tempoPrevistoSeconds, regraProdutividadeId, fmtHoras }: Props) {
  const user = useAuthStore((s) => s.user)
  const analistas = useMasterDataStore((s) => s.analistas)
  const isAdmin = user?.role === 'admin'

  const [rows, setRows] = useState<TempoAdicionalRow[]>([])
  const [open, setOpen] = useState(false)
  const [tempo, setTempo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const entityId = item?.id ? String(item.id) : ''

  const responsavelId = useMemo(
    () => (item ? resolveItemAnalistaId(item, pageKey, analistas) : null),
    [item, pageKey, analistas]
  )
  const meuAnalistaId = useMemo(() => resolveLinkedAnalistaId(user, analistas), [user, analistas])
  const podeLancar = isAdmin || (!!responsavelId && responsavelId === meuAnalistaId)

  const carregar = useCallback(async () => {
    if (!entityId) return
    try {
      setRows(await listTemposAdicionais({ pageKey, entityId }))
    } catch {
      setRows([])
    }
  }, [pageKey, entityId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const soma = somarAdicionais(rows)
  const previsto = tempoPrevistoSeconds ?? 0
  const segundosInformados = parseHmsToSeconds(tempo)

  const abrir = () => {
    setTempo('')
    setMotivo('')
    setJustificativa('')
    setErro(null)
    setOpen(true)
  }

  const salvar = async () => {
    if (!segundosInformados || segundosInformados <= 0) return setErro('Informe um tempo válido.')
    if (!motivo) return setErro('Selecione o motivo.')
    if (justificativa.trim().length < 10) return setErro('Descreva a justificativa (mínimo 10 caracteres).')
    setSaving(true)
    setErro(null)
    try {
      await createTempoAdicional({
        pageKey,
        entityId,
        ticket: item?.ticket ?? null,
        analistaId: responsavelId,
        regraProdutividadeId,
        tempoPrevistoSeconds: previsto,
        adicionalSeconds: segundosInformados,
        motivo,
        justificativa: justificativa.trim(),
      })
      setOpen(false)
      await carregar()
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao salvar o tempo adicional.')
    } finally {
      setSaving(false)
    }
  }

  const excluir = async (id: string) => {
    if (!window.confirm('Excluir este lançamento de tempo adicional?')) return
    try {
      await deleteTempoAdicional(id)
      await carregar()
    } catch (e: any) {
      window.alert(e?.message ?? 'Erro ao excluir.')
    }
  }

  const valorPrevisto =
    soma.lancadoSeconds > 0
      ? `${previsto ? fmtHoras(previsto) : '0 min'} + ${fmtHoras(soma.lancadoSeconds)} = ${fmtHoras(previsto + soma.lancadoSeconds)}`
      : previsto
        ? fmtHoras(previsto)
        : '—'

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
          Tempo previsto
        </Typography>
        <Box sx={{ textAlign: 'right', minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {valorPrevisto}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {previsto ? 'Produtividade' : 'Sem regra de produtividade'}
            {soma.pendenteSeconds > 0 ? ` · ${fmtHoras(soma.pendenteSeconds)} aguardando aprovação` : ''}
          </Typography>
        </Box>
      </Stack>

      {podeLancar ? (
        <Button
          size="small"
          startIcon={<Plus size={14} />}
          onClick={abrir}
          sx={{ textTransform: 'none', mt: 0.5, px: 0.5 }}
        >
          Informar tempo adicional
        </Button>
      ) : null}

      {rows.length > 0 ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {rows.map((r) => {
            const podeExcluir = isAdmin || (r.userId === user?.id && r.status === 'pendente')
            return (
              <Box
                key={r.id}
                sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" fontWeight={700}>
                    +{fmtHoras(r.adicionalSeconds)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getMotivoLabel(r.motivo)}
                  </Typography>
                  <Chip size="small" color={STATUS_COLOR[r.status]} label={TEMPO_ADICIONAL_STATUS_LABEL[r.status]} />
                  <Box sx={{ flex: 1 }} />
                  {podeExcluir ? (
                    <Tooltip title="Excluir lançamento">
                      <IconButton size="small" onClick={() => excluir(r.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {r.justificativa}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {r.userNome || 'Usuário'} · {fmtData(r.createdAt)}
                </Typography>
                {r.status !== 'pendente' ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {TEMPO_ADICIONAL_STATUS_LABEL[r.status]} por {r.revisorNome || 'admin'} em {fmtData(r.revisadoEm)}
                    {r.comentarioRevisao ? ` — ${r.comentarioRevisao}` : ''}
                  </Typography>
                ) : null}
              </Box>
            )
          })}
        </Stack>
      ) : null}

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Informar tempo adicional</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Tempo previsto pela regra: <strong>{previsto ? fmtHoras(previsto) : 'sem regra'}</strong>. O adicional
              fica pendente até a aprovação de um administrador.
            </Typography>
            <TextField
              label="Tempo adicional"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              placeholder="Ex.: 90, 1h30 ou 01:30"
              helperText={
                segundosInformados ? `= ${fmtHoras(segundosInformados)}` : 'Só número = minutos (90 = 1h30)'
              }
              autoFocus
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Motivo</InputLabel>
              <Select label="Motivo" value={motivo} onChange={(e) => setMotivo(String(e.target.value))}>
                {TEMPO_ADICIONAL_MOTIVOS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que o chamado exigiu mais tempo que o previsto"
              multiline
              minRows={3}
              fullWidth
            />
            {erro ? <Alert severity="error">{erro}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={salvar} disabled={saving} sx={{ textTransform: 'none' }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
