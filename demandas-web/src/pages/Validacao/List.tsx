import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip, FormControl, InputLabel, Select } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useValidationStore } from '../../store/validationStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { SmartImporter } from '../../components/SmartImporter'
import { smartImporterConfigs } from '../../config/smartImporterConfigs'
import type { ImportResult } from '../../types/smartImporter'
import React, { useEffect, useState, useMemo } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import { usePermissions } from '../../hooks/usePermissions'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import TableChartIcon from '@mui/icons-material/TableChart'

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useValidationStore()
  const md = useMasterDataStore()
  const {
    analistasById,
    clientesById,
    contratosById,
    operadorasById
  } = md
  const { canEdit, canDelete } = usePermissions('validacao')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const v = store.items.find((x) => x.id === id)
      if (!v) return
      const from = v.status
      const next = { ...v, status: newStatus, updatedAt: new Date().toISOString() }
      await store.upsert(next)
      store.log?.({ validationId: id, type: 'status_change', field: 'status', from, to: newStatus })
      setOpenStatus(false)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  const doDelete = async () => {
    try {
      await store.remove(id)
      setOpenDelete(false)
    } catch (error) {
      // Erro já é tratado no store, apenas fechar o dialog
      console.error('Erro ao excluir validação:', error)
      setOpenDelete(false)
    }
  }

  const doDuplicate = async () => {
    const v = store.items.find((x) => x.id === id)
    if (!v) return
    
    try {
      // Função para gerar ticket único com sufixo numérico
      const generateUniqueTicket = async (originalTicket: string | undefined): Promise<string | undefined> => {
        if (!originalTicket || originalTicket.trim() === '') {
          return undefined // Se não tinha ticket, retornar undefined
        }
        
        // Verificar se o ticket original já tem sufixo numérico (ex: "SR-1346706-1")
        // IMPORTANTE: Não aceitar números longos como sufixo (mais de 3 dígitos)
        const ticketMatch = originalTicket.match(/^(.+)-(\d{1,3})$/)
        let baseTicket = originalTicket
        let startSuffix = 1
        
        if (ticketMatch) {
          // Se já tem sufixo, usar o base e incrementar
          baseTicket = ticketMatch[1]
          startSuffix = parseInt(ticketMatch[2]) + 1
        }
        
        // Buscar ticket disponível incrementando sufixo
        const { api } = await import('../../lib/api.local')
        let suffix = startSuffix
        let newTicket = `${baseTicket}-${suffix}`
        
        // Verificar até encontrar um ticket disponível (máximo 10 tentativas)
        for (let i = 0; i < 10; i++) {
          const existing = await api.getValidacoes(`?ticket=${encodeURIComponent(newTicket)}`)
          if (!Array.isArray(existing) || existing.length === 0) {
            // Ticket disponível encontrado
            return newTicket
          }
          // Ticket já existe, tentar próximo sufixo
          suffix++
          newTicket = `${baseTicket}-${suffix}`
        }
        
        // Se não encontrou após 10 tentativas, gerar com timestamp
        const timestamp = Date.now().toString().slice(-4)
        return `${baseTicket}-${timestamp}`
      }
      
      // Gerar novo ticket único
      const newTicket = await generateUniqueTicket(v.ticket)
      
      const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _ticket, ...rest } = v
      const duplicated = await store.add({ 
        ...rest, 
        ticket: newTicket, // Usar novo ticket com sufixo
        status: 'Em validação', 
        updatedAt: new Date().toISOString() 
      })
      // Garantir navegação usando o ID real do backend
      let navigateId = duplicated?.id
      try {
        const { api } = await import('../../lib/api.local')
        const found = await api.getValidacoes(`?ticket=${encodeURIComponent(String(newTicket || ''))}`)
        if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
          navigateId = found[0].id
        }
      } catch (e) {
        console.warn('Não foi possível confirmar ID pelo ticket; usando ID retornado localmente', e)
      }
      try {
        sessionStorage.setItem('lastValidationId', String(navigateId || ''))
        if (newTicket) sessionStorage.setItem('lastValidationTicket', String(newTicket))
      } catch {}
      navigate(`/validacao/${navigateId}`)
    } catch (error) {
      console.error('Erro ao duplicar validação:', error)
      alert('Erro ao duplicar validação. Verifique o console para mais detalhes.')
    }
  }

  return (
    <>
      <IconButton size="small" onClick={handleMenuOpen}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose} keepMounted>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/validacao/${id}`) }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver</ListItemText>
        </MenuItem>
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); doDuplicate() }}>
            <ListItemIcon><FileCopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Duplicar</ListItemText>
          </MenuItem>
        )}
        
        {canEdit && (
          <MenuItem onClick={() => { 
            handleMenuClose(); 
            // Sugerir próximo status quando atual for 'Aberto'
            setNewStatus(status === 'Aberto' ? 'Em validação' : status)
            setOpenStatus(true) 
          }}>
            <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Alterar status</ListItemText>
          </MenuItem>
        )}
        
        {canDelete && (
          <MenuItem onClick={() => { handleMenuClose(); setOpenDelete(true) }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog open={openStatus} onClose={() => setOpenStatus(false)}>
        <DialogTitle>Alterar status</DialogTitle>
        <DialogContent>
          <TextField select label="Novo status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} sx={{ mt: 1, minWidth: 280 }}>
            {['Aberto','Em validação','Transf. Analista','Aprovada','Rejeitada','Pendente','Concluído Parcialmente','Cancelada'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenStatus(false)}
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
                boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={doChangeStatus}
            size="medium"
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
            sx={{
              borderRadius: '14px',
              padding: '10px 20px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              height: '44px',
              minWidth: '100px',
              boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
              '&:hover': {
                boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Excluir validação</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir esta validação?</Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDelete(false)}
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
                boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={doDelete}
            size="medium"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
            sx={{
              borderRadius: '14px',
              padding: '10px 20px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              height: '44px',
              minWidth: '100px',
              boxShadow: '0 4px 14px 0 rgba(220, 38, 38, 0.25)',
              '&:hover': {
                boxShadow: '0 8px 25px 0 rgba(220, 38, 38, 0.35)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'ticket', headerName: 'Nº Ticket', width: 140 },
  { field: 'descricao', headerName: 'Descrição', flex: 1, minWidth: 220 },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusBadge status={String(p.value ?? '')} /> },
  { field: 'analista', headerName: 'Analista', width: 160 },
  { 
    field: 'cliente', 
    headerName: 'Cliente', 
    width: 160,
    valueGetter: (value, row) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!row.cliente) return ''
      return String(row.cliente)
    },
    getQuickFilterText: (value) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!value) return ''
      if (typeof value === 'string') return value.toLowerCase()
      if (typeof value === 'object' && value?.nome) return value.nome.toLowerCase()
      return String(value).toLowerCase()
    },
    renderCell: (params) => {
      // O valor já vem como string do mapeamento dos rows
      return params.value || '-'
    }
  },
  { 
    field: 'contrato', 
    headerName: 'Contrato', 
    width: 160,
    valueGetter: (value, row) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!row.contrato) return ''
      return String(row.contrato)
    },
    getQuickFilterText: (value) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!value) return ''
      if (typeof value === 'string') return value.toLowerCase()
      if (typeof value === 'object' && value?.numero) return value.numero.toLowerCase()
      return String(value).toLowerCase()
    },
    renderCell: (params) => {
      // O valor já vem como string do mapeamento dos rows
      return params.value || '-'
    }
  },
  { 
    field: 'operadora', 
    headerName: 'Operadora', 
    width: 160,
    valueGetter: (value, row) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!row.operadora) return ''
      return String(row.operadora)
    },
    getQuickFilterText: (value) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!value) return ''
      if (typeof value === 'string') return value.toLowerCase()
      if (typeof value === 'object' && value?.nome) return value.nome.toLowerCase()
      return String(value).toLowerCase()
    },
    renderCell: (params) => {
      // O valor já vem como string do mapeamento dos rows
      return params.value || '-'
    }
  },
  { 
    field: 'solicitante', 
    headerName: 'Solicitante', 
    width: 160,
    valueGetter: (value, row) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!row.solicitante) return ''
      return String(row.solicitante)
    },
    getQuickFilterText: (value) => {
      // Garantir que sempre retorne uma string para busca rápida
      if (!value) return ''
      if (typeof value === 'string') return value.toLowerCase()
      if (typeof value === 'object' && value?.nome) return value.nome.toLowerCase()
      return String(value).toLowerCase()
    },
    renderCell: (params) => {
      // O valor já vem como string do mapeamento dos rows
      return params.value || '-'
    }
  },
  { field: 'dataInicio', headerName: 'Data Início', width: 140 },
  { field: 'dataFinal', headerName: 'Data Final', width: 140 },
  { 
    field: 'updatedAt', 
    headerName: 'Atualizado em', 
    width: 160,
    type: 'dateTime',
    valueGetter: (value, row) => {
      // Converter string ISO para Date object para ordenação correta
      const dateValue = row.updatedAt || value
      if (!dateValue) return null
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? null : date
    },
    valueFormatter: (value) => {
      // Formatar para exibição
      if (!value) return '-'
      const date = value instanceof Date ? value : new Date(value)
      return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR')
    },
    sortComparator: (v1, v2) => {
      // Comparador personalizado para garantir ordenação correta
      if (!v1 && !v2) return 0
      if (!v1) return 1
      if (!v2) return -1
      const date1 = v1 instanceof Date ? v1 : new Date(v1)
      const date2 = v2 instanceof Date ? v2 : new Date(v2)
      if (isNaN(date1.getTime()) && isNaN(date2.getTime())) return 0
      if (isNaN(date1.getTime())) return 1
      if (isNaN(date2.getTime())) return -1
      return date1.getTime() - date2.getTime()
    }
  },
]

export default function ValidationListPage() {
  const navigate = useNavigate()
  const store = useValidationStore()
  const { items, loading, error, clearError, syncFromApi } = store
  // Função para limpar erro manualmente
  const handleClearError = () => {
    clearError()
  }
  
  const md = useMasterDataStore()
  const {
    analistasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    solicitantesById,
    areasById,
    sistemasById,
    tiposDemandaById,
    tiposServicoById
  } = md
  const { user } = useAuthStore()
  const { canCreate, canImport, canExport, canDelete } = usePermissions('validacao')
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const STORAGE_KEY = 'validations-list-view-v1'
  const FILTER_KEY = 'validations-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'createdAt', sort: 'desc' }, // Primária: data de criação (mais recentes primeiro)
    { field: 'updatedAt', sort: 'desc' }  // Secundária: data de atualização
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [showOnlyMyValidations, setShowOnlyMyValidations] = useState(true)
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }

  // Filtro unificado (mesma abordagem de Cadastro e Manutenção): um único useMemo a partir de items
  // para evitar recálculos desnecessários e garantir que novo ticket apareça logo com "Minhas validações"
  const finalFilteredItems = useMemo(() => {
    let list = items
    // 1) Filtro por permissão (viewOwnDataOnly)
    if (user?.id && user?.viewOwnDataOnly) {
      list = list.filter(item => {
        if ('analista' in item && (item as any).analista === user?.id) return true
        if ('responsavelAnalista' in item && (item as any).responsavelAnalista === user?.id) return true
        return false
      })
    }
    // 2) Filtro "Minhas validações" (por analista do usuário)
    if (!showOnlyMyValidations) return list
    return list.filter(validation => {
      const analistaId = validation.analistaId ?? (typeof validation.analista === 'object' ? (validation.analista as any)?.id : validation.analista)
      const analista = analistaId ? analistasById[analistaId] : undefined
      const check1 = analistaId === user?.id
      const check2 = analista && analista.nome === user?.name
      const check3 = user?.role === 'admin' && analistaId === 'analista-admin'
      const check4 = validation.analista === user?.id
      const check5 = validation.analista === user?.name
      const check6 = user?.role === 'admin'
      return !!(check1 || check2 || check3 || check4 || check5 || check6)
    })
  }, [items, showOnlyMyValidations, user?.id, user?.name, user?.role, user?.viewOwnDataOnly, analistasById])

  const itemsForGrid = finalFilteredItems

  // carregar preferências
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.columnVisibilityModel) setColumnVisibilityModel(saved.columnVisibilityModel)
      if (saved.sortModel) setSortModel(saved.sortModel)
      if (saved.filterModel) setFilterModel(saved.filterModel)
      if (saved.paginationModel) setPaginationModel(saved.paginationModel)
    } catch {}
    
    // Carregar preferência do filtro de usuário
    try {
      const filterPreference = localStorage.getItem(FILTER_KEY)
      if (filterPreference !== null) {
        setShowOnlyMyValidations(JSON.parse(filterPreference))
      }
    } catch {}
    }, [])

  // Carregar dados da API automaticamente quando a página é carregada (apenas uma vez)
  const hasLoadedRef = React.useRef(false)
  useEffect(() => {
    // Só carregar dados se o usuário estiver logado e ainda não carregou
    if (user?.id && !hasLoadedRef.current && !loading) {
      hasLoadedRef.current = true
      syncFromApi()
    }
  }, [user?.id, loading]) // Depender do ID do usuário para carregar dados

  // Garantir que os dados mestres sejam carregados (apenas uma vez)
  const masterDataLoadedRef = React.useRef(false)
  useEffect(() => {
    if (md.clientes.length === 0 && !masterDataLoadedRef.current && md.syncFromApi) {
      masterDataLoadedRef.current = true
      logDev('🔍 Validacao: Dados mestres vazios, chamando syncFromApi...')
      md.syncFromApi()
    }
  }, [md.clientes.length, md.syncFromApi]) // Apenas quando necessário

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyValidations))
    } catch {}
  }, [showOnlyMyValidations])

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    if (isDeleting || selectedIds.length === 0) return
    const idsToDelete = [...selectedIds]
    setIsDeleting(true)
    try {
      const { api } = await import('../../lib/api.local')
      
      logDev('🗑️ Iniciando exclusão em massa de', idsToDelete.length, 'validações')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of idsToDelete) {
        try {
          await api.delete(`/validacoes/${id}`)
          successCount++
        } catch (error: any) {
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            logDev(`⚠️ Validação ${id} já foi excluída (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir validação ${id}:`, error)
            errorCount++
          }
        }
      }
      
      // Atualizar store local (remover TODOS os IDs, incluindo os 404)
      const currentItems = useValidationStore.getState().items
      const filteredItems = currentItems.filter((item) => !idsToDelete.includes(item.id))
      useValidationStore.setState({ items: filteredItems })
      
      // Limpar seleção
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      
      // Mostrar resultado
      const totalProcessed = successCount + notFoundCount
      if (errorCount === 0) {
        if (notFoundCount > 0) {
          alert(`✅ ${totalProcessed} validação(ões) removida(s)!\n\n${successCount} excluídas do banco\n${notFoundCount} já haviam sido excluídas (cache limpo)`)
        } else {
          alert(`✅ ${successCount} validação(ões) excluída(s) com sucesso!`)
        }
      } else {
        alert(`⚠️ ${totalProcessed} validação(ões) removida(s), ${errorCount} erro(s)\n\n${successCount} excluídas\n${notFoundCount} já excluídas anteriormente`)
      }
      
      // Recarregar dados
      await store.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir validações')
    } finally {
      setIsDeleting(false)
    }
  }

  // Função do Importador Inteligente
  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      logDev('🔍 SMART IMPORT VALIDAÇÕES: Processando resultado:', result)

      // Função para converter número de série do Excel para DateTime ISO
      const excelDateToISO = (value: any): string => {
        if (!value) return ''
        if (typeof value === 'string' && value.includes('-')) return value
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const serialNumber = Number(value)
          const excelEpoch = new Date(1900, 0, 1)
          const days = serialNumber - 2
          const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
          return date.toISOString()
        }
        return ''
      }

      // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
      const normalizeString = (str: string) => {
        if (!str) return ''
        return String(str).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
      }

      // Função para encontrar ID por nome (com normalização completa e correspondência flexível)
      const findIdByName = (name: string, items: any[], nameField: string = 'nome') => {
        if (!name) return ''
        const searchNormalized = normalizeString(String(name))
        const item = items.find(item => {
          const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
          return itemNameNormalized === searchNormalized
        })
        return item?.id || ''
      }

      // Processar itens válidos
      for (const item of result.valid) {
        try {
          const data = item.isCorrected ? item.correctedData : item.data

          logDev('🔍 SMART IMPORT VALIDAÇÕES: Dados recebidos do SmartImporter:', data)
          logDev('🔍 SMART IMPORT VALIDAÇÕES: Campos específicos:', {
            solicitante: data.solicitante,
            analistaId: data.analistaId,
            clienteId: data.clienteId,
            operadoraId: data.operadoraId,
            produtoId: data.produtoId,
            dataFinal: data.dataFinal,
            dataFinalizacao: data.dataFinalizacao,
            qualidade: data.qualidade
          })
          
          // Log específico para dataFinal
          logDev('🔍 SMART IMPORT VALIDAÇÕES: Processando dataFinal:', {
            dataFinal: data.dataFinal,
            dataFinalizacao: data.dataFinalizacao,
            excelDateToISO_result: excelDateToISO(data.dataFinal || data.dataFinalizacao)
          })


          // Normalizar status para formato padrão
          const normalizeStatus = (status: string) => {
            if (!status) return 'Aberta'
            const statusUpper = status.toUpperCase()
            if (
              statusUpper === 'CONCLUIDO PARCIALMENTE' ||
              statusUpper === 'CONCLUÍDO PARCIALMENTE'
            ) {
              return 'Concluído Parcialmente'
            }
            if (statusUpper === 'CONCLUIDA' || statusUpper === 'CONCLUÍDA') return 'Concluída'
            if (statusUpper === 'EM ANDAMENTO') return 'Em andamento'
            if (statusUpper === 'AGUARDANDO VALIDACAO' || statusUpper === 'AGUARDANDO VALIDAÇÃO') return 'Aguardando validação'
            if (statusUpper === 'COM ERROS') return 'Com erros'
            if (statusUpper === 'EM REAJUSTE') return 'Em reajuste'
            if (statusUpper === 'TRANSF. ANALISTA' || statusUpper === 'TRANSF ANALISTA') return 'Transf. Analista'
            if (statusUpper === 'CANCELADA') return 'Cancelada'
            return status
          }

          const validacaoData = {
            status: normalizeStatus(data.status),
            ticket: data.ticket ? String(data.ticket) : `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            solicitante: data.solicitante || '',
            analistaId: data.analistaId || '',
            clienteId: data.clienteId || '',
            contratoId: data.contratoId || '',
            operadoraId: data.operadoraId || '',
            produtoId: data.produtoId || '',
            dataInicio: excelDateToISO(data.dataInicio || data.dataInicial) || new Date().toISOString(),
            dataFim: excelDateToISO(data.dataFinal || data.dataFinalizacao),
            descricao: data.descricao || '',
            observacoes: data.observacoes || data.observacao || '',
            total: data.total || 0,
            qualidade: data.qualidade ? String(data.qualidade) : null,
            qtdRetornos: data.qtdRetornos || 0,
            vigencia: data.vigencia ? String(data.vigencia) : null,
            estruturaEdge: data.estruturaEdge ? String(data.estruturaEdge) : null,
            estruturaMove: data.estruturaMove ? String(data.estruturaMove) : null,
            formalizacao: data.formalizacao ? String(data.formalizacao) : null,
            itensPendentes: data.itensPendentes || 0,
            itensConcluidos: data.itensConcluidos || 0
          }

          logDev('🔍 SMART IMPORT VALIDAÇÕES: Dados que serão enviados para o backend:', validacaoData)

          Object.keys(validacaoData).forEach(key => {
            if (validacaoData[key] === '' || validacaoData[key] === null || validacaoData[key] === undefined) {
              delete validacaoData[key]
            }
          })

          const savedValidacao = await api.post('/validacoes', validacaoData)
          totalImported++
          totalSavedToDatabase++

        } catch (error) {
          console.error('❌ SMART IMPORT VALIDAÇÕES: Erro ao salvar validação:', error)
          errors.push(`Erro ao salvar validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      if (totalSavedToDatabase > 0) {
        await store.syncFromApi()
      }

      const successMessage = `${totalImported} validações processadas, ${totalSavedToDatabase} salvas no banco de dados`
      logDev(`✅ SMART IMPORT VALIDAÇÕES: ${successMessage}`)

      if (totalSavedToDatabase > 0) {
        alert(`✅ ${successMessage}`)
      }

      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT VALIDAÇÕES: Alguns erros ocorreram:', errors)
        alert(`⚠️ Alguns erros ocorreram:\n${errors.join('\n')}`)
      }

    } catch (error) {
      console.error('❌ SMART IMPORT VALIDAÇÕES: Erro geral:', error)
      alert('Erro ao importar validações')
    }
  }

  function persist(next: Partial<{ columnVisibilityModel: GridColumnVisibilityModel; sortModel: GridSortModel; filterModel: GridFilterModel; paginationModel: GridPaginationModel }>) {
    try {
      const current = {
        columnVisibilityModel,
        sortModel,
        filterModel,
        paginationModel,
      }
      const merged = { ...current, ...next }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {}
  }

  const normalizeText = (value?: string) => (value || '').trim().toLowerCase()
  const analistasByName = useMemo(() => new Map(md.analistas.map(a => [normalizeText(a.nome), a.id])), [md.analistas])
  const clientesByName = useMemo(() => new Map(md.clientes.map(c => [normalizeText(c.nome), c.id])), [md.clientes])
  const contratosByName = useMemo(() => new Map(md.contratos.map(c => [normalizeText(c.numero || c.codigo || ''), c.id])), [md.contratos])
  const operadorasByName = useMemo(() => new Map(md.operadoras.map(o => [normalizeText(o.nome), o.id])), [md.operadoras])
  const solicitantesByName = useMemo(() => new Map(md.solicitantes.map(s => [normalizeText(s.nome), s.id])), [md.solicitantes])

  // Ordenar os dados por updatedAt (mais recente primeiro) antes de passar para o DataGrid
  // Isso garante ordenação correta mesmo se o sortModel não estiver aplicado
  const sortedItems = useMemo(() => (
    [...itemsForGrid].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return dateB - dateA // Ordem decrescente (mais recente primeiro)
    })
  ), [itemsForGrid])

  const rows = useMemo(() => sortedItems.map((v) => {
    // Converter objetos relacionados para strings (nomes) para permitir busca rápida
    const getNomeFromValue = (value: any, byId?: Record<string, { nome?: string }>, byName?: Map<string, string>) => {
      if (!value) return ''
      if (typeof value === 'object') {
        return value.nome || ''
      }
      if (typeof value === 'string') {
        const byIdMatch = byId?.[value]?.nome
        if (byIdMatch) return byIdMatch
        const mappedId = byName?.get(normalizeText(value))
        return mappedId ? (byId?.[mappedId]?.nome || value) : value
      }
      return String(value || '')
    }
    const getContratoNumero = (value: any) => {
      if (!value) return ''
      if (typeof value === 'object') {
        return value.numero || value.codigo || ''
      }
      if (typeof value === 'string') {
        const byIdMatch = contratosById[value]
        if (byIdMatch) return byIdMatch.numero || byIdMatch.codigo || value
        const mappedId = contratosByName.get(normalizeText(value))
        if (mappedId) {
          const contract = contratosById[mappedId]
          return contract?.numero || contract?.codigo || value
        }
        return value
      }
      return String(value || '')
    }

    const analistaNome = getNomeFromValue(v.analista, analistasById, analistasByName)
    const clienteNome = getNomeFromValue(v.cliente || v.clienteId || v.clienteObj, clientesById, clientesByName)
    const contratoNumero = getContratoNumero(v.contrato || v.contratoId || v.contratoObj)
    const operadoraNome = getNomeFromValue(v.operadora || v.operadoraId || v.operadoraObj, operadorasById, operadorasByName)
    const solicitanteNome = getNomeFromValue(v.solicitante, solicitantesById, solicitantesByName)
    
    return {
      id: v.id,
      ticket: v.ticket ?? '',
      descricao: v.descricao ?? '',
      status: v.status ?? '',
      analista: analistaNome,
      cliente: clienteNome,
      contrato: contratoNumero,
      operadora: operadoraNome,
      solicitante: solicitanteNome,
      dataInicio: v.dataInicio ?? '',
      dataFinal: v.dataFinal ?? '',
      // Manter o valor original da data (ISO string) para ordenação correta
      // A formatação será feita pelo valueFormatter da coluna
      updatedAt: v.updatedAt || '',
    }
  }), [
    sortedItems,
    analistasById,
    clientesById,
    contratosById,
    operadorasById,
    solicitantesById,
    analistasByName,
    clientesByName,
    contratosByName,
    operadorasByName,
    solicitantesByName
  ])

  // Verificar se há dados
  const hasData = rows.length > 0
  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Validação
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyValidations}
                      onChange={(e) => setShowOnlyMyValidations(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#050032',
                          '&:hover': {
                            backgroundColor: 'rgba(5, 0, 50, 0.08)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#050032',
                        },
                      }}
                    />
                  }
                  label={
                    <div className="flex items-center gap-2">
                      {showOnlyMyValidations ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Minhas Validações</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todas as Validações</span>
                        </>
                      )}
                    </div>
                  }
                />
                {/* Contador de validações */}
                <Chip
                  label={`${formatIntegerPtBR(itemsForGrid.length)} validação${itemsForGrid.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyValidations 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
              </div>
            </div>
            <Stack direction="row" spacing={2}>
              {selectedIds.length > 0 && canDelete && (
                <Button 
                  variant="outlined" 
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  size="medium"
                  sx={{
                    borderRadius: '14px',
                    padding: '10px 20px',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    height: '44px',
                    borderColor: '#DA3832',
                    color: '#DA3832',
                    '&:hover': {
                      borderColor: '#DA3832',
                      backgroundColor: '#fef2f2',
                      color: '#DA3832'
                    }
                  }}
                >
                  Excluir ({formatIntegerPtBR(selectedIds.length)})
                </Button>
              )}

              {canImport && (
                <PrimaryActionButton
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setSmartImporterOpen(true)}
                >
                  Importador Inteligente
                </PrimaryActionButton>
              )}

              {canExport && (
                <Button 
                  variant="outlined" 
                  startIcon={<TableChartIcon />}
                  onClick={() => setExportModalOpen(true)}
                  size="medium"
                  className="text-secondary-600 border-secondary-300 hover:text-secondary-700 hover:border-secondary-400 hover:bg-secondary-50 transition-all duration-300 font-medium"
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
                      boxShadow: '0 4px 12px 0 rgba(5, 0, 50, 0.15)'
                    }
                  }}
                >
                  Exportar
                </Button>
              )}

              {canCreate && (
                <PrimaryActionButton startIcon={<AddCircleOutlineIcon />} onClick={() => navigate('/validacao/nova')} sx={{ minWidth: '140px' }}>
                  Nova Validação
                </PrimaryActionButton>
              )}
            </Stack>
          </div>
        </div>
      </div>
      
      {/* Informações sobre dados */}
      {loading && (
        <Box sx={{ mx: 2, mb: 1, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            🔄 Carregando validações...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ mx: 2, mb: 1, p: 1.5, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error.contrastText">
            ❌ Erro ao carregar validações: {error}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleClearError}
            size="small"
            className="text-error-600 border-error-300 hover:text-error-700 hover:border-error-400 hover:bg-error-50 transition-all duration-300 font-medium mt-2"
            sx={{
              borderRadius: '14px',
              padding: '8px 16px',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8rem',
              height: '36px',
              borderWidth: '2px',
              '&:hover': {
                borderWidth: '2px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px 0 rgba(220, 38, 38, 0.15)'
              }
            }}
          >
            Limpar Erro
          </Button>
        </Box>
      )}
      
      {!hasData && !loading && !error && (
        <Box sx={{ mx: 2, mb: 1, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            💡 Nenhuma validação encontrada. Crie uma nova validação ou importe dados para começar.
          </Typography>
        </Box>
      )}

      <div className="flex-1 px-6 pb-6" style={{ minHeight: '400px' }}>
        <DataGrid
          columns={columns}
          rows={rows}
          disableRowSelectionOnClick
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setSelectedIds(newSelection as string[])
          }}
          rowSelectionModel={selectedIds}
          onRowDoubleClick={(p) => navigate(`/validacao/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ 
            toolbar: { 
              showQuickFilter: true, 
              quickFilterProps: { 
                debounceMs: 300,
                placeholder: 'Buscar validações... (ex: ticket, cliente, operadora, analista)'
              },
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true }
            } 
          }}
          quickFilterValues={filterModel.quickFilterValues}
          onQuickFilterValuesChange={(values) => {
            setFilterModel({ ...filterModel, quickFilterValues: values })
            persist({ filterModel: { ...filterModel, quickFilterValues: values } })
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          // modelos controlados + persistência
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(m) => { setColumnVisibilityModel(m); persist({ columnVisibilityModel: m }) }}
          sortModel={sortModel}
          onSortModelChange={(m) => { setSortModel(m); persist({ sortModel: m }) }}
          filterModel={filterModel}
          onFilterModelChange={(m) => { setFilterModel(m); persist({ filterModel: m }) }}
          paginationModel={paginationModel}
          onPaginationModelChange={(m) => { setPaginationModel(m); persist({ paginationModel: m }) }}
          sx={{
            height: '100%',
            minHeight: '400px',
            '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#eef0f2' },
            '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: '#ffffff' },
            '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0, 159, 223, 0.06) !important' },
            '& .MuiDataGrid-toolbarContainer': {
              padding: '8px',
              backgroundColor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            },
            '& .MuiTablePagination-root': {
              minHeight: '52px',
            },
            '& .MuiDataGrid-virtualScroller': {
              backgroundColor: 'background.default',
            },
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-main': {
              width: '100%',
            },
          }}
        />
      </div>

      {/* Smart Importer - Importador Inteligente */}
      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs.validacoes}
        masterData={md}
      />

      {/* Modal de confirmação de exclusão em massa */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{formatIntegerPtBR(selectedIds.length)}</strong> validação(ões) selecionada(s)?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            ⚠️ Esta ação não pode ser desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={isDeleting || selectedIds.length === 0}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Exportação (opções e geração do arquivo) */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        formats={['excel']}
        filterOptions={{
          showDateFilter: true,
          showCreatedAtFilter: true,
          showAnalistaFilter: true,
          analistas: md.analistas
        }}
        data={finalFilteredItems.map(v => {
          const clienteId = (v as any).cliente ?? (v as any).clienteId
          const contratoId = (v as any).contrato ?? (v as any).contratoId
          const clienteResolved = typeof clienteId === 'object' ? (clienteId?.nome ?? 'N/A') : (clientesById[clienteId || '']?.nome ?? clienteId ?? 'N/A')
          const contratoResolved = typeof contratoId === 'object' ? (contratoId?.numero || contratoId?.codigo || 'N/A') : ((contratosById[contratoId || '']?.numero || contratosById[contratoId || '']?.codigo || contratoId) ?? 'N/A')
          const operadoraId = (v as any).operadora ?? (v as any).operadoraId
          const operadoraResolved = typeof operadoraId === 'object' ? (operadoraId?.nome ?? 'N/A') : (operadorasById[operadoraId || '']?.nome ?? operadoraId ?? 'N/A')
          const analistaId = typeof (v as any).analista === 'object' ? (v as any).analista?.id : ((v as any).analistaId ?? (v as any).analista)
          return {
            ...v,
            analista: typeof (v as any).analista === 'string'
              ? (analistasById[(v as any).analista]?.nome ?? (v as any).analista ?? 'N/A')
              : ((v as any).analista?.nome ?? 'N/A'),
            cliente: clienteResolved,
            contrato: contratoResolved,
            operadora: operadoraResolved,
            produto: (v.produto && typeof v.produto === 'object') ? ((v.produto as any).nome ?? 'N/A') : (produtosById[(v as any).produto || (v as any).produtoId || '']?.nome ?? (v as any).produto ?? 'N/A'),
            tipo: tiposDemandaById[v.tipo || '']?.nome ?? v.tipo ?? 'N/A',
            solicitante: solicitantesById[v.solicitante || '']?.nome ?? v.solicitante ?? 'N/A',
            dataInicio: v.dataInicio ? new Date(v.dataInicio).toLocaleString('pt-BR') : 'N/A',
            dataFinal: v.dataFinal ? new Date(v.dataFinal).toLocaleString('pt-BR') : 'N/A',
            updatedAt: v.updatedAt ? new Date(v.updatedAt).toLocaleString('pt-BR') : 'N/A',
            createdAt: v.createdAt ? new Date(v.createdAt).toLocaleString('pt-BR') : 'N/A',
            total: v.total != null ? Number(v.total) : '',
            observacoes: (v as any).observacoes ?? (v as any).observacao ?? '',
            qualidade: (v as any).qualidade ?? '',
            vigencia: (v as any).vigencia ? new Date((v as any).vigencia).toLocaleDateString('pt-BR') : '',
            qtdRetornos: (v as any).qtdRetornos != null ? String((v as any).qtdRetornos) : '',
            formalizacao: (v as any).formalizacao ?? '',
            itensPendentes: (v as any).itensPendentes != null ? String((v as any).itensPendentes) : '',
            itensConcluidos: (v as any).itensConcluidos != null ? String((v as any).itensConcluidos) : '',
            estruturaEdge: Array.isArray((v as any).estruturaEdge) ? (v as any).estruturaEdge.join('; ') : ((v as any).estruturaEdge ?? ''),
            estruturaMove: Array.isArray((v as any).estruturaMove) ? (v as any).estruturaMove.join('; ') : ((v as any).estruturaMove ?? ''),
            _dataInicioRaw: v.dataInicio ?? '',
            _dataFinalRaw: v.dataFinal ?? v.dataInicio ?? '',
            _analistaId: analistaId ?? ''
          }
        })}
        moduleName="validacoes"
        moduleTitle="Validações"
        appliedFilters={{
          'Minhas Validações': showOnlyMyValidations ? 'Sim' : 'Não',
          'Total na lista': finalFilteredItems.length
        }}
        columns={[
          { key: 'ticket', label: 'Nº Ticket' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'status', label: 'Status' },
          { key: 'analista', label: 'Analista' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'operadora', label: 'Operadora' },
          { key: 'produto', label: 'Produto' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'dataInicio', label: 'Data Início' },
          { key: 'dataFinal', label: 'Data Final' },
          { key: 'vigencia', label: 'Vigência' },
          { key: 'total', label: 'Total' },
          { key: 'observacoes', label: 'Observações' },
          { key: 'qualidade', label: 'Qualidade' },
          { key: 'qtdRetornos', label: 'Qtd. Retornos' },
          { key: 'formalizacao', label: 'Formalização' },
          { key: 'itensPendentes', label: 'Itens Pendentes' },
          { key: 'itensConcluidos', label: 'Itens Concluídos' },
          { key: 'estruturaEdge', label: 'Estrutura EDGE' },
          { key: 'estruturaMove', label: 'Estrutura MOVE' },
          { key: 'createdAt', label: 'Criado em' },
          { key: 'updatedAt', label: 'Atualizado em' }
        ]}
      />
    </Box>
  )
}

