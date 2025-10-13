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
  Grid,
  Box,
  Typography,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material'
import { useMasterDataStore } from '../../store/masterDataStore'
import { MaillingContact, ChangeLogEntry } from '../../types/mailling'

interface MaillingFormProps {
  open: boolean
  contact: MaillingContact | null
  onClose: () => void
  onSubmit: (contact: Omit<MaillingContact, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function MaillingForm({ open, contact, onClose, onSubmit }: MaillingFormProps) {
  const masterDataStore = useMasterDataStore()
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cargo: '',
    area: '',
    filial: '',
    superior: '',
    posicaoEmail: 'PARA' as 'PARA' | 'CÓPIA OCULTA' | 'CÓPIA',
    grupos: [] as string[],
    cancelamento: 'nao' as 'sim' | 'nao',
    alteracaoContratual: 'nao' as 'sim' | 'nao',
    alteracaoDadosCliente: 'nao' as 'sim' | 'nao',
    alteracaoServicos: 'nao' as 'sim' | 'nao',
    alteracaoRemuneracao: 'nao' as 'sim' | 'nao',
    curadoriaPortalRh: 'nao' as 'sim' | 'nao',
    documentacaoContratual: 'nao' as 'sim' | 'nao'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Inicializar formulário quando abrir
  useEffect(() => {
    if (open) {
      if (contact) {
        setFormData({
          area: contact.area || '',
          email: contact.email || '',
          cancelamento: contact.cancelamento || 'nao',
          alteracaoContratual: contact.alteracaoContratual || 'nao',
          alteracaoDadosCliente: contact.alteracaoDadosCliente || 'nao',
          alteracaoServicos: contact.alteracaoServicos || 'nao',
          alteracaoRemuneracao: contact.alteracaoRemuneracao || 'nao',
          curadoriaPortalRh: contact.curadoriaPortalRh || 'nao',
          documentacaoContratual: contact.documentacaoContratual || 'nao',
          cargo: contact.cargo || '',
          filial: contact.filial || '',
          nome: contact.nome || '',
          posicaoEmail: contact.posicaoEmail || 'PARA',
          superior: contact.superior || '',
          grupos: contact.grupos || []
        })
      } else {
        setFormData({
          area: '',
          email: '',
          cancelamento: 'nao',
          alteracaoContratual: 'nao',
          alteracaoDadosCliente: 'nao',
          alteracaoServicos: 'nao',
          alteracaoRemuneracao: 'nao',
          curadoriaPortalRh: 'nao',
          documentacaoContratual: 'nao',
          cargo: '',
          filial: '',
          nome: '',
          posicaoEmail: 'PARA',
          superior: ''
        })
      }
      setErrors({})
    }
  }, [open, contact])
  
  // Validar formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }
    
    if (!formData.cargo.trim()) {
      newErrors.cargo = 'Cargo é obrigatório'
    }
    
    if (!formData.area.trim()) {
      newErrors.area = 'Área é obrigatória'
    }
    
    if (!formData.filial.trim()) {
      newErrors.filial = 'Filial é obrigatória'
    }
    
    if (!formData.posicaoEmail) {
      newErrors.posicaoEmail = 'Posição de e-mail é obrigatória'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Handler de mudança nos campos
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  // Handler de submit
  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData)
    }
  }
  
  // Handler de fechar
  const handleClose = () => {
    setFormData({
      area: '',
      email: '',
      informativos: 'nao',
      cancelamento: 'nao',
      alteracaoContratual: 'nao',
      alteracaoDadosCliente: 'nao',
      alteracaoServicos: 'nao',
      aniversarioClientes: 'nao',
      alteracaoRemuneracao: 'nao',
      dexpara: 'nao',
      curadoriaPortalRh: 'nao',
      documentacaoContratual: 'nao',
      cargo: '',
      filial: '',
      nome: '',
      posicaoEmail: 'PARA',
      superior: ''
    })
    setErrors({})
    onClose()
  }

