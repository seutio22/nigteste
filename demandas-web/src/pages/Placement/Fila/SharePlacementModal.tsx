import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import { api } from '../../../lib/api.local'
import { PROPOSTA_DECK_ALLOWED_VIEWS_DEFAULT } from './placementPropostaDeck'

type Props = {
  open: boolean
  onClose: () => void
  cotacaoId: string
  ticketLabel: string
  /** CSV de seções permitidas (espelha preferências da etapa Proposta enviada). */
  allowedViews?: string
}

type ShareToken = {
  id: string
  name?: string
  token: string
  allowedViews: string
  expiresAt?: string | null
  viewCount: number
  createdAt: string
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Compartilhar apresentação
        <IconButton onClick={onClose} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Gera um link público com o deck da proposta (mesmo formato da apresentação interna).
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
          <Typography variant="subtitle2">Links ativos</Typography>
          {loading ? (
            <Typography variant="body2">Carregando…</Typography>
          ) : tokens.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum link ativo.
            </Typography>
          ) : (
            tokens.map((t) => {
              const url = publicUrl(t.token)
              return (
                <Box
                  key={t.id}
                  sx={{
                    p: 1.25,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {t.name || 'Link'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.viewCount} acesso(s)
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
