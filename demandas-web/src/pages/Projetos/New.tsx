import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Stack,
  FormControlLabel,
  Switch
} from '@mui/material'
import { ArrowBack, Save, Cancel } from '@mui/icons-material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import ProjectTemplatesDialog from '../../components/ProjectTemplatesDialog'
import { summarizeTimeline, type ProjectTimelineShape } from '../../utils/projectTimelineSpreadsheet'

export default function ProjectNewPage() {
  const navigate = useNavigate()
  const { add, upsert } = useProjectStore()
  const { user } = useAuthStore()
  
  const [selectedTimeline, setSelectedTimeline] = useState<ProjectTimelineShape | null>(null)
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    startDate: '',
    endDate: '',
    manager: '',
    budget: '',
    progress: 0,
    isPrivate: false
  })
  
  const [errors, setErrors] = useState<{
    name?: string
    description?: string
    status?: string
    priority?: string
    startDate?: string
    endDate?: string
    progress?: string
  }>({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpar erro do campo
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do projeto é obrigatório'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Data de início é obrigatória'
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'Data de término é obrigatória'
    }
    
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'Data de término deve ser posterior à data de início'
    }
    
    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progresso deve estar entre 0 e 100'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      
      // Criar projeto usando o store
      const projectData = {
        name: formData.name,
        description: formData.description,
        status: formData.status as 'active' | 'paused' | 'completed' | 'cancelled',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias no futuro
        manager: formData.manager || user?.name || 'Não definido',
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        progress: formData.progress,
        team: [],
        tags: [],
        color: '#1976d2', // Cor padrão
        isPrivate: formData.isPrivate
      }
      
      // Não enviar managerId por enquanto para evitar erro de referência
      // if (user?.id) {
      //   projectData.managerId = user.id
      // }
      
      const novoProjeto = await add(projectData)

      if (selectedTimeline?.phases?.length) {
        await upsert({
          ...novoProjeto,
          timeline: selectedTimeline,
        } as any)
      }
      
      alert('Projeto criado com sucesso!')
      navigate('/projetos')
      
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      alert('Erro ao criar projeto. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/projetos')
  }

  return (
    <Box sx={{ p: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleCancel}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Novo Projeto
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Preencha os dados do novo projeto. Os campos marcados com * são obrigatórios.
        </Alert>

        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Cronograma inicial (opcional)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTimeline?.phases?.length
                  ? `Template aplicado: ${summarizeTimeline(selectedTimeline).phases} etapas, ${summarizeTimeline(selectedTimeline).tasks} tarefas, ${summarizeTimeline(selectedTimeline).subtasks} subtarefas`
                  : 'Use um template salvo ou importe um arquivo Excel com etapas, tarefas e subtarefas.'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setTemplatesDialogOpen(true)}>
                Escolher template / Excel
              </Button>
              {selectedTimeline ? (
                <Button color="inherit" onClick={() => setSelectedTimeline(null)}>
                  Limpar
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Paper>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Nome do Projeto */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Projeto *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>

            {/* Descrição */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição *"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                multiline
                rows={4}
                required
              />
            </Grid>

            {/* Status e Prioridade */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.status}>
                <InputLabel>Status *</InputLabel>
                <Select
                  value={formData.status}
                  label="Status *"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="paused">Pausado</MenuItem>
                  <MenuItem value="completed">Concluído</MenuItem>
                  <MenuItem value="cancelled">Cancelado</MenuItem>
                </Select>
                {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.priority}>
                <InputLabel>Prioridade *</InputLabel>
                <Select
                  value={formData.priority}
                  label="Prioridade *"
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Média</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
                {errors.priority && <FormHelperText>{errors.priority}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Datas */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Início *"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                error={!!errors.startDate}
                helperText={errors.startDate}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Término *"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                error={!!errors.endDate}
                helperText={errors.endDate}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Gerente e Orçamento */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Gerente do Projeto"
                value={formData.manager}
                onChange={(e) => handleInputChange('manager', e.target.value)}
                placeholder="Nome do gerente responsável"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Orçamento"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                placeholder="R$ 0,00"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Progresso */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Progresso (%)"
                value={formData.progress}
                onChange={(e) => handleInputChange('progress', Number(e.target.value))}
                error={!!errors.progress}
                helperText={errors.progress || '0-100%'}
                type="number"
                inputProps={{ min: 0, max: 100, step: 1 }}
              />
            </Grid>

          {/* Privacidade */}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPrivate}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                />
              }
              label="Projeto privado (visível só para mim)"
            />
          </Grid>
          </Grid>

          {/* Botões de Ação */}
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <PrimaryActionButton
              type="submit"
              startIcon={<Save />}
              disabled={loading}
              size="large"
            >
              {loading ? 'Criando...' : 'Criar Projeto'}
            </PrimaryActionButton>
            
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={loading}
              size="large"
            >
              Cancelar
            </Button>
          </Stack>
        </form>
      </Paper>

      <ProjectTemplatesDialog
        open={templatesDialogOpen}
        onClose={() => setTemplatesDialogOpen(false)}
        mode="pick"
        onApplyTimeline={(timeline) => setSelectedTimeline(timeline)}
      />
    </Box>
  )
}
