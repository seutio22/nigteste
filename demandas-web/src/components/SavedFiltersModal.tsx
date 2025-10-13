import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Paper
} from '@mui/material'
import {
  Delete as DeleteIcon,
  PlayArrow as ApplyIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon
} from '@mui/icons-material'
import { useMaillingStore } from '../store/maillingStore'
import type { MaillingFilter, SavedFilter } from '../types/mailling'

interface SavedFiltersModalProps {
  open: boolean
  onClose: () => void
  currentFilters: MaillingFilter
  onApplyFilter: (filtros: MaillingFilter) => void
}

export function SavedFiltersModal({ open, onClose, currentFilters, onApplyFilter }: SavedFiltersModalProps) {
  const { savedFilters, saveFilter, removeSavedFilter, updateSavedFilter } = useMaillingStore()
  
  const [saveMode, setSaveMode] = useState(false)
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null)
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  
  const handleSaveNewFilter = () => {
    if (!filterName.trim()) {
      alert('Por favor, dê um nome ao filtro')
      return
    }
    
    saveFilter(filterName, filterDescription, currentFilters)
    setFilterName('')
    setFilterDescription('')
    setSaveMode(false)
    alert('Filtro salvo com sucesso!')
  }
  
  const handleUpdateFilter = () => {
    if (!editingFilter) return
    
    updateSavedFilter(editingFilter.id, {
      nome: filterName,
      descricao: filterDescription,
      filtros: currentFilters
    })
    
    setEditingFilter(null)
    setFilterName('')
    setFilterDescription('')
    alert('Filtro atualizado com sucesso!')
  }
  
  const handleDeleteFilter = (id: string) => {
    if (confirm('Deseja realmente excluir este filtro?')) {
      removeSavedFilter(id)
    }
  }
  
  const handleApplyFilter = (filter: SavedFilter) => {
    onApplyFilter(filter.filtros)
    onClose()
  }
  
  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilter(filter)
    setFilterName(filter.nome)
    setFilterDescription(filter.descricao || '')
    setSaveMode(true)
  }
  
  const countActiveFilters = (filtros: MaillingFilter) => {
    return Object.entries(filtros).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && value !== ''
    }).length
  }
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkIcon color="primary" />
          <Typography variant="h6">Filtros Salvos</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Salve combinações de filtros para reutilizar rapidamente
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {/* Botão para salvar filtro atual */}
        {!saveMode && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Filtros Ativos Atualmente: {countActiveFilters(currentFilters)}
            </Typography>
            <Button
              variant="contained"
              startIcon={<BookmarkIcon />}
              onClick={() => setSaveMode(true)}
              fullWidth
              disabled={countActiveFilters(currentFilters) === 0}
            >
              Salvar Filtros Atuais
            </Button>
            {countActiveFilters(currentFilters) === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                Configure alguns filtros antes de salvar
              </Typography>
            )}
          </Paper>
        )}
        
        {/* Formulário para salvar novo filtro */}
        {saveMode && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
              {editingFilter ? 'Editar Filtro' : 'Novo Filtro'}
            </Typography>
            <TextField
              fullWidth
              label="Nome do Filtro *"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Ex: Vendas e Marketing"
              sx={{ mb: 2 }}
              size="small"
            />
            <TextField
              fullWidth
              label="Descrição (opcional)"
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              placeholder="Ex: Contatos dos departamentos de vendas e marketing"
              multiline
              rows={2}
              sx={{ mb: 2 }}
              size="small"
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={editingFilter ? handleUpdateFilter : handleSaveNewFilter}
                disabled={!filterName.trim()}
                fullWidth
              >
                {editingFilter ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSaveMode(false)
                  setEditingFilter(null)
                  setFilterName('')
                  setFilterDescription('')
                }}
                fullWidth
              >
                Cancelar
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Lista de filtros salvos */}
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          Filtros Salvos ({savedFilters.length})
        </Typography>
        
        {savedFilters.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum filtro salvo ainda. Configure filtros na página e clique em "Salvar Filtros Atuais".
            </Typography>
          </Paper>
        ) : (
          <List>
            {savedFilters.map((filter, index) => (
              <React.Fragment key={filter.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    '&:hover': { backgroundColor: 'grey.50' },
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    mb: 1
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {filter.nome}
                        </Typography>
                        <Chip
                          label={`${countActiveFilters(filter.filtros)} filtros`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {filter.descricao && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {filter.descricao}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Criado em: {new Date(filter.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        color="primary"
                        onClick={() => handleApplyFilter(filter)}
                        title="Aplicar filtro"
                      >
                        <ApplyIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        color="default"
                        onClick={() => handleEditFilter(filter)}
                        title="Editar filtro"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() => handleDeleteFilter(filter.id)}
                        title="Excluir filtro"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

