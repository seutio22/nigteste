import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, Menu, MenuItem, TextField, FormControl, InputLabel, Select, Box, Typography, Switch, FormControlLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { AddCircleOutline as AddCircleOutlineIcon, Download, MoreVert, Visibility, Edit, Delete, ContentCopy, TrendingUp, Description, Search, FilterList, Person, Group } from '@mui/icons-material'
import TableChartIcon from '@mui/icons-material/TableChart'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import ExportDataModal from '../../components/ExportDataModal'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import { usePermissions } from '../../hooks/usePermissions'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { formatIntegerPtBR } from '../../utils/formatNumber'

const tipoServicoLabel: Record<string, string> = {
  duvida: 'Dúvida',
  solicitacao: 'Solicitação',
}

const canalLabel: Record<string, string> = {
  teams: 'Teams',
  email: 'E-mail',
  ligacao: 'Ligação',
  mensagem: 'Mensagem',
}

export default function AtendimentoListPage() {
  const navigate = useNavigate()
  const atendimentoStore = useAtendimentoStore()
  const masterDataStore = useMasterDataStore()
  const {
    analistasById,
    areasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    sistemasById,
    solicitantesById,
  } = masterDataStore
  const { user } = useAuthStore()
  const { canCreate, canExport } = usePermissions('atendimento')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Estados para filtros e DataGrid
  const STORAGE_KEY = 'atendimentos-list-view-v1'
  const FILTER_KEY = 'atendimento-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [showOnlyMyAtendimentos, setShowOnlyMyAtendimentos] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'createdAt', sort: 'desc' } // Ordenar por data de criação (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })

  // Carregar dados mestres e atendimentos
  useEffect(() => {
    if (masterDataStore.syncFromApi) {
      masterDataStore.syncFromApi()
    }
    if (atendimentoStore.syncFromApi) {
      atendimentoStore.syncFromApi()
    }
  }, [])

  // Carregar preferências
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.columnVisibilityModel) setColumnVisibilityModel(saved.columnVisibilityModel)
        if (saved.sortModel) setSortModel(saved.sortModel)
        if (saved.filterModel) setFilterModel(saved.filterModel)
        if (saved.paginationModel) setPaginationModel(saved.paginationModel)
      }
    } catch {}
    
    // Carregar preferência do filtro de usuário - SEMPRE inicia como "Meus atendimentos" (true)
    try {
      const filterPreference = localStorage.getItem(FILTER_KEY)
      if (filterPreference !== null) {
        setShowOnlyMyAtendimentos(JSON.parse(filterPreference))
      } else {
        // Se não houver preferência salva, manter o padrão "Meus atendimentos" (true)
        setShowOnlyMyAtendimentos(true)
      }
    } catch {
      // Em caso de erro, manter o padrão "Meus atendimentos" (true)
      setShowOnlyMyAtendimentos(true)
    }
  }, [])

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyAtendimentos))
    } catch {}
  }, [showOnlyMyAtendimentos])

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

  // Usar dados do store em vez de array vazio
  const atendimentos = atendimentoStore.items

  // Aplicar filtro adicional para atendimentos do usuário logado
  const filteredByUser = useMemo(() => {
    if (!showOnlyMyAtendimentos) return atendimentos
    return atendimentos.filter(atendimento => {
      const analista = analistasById?.[atendimento.analista || '']
      return user?.role === 'admin' || 
             atendimento.analista === user?.id || 
             (analista && analista.nome === user?.name)
    })
  }, [showOnlyMyAtendimentos, atendimentos, analistasById, user?.id, user?.name, user?.role])


  // Ordenar por data de criação (mais recente primeiro)
  const sortedAtendimentos = useMemo(() => {
    return [...filteredByUser].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0)
      const dateB = new Date(b.createdAt || b.updatedAt || 0)
      return dateB.getTime() - dateA.getTime()
    })
  }, [filteredByUser])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedId(id)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedId(null)
  }

  const handleView = (id: string) => {
    navigate(`/atendimento/${id}`)
    handleMenuClose()
  }

  const handleEdit = (id: string) => {
    navigate(`/atendimento/${id}/edit`)
    handleMenuClose()
  }

  const handleDuplicate = (id: string) => {
    alert('Funcionalidade de duplicação em desenvolvimento')
    handleMenuClose()
  }

  const handleStatusChange = (id: string) => {
    alert('Funcionalidade de alteração de status em desenvolvimento')
    handleMenuClose()
  }

  const handleExportPDF = (id: string) => {
    alert('Funcionalidade de exportação PDF em desenvolvimento')
    handleMenuClose()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este atendimento?')) {
      try {
        await api.deleteAtendimento(id)
        atendimentoStore.remove(id)
        handleMenuClose()
      } catch (error) {
        console.error('Erro ao excluir atendimento:', error)
        alert('Erro ao excluir atendimento. Verifique se você tem permissão para esta ação.')
      }
    }
  }

  // Definir colunas do DataGrid
  const columns: GridColDef[] = [
    { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
      <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
    ) },
    { field: 'ticket', headerName: 'Ticket', width: 140 },
    { field: 'cliente', headerName: 'Cliente', width: 200, renderCell: (p) => {
      const cliente = clientesById?.[String(p.value || '')]
      return cliente?.nome || p.value || '-'
    }},
    { field: 'solicitante', headerName: 'Solicitante', width: 160, renderCell: (p) => {
      const nomeFromApi = (p.row as { solicitanteNome?: string }).solicitanteNome
      if (nomeFromApi) return nomeFromApi
      const raw = p.value
      const idOrName = typeof raw === 'object' && raw !== null
        ? (raw as { id?: string; nome?: string }).id ?? (raw as { id?: string; nome?: string }).nome ?? ''
        : String(raw || '')
      const v = (idOrName || '').trim()
      const byId = solicitantesById?.[v]
      const byName = !byId && v ? masterDataStore.solicitantes?.find(s => (s.id && String(s.id).trim() === v) || (s.nome && String(s.nome).trim() === v)) : null
      const nome = byId?.nome ?? byName?.nome
      if (nome) return nome
      // ID de solicitante excluído (não encontrado): deixar em branco
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
      return isUuid ? '' : (idOrName || '-')
    }},
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(p.value)}`}>
        {p.value}
      </span>
    ) },
    { field: 'dataInicio', headerName: 'Data Início', width: 140, renderCell: (p) => 
      p.value ? new Date(p.value).toLocaleDateString('pt-BR') : '-'
    },
    { field: 'area', headerName: 'Área', width: 160, renderCell: (p) => {
      const area = areasById?.[String(p.value || '')]
      return area?.nome || p.value || '-'
    }},
    { field: 'analista', headerName: 'Analista', width: 160, renderCell: (p) => {
      const analista = analistasById?.[String(p.value || '')]
      return analista?.nome || p.value || '-'
    }},
    { field: 'tipoServico', headerName: 'Tipo de Serviço', width: 160, renderCell: (p) => {
      return tipoServicoLabel[String(p.value || '')] || p.value || '-'
    }},
    { field: 'tipo', headerName: 'Canal de Atendimento', width: 160, renderCell: (p) => {
      return canalLabel[String(p.value || '')] || p.value || '-'
    }},
    { 
      field: 'createdAt', 
      headerName: 'Data Criação', 
      width: 160,
      type: 'dateTime',
      valueGetter: (value, row) => {
        const dateValue = row.createdAt || value
        if (!dateValue) return null
        const date = new Date(dateValue)
        return isNaN(date.getTime()) ? null : date
      },
      valueFormatter: (value) => {
        if (!value) return '-'
        const date = value instanceof Date ? value : new Date(value)
        return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      sortComparator: (v1, v2) => {
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

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Aberto':
        return 'bg-green-100 text-green-800'
      case 'Em Andamento':
        return 'bg-orange-100 text-orange-800'
      case 'Concluído':
        return 'bg-blue-100 text-blue-800'
      case 'Cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
                Atendimento
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyAtendimentos}
                      onChange={(e) => setShowOnlyMyAtendimentos(e.target.checked)}
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
                      {showOnlyMyAtendimentos ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Meus Atendimentos</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todos os Atendimentos</span>
                        </>
                      )}
                    </div>
                  }
                />
                
                {/* Contador de atendimentos */}
                <Chip
                  label={`${formatIntegerPtBR(sortedAtendimentos.length)} atendimento${sortedAtendimentos.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyAtendimentos 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Mensagem informativa */}
                {showOnlyMyAtendimentos && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas seus atendimentos
                  </Typography>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => alert('Funcionalidade de importar em desenvolvimento')}
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
                Importar
              </Button>

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
              {canCreate && (
                <PrimaryActionButton
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => navigate('/atendimento/nova')}
                  sx={{ minWidth: '160px' }}
                >
                  Novo Atendimento
                </PrimaryActionButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6" style={{ minHeight: '400px' }}>
        <DataGrid
          rows={sortedAtendimentos}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true },
            },
          }}
          sortModel={sortModel}
          onSortModelChange={(newModel) => {
            setSortModel(newModel)
            persist({ sortModel: newModel })
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(model) => {
            setColumnVisibilityModel(model)
            persist({ columnVisibilityModel: model })
          }}
          filterModel={filterModel}
          onFilterModelChange={(model) => {
            setFilterModel(model)
            persist({ filterModel: model })
          }}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            setPaginationModel(model)
            persist({ paginationModel: model })
          }}
          sx={{
            height: '100%',
            minHeight: '400px',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: '#eef0f2',
            },
            '& .MuiDataGrid-row:nth-of-type(odd)': {
              backgroundColor: '#ffffff',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 159, 223, 0.06) !important',
            },
            '& .MuiDataGrid-cell': {
              textTransform: 'none',
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-columnHeader': {
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        />
      </div>

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleView(selectedId!)}>
          <Visibility className="mr-2" />
          Ver
        </MenuItem>
        <MenuItem onClick={() => handleEdit(selectedId!)}>
          <Edit className="mr-2" />
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleDuplicate(selectedId!)}>
          <ContentCopy className="mr-2" />
          Duplicar
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedId!)}>
          <TrendingUp className="mr-2" />
          Alterar status
        </MenuItem>
        <MenuItem onClick={() => handleExportPDF(selectedId!)}>
          <Description className="mr-2" />
          Exportar PDF
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedId!)} className="text-red-600">
          <Delete className="mr-2" />
          Excluir
        </MenuItem>
      </Menu>

      {/* Modal de Exportação - filtros de data e analista dentro do modal (como Validação/Reajuste) */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        formats={['excel']}
        filterOptions={{
          showDateFilter: true,
          showCreatedAtFilter: true,
          showAnalistaFilter: true,
          analistas: masterDataStore.analistas
        }}
        data={sortedAtendimentos.map(a => ({
          ...a,
          analista: analistasById?.[a.analista || '']?.nome ?? a.analista ?? 'N/A',
          area: areasById?.[a.area || '']?.nome ?? a.area ?? 'N/A',
          cliente: clientesById?.[a.cliente || '']?.nome ?? a.cliente ?? 'N/A',
          contrato: contratosById?.[a.contrato || '']?.numero ?? a.contrato ?? 'N/A',
          operadora: operadorasById?.[a.operadora || '']?.nome ?? a.operadora ?? 'N/A',
          produto: produtosById?.[a.produto || '']?.nome ?? a.produto ?? 'N/A',
          sistema: sistemasById?.[a.sistema || '']?.nome ?? a.sistema ?? 'N/A',
          solicitante: solicitantesById?.[a.solicitante || '']?.nome ?? (a.solicitante && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(a.solicitante).trim()) ? '' : a.solicitante) ?? '',
          tipoServico: tipoServicoLabel[String(a.tipoServico || '')] || a.tipoServico || 'N/A',
          tipo: canalLabel[String(a.tipo || '')] || a.tipo || 'N/A',
          dataInicio: a.dataInicio ? new Date(a.dataInicio).toLocaleString('pt-BR') : '',
          dataResolucao: a.dataFinal ? new Date(a.dataFinal).toLocaleString('pt-BR') : '',
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString('pt-BR') : '',
          _dataInicioRaw: a.dataInicio ?? a.createdAt ?? '',
          _dataFinalRaw: a.dataFinal ?? a.dataInicio ?? a.createdAt ?? '',
          _analistaId: a.analista ?? ''
        }))}
        moduleName="atendimentos"
        moduleTitle="Atendimentos"
        appliedFilters={{
          'Meus Atendimentos': showOnlyMyAtendimentos ? 'Sim' : 'Não',
          'Total na lista': sortedAtendimentos.length
        }}
        columns={[
          { key: 'ticket', label: 'Ticket' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'status', label: 'Status' },
          { key: 'dataInicio', label: 'Data de Início' },
          { key: 'area', label: 'Área' },
          { key: 'analista', label: 'Analista' },
          { key: 'tipoServico', label: 'Tipo de Serviço' },
          { key: 'tipo', label: 'Canal de Atendimento' }
        ]}
      />
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const atendimentoStore = useAtendimentoStore()
  const { canEdit, canDelete } = usePermissions('atendimento')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const atendimento = atendimentoStore.items.find((x) => x.id === id)
      if (!atendimento) return
      const from = atendimento.status
      const next = { ...atendimento, status: newStatus, updatedAt: new Date().toISOString() }
      await atendimentoStore.update(id, next)
      setOpenStatus(false)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  const doDelete = async () => {
    try {
      await atendimentoStore.remove(id)
      setOpenDelete(false)
    } catch (error) {
      console.error('Erro ao excluir atendimento:', error)
      alert('Erro ao excluir atendimento. Verifique o console para mais detalhes.')
    }
  }

  const doDuplicate = async () => {
    const atendimento = atendimentoStore.items.find((x) => x.id === id)
    if (!atendimento) return
    
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
          const existing = await api.getAtendimentos(`?ticket=${encodeURIComponent(newTicket)}`)
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
      const newTicket = await generateUniqueTicket(atendimento.ticket)
      
      const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = atendimento
      const duplicated = await atendimentoStore.add({ ...rest, status: 'Aberto', ticket: newTicket })
      
      // Garantir navegação usando o ID real do backend
      let navigateId = duplicated?.id
      try {
        const { api } = await import('../../lib/api.local')
        const found = await api.getAtendimentos(`?ticket=${encodeURIComponent(String(newTicket || ''))}`)
        if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
          navigateId = found[0].id
        }
      } catch (e) {
        console.warn('Não foi possível confirmar ID pelo ticket; usando ID retornado localmente', e)
      }
      
      navigate(`/atendimento/${navigateId}`)
    } catch (error) {
      console.error('Erro ao duplicar atendimento:', error)
      alert('Erro ao duplicar atendimento. Verifique o console para mais detalhes.')
    }
  }

  const doExportPdf = () => {
    const atendimento = atendimentoStore.items.find((x) => x.id === id)
    if (!atendimento) return
    alert('Funcionalidade de exportação PDF em desenvolvimento')
  }

  return (
    <>
      <IconButton size="small" onClick={handleMenuOpen}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose} keepMounted>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/atendimento/${id}`) }}>
          <Visibility className="mr-2" />
          Ver
        </MenuItem>
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); navigate(`/atendimento/${id}/edit`) }}>
            <Edit className="mr-2" />
            Editar
          </MenuItem>
        )}
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); doDuplicate() }}>
            <ContentCopy className="mr-2" />
            Duplicar
          </MenuItem>
        )}
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); setOpenStatus(true) }}>
            <TrendingUp className="mr-2" />
            Alterar status
          </MenuItem>
        )}
        
        <MenuItem onClick={() => { handleMenuClose(); doExportPdf() }}>
          <Description className="mr-2" />
          Exportar PDF
        </MenuItem>
        
        {canDelete && (
          <MenuItem onClick={() => { handleMenuClose(); setOpenDelete(true) }}>
            <Delete className="mr-2" />
            Excluir
          </MenuItem>
        )}
      </Menu>

      {/* Dialog para alterar status */}
      <Dialog open={openStatus} onClose={() => setOpenStatus(false)}>
        <DialogTitle>Alterar status</DialogTitle>
        <DialogContent>
          <TextField select label="Novo status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} sx={{ mt: 1, minWidth: 280 }}>
            {['Aberto','Em Andamento','Concluído','Cancelado'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatus(false)}>Cancelar</Button>
          <Button variant="contained" onClick={doChangeStatus}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para excluir */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Excluir atendimento</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir este atendimento?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Excluir</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
