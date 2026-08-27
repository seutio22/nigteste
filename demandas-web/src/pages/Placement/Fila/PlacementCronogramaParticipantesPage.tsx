import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { usePlacementCronogramaPage } from './placementCronogramaPageContext'
import { addCronogramaParticipante, removeCronogramaParticipante } from './placementCronogramaSync'

export default function PlacementCronogramaParticipantesPage() {
  const { cronograma, setCronograma } = usePlacementCronogramaPage()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')

  const participantes = cronograma.participantes ?? []

  function handleAdd() {
    const trimmed = nome.trim()
    if (!trimmed) return
    setCronograma(addCronogramaParticipante(cronograma, trimmed, email.trim() || null))
    setNome('')
    setEmail('')
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        Participantes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cadastre quem pode ser selecionado como responsável nas tarefas do cronograma desta cotação.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
          <TextField
            label="Nome"
            size="small"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="E-mail (opcional)"
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!nome.trim()}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Adicionar
          </Button>
        </Stack>
      </Paper>

      {participantes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum participante cadastrado. Adicione nomes acima para usá-los no campo Responsável.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 64 }} align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {participantes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell>{p.email ?? '—'}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Remover"
                      onClick={() => setCronograma(removeCronogramaParticipante(cronograma, p.id))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {participantes.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          {participantes.map((p) => (
            <Chip key={p.id} label={p.nome} size="small" variant="outlined" />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}
