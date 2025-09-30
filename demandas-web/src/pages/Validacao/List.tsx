import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useValidationStore } from '../../store/validationStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { UploadModal } from '../../components/UploadModal'
import { useFilteredData } from '../../lib/utils'
import { useEffect, useState } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useValidationStore()
  const md = useMasterDataStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = () => {
    const v = store.items.find((x) => x.id === id)
    if (!v) return
    const from = v.status
    const next = { ...v, status: newStatus, updatedAt: new Date().toISOString() }
    store.upsert(next)
    store.log?.({ validationId: id, type: 'status_change', field: 'status', from, to: newStatus })
    setOpenStatus(false)
  }

  const doDelete = async () => {
    await store.remove(id)
    setOpenDelete(false)
  }

  const doDuplicate = async () => {
    const v = store.items.find((x) => x.id === id)
    if (!v) return
    const { id: _omit, createdAt: _c, updatedAt: _u, ...rest } = v
    try {
      const duplicated = await store.add({ ...rest, status: 'Em validação', updatedAt: new Date().toISOString() })
      navigate(`/validacao/${duplicated.id}`)
    } catch (error) {
      console.error('Erro ao duplicar validação:', error)
    }
  }

  const doExportPdf = () => {
    const v = store.items.find((x) => x.id === id)
    if (!v) return
    const label = (val?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === val)?.nome || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Validação ${v.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Validação ${v.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${v.status}</td></tr>
      <tr><td class="muted">Ticket</td><td>${v.ticket || '-'}</td></tr>
      <tr><td class="muted">Solicitante</td><td>${v.solicitante || '-'}</td></tr>
      <tr><td class="muted">Analista</td><td>${v.analista?.nome || '-'}</td></tr>
      <tr><td class="muted">Cliente</td><td>${v.cliente?.nome || '-'}</td></tr>
      <tr><td class="muted">Contrato</td><td>${v.contrato?.numero || '-'}</td></tr>
      <tr><td class="muted">Operadora</td><td>${v.operadora?.nome || '-'}</td></tr>
      <tr><td class="muted">Data Início</td><td>${v.dataInicio || '-'}</td></tr>
      <tr><td class="muted">Data Final</td><td>${v.dataFinal || '-'}</td></tr>
      <tr><td class="muted">Descrição</td><td>${v.descricao || '-'}</td></tr>
      <tr><td class="muted">Total</td><td>R$ ${v.total?.toLocaleString('pt-BR') || '0'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(v.updatedAt).toLocaleString('pt-BR')}</td></tr>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
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
        <MenuItem onClick={() => { handleMenuClose(); doDuplicate() }}>
          <ListItemIcon><FileCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenStatus(true) }}>
          <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Alterar status</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); doExportPdf() }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Exportar PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenDelete(true) }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={openStatus} onClose={() => setOpenStatus(false)}>
        <DialogTitle>Alterar status</DialogTitle>
        <DialogContent>
          <TextField select label="Novo status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} sx={{ mt: 1, minWidth: 280 }}>
            {['Em validação','Aprovada','Rejeitada','Pendente','Cancelada'].map(s => (
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
                boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
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
                boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
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
  { field: 'cliente', headerName: 'Cliente', width: 160 },
  { field: 'contrato', headerName: 'Contrato', width: 160 },
  { field: 'operadora', headerName: 'Operadora', width: 160 },
  { field: 'solicitante', headerName: 'Solicitante', width: 160 },
  { field: 'dataInicio', headerName: 'Data Início', width: 140 },
  { field: 'dataFinal', headerName: 'Data Final', width: 140 },
  { field: 'updatedAt', headerName: 'Atualizado em', width: 160 },
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
  const { user } = useAuthStore()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  
  const STORAGE_KEY = 'validations-list-view-v1'
  const FILTER_KEY = 'validations-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'updatedAt', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [showOnlyMyValidations, setShowOnlyMyValidations] = useState(true)

  // Filtrar dados por permissão do usuário
  const filteredItems = useFilteredData(items, user?.role, user?.id, user?.viewOwnDataOnly)
  // Aplicar filtro adicional para validações do usuário logado
  const finalFilteredItems = showOnlyMyValidations 
    ? filteredItems.filter(validation => {
        // Múltiplas verificações para identificar se a validação é do usuário
        const analistaId = typeof validation.analista === 'object' ? validation.analista?.id : validation.analista
        const analistaNome = typeof validation.analista === 'object' ? validation.analista?.nome : null
        
        const check1 = analistaId === user?.id
        const check2 = analistaNome === user?.name
        const check3 = user?.role === 'admin' && analistaId === 'analista-admin'
        const check4 = validation.analista === user?.id // Verificar campo analista também
        const check5 = validation.analista === user?.name // Verificar se analista é o nome do usuário
        
        // Verificação adicional: se o usuário é admin, sempre incluir validações criadas por ele
        const check6 = user?.role === 'admin'
        
        const isMyValidation = check1 || check2 || check3 || check4 || check5 || check6
        
        
        return isMyValidation
      })
    : filteredItems
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

  // Carregar dados da API automaticamente quando a página é carregada
  useEffect(() => {
    // Só carregar dados se o usuário estiver logado
    if (user?.id) {
      syncFromApi()
    } else {
      }
  }, [user?.id]) // Depender do ID do usuário para carregar dados

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyValidations))
    } catch {}
  }, [showOnlyMyValidations])

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

  const handleUpload = async (file: File) => {
    // Simular processamento do upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Aqui você implementaria a lógica real de processamento do arquivo
    // Por exemplo, usando uma biblioteca como xlsx para ler o Excel
    // Simular sucesso
    return Promise.resolve()
  }

  const rows = finalFilteredItems.map((v) => {
    const row = {
      id: v.id,
      ticket: v.ticket ?? '',
      descricao: v.descricao ?? '',
      status: v.status ?? '',
      analista: v.analista?.nome ?? '',
      cliente: v.cliente?.nome ?? '',
      contrato: v.contrato?.numero ?? '',
      operadora: v.operadora?.nome ?? '',
      solicitante: v.solicitante ?? '',
      dataInicio: v.dataInicio ?? '',
      dataFinal: v.dataFinal ?? '',
      updatedAt: new Date(v.updatedAt).toLocaleString('pt-BR'),
    }
    return row
  })

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
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyValidations}
                      onChange={(e) => setShowOnlyMyValidations(e.target.checked)}
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
                  label={`${finalFilteredItems.length} validação${finalFilteredItems.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyValidations 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Mensagem informativa */}
                {showOnlyMyValidations && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas suas validações
                  </Typography>
                )}
              </div>
            </div>
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                startIcon={<CloudUploadIcon />}
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
                variant="outlined" 
                startIcon={<PictureAsPdfIcon />}
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
                onClick={() => navigate('/validacao/nova')}
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
                Nova Validação
              </Button>
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
          onRowDoubleClick={(p) => navigate(`/validacao/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ 
            toolbar: { 
              showQuickFilter: true, 
              quickFilterProps: { 
                debounceMs: 300,
                placeholder: 'Buscar validações... (ex: ticket, analista, área)'
              } 
            } 
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
            '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: (t) => t.palette.action.hover },
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

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Importar Validações"
        entityType="validacao"
        onUpload={handleUpload}
      />

      {/* Modal de Exportação */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={finalFilteredItems.map(v => ({
          ...v,
          // Usar objetos relacionados diretamente
          analista: v.analista?.nome ?? 'N/A',
          area: md.areas.find(ar => ar.id === v.area)?.nome ?? v.area ?? 'N/A',
          cliente: v.cliente?.nome ?? 'N/A',
          contrato: v.contrato?.numero ?? 'N/A',
          operadora: v.operadora?.nome ?? 'N/A',
          produto: v.produto?.nome ?? 'N/A',
          sistema: md.sistemas.find(s => s.id === v.sistema)?.nome ?? v.sistema ?? 'N/A',
          tipo: md.tiposDemanda.find(t => t.id === v.tipo)?.nome ?? v.tipo ?? 'N/A',
          tipoServico: md.tiposServico.find(ts => ts.id === v.tipoServico)?.nome ?? v.tipoServico ?? 'N/A',
          // Formatar datas
          dataInicio: v.dataInicio ? new Date(v.dataInicio).toLocaleString('pt-BR') : 'N/A',
          dataFinal: v.dataFinal ? new Date(v.dataFinal).toLocaleString('pt-BR') : 'N/A',
          updatedAt: v.updatedAt ? new Date(v.updatedAt).toLocaleString('pt-BR') : 'N/A',
          // Formatar valores monetários
          total: v.total ? `R$ ${v.total.toLocaleString('pt-BR')}` : 'R$ 0,00'
        }))}
        moduleName="validacoes"
        moduleTitle="Validações"
        appliedFilters={{
          'Minhas Validações': showOnlyMyValidations ? 'Sim' : 'Não',
          'Total de Registros': finalFilteredItems.length
        }}
        columns={[
          { key: 'ticket', label: 'Nº Ticket' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'status', label: 'Status' },
          { key: 'analista', label: 'Analista' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'operadora', label: 'Operadora' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'dataInicio', label: 'Data Início' },
          { key: 'dataFinal', label: 'Data Final' },
          { key: 'total', label: 'Total' },
          { key: 'updatedAt', label: 'Atualizado em' }
        ]}
      />
    </Box>
  )
}

