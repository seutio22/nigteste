import React, { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  FilterList as FilterIcon,
  Email as EmailIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import { useMaillingStore } from '../../store/maillingStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { MaillingContact, MaillingFilter } from '../../types/mailling'
import { MaillingForm } from './Form'
import { UploadModal } from '../../components/UploadModal'

export default function MaillingListPage() {
  const maillingStore = useMaillingStore()
  const masterDataStore = useMasterDataStore()
  
  // Estados
  const [searchTerm, setSearchTerm] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<MaillingContact | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [emailsPopupOpen, setEmailsPopupOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as const })
  
  // Filtros
  const [filters, setFilters] = useState<MaillingFilter>({})
  
  // Sincronizar com a API quando a página carregar
  useEffect(() => {
    maillingStore.syncFromApi()
  }, [])
  
  // Contatos filtrados
  const filteredContacts = useMemo(() => {
    let contacts = maillingStore.contacts
    
    // Aplicar filtros
    if (Object.values(filters).some(v => v)) {
      contacts = maillingStore.getFiltered(filters)
    }
    
    // Aplicar busca
    if (searchTerm) {
      contacts = contacts.filter(contact => 
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.filial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.superior?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return contacts
  }, [maillingStore.contacts, filters, searchTerm])
  
  // Handlers
  const handleAddContact = () => {
    setEditingContact(null)
    setFormOpen(true)
  }
  
  const handleEditContact = (contact: MaillingContact) => {
    setEditingContact(contact)
    setFormOpen(true)
  }
  
  const handleDeleteContact = (id: string) => {
    maillingStore.remove(id)
    setSnackbar({ open: true, message: 'Contato removido com sucesso!', severity: 'success' })
  }
  
  const handleExport = () => {
    maillingStore.exportToExcel()
    setSnackbar({ open: true, message: 'Exportação iniciada!', severity: 'success' })
  }
  
  const handleFormSubmit = (contact: Omit<MaillingContact, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingContact) {
      maillingStore.update(editingContact.id, contact)
      setSnackbar({ open: true, message: 'Contato atualizado com sucesso!', severity: 'success' })
    } else {
      maillingStore.add(contact)
      setSnackbar({ open: true, message: 'Contato adicionado com sucesso!', severity: 'success' })
    }
    setFormOpen(false)
    setEditingContact(null)
  }
  
  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const handleUpload = async (file: File) => {
    try {
      console.log('📁 Processando arquivo de mailling:', file.name)
      
      // Ler o arquivo Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      console.log('📊 Dados lidos do Excel:', jsonData.length, 'linhas')
      console.log('📊 Primeira linha do Excel:', jsonData[0])
      
      // Processar cada linha
      const newContacts: Omit<MaillingContact, 'id' | 'createdAt' | 'updatedAt' | 'changeLog'>[] = []
      
      for (const row of jsonData) {
        console.log('📊 Processando linha:', row)
        
        // Função para converter Sim/Não para sim/nao
        const convertSimNao = (value: string) => {
          if (!value) return 'nao'
          const lowerValue = value.toLowerCase().trim()
          if (lowerValue === 'sim' || lowerValue === 's') return 'sim'
          if (lowerValue === 'não' || lowerValue === 'nao' || lowerValue === 'n') return 'nao'
          return 'nao'
        }

        // Função para converter posição de e-mail
        const convertPosicaoEmail = (value: string) => {
          if (!value) return 'PARA'
          const lowerValue = value.toLowerCase().trim()
          if (lowerValue.includes('cópia oculta') || lowerValue.includes('copia oculta')) return 'CÓPIA OCULTA'
          if (lowerValue.includes('cópia') || lowerValue.includes('copia')) return 'CÓPIA'
          return 'PARA'
        }

        // Função para converter grupos (pode vir como string separada por vírgula)
        const convertGrupos = (value: any): string[] => {
          if (!value) return []
          if (Array.isArray(value)) return value
          if (typeof value === 'string') {
            // Se for string separada por vírgula, split
            const nomes = value.split(',').map(n => n.trim()).filter(n => n)
            // Buscar IDs dos grupos pelos nomes
            return nomes.map(nome => {
              const grupo = masterDataStore.grupos?.find(g => g.nome.toLowerCase() === nome.toLowerCase())
              return grupo?.id
            }).filter(id => id) as string[]
          }
          return []
        }

        const contact = {
          nome: row['Nome'] || row['nome'] || '',
          email: row['E-mail'] || row['email'] || '',
          cargo: row['Cargo'] || row['cargo'] || '',
          area: row['Área'] || row['area'] || '',
          filial: row['Filial'] || row['filial'] || '',
          superior: row['Superior'] || row['superior'] || '',
          posicaoEmail: convertPosicaoEmail(row['Posição E-mail'] || row['posicaoEmail'] || 'PARA'),
          grupos: convertGrupos(row['Grupos'] || row['grupos'] || ''),
          cancelamento: convertSimNao(row['Cancelamento'] || row['cancelamento'] || ''),
          alteracaoContratual: convertSimNao(row['Alteração Contratual'] || row['alteracaoContratual'] || ''),
          alteracaoDadosCliente: convertSimNao(row['Alteração Dados Cliente'] || row['alteracaoDadosCliente'] || ''),
          alteracaoServicos: convertSimNao(row['Alteração Serviços'] || row['alteracaoServicos'] || ''),
          alteracaoRemuneracao: convertSimNao(row['Alteração Remuneração'] || row['alteracaoRemuneracao'] || ''),
          curadoriaPortalRh: convertSimNao(row['Curadoria Portal RH'] || row['curadoriaPortalRh'] || ''),
          documentacaoContratual: convertSimNao(row['Documentação Contratual'] || row['documentacaoContratual'] || '')
        }
        
        console.log('📊 Contato processado:', contact)
        console.log('📊 Nome:', contact.nome, 'Email:', contact.email)
        
        // Validar se tem pelo menos nome ou email
        console.log('🔍 Validação - Nome:', contact.nome, 'Email:', contact.email)
        console.log('🔍 Validação - Nome válido:', !!contact.nome, 'Email válido:', !!contact.email)
        
        // Aceitar contato se tiver pelo menos nome ou email
        if (contact.nome || contact.email) {
          // Se não tiver nome, usar email como nome
          if (!contact.nome && contact.email) {
            contact.nome = contact.email
          }
          // Se não tiver email, usar nome como email
          if (!contact.email && contact.nome) {
            contact.email = contact.nome + '@exemplo.com'
          }
          
          newContacts.push(contact)
          console.log('✅ Contato válido adicionado')
        } else {
          console.log('❌ Contato inválido - falta nome e email')
          console.log('❌ Nome vazio:', !contact.nome, 'Email vazio:', !contact.email)
        }
      }
      
      console.log('✅ Contatos válidos encontrados:', newContacts.length)
      
      // Adicionar contatos ao store
      for (const contact of newContacts) {
        await maillingStore.add(contact)
      }
      
      console.log('✅ Upload concluído com sucesso!')
      
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error)
      throw new Error('Erro ao processar arquivo Excel')
    }
  }
  
  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Mailling
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadModalOpen(true)}
                size="medium"
                className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  height: '44px',
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
                  }
                }}
              >
                Importar
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddContact}
                size="medium"
                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  height: '44px',
                  minWidth: '140px',
                  boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
                  '&:hover': {
                    boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Novo Contato
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        {/* Estatísticas */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                {maillingStore.contacts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Total de Contatos
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                {filteredContacts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Contatos Filtrados
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="info.main" sx={{ fontWeight: 600 }}>
                {Object.values(filters).filter(v => v).length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Filtros Ativos
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Barra de Ações */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddContact}
                size="small"
              >
                Novo Contato
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadModalOpen(true)}
                size="small"
              >
                Importar
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={maillingStore.contacts.length === 0}
                size="small"
              >
                Exportar Todos
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => setEmailsPopupOpen(true)}
                disabled={filteredContacts.length === 0}
                size="small"
                color="secondary"
              >
                Exportar E-mails ({filteredContacts.length})
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Filtros */}
        <Paper sx={{ p: 1.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <FilterIcon color="action" sx={{ fontSize: '1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              Filtros de Segmentação
            </Typography>
          </Box>
          
          <Grid container spacing={1.5}>
            {/* Filtros principais em linha única */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 0.5, fontSize: '1rem' }} />,
                }}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontSize: '0.75rem',
                    height: '32px'
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.75rem' }}>Filial</InputLabel>
                <Select
                  value={filters.filial || ''}
                  label="Filial"
                  onChange={(e) => setFilters(prev => ({ ...prev, filial: e.target.value || undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.75rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Todas</MenuItem>
                  {masterDataStore.filiaisMailling?.map(filial => (
                    <MenuItem key={filial.id} value={filial.id} sx={{ fontSize: '0.75rem' }}>
                      {filial.nome}
                    </MenuItem>
                  )) || []}
                </Select>
              </FormControl>
            </Grid>

            {/* Filtros de segmentação compactos */}
            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Cancel</InputLabel>
                <Select
                  value={filters.cancelamento || ''}
                  label="Cancel"
                  onChange={(e) => setFilters(prev => ({ ...prev, cancelamento: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Contrato</InputLabel>
                <Select
                  value={filters.alteracaoContratual || ''}
                  label="Contrato"
                  onChange={(e) => setFilters(prev => ({ ...prev, alteracaoContratual: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Dados</InputLabel>
                <Select
                  value={filters.alteracaoDadosCliente || ''}
                  label="Dados"
                  onChange={(e) => setFilters(prev => ({ ...prev, alteracaoDadosCliente: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Serviços</InputLabel>
                <Select
                  value={filters.alteracaoServicos || ''}
                  label="Serviços"
                  onChange={(e) => setFilters(prev => ({ ...prev, alteracaoServicos: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Remun</InputLabel>
                <Select
                  value={filters.alteracaoRemuneracao || ''}
                  label="Remun"
                  onChange={(e) => setFilters(prev => ({ ...prev, alteracaoRemuneracao: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Curadoria</InputLabel>
                <Select
                  value={filters.curadoriaPortalRh || ''}
                  label="Curadoria"
                  onChange={(e) => setFilters(prev => ({ ...prev, curadoriaPortalRh: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.7rem' }}>Doc</InputLabel>
                <Select
                  value={filters.documentacaoContratual || ''}
                  label="Doc"
                  onChange={(e) => setFilters(prev => ({ ...prev, documentacaoContratual: (e.target.value || undefined) as 'sim' | 'nao' | undefined }))}
                  sx={{ 
                    '& .MuiSelect-select': { fontSize: '0.7rem' },
                    height: '32px'
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.7rem' }}>Todos</MenuItem>
                  <MenuItem value="sim" sx={{ fontSize: '0.7rem' }}>Sim</MenuItem>
                  <MenuItem value="nao" sx={{ fontSize: '0.7rem' }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={clearFilters} size="small" sx={{ fontSize: '0.75rem', height: '28px' }}>
                  Limpar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Tabela de Contatos */}
        <Paper sx={{ p: 1 }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)', minHeight: '600px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', maxWidth: '60px', padding: '8px 4px' }}><strong>Ações</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '120px', padding: '8px 4px' }}><strong>Nome</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '100px', padding: '8px 4px' }}><strong>Cargo</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '100px', padding: '8px 4px' }}><strong>Área</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '100px', padding: '8px 4px' }}><strong>Filial</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '100px', padding: '8px 4px' }}><strong>Superior</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '180px', padding: '8px 4px' }}><strong>E-mail</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '100px', padding: '8px 4px' }}><strong>Posição</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '150px', padding: '8px 4px' }}><strong>Grupos</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Cancel</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Contrato</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Dados</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Serviços</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Remun</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Curadoria</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '60px', padding: '8px 4px' }}><strong>Doc</strong></TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', backgroundColor: 'grey.50', minWidth: '80px', padding: '8px 4px' }}><strong>Alterações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
                    <TableCell sx={{ minWidth: '60px', maxWidth: '60px', padding: '4px 2px' }}>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditContact(contact)}
                          sx={{ 
                            padding: '1px',
                            minWidth: '20px',
                            height: '20px',
                            '&:hover': { backgroundColor: 'primary.light' }
                          }}
                        >
                          <EditIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteContact(contact.id)}
                          sx={{ 
                            padding: '1px',
                            minWidth: '20px',
                            height: '20px',
                            '&:hover': { backgroundColor: 'error.light' }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '120px', padding: '4px 6px' }}>
                      <Typography noWrap sx={{ fontWeight: 500 }}>
                        {contact.nome || <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '100px', padding: '4px 6px' }}>
                      <Typography noWrap>
                        {contact.cargo ? 
                          masterDataStore.cargosMailling?.find(c => c.id === contact.cargo)?.nome : 
                          <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        }
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '100px', padding: '4px 6px' }}>
                      <Typography noWrap>
                        {contact.area ? 
                          masterDataStore.areasMailling?.find(a => a.id === contact.area)?.nome : 
                          <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        }
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '100px', padding: '4px 6px' }}>
                      <Typography noWrap>
                        {contact.filial ? 
                          masterDataStore.filiaisMailling?.find(f => f.id === contact.filial)?.nome : 
                          <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        }
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '100px', padding: '4px 6px' }}>
                      <Typography noWrap>
                        {contact.superior || <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, minWidth: '180px', padding: '4px 6px' }}>
                      <Typography noWrap sx={{ color: 'primary.main' }}>
                        {contact.email}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '100px', padding: '4px 6px' }}>
                      <Typography noWrap>
                        {contact.posicaoEmail || <Chip label="Não informado" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', minWidth: '150px', padding: '4px 6px' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {contact.grupos && contact.grupos.length > 0 ? (
                          contact.grupos.map(grupoId => {
                            const grupo = masterDataStore.grupos?.find(g => g.id === grupoId)
                            return grupo ? (
                              <Chip 
                                key={grupoId}
                                label={grupo.nome} 
                                size="small" 
                                color="primary" 
                                variant="outlined" 
                                sx={{ fontSize: '0.65rem', height: '20px' }} 
                              />
                            ) : null
                          })
                        ) : (
                          <Chip label="Sem grupos" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.cancelamento === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.alteracaoContratual === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.alteracaoDadosCliente === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.alteracaoServicos === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.alteracaoRemuneracao === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.curadoriaPortalRh === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '60px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.documentacaoContratual === 'sim' ? 
                        <Chip label="Sim" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} /> : 
                        <Chip label="Não" size="small" color="default" variant="outlined" sx={{ fontSize: '0.65rem', height: '20px' }} />
                      }
                    </TableCell>
                    <TableCell sx={{ minWidth: '80px', textAlign: 'center', padding: '4px 2px' }}>
                      {contact.changeLog && contact.changeLog.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                          <Chip
                            label={contact.changeLog.length}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.6rem', 
                              height: '18px',
                              minWidth: '18px'
                            }}
                            title={`${contact.changeLog.length} alteração(ões) registrada(s)`}
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center', color: 'text.secondary' }}>
                            {contact.changeLog[contact.changeLog.length - 1]?.changedBy?.split(' (')[0] || 'Usuário'}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredContacts.length === 0 && (
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum contato encontrado com os filtros aplicados.
              </Typography>
            </Box>
          )}
          
          {filteredContacts.length > 0 && (
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                Total: {filteredContacts.length} contato(s) | 
                Capacidade: 80+ contatos visíveis
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Modal de Formulário */}
        <MaillingForm
          open={formOpen}
          contact={editingContact}
          onClose={() => {
            setFormOpen(false)
            setEditingContact(null)
          }}
          onSubmit={handleFormSubmit}
        />
        
        {/* Modal de Importação */}
        <UploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title="Importar Contatos de Mailling"
          entityType="mailling"
          onUpload={handleUpload}
        />
        
        {/* Popup de E-mails */}
        <Dialog
          open={emailsPopupOpen}
          onClose={() => setEmailsPopupOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon color="secondary" />
              E-mails Filtrados ({filteredContacts.length})
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                E-mails separados por ponto e vírgula (;):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={maillingStore.getEmailsFormatted(filteredContacts)}
                InputProps={{
                  readOnly: true,
                  sx: { 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }
                }}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    backgroundColor: 'grey.50'
                  } 
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Total: {filteredContacts.length} e-mail(s) | 
                Clique no campo acima para selecionar todos
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(maillingStore.getEmailsFormatted(filteredContacts))
                  setSnackbar({ 
                    open: true, 
                    message: 'E-mails copiados para a área de transferência!', 
                    severity: 'success' 
                  })
                }}
              >
                Copiar E-mails
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmailsPopupOpen(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </Box>
  )
}