  const getFieldDisplayName = (field: string) => {
    switch (field) {
      case 'area':
        return 'Área'
      case 'cargo':
        return 'Cargo'
      case 'filial':
        return 'Filial'
      case 'nome':
        return 'Nome'
      case 'email':
        return 'E-mail'
      case 'posicaoEmail':
        return 'Posição de E-mail'
      case 'grupos':
        return 'Grupos'
      case 'cancelamento':
        return 'Cancelamento'
      case 'alteracaoContratual':
        return 'Alteração Contratual'
      case 'alteracaoDadosCliente':
        return 'Alteração Dados Cliente'
      case 'alteracaoServicos':
        return 'Alteração Serviços'
      case 'alteracaoRemuneracao':
        return 'Alteração Remuneração'
      case 'curadoriaPortalRh':
        return 'Curadoria Portal RH'
      case 'documentacaoContratual':
        return 'Documentação Contratual'
      default:
        return field
    }
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {contact ? 'Editar Contato' : 'Novo Contato'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {contact ? 'Atualize as informações do contato' : 'Adicione um novo contato para mailling'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Campos obrigatórios de identificação */}
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
            Informações de Identificação *
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Área *</InputLabel>
                <Select
                  value={formData.area}
                  label="Área *"
                  onChange={(e) => handleChange('area', e.target.value)}
                  error={!!errors.area}
                  required
                >
                  <MenuItem value="">Selecione uma área</MenuItem>
                  {masterDataStore.areasMailling?.map(area => (
                    <MenuItem key={area.id} value={area.id}>{area.nome}</MenuItem>
                  )) || []}
                </Select>
                {errors.area && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.area}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Cargo *</InputLabel>
                <Select
                  value={formData.cargo}
                  label="Cargo *"
                  onChange={(e) => handleChange('cargo', e.target.value)}
                  error={!!errors.cargo}
                  required
                >
                  <MenuItem value="">Selecione um cargo</MenuItem>
                  {masterDataStore.cargosMailling?.map(cargo => (
                    <MenuItem key={cargo.id} value={cargo.id}>{cargo.nome}</MenuItem>
                  )) || []}
                </Select>
                {errors.cargo && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.cargo}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome *"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                error={!!errors.nome}
                helperText={errors.nome}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="E-mail *"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                placeholder="exemplo@empresa.com"
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Filial *</InputLabel>
                <Select
                  value={formData.filial}
                  label="Filial *"
                  onChange={(e) => handleChange('filial', e.target.value)}
                  error={!!errors.filial}
                  required
                >
                  <MenuItem value="">Selecione uma filial</MenuItem>
                  {masterDataStore.filiaisMailling?.map(filial => (
                    <MenuItem key={filial.id} value={filial.id}>{filial.nome}</MenuItem>
                  )) || []}
                </Select>
                {errors.filial && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.filial}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Superior"
                value={formData.superior}
                onChange={(e) => handleChange('superior', e.target.value)}
                placeholder="ex: Nome do superior direto"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Posição de E-mail *</InputLabel>
                <Select
                  value={formData.posicaoEmail}
                  label="Posição de E-mail *"
                  onChange={(e) => handleChange('posicaoEmail', e.target.value as 'PARA' | 'CÓPIA OCULTA' | 'CÓPIA')}
                  error={!!errors.posicaoEmail}
                  required
                >
                  <MenuItem value="PARA">PARA</MenuItem>
                  <MenuItem value="CÓPIA OCULTA">CÓPIA OCULTA</MenuItem>
                  <MenuItem value="CÓPIA">CÓPIA</MenuItem>
                </Select>
                {errors.posicaoEmail && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.posicaoEmail}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                multiple
                id="grupos-select"
                options={masterDataStore.grupos || []}
                getOptionLabel={(option) => option.nome}
                value={masterDataStore.grupos?.filter(g => formData.grupos?.includes(g.id)) || []}
                onChange={(_, newValue) => {
                  const ids = newValue.map(g => g.id)
                  setFormData(prev => ({ ...prev, grupos: ids }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Grupos"
                    placeholder={masterDataStore.grupos?.length > 0 ? "Selecione um ou mais grupos" : "Nenhum grupo cadastrado - vá em Dados > Grupos"}
                    helperText={masterDataStore.grupos?.length > 0 
                      ? `${masterDataStore.grupos.length} grupo(s) disponível(is). Selecione os grupos aos quais este contato pertence` 
                      : "⚠️ Cadastre grupos em Dados > Grupos primeiro"}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.nome}
                      {...getTagProps({ index })}
                      color="primary"
                      size="small"
                    />
                  ))
                }
                noOptionsText="Nenhum grupo encontrado. Cadastre grupos em Dados > Grupos"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }}>
            <Chip label="Parâmetros de Segmentação (Opcionais)" color="secondary" variant="outlined" />
          </Divider>
          
