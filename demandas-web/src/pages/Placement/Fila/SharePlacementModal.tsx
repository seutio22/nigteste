import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { api } from '../../../lib/api.local'
import { PROPOSTA_DECK_ALLOWED_VIEWS_DEFAULT } from './placementPropostaDeck'
import {
  formatShareAccessDateTime,
  formatShareAccessDuration,
  formatShareAccessElapsed,
  type ShareClickEvent,
} from './usePlacementShareAccessTracking'

type Props = {
  open: boolean
  onClose: () => void
  cotacaoId: string
  ticketLabel: string
  /** CSV de seções permitidas (espelha preferências da etapa Proposta enviada). */
  allowedViews?: string
}

type ShareAccessLog = {
  id: string
  ipAddress: string
  accessedAt: string
  durationSeconds?: number | null
  clickEvents?: ShareClickEvent[] | null
}

type ShareToken = {
  id: string
  name?: string
  token: string
  allowedViews: string
  expiresAt?: string | null
  viewCount: number
  lastViewAt?: string | null
  createdAt: string
  accessLogs?: ShareAccessLog[]
}

export function SharePlacementModal({
  open,
  onClose,
  cotacaoId,
  ticketLabel,
  allowedViews = PROPOSTA_DECK_ALLOWED_VIEWS_DEFAULT,
}: Props) {
  const [tokens, setTokens] = useState<ShareToken[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastUrl, setLastUrl] = useState('')
  const [openClicks, setOpenClicks] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = (await api.get(`/placement/cotacoes/${cotacaoId}/share`)) as {
        shareTokens?: ShareToken[]
      }
      setTokens(res.shareTokens ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível listar links.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setName(`Proposta ${ticketLabel}`)
      setSuccess('')
      setLastUrl('')
      void load()
    }
  }, [open, cotacaoId, ticketLabel])

  async function handleCreate() {
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const res = (await api.post(`/placement/cotacoes/${cotacaoId}/share`, {
        name: name.trim() || undefined,
        allowedViews: allowedViews || PROPOSTA_DECK_ALLOWED_VIEWS_DEFAULT,
      })) as { shareUrl?: string }
      setLastUrl(res.shareUrl ?? '')
      setSuccess('Link gerado. Copie e envie ao cliente.')
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao gerar link.')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setSuccess('Link copiado.')
    } catch {
      setError('Não foi possível copiar automaticamente.')
    }
  }

  async function handleDeactivate(tokenId: string) {
    try {
      await api.delete(`/placement/cotacoes/${cotacaoId}/share/${tokenId}`)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao desativar link.')
    }
  }

  function publicUrl(token: string) {
    return `${window.location.origin}/share/placement/${token}`
  }

  function totalDwellSeconds(logs: ShareAccessLog[] | undefined): number {
    return (logs ?? []).reduce((sum, log) => sum + (log.durationSeconds ?? 0), 0)
  }

  function clicksOf(log: ShareAccessLog): ShareClickEvent[] {
    return Array.isArray(log.clickEvents) ? log.clickEvents : []
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Compartilhar apresentação
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Atualizar acessos">
            <IconButton onClick={() => void load()} size="small" disabled={loading} aria-label="Atualizar">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small" aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Gera um link público com o deck da proposta. Cada abertura registra IP, data/hora, tempo
            na página e onde a pessoa clicou (abas e botões).
          </Typography>
          <TextField
            size="small"
            label="Nome do link"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={creating || loading}
            sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
          >
            {creating ? 'Gerando…' : 'Gerar link'}
          </Button>
          {lastUrl ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" fullWidth value={lastUrl} InputProps={{ readOnly: true }} />
              <Tooltip title="Copiar">
                <IconButton onClick={() => void handleCopy(lastUrl)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          <Divider />
          <Typography variant="subtitle2">Links ativos e acessos</Typography>
          {loading ? (
            <Typography variant="body2">Carregando…</Typography>
          ) : tokens.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum link ativo.
            </Typography>
          ) : (
            tokens.map((t) => {
              const url = publicUrl(t.token)
              const logs = t.accessLogs ?? []
              const dwellTotal = totalDwellSeconds(logs)
              return (
                <Box
                  key={t.id}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {t.name || 'Link'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t.viewCount} acesso(s)
                        {t.lastViewAt ? ` · último: ${formatShareAccessDateTime(t.lastViewAt)}` : ''}
                        {dwellTotal > 0 ? ` · ${formatShareAccessDuration(dwellTotal)} no total` : ''}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ wordBreak: 'break-all', mt: 0.5 }}
                      >
                        {url}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => void handleCopy(url)} aria-label="Copiar">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDeactivate(t.id)}
                        aria-label="Desativar"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {logs.length > 0 ? (
                    <TableContainer sx={{ mt: 1.25, maxHeight: 320 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Data e hora</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">
                              Tempo
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Onde clicou</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {logs.map((log) => {
                            const clicks = clicksOf(log)
                            const open = !!openClicks[log.id]
                            return (
                              <React.Fragment key={log.id}>
                                <TableRow hover>
                                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                                    {formatShareAccessDateTime(log.accessedAt)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                                    {log.ipAddress || '—'}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontSize: '0.8125rem' }}>
                                    {formatShareAccessDuration(log.durationSeconds)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                                    {clicks.length ? (
                                      <Button
                                        size="small"
                                        sx={{ textTransform: 'none', px: 0.5, minWidth: 0 }}
                                        onClick={() =>
                                          setOpenClicks((prev) => ({ ...prev, [log.id]: !open }))
                                        }
                                      >
                                        {clicks.length} clique(s)
                                      </Button>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                </TableRow>
                                {clicks.length > 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} sx={{ py: 0, border: 0 }}>
                                      <Collapse in={open} timeout="auto" unmountOnExit>
                                        <Box sx={{ py: 1, pl: 0.5 }}>
                                          <Stack spacing={0.5}>
                                            {clicks.map((ev, idx) => (
                                              <Stack
                                                key={`${log.id}-${idx}`}
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                                flexWrap="wrap"
                                                useFlexGap
                                              >
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                  sx={{ fontFamily: 'monospace', minWidth: 44 }}
                                                >
                                                  {formatShareAccessElapsed(ev.t)}
                                                </Typography>
                                                <Chip
                                                  size="small"
                                                  label={ev.kind === 'pane' ? 'Aba' : 'Clique'}
                                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                                  color={ev.kind === 'pane' ? 'primary' : 'default'}
                                                  variant={ev.kind === 'pane' ? 'filled' : 'outlined'}
                                                />
                                                <Typography variant="caption">
                                                  {ev.label}
                                                </Typography>
                                              </Stack>
                                            ))}
                                          </Stack>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                ) : null}
                              </React.Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : t.viewCount > 0 ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Acessos registrados antes desta versão podem não exibir IP ou tempo.
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Nenhum acesso registrado ainda.
                    </Typography>
                  )}
                </Box>
              )
            })
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
