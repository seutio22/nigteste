import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material'
import { getApi } from '../lib/apiConfig'
import { useAuthStore } from '../store/authStore'

interface CreateAlertModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateAlertModal({ open, onClose, onSuccess }: CreateAlertModalProps) {
  const { user } = useAuthStore()
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [dataExibicao, setDataExibicao] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [targetUsers, setTargetUsers] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitulo('')
      setMensagem('')
      setPrioridade('media')
      setDataExibicao(new Date().toISOString().slice(0, 10))
      setTargetUsers([])
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setLoadingUsers(true)
      getApi()
        .get('/user-alerts/available-users')
        .then((data: any) => {
          const list = Array.isArray(data) ? data : data?.users ?? []
          setUsers(
            list.map((u: any) => ({
              id: u.id,
              name: u.name || u.email || 'Sem nome'
            }))
          )
        })
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false))
    }
  }, [open])

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      setError('Título é obrigatório')
      return
    }
    if (!mensagem.trim()) {
      setError('Mensagem é obrigatória')
      return
    }
    if (!dataExibicao) {
      setError('Data de exibição é obrigatória')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await getApi().post('/user-alerts', {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        prioridade,
        dataExibicao: new Date(dataExibicao).toISOString(),
        targetUserIds: targetUsers.map((u) => u.id)
      })
      onSuccess?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar alerta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Criar alerta para usuários</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box className="flex flex-col gap-4 pt-2">
          <TextField
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            fullWidth
            multiline
            rows={3}
            required
          />
          <FormControl fullWidth>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={prioridade}
              label="Prioridade"
              onChange={(e) => setPrioridade(e.target.value)}
            >
              <MenuItem value="baixa">Baixa</MenuItem>
              <MenuItem value="media">Média</MenuItem>
              <MenuItem value="alta">Alta</MenuItem>
              <MenuItem value="urgente">Urgente</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Data de exibição"
            type="date"
            value={dataExibicao}
            onChange={(e) => setDataExibicao(e.target.value)}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(opt) => opt.name}
            value={targetUsers}
            onChange={(_, v) => setTargetUsers(v)}
            loading={loadingUsers}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Destinatários (vazio = todos)"
                placeholder="Selecione usuários..."
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((opt, i) => (
                <Chip
                  key={opt.id}
                  label={opt.name}
                  size="small"
                  {...getTagProps({ index: i })}
                />
              ))
            }
          />
          {targetUsers.length === 0 && (
            <Typography variant="caption" color="textSecondary">
              Deixe vazio para enviar o alerta a todos os usuários
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Criar alerta'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
