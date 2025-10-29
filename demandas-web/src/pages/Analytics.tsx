import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch, FormControlLabel } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'
import { ReportStatusBadge } from '../components/ReportStatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { SmartImporter } from '../components/SmartImporter'
import { smartImporterConfigs } from '../config/smartImporterConfigs'
import type { ImportResult } from '../types/smartImporter'
import { useFilteredData } from '../lib/utils'
import { useEffect, useState } from 'react'
import ExportDataModal from '../components/ExportDataModal'
import { usePermissions } from '../hooks/usePermissions'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AddIcon from '@mui/icons-material/Add'
import AssessmentIcon from '@mui/icons-material/Assessment'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'titulo', headerName: 'Título', flex: 1, minWidth: 250 },
  { field: 'tipo', headerName: 'Tipo', width: 120, renderCell: (p) => (
    <Chip 
      label={p.value === 'mensal' ? 'Mensal' : p.value === 'trimestral' ? 'Trimestral' : p.value === 'semestral' ? 'Semestral' : p.value === 'anual' ? 'Anual' : 'Personalizado'} 
      size="small" 
      variant="outlined" 
    />
  ) },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <ReportStatusBadge status={String(p.value ?? '')} /> },
  { field: 'prioridade', headerName: 'Prioridade', width: 120, renderCell: (p) => <PriorityBadge priority={String(p.value ?? '')} /> },
  { field: 'analista', headerName: 'Analista', width: 160 },
  { field: 'area', headerName: 'Área', width: 160 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'dataEntrega', headerName: 'Data de Entrega Programada', width: 140 },
  { field: 'dataCriacao', headerName: 'Data de Início', width: 160 },
  { field: 'dataFinalizacao', headerName: 'Data de Finalização', width: 160 },
  { field: 'dataAtualizacao', headerName: 'Atualizado em', width: 160 },
]

