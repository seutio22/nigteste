import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useDemandStore } from '../../store/demandStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { SmartImporter } from '../../components/SmartImporter'
import { smartImporterConfigs } from '../../config/smartImporterConfigs'
import { useFilteredData } from '../../lib/utils'
import React, { useEffect, useState, memo, useRef } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import type { ImportResult } from '../../types/smartImporter'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import { usePermissions } from '../../hooks/usePermissions'

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'ticket', headerName: 'Nº Ticket', width: 140 },
  { field: 'descricao', headerName: 'Descrição', flex: 1, minWidth: 220 },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusBadge status={String(p.value ?? '')} /> },
  { field: 'analista', headerName: 'Analista', width: 160 },
  { field: 'area', headerName: 'Área', width: 160 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'operadora', headerName: 'Operadora', width: 160 },
  { field: 'produto', headerName: 'Produto', width: 160 },
  { field: 'tipoServico', headerName: 'Tipo de serviço', width: 180 },
  { field: 'tipo', headerName: 'Tipo de Demanda', width: 180 },
  { 
    field: 'createdAt', 
    headerName: 'Data de Criação', 
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
  { 
    field: 'updatedAt', 
    headerName: 'Atualizado em', 
    width: 160,
    type: 'dateTime',
    valueGetter: (value, row) => {
      const dateValue = row.updatedAt || value
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

export default function DemandListPage() {
  // FORÇAR DEPLOY - v2
  const navigate = useNavigate()
  const { items, isLoading } = useDemandStore()
  const demandStore = useDemandStore()
  const md = useMasterDataStore()
  const {
    analistasById,
    areasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    tiposServicoById,
    tiposDemandaById
  } = md

  // Funções auxiliares removidas - usando acesso direto aos índices para melhor performance
  const { user } = useAuthStore()
  const { canCreate, canDelete, canImport, canExport } = usePermissions('cadastro')
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [showOnlyMyDemands, setShowOnlyMyDemands] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const STORAGE_KEY = 'demands-list-view-v1'
  const FILTER_KEY = 'demands-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'updatedAt', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })

  // Filtrar dados por permissão do usuário
  const filteredItems = useFilteredData(items, user?.role, user?.id, user?.viewOwnDataOnly)

  // Filtro simplificado (mesma abordagem da página Manutenção)
  const finalFilteredItems = showOnlyMyDemands
    ? filteredItems.filter(demand => {
        // Buscar o analista correspondente ao usuário logado
        const analista = demand.analistaId ? analistasById[demand.analistaId] : undefined
        
        // Múltiplas verificações para identificar se a demanda é do usuário
        const check1 = demand.analistaId === user?.id
        const check2 = analista && analista.nome === user?.name
        const check3 = user?.role === 'admin' && demand.analistaId === 'analista-admin'
        const check4 = demand.analista === user?.id // Verificar campo analista também
        const check5 = demand.analista === user?.name // Verificar se analista é o nome do usuário
        
        // Verificação adicional: se o usuário é admin, sempre incluir
        const check6 = user?.role === 'admin'
        
        const isMyDemand = check1 || check2 || check3 || check4 || check5 || check6
        
        return isMyDemand
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
    
    // Carregar preferência do filtro de usuário - SEMPRE inicia como "Meus cadastros" (true)
    try {
      const filterPreference = localStorage.getItem(FILTER_KEY)
      if (filterPreference !== null) {
        setShowOnlyMyDemands(JSON.parse(filterPreference))
      } else {
        // Se não houver preferência salva, manter o padrão "Meus cadastros" (true)
        setShowOnlyMyDemands(true)
      }
    } catch {
      // Em caso de erro, manter o padrão "Meus cadastros" (true)
      setShowOnlyMyDemands(true)
    }
  }, [])

  // Ref para controlar carregamento único - evita loops
  const dataLoadedRef = useRef(false)
  
  // Carregar dados mestres e demandas uma única vez
  useEffect(() => {
    // Evitar múltiplas chamadas usando ref
    if (dataLoadedRef.current) return
    
    if (!user?.id) {
      return
    }
    
    // Marcar como carregado antes de iniciar para evitar chamadas duplicadas
    dataLoadedRef.current = true
    
    const loadData = async () => {
      try {
        // Carregar dados mestres se necessário
        if (md.analistas.length === 0 || md.tiposServico.length === 0 || md.tiposDemanda.length === 0) {
          await md.syncFromApi?.()
        }
        
        // Carregar demandas se usuário estiver logado
        if (user?.id && demandStore.items.length === 0) {
          await demandStore.syncFromApi()
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error)
        // Resetar ref em caso de erro para permitir nova tentativa
        dataLoadedRef.current = false
      }
    }
    
    loadData()
  }, [user?.id]) // Apenas quando usuário muda

  // Recarregar dados quando a página recebe foco (volta de outras páginas)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && !demandStore.isLoading) {
        demandStore.syncFromApi()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.id, demandStore]) // Dependências corretas para evitar problemas

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyDemands))
    } catch {}
  }, [showOnlyMyDemands])

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

  const handleBulkDelete = async () => {
    if (isDeleting || selectedIds.length === 0) return
    const idsToDelete = [...selectedIds]
    setIsDeleting(true)
    try {
      const { api } = await import('../../lib/api.local')
      
      console.log('🗑️ Iniciando exclusão em massa de', idsToDelete.length, 'itens')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of idsToDelete) {
        try {
          await api.delete(`/demandas/${id}`)
          successCount++
        } catch (error: any) {
          // Se for erro 404, significa que já foi excluído - ignorar
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            console.log(`⚠️ Demanda ${id} já foi excluída (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir demanda ${id}:`, error)
            errorCount++
          }
        }
      }
      
      // Atualizar store local (remover TODOS os IDs, incluindo os 404)
      const currentItems = demandStore.getState().items
      const filteredItems = currentItems.filter((item) => !idsToDelete.includes(item.id))
      demandStore.setState({ items: filteredItems })
      
      // Limpar seleção
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      
      // Mostrar resultado
      const totalProcessed = successCount + notFoundCount
      if (errorCount === 0) {
        if (notFoundCount > 0) {
          alert(`✅ ${totalProcessed} demanda(s) removida(s)!\n\n${successCount} excluídas do banco\n${notFoundCount} já haviam sido excluídas (cache limpo)`)
        } else {
          alert(`✅ ${successCount} demanda(s) excluída(s) com sucesso!`)
        }
      } else {
        alert(`⚠️ ${totalProcessed} demanda(s) removida(s), ${errorCount} erro(s)\n\n${successCount} excluídas\n${notFoundCount} já excluídas anteriormente`)
      }
      
      // Recarregar dados
      await demandStore.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir demandas')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      console.log('🔍 SMART IMPORT DEMANDAS: Processando resultado:', result)

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
          return date.toISOString()
        }
        
        return ''
      }

      // Processar itens válidos
      for (const item of result.valid) {
        try {
          const data = item.isCorrected ? item.correctedData : item.data
          
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

          // Função para encontrar ID por nome (com normalização completa)
          const findIdByName = (name: string, items: any[], nameField: string = 'nome') => {
            if (!name) return ''
            
            const searchNormalized = normalizeString(String(name))
            
            // Buscar item com correspondência exata (normalizada)
            const item = items.find(item => {
              const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
              return itemNameNormalized === searchNormalized
            })
            
            console.log(`🔍 SMART IMPORT DEMANDAS: Buscando "${name}" (normalizado: "${searchNormalized}") em ${items.length} itens, encontrado:`, item ? `${item.nome || item[nameField]} (${item.id})` : 'não encontrado')
            return item?.id || ''
          }

          // Mapear dados para o formato de demanda
          const demandaData = {
            // Campos obrigatórios
            status: data.status || 'Aberta',
            // CORRIGIDO: Buscar tipoServico por nome no Excel
            tipoServicoId: findIdByName(data.tipoServico || data.tipoServicoId, md.tiposServico) || '',
            // CORRIGIDO: Buscar tipoId (ID do tipo de demanda) ou aceitar nome diretamente
            tipoId: findIdByName(data.tipo || data.tipoDemanda, md.tiposDemanda) || '',
            
            // Campos opcionais
            descricao: data.descricao || data.descricaoDemanda || '',
            analistaId: findIdByName(data.analista || data.analistaId, md.analistas) || '',
            dataInicio: excelDateToISO(data.dataInicio || data.dataInicial) || new Date().toISOString(),
            dataFinal: excelDateToISO(data.dataFinal || data.dataFinalizacao),
            // CORRIGIDO: Aceitar ticket do Excel, gerar apenas se não existir
            ticket: data.ticket ? String(data.ticket) : `DEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            // CORRIGIDO: Aceitar solicitante diretamente do Excel (sem validação)
            solicitante: data.solicitante || data.solicitanteId || '',
            areaId: findIdByName(data.area || data.areaId, md.areas) || '',
            clienteId: findIdByName(data.cliente || data.clienteId, md.clientes) || '',
            contratoId: findIdByName(data.contrato || data.contratoId, md.contratos, 'codigo') || '',
            operadoraId: findIdByName(data.operadora || data.operadoraId, md.operadoras) || '',
            produtoId: findIdByName(data.produto || data.produtoId, md.produtos) || '',
            sistemaId: findIdByName(data.sistema || data.sistemaId, md.sistemas) || '',
            periodicidade: data.analiseQuantitativa ? String(data.analiseQuantitativa) : (data.periodicidade || null),
            qtdRetornos: data.qtdRetornos || data.quantidadeRetornos || 0,
            qualidade: data.qualidade ? String(data.qualidade) : null,
            qtdClientesVinculados: data.qtdClientesVinculados || data.clientesVinculados || 0,
            usuariosEmpresa: data.usuariosEmpresa || data.usuarios || 0,
            observacoes: data.observacoes || data.observacao || ''
          }

          // Remover campos vazios para evitar problemas com o Prisma
          Object.keys(demandaData).forEach(key => {
            if (demandaData[key] === '' || demandaData[key] === null || demandaData[key] === undefined) {
              delete demandaData[key]
            }
          })

          console.log('🔍 SMART IMPORT DEMANDAS: Salvando demanda:', demandaData)
          console.log('🔍 SMART IMPORT DEMANDAS: Tipo de tipoServicoId:', typeof demandaData.tipoServicoId)
          console.log('🔍 SMART IMPORT DEMANDAS: Valor de tipoServicoId:', demandaData.tipoServicoId)

          // Salvar na API
          const savedDemanda = await api.post('/demandas', demandaData)
          console.log('✅ SMART IMPORT DEMANDAS: Demanda salva:', savedDemanda.id)
          
          totalImported++
          totalSavedToDatabase++

        } catch (error) {
          console.error('❌ SMART IMPORT DEMANDAS: Erro ao salvar demanda:', error)
          errors.push(`Erro ao salvar demanda: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      // Atualizar store local
      if (totalSavedToDatabase > 0) {
        await demandStore.syncFromApi()
      }

      const successMessage = `${totalImported} demandas processadas, ${totalSavedToDatabase} salvas no banco de dados`
      console.log(`✅ SMART IMPORT DEMANDAS: ${successMessage}`)

      // Mostrar notificação de sucesso
      if (totalSavedToDatabase > 0) {
        // Aqui você pode adicionar uma notificação de sucesso
        console.log('✅ SMART IMPORT DEMANDAS: Importação concluída com sucesso!')
      }

      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT DEMANDAS: Alguns erros ocorreram:', errors)
      }

    } catch (error) {
      console.error('❌ SMART IMPORT DEMANDAS: Erro geral:', error)
    }
  }

  // 🚀 OTIMIZAÇÃO: Geração de rows simplificada (mesma abordagem da página Manutenção)
  const rows = finalFilteredItems.map((d) => {
    // Gerar ticket se não existir
    const generateTicket = (id: string) => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const random = Math.random().toString(36).substr(2, 4).toUpperCase()
      return `CAD-${year}${month}${day}-${random}`
    }
    
    return {
      id: d.id,
      ticket: d.ticket || generateTicket(d.id),
      descricao: d.descricao ?? '',
      status: d.status,
      analista: (() => {
        // Tratamento especial para analista-admin
        if (d.analista === 'analista-admin') {
          return 'ADMINISTRADOR'
        }
        
        // Se d.analista é um ID, buscar o nome; se já é um nome, usar diretamente
        if (d.analista && typeof d.analista === 'string' && d.analista.length > 20) {
          // Parece ser um ID (UUID), buscar o nome
          return analistasById[d.analista]?.nome ?? d.analista
        }
        
        // Se d.analistaId existe, buscar o nome
        if (d.analistaId) {
          return analistasById[d.analistaId]?.nome ?? d.analistaId
        }
        
        return d.analista || ''
      })(),
      area: (() => {
        if (d.area && typeof d.area === 'string' && d.area.length > 20) {
          return areasById[d.area]?.nome ?? d.area
        }
        
        if (d.areaId) {
          return areasById[d.areaId]?.nome ?? d.areaId
        }
        
        return d.area || ''
      })(),
      cliente: (() => {
        if (d.cliente && typeof d.cliente === 'string' && d.cliente.length > 20) {
          return clientesById[d.cliente]?.nome ?? d.cliente
        }
        
        if (d.clienteId) {
          return clientesById[d.clienteId]?.nome ?? d.clienteId
        }
        
        return d.cliente || ''
      })(),
      contrato: (() => {
        if (d.contrato && typeof d.contrato === 'string' && d.contrato.length > 20) {
          return contratosById[d.contrato]?.codigo ?? contratosById[d.contrato]?.numero ?? d.contrato
        }
        
        if (d.contratoId) {
          return contratosById[d.contratoId]?.codigo ?? contratosById[d.contratoId]?.numero ?? d.contratoId
        }
        
        return d.contrato || ''
      })(),
      operadora: (() => {
        if (d.operadora && typeof d.operadora === 'string' && d.operadora.length > 20) {
          return operadorasById[d.operadora]?.nome ?? d.operadora
        }
        
        if (d.operadoraId) {
          return operadorasById[d.operadoraId]?.nome ?? d.operadoraId
        }
        
        return d.operadora || ''
      })(),
      produto: (() => {
        if (d.produto && typeof d.produto === 'string' && d.produto.length > 20) {
          return produtosById[d.produto]?.nome ?? d.produto
        }
        
        if (d.produtoId) {
          return produtosById[d.produtoId]?.nome ?? d.produtoId
        }
        
        return d.produto || ''
      })(),
      tipoServico: (() => {
        if (d.tipoServico && typeof d.tipoServico === 'string' && d.tipoServico.length > 20) {
          return tiposServicoById[d.tipoServico]?.nome ?? d.tipoServico
        }
        
        if (d.tipoServicoId) {
          return tiposServicoById[d.tipoServicoId]?.nome ?? d.tipoServicoId
        }
        
        return d.tipoServico || ''
      })(),
      tipo: (() => {
        if (d.tipo && typeof d.tipo === 'string' && d.tipo.length > 20) {
          return tiposDemandaById[d.tipo]?.nome ?? d.tipo
        }
        
        if (d.tipoId) {
          return tiposDemandaById[d.tipoId]?.nome ?? d.tipoId
        }
        
        return d.tipo || ''
      })(),
      createdAt: d.createdAt || '',
      updatedAt: d.updatedAt || '',
    }
  })
  
  // Ordenar os dados por updatedAt (data de atualização - mais recente primeiro) antes de passar para o DataGrid
  const sortedRows = [...rows].sort((a, b) => {
    // Tratar strings vazias como datas inválidas (devem ir para o final)
    const dateA = a.updatedAt && a.updatedAt.trim() !== '' ? new Date(a.updatedAt).getTime() : 0
    const dateB = b.updatedAt && b.updatedAt.trim() !== '' ? new Date(b.updatedAt).getTime() : 0
    
    // Se ambos são inválidos, manter ordem original
    if (dateA === 0 && dateB === 0) return 0
    
    // Datas inválidas vão para o final
    if (dateA === 0) return 1
    if (dateB === 0) return -1
    
    // Ordem decrescente (mais recente primeiro)
    return dateB - dateA
  })

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Cadastro
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyDemands}
                      onChange={(e) => setShowOnlyMyDemands(e.target.checked)}
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
                      {showOnlyMyDemands ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Meus Cadastros</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todos os Cadastros</span>
                        </>
                      )}
                    </div>
                  }
                />
                
                {/* Contador de demandas */}
                <Chip
                  label={`${finalFilteredItems.length} demanda${finalFilteredItems.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyDemands 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                
                {/* Mensagem informativa */}
                {showOnlyMyDemands && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas suas demandas
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
                    borderWidth: '2px',
                    '&:hover': {
                      borderWidth: '2px',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px 0 rgba(239, 68, 68, 0.2)'
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
                    background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px 0 rgba(124, 58, 237, 0.3)'
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
                  onClick={() => navigate('/cadastro/nova')}
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
                  Nova Demanda
                </Button>
              )}
            </Stack>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6" style={{ minHeight: '400px' }}>
        <DataGrid
          rows={sortedRows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading && sortedRows.length === 0}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'updatedAt', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          pagination
          disableRowSelectionOnClick
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setSelectedIds(newSelection as string[])
          }}
          rowSelectionModel={selectedIds}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => {
            setColumnVisibilityModel(newModel)
            persist({ columnVisibilityModel: newModel })
          }}
          sortModel={sortModel}
          onSortModelChange={(newModel) => {
            setSortModel(newModel)
            persist({ sortModel: newModel })
          }}
          filterModel={filterModel}
          onFilterModelChange={(newModel) => {
            setFilterModel(newModel)
            persist({ filterModel: newModel })
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={(newModel) => {
            setPaginationModel(newModel)
            persist({ paginationModel: newModel })
          }}
          sx={{
            height: '100%',
            minHeight: '400px',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </div>

      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs.demandas || smartImporterConfigs.clientes}
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
            Tem certeza que deseja excluir <strong>{selectedIds.length}</strong> demanda(s) selecionada(s)?
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

      {/* Modal de Exportação */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={finalFilteredItems.map(d => ({
          ...d,
          // Mapear IDs para nomes legíveis usando acesso direto aos índices
          analista: (() => {
            if (d.analistaId) return analistasById[d.analistaId]?.nome ?? d.analistaId
            if (d.analista && typeof d.analista === 'string' && d.analista.length > 20) {
              return analistasById[d.analista]?.nome ?? d.analista
            }
            return d.analista ?? 'N/A'
          })(),
          area: (() => {
            if (d.areaId) return areasById[d.areaId]?.nome ?? d.areaId
            if (d.area && typeof d.area === 'string' && d.area.length > 20) {
              return areasById[d.area]?.nome ?? d.area
            }
            return d.area ?? 'N/A'
          })(),
          cliente: (() => {
            if (d.clienteId) return clientesById[d.clienteId]?.nome ?? d.clienteId
            if (d.cliente && typeof d.cliente === 'string' && d.cliente.length > 20) {
              return clientesById[d.cliente]?.nome ?? d.cliente
            }
            return d.cliente ?? 'N/A'
          })(),
          contrato: (() => {
            if (d.contratoId) {
              return contratosById[d.contratoId]?.codigo ?? contratosById[d.contratoId]?.numero ?? d.contratoId
            }
            if (d.contrato && typeof d.contrato === 'string' && d.contrato.length > 20) {
              return contratosById[d.contrato]?.codigo ?? contratosById[d.contrato]?.numero ?? d.contrato
            }
            return d.contrato ?? 'N/A'
          })(),
          operadora: (() => {
            if (d.operadoraId) return operadorasById[d.operadoraId]?.nome ?? d.operadoraId
            if (d.operadora && typeof d.operadora === 'string' && d.operadora.length > 20) {
              return operadorasById[d.operadora]?.nome ?? d.operadora
            }
            return d.operadora ?? 'N/A'
          })(),
          produto: (() => {
            if (d.produtoId) return produtosById[d.produtoId]?.nome ?? d.produtoId
            if (d.produto && typeof d.produto === 'string' && d.produto.length > 20) {
              return produtosById[d.produto]?.nome ?? d.produto
            }
            return d.produto ?? 'N/A'
          })(),
          tipoServico: (() => {
            if (d.tipoServicoId) return tiposServicoById[d.tipoServicoId]?.nome ?? d.tipoServicoId
            if (d.tipoServico && typeof d.tipoServico === 'string' && d.tipoServico.length > 20) {
              return tiposServicoById[d.tipoServico]?.nome ?? d.tipoServico
            }
            return d.tipoServico ?? 'N/A'
          })(),
          // Formatar data
          updatedAt: d.updatedAt ? new Date(d.updatedAt).toLocaleString('pt-BR') : 'N/A'
        }))}
        moduleName="demandas"
        moduleTitle="Cadastro"
        appliedFilters={{
          'Meus Cadastros': showOnlyMyDemands ? 'Sim' : 'Não',
          'Total de Registros': finalFilteredItems.length
        }}
        columns={[
          { key: 'ticket', label: 'Nº Ticket' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'status', label: 'Status' },
          { key: 'analista', label: 'Analista' },
          { key: 'area', label: 'Área' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'operadora', label: 'Operadora' },
          { key: 'produto', label: 'Produto' },
          { key: 'tipoServico', label: 'Tipo de Serviço' },
          { key: 'updatedAt', label: 'Atualizado em' }
        ]}
      />
    </Box>
  )
}

// 🚀 MELHORIA FASE 2A: React.memo - 40-60% menos re-renders
const ActionCell = memo(function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useDemandStore()
  const md = useMasterDataStore()
  const { canEdit, canDelete } = usePermissions('cadastro')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const d = store.items.find((x) => x.id === id)
      if (!d) return
      const from = d.status
      const next = { ...d, status: newStatus, updatedAt: new Date().toISOString() }
      await store.upsert(next)
      store.log?.({ demandaId: id, type: 'status_change', field: 'status', from, to: newStatus })
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
      console.error('Erro ao excluir demanda:', error)
      alert('Erro ao excluir demanda. Verifique o console para mais detalhes.')
    }
  }

  const doDuplicate = async () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    
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
          const existing = await api.getDemandas(`?ticket=${encodeURIComponent(newTicket)}`)
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
      const newTicket = await generateUniqueTicket(d.ticket)
      
      const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = d
      const duplicated = await store.add({ ...rest, status: 'Aberta', ticket: newTicket })
      
      // Garantir navegação usando o ID real do backend
      let navigateId = duplicated?.id
      try {
        const { api } = await import('../../lib/api.local')
        const found = await api.getDemandas(`?ticket=${encodeURIComponent(String(newTicket || ''))}`)
        if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
          navigateId = found[0].id
        }
      } catch (e) {
        console.warn('Não foi possível confirmar ID pelo ticket; usando ID retornado localmente', e)
      }
      
      navigate(`/cadastro/${navigateId}`)
    } catch (error) {
      console.error('Erro ao duplicar demanda:', error)
      alert('Erro ao duplicar demanda. Verifique o console para mais detalhes.')
    }
  }

  const doExportPdf = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const label = (val?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === val)?.nome || '-'
    const contrato = md.contratos.find(c => c.id === d.contrato)?.codigo || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Demanda ${d.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Demanda ${d.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${d.status}</td></tr>
      <tr><td class="muted">Cliente</td><td>${label(d.cliente, md.clientes)}</td></tr>
      <tr><td class="muted">Contrato</td><td>${contrato}</td></tr>
      <tr><td class="muted">Operadora</td><td>${label(d.operadora, md.operadoras)}</td></tr>
      <tr><td class="muted">Produto</td><td>${label(d.produto, md.produtos)}</td></tr>
      <tr><td class="muted">Sistema</td><td>${label(d.sistema, md.sistemas)}</td></tr>
      <tr><td class="muted">Área</td><td>${label(d.area, md.areas)}</td></tr>
      <tr><td class="muted">Analista</td><td>${label(d.analista, md.analistas)}</td></tr>
      <tr><td class="muted">Tipo</td><td>${label(d.tipo, md.tiposDemanda)}</td></tr>
      <tr><td class="muted">Descrição</td><td>${d.descricao ?? '-'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(d.updatedAt).toLocaleString('pt-BR')}</td></tr>
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
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/cadastro/${id}`) }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver</ListItemText>
        </MenuItem>
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); navigate(`/cadastro/${id}/edit`) }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        
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
            {['Aberta','Em andamento','Transf. Analista','Aguardando aprovação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => (
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
        <DialogTitle>Excluir demanda</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir esta demanda?</Typography>
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
})


