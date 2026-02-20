import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Trash2, Users } from 'lucide-react'
import { getApi } from '../lib/apiConfig'

interface ManagedAlertsModalProps {
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}

export function ManagedAlertsModal({ open, onClose, onDeleted }: ManagedAlertsModalProps) {
  const [alertas, setAlertas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      getApi()
        .get('/user-alerts/managed')
        .then((res: any) => {
          setAlertas(res?.alertas ?? [])
        })
        .catch(() => setAlertas([]))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await getApi().delete(`/user-alerts/${id}`)
      setAlertas((prev) => prev.filter((a) => a.id !== id))
      onDeleted?.()
    } catch {
      setDeletingId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return d
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Meus alertas criados</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box className="flex justify-center py-8">
            <CircularProgress />
          </Box>
        ) : alertas.length === 0 ? (
          <Typography color="textSecondary" className="py-8 text-center">
            Nenhum alerta criado ainda
          </Typography>
        ) : (
          <List className="divide-y divide-gray-100">
            {alertas.map((a) => (
              <ListItem
                key={a.id}
                className="flex flex-col items-start gap-2"
                sx={{ alignItems: 'flex-start' }}
              >
                <div className="flex w-full items-center justify-between">
                  <Typography variant="subtitle2" className="font-medium">
                    {a.titulo}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="text-gray-400 hover:text-red-500"
                  >
                    {deletingId === a.id ? (
                      <CircularProgress size={18} />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </IconButton>
                </div>
                <Typography variant="body2" color="textSecondary" className="line-clamp-2">
                  {a.mensagem}
                </Typography>
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip label={formatDate(a.dataExibicao)} size="small" variant="outlined" />
                  <Chip label={a.prioridade} size="small" />
                  <Chip
                    icon={<Users className="w-3 h-3" />}
                    label={`${a.visualizacoes?.length ?? 0} visualização(ões)`}
                    size="small"
                  />
                </div>
                {a.visualizacoes?.length > 0 && (
                  <Accordion className="w-full shadow-none border border-gray-100">
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="caption">Quem visualizou</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {a.visualizacoes.map((v: any) => (
                          <ListItem key={v.id} className="py-0">
                            <ListItemText
                              primary={v.usuarioNome}
                              secondary={formatDate(v.dataVisualizacao)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
