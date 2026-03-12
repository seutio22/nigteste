import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch, FormControlLabel } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'
import { ReportStatusBadge } from '../components/ReportStatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { normalizeReportStatus } from '../utils/statusPadrao'
import { SmartImporter } from '../components/SmartImporter'
import { smartImporterConfigs } from '../config/smartImporterConfigs'
import type { ImportResult } from '../types/smartImporter'
import { useFilteredData } from '../lib/utils'
import { useEffect, useState, useMemo } from 'react'
import ExportDataModal from '../components/ExportDataModal'
import { usePermissions } from '../hooks/usePermissions'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import TableChartIcon from '@mui/icons-material/TableChart'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AddIcon from '@mui/icons-material/Add'
import AssessmentIcon from '@mui/icons-material/Assessment'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

const isDev = import.meta.env.DEV
const logDev = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'titulo', headerName: 'Título', flex: 1, minWidth: 250 },
  { field: 'tipo', headerName: 'Tipo', width: 120, renderCell: (p) => (
    <Chip 
      label={p.value === 'diaria' ? 'Diária' : p.value === 'semanal' ? 'Semanal' : p.value === 'mensal' ? 'Mensal' : p.value === 'trimestral' ? 'Trimestral' : p.value === 'semestral' ? 'Semestral' : p.value === 'anual' ? 'Anual' : 'Personalizado'} 
      size="small" 
      variant="outlined" 
    />
  ) },
  { field: 'ticket', headerName: 'Ticket', width: 140 },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <ReportStatusBadge status={String(p.value ?? '')} /> },
  { field: 'prioridade', headerName: 'Prioridade', width: 120, renderCell: (p) => <PriorityBadge priority={String(p.value ?? '')} /> },
  { field: 'analista', headerName: 'Analista', width: 160 },
  { field: 'area', headerName: 'Área', width: 160 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'dataEntrega', headerName: 'Data de Entrega Programada', width: 140 },
  { field: 'dataCriacao', headerName: 'Data de Início', width: 160 },
  { field: 'dataFinalizacao', headerName: 'Data de Finalização', width: 160 },
  { 
    field: 'dataAtualizacao', 
    headerName: 'Atualizado em', 
    width: 160,
    type: 'dateTime',
    valueGetter: (value, row) => {
      const dateValue = row.dataAtualizacao || value
      if (!dateValue) return null
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? null : date
    },
    valueFormatter: (value) => {
      if (!value) return '-'
      const date = value instanceof Date ? value : new Date(value)
      return isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR')
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
  const [isDeleting, setIsDeleting] = useState(false)

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
  const finalFilteredItems = useMemo(() => {
    if (!showOnlyMyReports) return items
    return items.filter(item => {
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
  }, [showOnlyMyReports, items, md.analistas, user?.name])
  
  // Debug logs
  logDev('🔍 AnalyticsPage: Total de items:', items.length)
  logDev('🔍 AnalyticsPage: Items:', items)
  logDev('🔍 AnalyticsPage: User:', user)
  logDev('🔍 AnalyticsPage: ShowOnlyMyReports:', showOnlyMyReports)
  logDev('🔍 AnalyticsPage: Analistas disponíveis:', md.analistas)
  
  // Debug do filtro
  if (showOnlyMyReports && user?.name) {
    const analistaCorrespondente = md.analistas.find(analista => 
      analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
      analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
      (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
    )
    logDev('🔍 AnalyticsPage: Analista correspondente ao usuário:', analistaCorrespondente)
    
    if (analistaCorrespondente) {
      const meusRelatorios = items.filter(item => item.analista?.toLowerCase() === analistaCorrespondente.nome.toLowerCase())
      logDev('🔍 AnalyticsPage: Relatórios do analista correspondente:', meusRelatorios.length, meusRelatorios)
    }
  }
  
  logDev('🔍 AnalyticsPage: FinalFilteredItems:', finalFilteredItems.length)

  // Sincronizar dados mestres ao abrir a página
  useEffect(() => {
    if (md.syncFromApi) {
      logDev('🔄 AnalyticsPage: Sincronizando dados mestres (analistas)...')
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
    logDev('🔄 AnalyticsPage: useEffect executado, user.id:', user?.id)
    if (user?.id) {
      // FORÇAR sincronização IMEDIATA ignorando cache
      logDev('🔄 AnalyticsPage: FORÇANDO syncFromApi...')
      const syncNow = async () => {
        try {
          const store = useReportStore.getState()
          await store.syncFromApi()
          logDev('✅ AnalyticsPage: syncFromApi completado!')
        } catch (error) {
          console.error('❌ AnalyticsPage: Erro no syncFromApi:', error)
        }
      }
      syncNow()
    } else {
      logDev('⚠️ AnalyticsPage: Usuário não encontrado')
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
    if (isDeleting || selectedIds.length === 0) return
    const idsToDelete = [...selectedIds]
    setIsDeleting(true)
    try {
      const { api } = await import('../lib/api.local')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of idsToDelete) {
        try {
          await api.delete(`/analytics/${id}`)
          successCount++
        } catch (error: any) {
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            notFoundCount++
          } else {
            errorCount++
          }
        }
      }
      
      reportStore.remove(idsToDelete)
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
      
      await reportStore.syncFromApi()
    } catch (error) {
      alert('Erro ao excluir relatórios')
    } finally {
      setIsDeleting(false)
    }
  }

  // Função do Importador Inteligente
  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      // Função para converter número de série do Excel para DateTime ISO
      const excelDateToISO = (value: any): string => {
        if (!value) return ''
        
        // Se já é uma string de data válida, retornar como está
        if (typeof value === 'string' && value.includes('-')) {
          return value
        }
        
        // Se é um número (serial do Excel)
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const serialNumber = Number(value)
          // Excel epoch: 1900-01-01 (mas com bug, Excel considera 1900 como ano bissexto)
          const excelEpoch = new Date(1900, 0, 1)
          const days = serialNumber - 2 // Ajuste pelo bug do Excel
          const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
          return date.toISOString().split('T')[0] // Retornar apenas a data (YYYY-MM-DD)
        }
        
        return ''
      }

      // Processar itens válidos
      for (let itemIndex = 0; itemIndex < result.valid.length; itemIndex++) {
        const item = result.valid[itemIndex]
        const itemNumber = itemIndex + 1
        
        try {
          const data = item.isCorrected ? item.correctedData : item.data
          
          // Validar campos obrigatórios ANTES de processar
          if (!data.titulo || data.titulo.trim() === '') {
            errors.push(`Item ${itemNumber}: Título é obrigatório`)
            continue
          }
          
          // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
          const normalizeString = (str: string) => {
            if (!str) return ''
            return String(str)
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
              .replace(/\s+/g, ' ') // Normaliza espaços
          }

          // Função para encontrar ID por nome (com normalização completa e correspondência flexível)
          const findIdByName = (name: string, items: any[], nameField: string = 'nome') => {
            if (!name) return ''
            
            const searchNormalized = normalizeString(String(name))
            
            // Primeiro, tentar correspondência exata (normalizada)
            let foundItem = items.find(item => {
              const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
              return itemNameNormalized === searchNormalized
            })
            
            // Se não encontrou correspondência exata, tentar correspondência parcial
            if (!foundItem) {
              foundItem = items.find(item => {
                const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
                // Verificar se o termo de busca está contido no nome do item
                return itemNameNormalized.includes(searchNormalized) || searchNormalized.includes(itemNameNormalized)
              })
            }
            
            // Se ainda não encontrou, tentar correspondência por palavras-chave
            if (!foundItem) {
              const searchWords = searchNormalized.split(' ').filter(word => word.length > 2)
              if (searchWords.length > 0) {
                foundItem = items.find(item => {
                  const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
                  return searchWords.some(word => itemNameNormalized.includes(word))
                })
              }
            }
            
            return foundItem?.id || ''
          }

          // Mapear dados para o formato de relatório
          // O modelo Report espera strings (nomes), não IDs
          const areaId = findIdByName(data.area || data.areaId, md.areas)
          const clienteId = findIdByName(data.cliente || data.clienteId, md.clientes)
          const contratoId = findIdByName(data.contrato || data.contratoId, md.contratos, 'codigo')
          const analistaId = findIdByName(data.analista || data.analistaId, md.analistas)

          // Converter IDs para nomes (o modelo Report espera strings, não IDs)
          const areaNome = areaId ? (md.areas.find(a => a.id === areaId)?.nome || data.area || data.areaId || '') : (data.area || data.areaId || '')
          const clienteNome = clienteId ? (md.clientes.find(c => c.id === clienteId)?.nome || data.cliente || data.clienteId || '') : (data.cliente || data.clienteId || '')
          const contratoCodigo = contratoId ? (md.contratos.find(c => c.id === contratoId)?.codigo || md.contratos.find(c => c.id === contratoId)?.numero || data.contrato || data.contratoId || '') : (data.contrato || data.contratoId || '')
          const analistaNome = analistaId ? (md.analistas.find(a => a.id === analistaId)?.nome || data.analista || data.analistaId || '') : (data.analista || data.analistaId || '')

          // Validar analista ANTES de criar relatorioData
          const analistaFinal = analistaNome && analistaNome.trim() !== '' ? analistaNome.trim() : (data.analista || data.analistaId || 'N/A')
          if (!analistaFinal || analistaFinal.trim() === '' || analistaFinal === 'N/A') {
            errors.push(`Item ${itemNumber} (${data.titulo || 'sem título'}): Analista é obrigatório e não foi encontrado`)
            continue
          }

          const relatorioData = {
            // Campos obrigatórios
            titulo: data.titulo.trim(), // Já validado acima
            status: normalizeReportStatus(data.status),
            tipo: data.tipo || 'mensal',
            analista: analistaFinal, // Campo obrigatório no modelo Report - já validado
            dataInicio: excelDateToISO(data.dataInicio || data.dataInicial) || new Date().toISOString().split('T')[0],
            dataEntrega: excelDateToISO(data.dataEntrega || data.dataEntregaPrevista) || new Date().toISOString().split('T')[0],
            
            // Campos opcionais
            descricao: data.descricao || '',
            ticket: data.ticket ? String(data.ticket) : `REL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            total: data.total ? String(data.total) : undefined,
            ...(areaNome && areaNome.trim() !== '' && { area: areaNome }),
            ...(clienteNome && clienteNome.trim() !== '' && { cliente: clienteNome }),
            ...(contratoCodigo && contratoCodigo.trim() !== '' && { contrato: contratoCodigo }),
            dataFinalizacao: excelDateToISO(data.dataFinalizacao || data.dataFinal),
            prioridade: data.prioridade || 'media',
            solicitante: data.solicitante || '',
            solicitacao: data.solicitacao || '',
            tipoSolicitacao: data.tipoSolicitacao || '',
            tipoServico: data.tipoServico || '',
            observacoes: data.observacoes || data.observacao || ''
          }

          // Remover campos vazios (mas manter analista e titulo que são obrigatórios)
          Object.keys(relatorioData).forEach(key => {
            if (key !== 'analista' && key !== 'titulo' && (relatorioData[key] === '' || relatorioData[key] === null || relatorioData[key] === undefined)) {
              delete relatorioData[key]
            }
          })

          // Salvar na API (usar /analytics que usa o modelo Report com todos os campos)
          await api.post('/analytics', relatorioData)
          
          totalImported++
          totalSavedToDatabase++

        } catch (error: any) {
          const errorDetails = error?.response?.data || error?.message || JSON.stringify(error)
          errors.push(`Item ${itemNumber} (${item.isCorrected ? item.correctedData?.titulo : item.data?.titulo || 'sem título'}): ${errorDetails}`)
        }
      }

      // Atualizar store local
      if (totalSavedToDatabase > 0) {
        await reportStore.syncFromApi()
      }

      const totalFromResult = result.valid.length
      const successMessage = `${totalImported} de ${totalFromResult} relatórios processados, ${totalSavedToDatabase} salvos no banco de dados`

      // Mostrar notificação de sucesso
      if (totalSavedToDatabase > 0) {
        alert(`✅ ${successMessage}`)
      }

      if (errors.length > 0) {
        alert(`⚠️ Alguns erros ocorreram:\n${errors.join('\n')}`)
      }

      // Se não houve sucessos, mostrar mensagem informativa
      if (totalSavedToDatabase === 0 && totalFromResult > 0) {
        alert(`⚠️ Nenhum relatório foi salvo. Verifique os logs do console para mais detalhes.`)
      }

    } catch (error) {
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
    logDev('🔍 DEBUG Analytics - Item:', r.id, {
      dataInicio: r.dataInicio,
      dataFinalizacao: r.dataFinalizacao,
      dataEntrega: r.dataEntrega,
      dataCriacao: r.dataCriacao
    })
    
    return {
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      ticket: r.ticket || '-',
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
      // Manter o valor original da data (ISO string) para ordenação correta
      // A formatação será feita pelo valueFormatter da coluna
      dataAtualizacao: r.dataAtualizacao || '',
    }
  })
  
  // Ordenar os dados por dataAtualizacao (mais recente primeiro) antes de passar para o DataGrid
  const sortedRows = [...rows].sort((a, b) => {
    const dateA = a.dataAtualizacao ? new Date(a.dataAtualizacao).getTime() : 0
    const dateB = b.dataAtualizacao ? new Date(b.dataAtualizacao).getTime() : 0
    return dateB - dateA // Ordem decrescente (mais recente primeiro)
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
                    borderColor: '#DA3832',
                    color: '#DA3832',
                    '&:hover': {
                      borderColor: '#DA3832',
                      backgroundColor: '#fef2f2',
                      color: '#DA3832'
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
                    background: 'linear-gradient(135deg, #050032 0%, #002561 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px 0 rgba(5, 0, 50, 0.3)'
                    }
                  }}
                >
                  Importador Inteligente
                </Button>
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
          rows={sortedRows}
          disableRowSelectionOnClick
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setSelectedIds(newSelection as string[])
          }}
          rowSelectionModel={selectedIds}
          onRowDoubleClick={(p) => navigate(`/analytics/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ 
            toolbar: { 
              showQuickFilter: true, 
              quickFilterProps: { debounceMs: 300 },
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true }
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
            disabled={isDeleting || selectedIds.length === 0}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Exportação - filtros de data e analista dentro do modal (como Validação/Reajuste) */}
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
        data={finalFilteredItems.map(r => {
          const isUuid = (v: string | undefined) => v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
          const orNa = (v: string | undefined) => (!v || isUuid(v)) ? 'N/A' : v

          const findByName = (value: string | undefined, arr: { id: string; nome: string }[]) => {
            if (!value) return null
            const n = (s: string) => String(s).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
            const nv = n(value)
            return arr.find(a => n(a.nome) === nv) ?? null
          }
          const findContratoByCodigo = (value: string | undefined, arr: any[]) => {
            if (!value) return null
            const n = (s: string) => String(s).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
            const nv = n(value)
            return arr.find((c: any) => n(c.codigo || '') === nv || n(c.numero || '') === nv) ?? null
          }

          let analistaNome = ''
          if (r.analista) {
            if (isUuid(r.analista)) analistaNome = md.analistas.find(a => a.id === r.analista)?.nome ?? ''
            else analistaNome = findByName(r.analista, md.analistas)?.nome ?? r.analista
          }
          let areaNome = ''
          if (r.area) {
            if (isUuid(r.area)) areaNome = md.areas.find(ar => ar.id === r.area)?.nome ?? ''
            else areaNome = findByName(r.area, md.areas)?.nome ?? r.area
          }
          let clienteNome = ''
          if (r.cliente) {
            if (isUuid(r.cliente)) clienteNome = md.clientes.find(c => c.id === r.cliente)?.nome ?? ''
            else clienteNome = findByName(r.cliente, md.clientes)?.nome ?? r.cliente
          }
          let contratoLabel = ''
          if (r.contrato) {
            if (isUuid(r.contrato)) {
              const c = md.contratos.find(x => x.id === r.contrato)
              contratoLabel = (c as any)?.codigo ?? (c as any)?.numero ?? ''
            } else {
              const found = findContratoByCodigo(r.contrato, md.contratos)
              contratoLabel = (found as any)?.codigo ?? (found as any)?.numero ?? r.contrato
            }
          }

          const analistaId = isUuid(r.analista) ? r.analista : (findByName(r.analista, md.analistas)?.id ?? '')
          const dataInicioRaw = r.dataInicio ?? r.dataCriacao ?? ''
          const dataFinalRaw = r.dataFinalizacao ?? r.dataEntrega ?? r.dataInicio ?? r.dataCriacao ?? ''

          // Resolver solicitante, solicitacao, tipoSolicitacao (IDs → nomes)
          let solicitanteLabel = r.solicitante ?? ''
          if (solicitanteLabel && isUuid(solicitanteLabel)) {
            solicitanteLabel = md.solicitantes.find(s => s.id === solicitanteLabel)?.nome ?? solicitanteLabel
          }
          let solicitacaoLabel = r.solicitacao ?? ''
          if (solicitacaoLabel && isUuid(solicitacaoLabel)) {
            solicitacaoLabel = md.modelos.find(m => m.id === solicitacaoLabel)?.nome ?? solicitacaoLabel
          }
          let tipoSolicitacaoLabel = r.tipoSolicitacao ?? ''
          if (tipoSolicitacaoLabel && isUuid(tipoSolicitacaoLabel)) {
            tipoSolicitacaoLabel = md.relatorios.find(rel => rel.id === tipoSolicitacaoLabel)?.nome ?? tipoSolicitacaoLabel
          }

          return {
            ...r,
            analista: orNa(analistaNome),
            area: orNa(areaNome),
            cliente: orNa(clienteNome),
            contrato: orNa(contratoLabel),
            solicitante: orNa(solicitanteLabel),
            solicitacao: orNa(solicitacaoLabel),
            tipoSolicitacao: orNa(tipoSolicitacaoLabel),
            descricao: r.descricao ?? '',
            total: r.total ?? '',
            tipoServico: r.tipoServico ?? '',
            observacoes: r.observacoes ?? '',
            dataEntrega: r.dataEntrega ? new Date(r.dataEntrega).toLocaleString('pt-BR') : '',
            dataCriacao: r.dataInicio ? new Date(r.dataInicio).toLocaleString('pt-BR') : '',
            dataFinalizacao: r.dataFinalizacao ? new Date(r.dataFinalizacao).toLocaleString('pt-BR') : '',
            dataAtualizacao: r.dataAtualizacao ? new Date(r.dataAtualizacao).toLocaleString('pt-BR') : '',
            _dataInicioRaw: dataInicioRaw,
            _dataFinalRaw: dataFinalRaw,
            _analistaId: analistaId
          }
        })}
        moduleName="analytics"
        moduleTitle="Analytics"
        appliedFilters={{
          'Meus Relatórios': showOnlyMyReports ? 'Sim' : 'Não',
          'Total na lista': finalFilteredItems.length
        }}
        columns={[
          { key: 'titulo', label: 'Título' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'ticket', label: 'Ticket' },
          { key: 'total', label: 'Total' },
          { key: 'status', label: 'Status' },
          { key: 'prioridade', label: 'Prioridade' },
          { key: 'analista', label: 'Analista' },
          { key: 'area', label: 'Área' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'dataEntrega', label: 'Data de Entrega' },
          { key: 'dataCriacao', label: 'Data de Início' },
          { key: 'dataFinalizacao', label: 'Data de Finalização' },
          { key: 'dataAtualizacao', label: 'Atualizado em' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'solicitacao', label: 'Solicitação' },
          { key: 'tipoSolicitacao', label: 'Tipo de Solicitação' },
          { key: 'tipoServico', label: 'Tipo de Serviço' },
          { key: 'observacoes', label: 'Observações' }
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
  logDev('🔍 Analytics ActionCell Debug:', {
    reportId: id,
    reportUserId: report?.userId,
    currentUserId: user?.id,
    userRole: user?.role,
    canDelete,
    report: report
  })

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const r = store.items.find((x) => x.id === id)
      if (!r) return
      const from = r.status
      const next = { ...r, status: newStatus as any, dataAtualizacao: new Date().toISOString() }
      await store.upsert(next)
      store.log({ reportId: id, type: 'status_change', field: 'status', from, to: newStatus })
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
      // 🐛 CORREÇÃO: Sincronizar após exclusão para atualizar a lista
      await store.syncFromApi()
    } catch (error) {
      console.error('Erro ao excluir relatório:', error)
      alert('Erro ao excluir relatório. Verifique o console para mais detalhes.')
    }
  }

  const doDuplicate = async () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    const { id: _omit, dataCriacao: _c, dataAtualizacao: _u, ...rest } = r
    const duplicated = await store.add({ ...rest, status: 'Pendente' })
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
            {['pendente','emandamento','transfanalista','concluido','entregue','cancelado'].map(s => (
              <MenuItem key={s} value={s}>
                {s === 'pendente' ? 'Pendente' : 
                 s === 'emandamento' ? 'Em Andamento' : 
                 s === 'transfanalista' ? 'Transf. Analista' :
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