          {/* Novos parâmetros de segmentação */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Cancelamento</InputLabel>
                <Select
                  value={formData.cancelamento}
                  label="Cancelamento"
                  onChange={(e) => handleChange('cancelamento', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Alteração Contratual</InputLabel>
                <Select
                  value={formData.alteracaoContratual}
                  label="Alteração Contratual"
                  onChange={(e) => handleChange('alteracaoContratual', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Alteração Dados Cliente</InputLabel>
                <Select
                  value={formData.alteracaoDadosCliente}
                  label="Alteração Dados Cliente"
                  onChange={(e) => handleChange('alteracaoDadosCliente', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Alteração Serviços</InputLabel>
                <Select
                  value={formData.alteracaoServicos}
                  label="Alteração Serviços"
                  onChange={(e) => handleChange('alteracaoServicos', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Alteração Remuneração</InputLabel>
                <Select
                  value={formData.alteracaoRemuneracao}
                  label="Alteração Remuneração"
                  onChange={(e) => handleChange('alteracaoRemuneracao', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Curadoria Portal RH</InputLabel>
                <Select
                  value={formData.curadoriaPortalRh}
                  label="Curadoria Portal RH"
                  onChange={(e) => handleChange('curadoriaPortalRh', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Documentação Contratual</InputLabel>
                <Select
                  value={formData.documentacaoContratual}
                  label="Documentação Contratual"
                  onChange={(e) => handleChange('documentacaoContratual', e.target.value as 'sim' | 'nao')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="sim">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'success.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Sim
                    </Box>
                  </MenuItem>
                  <MenuItem value="nao">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'error.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                      Não
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Nota:</strong> Apenas o campo E-mail é obrigatório. Os parâmetros de segmentação 
              são opcionais e permitem filtrar contatos para envio de relatórios específicos.
            </Typography>
          </Box>

          {/* Log de Alterações - Apenas para visualização */}
          {contact && contact.changeLog && contact.changeLog.length > 0 && (
            <Accordion sx={{ mt: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="action" />
                  <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                    Histórico de Alterações ({contact.changeLog.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Data/Hora</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Campo</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Valor Anterior</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Novo Valor</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Alterado Por</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contact.changeLog
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((entry) => (
                          <TableRow key={entry.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: '0.9rem' }} />
                                {new Date(entry.timestamp).toLocaleString('pt-BR')}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EditIcon sx={{ fontSize: '0.9rem' }} />
                                {getFieldDisplayName(entry.field)}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              <Chip 
                                label={entry.oldValue || 'vazio'} 
                                size="small" 
                                variant="outlined" 
                                color="default"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              <Chip 
                                label={entry.newValue || 'vazio'} 
                                size="small" 
                                variant="outlined" 
                                color="primary"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: '0.9rem' }} />
                                <Box>
                                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                                    {entry.changedBy?.split(' (')[0] || 'Usuário'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'text.secondary' }}>
                                    {entry.changedBy?.includes('(') ? entry.changedBy.split('(')[1]?.replace(')', '') : 'Sistema'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {contact.changeLog.length === 0 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma alteração registrada para este contato.
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Informações de Criação/Atualização */}
          {contact && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Informações do Registro:</strong>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Criado em:</strong> {new Date(contact.createdAt).toLocaleString('pt-BR')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Última atualização:</strong> {new Date(contact.updatedAt).toLocaleString('pt-BR')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!formData.email.trim() || !formData.area.trim() || !formData.cargo.trim() || !formData.filial.trim() || !formData.nome.trim() || !formData.posicaoEmail.trim()}
        >
          {contact ? 'Atualizar' : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}


