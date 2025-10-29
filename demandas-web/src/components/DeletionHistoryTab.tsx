import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material'
import {
  RestoreFromTrash as RestoreIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon
} from '@mui/icons-material'

interface DeletionLog {
  id: string
  entityType: string
  entityId: string
  deletedBy: string
  deletedAt: string
  reason?: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  entityData?: any
}

interface DeletionStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byEntityType: Array<{ entityType: string; _count: { entityType: number } }>
  byUser: Array<{ deletedBy: string; _count: { deletedBy: number } }>
}

const DeletionHistoryTab: React.FC = () => {
  const [logs, setLogs] = useState<DeletionLog[]>([])
  const [stats, setStats] = useState<DeletionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    entityType: '',
    deletedBy: '',
    startDate: '',
    endDate: ''
  })
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean
    log: DeletionLog | null
    reason: string
  }>({
    open: false,
    log: null,
    reason: ''
  })
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const entityTypeLabels: Record<string, string> = {
    demanda: 'Cadastro',
    manutencao: 'Manutenção',
    analytics: 'Analytics',
    atendimento: 'Atendimento',
    validacao: 'Validação',
    reajuste: 'Reajuste'
  }

  const entityTypeColors: Record<string, string> = {
    demanda: 'primary',
    manutencao: 'secondary',
    analytics: 'success',
    atendimento: 'warning',
    validacao: 'info',
    reajuste: 'error'
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      if (filters.entityType) queryParams.append('entityType', filters.entityType)
      if (filters.deletedBy) queryParams.append('deletedBy', filters.deletedBy)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)

      const response = await fetch(`/api/deletion-history/history?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setLogs(data.logs)
      } else {
        throw new Error(data.error || 'Erro ao carregar histórico')
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar histórico de exclusões',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/deletion-history/stats')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [filters])

  const handleRestore = async (log: DeletionLog) => {
    setRestoreDialog({
      open: true,
      log,
      reason: ''
    })
  }

  const confirmRestore = async () => {
    if (!restoreDialog.log) return

    try {
      setRestoring(restoreDialog.log.id)
      
      const response = await fetch(`/api/deletion-history/restore/${restoreDialog.log.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: restoreDialog.reason
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Item restaurado com sucesso!',
          severity: 'success'
        })
        fetchLogs()
        fetchStats()
      } else {
        throw new Error(data.error || 'Erro ao restaurar item')
      }
    } catch (error) {
      console.error('Erro ao restaurar:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao restaurar item',
        severity: 'error'
      })
    } finally {
      setRestoring(null)
      setRestoreDialog({ open: false, log: null, reason: '' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getEntityTitle = (log: DeletionLog) => {
    if (!log.entityData) return `ID: ${log.entityId}`
    
    switch (log.entityType) {
      case 'demanda':
        return log.entityData.titulo || `Demanda ${log.entityId}`
      case 'manutencao':
        return log.entityData.titulo || `Manutenção ${log.entityId}`
      case 'analytics':
        return log.entityData.titulo || `Relatório ${log.entityId}`
      case 'atendimento':
        return log.entityData.titulo || `Atendimento ${log.entityId}`
      case 'validacao':
        return log.entityData.titulo || `Validação ${log.entityId}`
      case 'reajuste':
        return log.entityData.titulo || `Reajuste ${log.entityId}`
      default:
        return `Item ${log.entityId}`
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5" component="h1">
          Histórico de Exclusões
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchLogs()
            fetchStats()
          }}
          sx={{ ml: 'auto' }}
        >
          Atualizar
        </Button>
      </Box>

      {/* Estatísticas */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total de Exclusões
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Hoje
                </Typography>
                <Typography variant="h4">
                  {stats.today}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Esta Semana
                </Typography>
                <Typography variant="h4">
                  {stats.thisWeek}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Este Mês
                </Typography>
                <Typography variant="h4">
                  {stats.thisMonth}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtros
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Entidade</InputLabel>
              <Select
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                label="Tipo de Entidade"
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(entityTypeLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Inicial"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Final"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Logs */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Excluído por</TableCell>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Motivo</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary">
                    Nenhum item excluído encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Chip
                      label={entityTypeLabels[log.entityType] || log.entityType}
                      color={entityTypeColors[log.entityType] as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getEntityTitle(log)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {log.entityId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.user.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {log.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(log.deletedAt)}
                  </TableCell>
                  <TableCell>
                    {log.reason || '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Restaurar Item">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRestore(log)}
                        disabled={restoring === log.id}
                      >
                        {restoring === log.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RestoreIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Confirmação de Restauração */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, log: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmar Restauração
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Você está prestes a restaurar um item que foi excluído. 
            Esta ação irá remover o item do histórico de exclusões e 
            torná-lo novamente visível no sistema.
          </Alert>
          
          {restoreDialog.log && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Tipo:</strong> {entityTypeLabels[restoreDialog.log.entityType]}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Item:</strong> {getEntityTitle(restoreDialog.log)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Excluído em:</strong> {formatDate(restoreDialog.log.deletedAt)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Excluído por:</strong> {restoreDialog.log.user.name}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo da Restauração (opcional)"
            value={restoreDialog.reason}
            onChange={(e) => setRestoreDialog({ ...restoreDialog, reason: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRestoreDialog({ open: false, log: null, reason: '' })}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmRestore}
            variant="contained"
            color="primary"
            disabled={restoring !== null}
          >
            {restoring ? 'Restaurando...' : 'Confirmar Restauração'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default DeletionHistoryTab
