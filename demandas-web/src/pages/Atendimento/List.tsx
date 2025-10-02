import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, Menu, MenuItem, TextField, FormControl, InputLabel, Select, Box, Typography, Switch, FormControlLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { Add, Download, MoreVert, Visibility, Edit, Delete, ContentCopy, TrendingUp, Description, Search, FilterList, Person, Group } from '@mui/icons-material'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import ExportDataModal from '../../components/ExportDataModal'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'

export default function AtendimentoListPage() {
  const navigate = useNavigate()
  const atendimentoStore = useAtendimentoStore()
  const masterDataStore = useMasterDataStore()
  const { user } = useAuthStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Estados para filtros e DataGrid
  const [showOnlyMyAtendimentos, setShowOnlyMyAtendimentos] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'createdAt', sort: 'desc' } // Ordenar por data de criação (mais recentes primeiro)
  ])

  // Carregar dados mestres e atendimentos
  useEffect(() => {
    if (masterDataStore.syncFromApi) {
      masterDataStore.syncFromApi()
    }
    if (atendimentoStore.syncFromApi) {
      atendimentoStore.syncFromApi()
    }
  }, [])

  // Carregar preferência do filtro de usuário - SEMPRE inicia como "Meus atendimentos" (true)
  useEffect(() => {
    try {
      const filterPreference = localStorage.getItem('atendimento-user-filter-v1')
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
      localStorage.setItem('atendimento-user-filter-v1', JSON.stringify(showOnlyMyAtendimentos))
    } catch {}
  }, [showOnlyMyAtendimentos])

  // Usar dados do store em vez de array vazio
  const atendimentos = atendimentoStore.items

  // Aplicar filtro adicional para atendimentos do usuário logado
  const filteredByUser = showOnlyMyAtendimentos 
    ? atendimentos.filter(atendimento => {
        const analista = masterDataStore.analistas.find(a => a.id === atendimento.analista)
        return user?.role === 'admin' || 
               atendimento.analista === user?.id || 
               (analista && analista.nome === user?.name)
      })
    : atendimentos


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
      const cliente = masterDataStore.clientes.find(c => c.id === p.value)
      return cliente ? cliente.nome : p.value || '-'
    }},
    { field: 'solicitante', headerName: 'Solicitante', width: 160, renderCell: (p) => {
      const solicitante = masterDataStore.solicitantes.find(s => s.id === p.value)
      return solicitante ? solicitante.nome : p.value || '-'
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
      const area = masterDataStore.areas.find(a => a.id === p.value)
      return area ? area.nome : p.value || '-'
    }},
    { field: 'analista', headerName: 'Analista', width: 160, renderCell: (p) => {
      const analista = masterDataStore.analistas.find(a => a.id === p.value)
      return analista ? analista.nome : p.value || '-'
    }},
    { field: 'tipoServico', headerName: 'Tipo de Serviço', width: 160, renderCell: (p) => {
      const tipoServico = masterDataStore.tiposServico.find(ts => ts.id === p.value)
      return tipoServico ? tipoServico.nome : p.value || '-'
    }},
    { field: 'tipo', headerName: 'Tipo de Demanda', width: 160, renderCell: (p) => {
      const tipo = masterDataStore.tiposDemanda.find(t => t.id === p.value)
      return tipo ? tipo.nome : p.value || '-'
    }},
    { field: 'createdAt', headerName: 'Data Criação', width: 160, renderCell: (p) => 
      p.value ? new Date(p.value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
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
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.08)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
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
                  label={`${sortedAtendimentos.length} atendimento${sortedAtendimentos.length !== 1 ? 's' : ''}`}
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
                    boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
                  }
                }}
              >
                Importar
              </Button>

              <Button
                variant="outlined"
                startIcon={<Download />}
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
                    boxShadow: '0 4px 12px 0 rgba(156, 39, 176, 0.15)'
                  }
                }}
              >
                Exportar
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/atendimento/nova')}
                size="medium"
                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  height: '44px',
                  minWidth: '160px',
                  boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
                  '&:hover': {
                    boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Novo Atendimento
              </Button>
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
            },
          }}
          sortModel={sortModel}
          onSortModelChange={(newModel) => setSortModel(newModel)}
          sx={{
            height: '100%',
            minHeight: '400px',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
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

      {/* Modal de Exportação */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={sortedAtendimentos.map(a => ({
          ...a,
          // Mapear IDs para nomes legíveis
          analista: masterDataStore.analistas.find(an => an.id === a.analista)?.nome ?? a.analista ?? 'N/A',
          area: masterDataStore.areas.find(ar => ar.id === a.area)?.nome ?? a.area ?? 'N/A',
          cliente: masterDataStore.clientes.find(c => c.id === a.cliente)?.nome ?? a.cliente ?? 'N/A',
          contrato: masterDataStore.contratos.find(c => c.id === a.contrato)?.numero ?? a.contrato ?? 'N/A',
          operadora: masterDataStore.operadoras.find(o => o.id === a.operadora)?.nome ?? a.operadora ?? 'N/A',
          produto: masterDataStore.produtos.find(p => p.id === a.produto)?.nome ?? a.produto ?? 'N/A',
          sistema: masterDataStore.sistemas.find(s => s.id === a.sistema)?.nome ?? a.sistema ?? 'N/A',
          tipoServico: masterDataStore.tiposServico.find(ts => ts.id === a.tipoServico)?.nome ?? a.tipoServico ?? 'N/A',
          // Formatar datas
          dataInicio: a.dataInicio ? new Date(a.dataInicio).toLocaleString('pt-BR') : 'N/A',
          dataResolucao: a.dataFinal ? new Date(a.dataFinal).toLocaleString('pt-BR') : 'N/A',
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleString('pt-BR') : 'N/A'
        }))}
        moduleName="atendimentos"
        moduleTitle="Atendimentos"
        appliedFilters={{
          'Meus Atendimentos': showOnlyMyAtendimentos ? 'Sim' : 'Não',
          'Total de Registros': sortedAtendimentos.length
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
          { key: 'tipo', label: 'Tipo de Demanda' }
        ]}
      />
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const atendimentoStore = useAtendimentoStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = () => {
    const atendimento = atendimentoStore.items.find((x) => x.id === id)
    if (!atendimento) return
    const from = atendimento.status
    const next = { ...atendimento, status: newStatus, updatedAt: new Date().toISOString() }
    atendimentoStore.update(id, next)
    setOpenStatus(false)
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
    const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = atendimento
    const duplicated = await atendimentoStore.add({ ...rest, status: 'Aberto', ticket: undefined })
    navigate(`/atendimento/${duplicated.id}`)
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
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/atendimento/${id}/edit`) }}>
          <Edit className="mr-2" />
          Editar
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); doDuplicate() }}>
          <ContentCopy className="mr-2" />
          Duplicar
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenStatus(true) }}>
          <TrendingUp className="mr-2" />
          Alterar status
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); doExportPdf() }}>
          <Description className="mr-2" />
          Exportar PDF
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenDelete(true) }}>
          <Delete className="mr-2" />
          Excluir
        </MenuItem>
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