export default function AnalyticsPage() {
  // FORÇAR DEPLOY - Exclusão em massa + Importador Inteligente - v1.0
  const navigate = useNavigate()
  const reportStore = useReportStore()
  const items = useReportStore(state => state.items)
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const { canCreate, canImport, canExport, canDelete } = usePermissions('analytics')
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const STORAGE_KEY = 'reports-list-view-v1'
  const FILTER_KEY = 'reports-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'dataAtualizacao', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [showOnlyMyReports, setShowOnlyMyReports] = useState(true) // SEMPRE inicia como "Meus relatórios"

  // Aplicar filtro "Meus relatórios" baseado no usuário logado
  const finalFilteredItems = showOnlyMyReports 
    ? items.filter(item => {
        // Buscar o analista correspondente ao usuário logado
        const analistaCorrespondente = md.analistas.find(analista => 
          analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
          analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
          (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
        )
        
        // Se encontrou o analista correspondente, comparar NOMES (não IDs)
        if (analistaCorrespondente) {
          return item.analista?.toLowerCase() === analistaCorrespondente.nome.toLowerCase()
        }
        
        // Se não encontrou correspondência, retornar false (não mostrar)
        return false
      })
    : items
  
  // Debug logs
  console.log('🔍 AnalyticsPage: Total de items:', items.length)
  console.log('🔍 AnalyticsPage: Items:', items)
  console.log('🔍 AnalyticsPage: User:', user)
  console.log('🔍 AnalyticsPage: ShowOnlyMyReports:', showOnlyMyReports)
  console.log('🔍 AnalyticsPage: Analistas disponíveis:', md.analistas)
  
  // Debug do filtro
  if (showOnlyMyReports && user?.name) {
    const analistaCorrespondente = md.analistas.find(analista => 
      analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
      analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
      (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
    )
    console.log('🔍 AnalyticsPage: Analista correspondente ao usuário:', analistaCorrespondente)
    
    if (analistaCorrespondente) {
      const meusRelatorios = items.filter(item => item.analista?.toLowerCase() === analistaCorrespondente.nome.toLowerCase())
      console.log('🔍 AnalyticsPage: Relatórios do analista correspondente:', meusRelatorios.length, meusRelatorios)
    }
  }
  
  console.log('🔍 AnalyticsPage: FinalFilteredItems:', finalFilteredItems.length)

  // Sincronizar dados mestres ao abrir a página
  useEffect(() => {
    if (md.syncFromApi) {
      console.log('🔄 AnalyticsPage: Sincronizando dados mestres (analistas)...')
      md.syncFromApi()
    }
  }, [])

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
    
    // Carregar preferência do filtro de usuário - SEMPRE inicia como "Meus relatórios" (true)
    try {
      const filterPreference = localStorage.getItem(FILTER_KEY)
      if (filterPreference !== null) {
        setShowOnlyMyReports(JSON.parse(filterPreference))
      } else {
        // Se não houver preferência salva, manter o padrão "Meus relatórios" (true)
        setShowOnlyMyReports(true)
      }
    } catch {
      // Em caso de erro, manter o padrão "Meus relatórios" (true)
      setShowOnlyMyReports(true)
    }
  }, [])

  // Carregar dados automaticamente quando a página é carregada
  useEffect(() => {
    console.log('🔄 AnalyticsPage: useEffect executado, user.id:', user?.id)
    if (user?.id) {
      // FORÇAR sincronização IMEDIATA ignorando cache
      console.log('🔄 AnalyticsPage: FORÇANDO syncFromApi...')
      const syncNow = async () => {
        try {
          const store = useReportStore.getState()
          await store.syncFromApi()
          console.log('✅ AnalyticsPage: syncFromApi completado!')
        } catch (error) {
          console.error('❌ AnalyticsPage: Erro no syncFromApi:', error)
        }
      }
      syncNow()
    } else {
      console.log('⚠️ AnalyticsPage: Usuário não encontrado')
    }
  }, [user?.id])

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyReports))
    } catch {}
  }, [showOnlyMyReports])

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    try {
      const { api } = await import('../lib/api.local')
      console.log('🗑️ Iniciando exclusão em massa de', selectedIds.length, 'relatórios')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of selectedIds) {
        try {
          await api.delete(`/relatorios/${id}`)
          successCount++
        } catch (error: any) {
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            console.log(`⚠️ Relatório ${id} já foi excluído (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir relatório ${id}:`, error)
            errorCount++
          }
        }
      }
      
      reportStore.remove(selectedIds)
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      
      const totalProcessed = successCount + notFoundCount
      if (errorCount === 0) {
        if (notFoundCount > 0) {
          alert(`✅ ${totalProcessed} relatório(s) removido(s)!\n\n${successCount} excluídos do banco\n${notFoundCount} já haviam sido excluídos (cache limpo)`)
        } else {
          alert(`✅ ${successCount} relatório(s) excluído(s) com sucesso!`)
        }
      } else {
        alert(`⚠️ ${totalProcessed} relatório(s) removido(s), ${errorCount} erro(s)\n\n${successCount} excluídos\n${notFoundCount} já excluídos anteriormente`)
      }
      
      reportStore.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir relatórios')
    }
  }

  // Função do Importador Inteligente
  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      const normalizeString = (str: string) => {
        if (!str) return ''
        return String(str).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
      }

      const findIdByName = (name: string, items: any[], nameField: string = 'nome') => {
        if (!name) return ''
        const searchNormalized = normalizeString(String(name))
        const item = items.find(item => {
          const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
          return itemNameNormalized === searchNormalized
        })
        return item?.id || ''
      }

      for (const item of result.valid) {
        try {
          const data = item.isCorrected ? item.correctedData : item.data

          const relatorioData = {
            titulo: data.titulo || '',
            descricao: data.descricao || '',
            ticket: data.ticket || `REL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            total: data.total || 0,
            tipo: data.tipo || 'mensal',
            status: data.status || 'pendente',
            analista: data.analista || '',
            areaId: findIdByName(data.area || data.areaId, md.areas) || '',
            clienteId: findIdByName(data.cliente || data.clienteId, md.clientes) || '',
            contratoId: findIdByName(data.contrato || data.contratoId, md.contratos, 'codigo') || '',
            dataInicio: data.dataInicio || new Date().toISOString().split('T')[0],
            dataFinalizacao: data.dataFinalizacao,
            dataEntrega: data.dataEntrega || new Date().toISOString().split('T')[0],
            prioridade: data.prioridade || 'media',
            solicitante: data.solicitante || '',
            solicitacao: data.solicitacao || '',
            tipoSolicitacao: data.tipoSolicitacao || '',
            tipoServico: data.tipoServico || '',
            observacoes: data.observacoes || ''
          }

          Object.keys(relatorioData).forEach(key => {
            if (relatorioData[key] === '' || relatorioData[key] === null || relatorioData[key] === undefined) {
              delete relatorioData[key]
            }
          })

          const savedRelatorio = await api.post('/relatorios', relatorioData)
          totalImported++
          totalSavedToDatabase++
        } catch (error) {
          console.error('❌ SMART IMPORT RELATÓRIOS: Erro ao salvar relatório:', error)
          errors.push(`Erro ao salvar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      if (totalSavedToDatabase > 0) {
        await reportStore.syncFromApi()
      }

      const successMessage = `${totalImported} relatórios processados, ${totalSavedToDatabase} salvos no banco de dados`
      if (totalSavedToDatabase > 0) {
        alert(`✅ ${successMessage}`)
      }
      if (errors.length > 0) {
        alert(`⚠️ Alguns erros ocorreram:\n${errors.join('\n')}`)
      }
    } catch (error) {
      console.error('❌ SMART IMPORT RELATÓRIOS: Erro geral:', error)
      alert('Erro ao importar relatórios')
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


  const rows = finalFilteredItems.map((r) => {
    // DEBUG: Verificar dados de data
    console.log('🔍 DEBUG Analytics - Item:', r.id, {
      dataInicio: r.dataInicio,
      dataFinalizacao: r.dataFinalizacao,
      dataEntrega: r.dataEntrega,
      dataCriacao: r.dataCriacao
    })
    
    return {
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      status: r.status,
      prioridade: r.prioridade,
      analista: r.analista || 'N/A', // JÁ vem convertido do syncFromApi!
      area: md.areas.find(a => a.id === r.area)?.nome ?? r.area ?? '',
      cliente: md.clientes.find(c => c.id === r.cliente)?.nome ?? r.cliente ?? '',
      contrato: md.contratos.find(c => c.id === r.contrato)?.codigo ?? r.contrato ?? '',
      // Corrigido: Formatar data sem timezone (mesmo formato usado no Detail)
      dataEntrega: r.dataEntrega ? r.dataEntrega.split('T')[0].split('-').reverse().join('/') : '-',
      dataCriacao: r.dataInicio ? r.dataInicio.split('T')[0].split('-').reverse().join('/') : '-',
      dataFinalizacao: r.dataFinalizacao ? r.dataFinalizacao.split('T')[0].split('-').reverse().join('/') : '-',
      dataAtualizacao: new Date(r.dataAtualizacao).toLocaleString('pt-BR'),
    }
  })

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Analytics
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyReports}
                      onChange={(e) => setShowOnlyMyReports(e.target.checked)}
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
                      {showOnlyMyReports ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Meus Relatórios</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todos os Relatórios</span>
                        </>
                      )}
                    </div>
                  }
                />
                
                {/* Contador de relatórios */}
                <Chip
                  label={`${finalFilteredItems.length} relatório${finalFilteredItems.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyReports 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Mensagem informativa */}
                {showOnlyMyReports && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas seus relatórios
                  </Typography>
                )}
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
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    '&:hover': {
                      borderColor: '#dc2626',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626'
                    }
                  }}
                >
                  Excluir ({selectedIds.length})
                </Button>
              )}

              {canImport && (
                <Button 
                  variant="contained" 
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => setSmartImporterOpen(true)}
                  size="medium"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-300 font-medium"
                  sx={{
                    borderRadius: '14px',
                    padding: '10px 20px',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    height: '44px',
                    background: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7e22ce 0%, #2563eb 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px 0 rgba(147, 51, 234, 0.3)'
                    }
                  }}
                >
                  Importador Inteligente
                </Button>
              )}

              {canExport && (
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
              )}
              
              {canCreate && (
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => navigate('/analytics/novo')}
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
                  Novo Relatório
                </Button>
              )}
            </Stack>
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-6 pb-6">
        <DataGrid
          columns={columns}
          rows={rows}
          disableRowSelectionOnClick
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setSelectedIds(newSelection as string[])
          }}
          rowSelectionModel={selectedIds}
          onRowDoubleClick={(p) => navigate(`/analytics/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
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

      {/* Smart Importer - Importador Inteligente */}
      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs.analytics}
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
            Tem certeza que deseja excluir <strong>{selectedIds.length}</strong> relatório(s) selecionado(s)?
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
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Exportação */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={finalFilteredItems.map(r => ({
          ...r,
          // Mapear IDs para nomes legíveis
          analista: md.analistas.find(a => a.id === r.analista)?.nome ?? r.analista ?? 'N/A',
          area: md.areas.find(ar => ar.id === r.area)?.nome ?? r.area ?? 'N/A',
          cliente: md.clientes.find(c => c.id === r.cliente)?.nome ?? r.cliente ?? 'N/A',
          contrato: r.contrato ?? 'N/A',
          // Formatar datas (já estão em formato ISO string do store)
          dataEntrega: r.dataEntrega ? new Date(r.dataEntrega).toLocaleString('pt-BR') : 'N/A',
          dataCriacao: r.dataInicio ? new Date(r.dataInicio).toLocaleString('pt-BR') : 'N/A',
          dataFinalizacao: r.dataFinalizacao ? new Date(r.dataFinalizacao).toLocaleString('pt-BR') : 'N/A',
          dataAtualizacao: r.dataAtualizacao ? new Date(r.dataAtualizacao).toLocaleString('pt-BR') : 'N/A'
        }))}
        moduleName="analytics"
        moduleTitle="Analytics"
        appliedFilters={{
          'Meus Relatórios': showOnlyMyReports ? 'Sim' : 'Não',
          'Total de Registros': finalFilteredItems.length
        }}
        columns={[
          { key: 'titulo', label: 'Título' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'status', label: 'Status' },
          { key: 'prioridade', label: 'Prioridade' },
          { key: 'analista', label: 'Analista' },
          { key: 'area', label: 'Área' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'dataEntrega', label: 'Data de Entrega' },
          { key: 'dataAtualizacao', label: 'Atualizado em' }
        ]}
      />
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useReportStore()
  const { user } = useAuthStore()
  const permissions = usePermissions('analytics')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)
  
  // Verificar se o usuário pode excluir este relatório (permissão + ownership)
  const report = store.items.find((r) => r.id === id)
  const canDelete = permissions.canDelete && (report?.userId === user?.id || user?.role === 'admin' || !report?.userId)
  const canEdit = permissions.canEdit && (report?.userId === user?.id || user?.role === 'admin' || !report?.userId)
  
  // Debug: Log para verificar dados
  console.log('🔍 Analytics ActionCell Debug:', {
    reportId: id,
    reportUserId: report?.userId,
    currentUserId: user?.id,
    userRole: user?.role,
    canDelete,
    report: report
  })

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    const from = r.status
    const next = { ...r, status: newStatus as any, dataAtualizacao: new Date().toISOString() }
    store.upsert(next)
    store.log({ reportId: id, type: 'status_change', field: 'status', from, to: newStatus })
    setOpenStatus(false)
  }

  const doDelete = async () => {
    try {
      await store.remove(id)
      setOpenDelete(false)
    } catch (error) {
      console.error('Erro ao excluir relatório:', error)
      alert('Erro ao excluir relatório. Verifique o console para mais detalhes.')
    }
  }

  const doDuplicate = async () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    const { id: _omit, dataCriacao: _c, dataAtualizacao: _u, ...rest } = r
    const duplicated = await store.add({ ...rest, status: 'pendente' })
    navigate(`/analytics/${duplicated.id}`)
  }

  const doExportPdf = () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório ${r.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Relatório: ${r.titulo}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${r.status}</td></tr>
      <tr><td class="muted">Tipo</td><td>${r.tipo}</td></tr>
      <tr><td class="muted">Prioridade</td><td>${r.prioridade}</td></tr>
      <tr><td class="muted">Data de Entrega</td><td>${new Date(r.dataEntrega).toLocaleDateString('pt-BR')}</td></tr>
      <tr><td class="muted">Descrição</td><td>${r.descricao ?? '-'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(r.dataAtualizacao).toLocaleString('pt-BR')}</td></tr>
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
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/analytics/${id}`) }}>
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
          <MenuItem onClick={() => { handleMenuClose(); setOpenStatus(true) }}>
            <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Alterar status</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => { handleMenuClose(); doExportPdf() }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Exportar PDF</ListItemText>
        </MenuItem>
        
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
            {['pendente','emandamento','concluido','entregue','cancelado'].map(s => (
              <MenuItem key={s} value={s}>
                {s === 'pendente' ? 'Pendente' : 
                 s === 'emandamento' ? 'Em Andamento' : 
                 s === 'concluido' ? 'Concluído' : 
                 s === 'entregue' ? 'Entregue' : 'Cancelado'}
              </MenuItem>
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
        <DialogTitle>Excluir relatório</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir este relatório?</Typography>
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