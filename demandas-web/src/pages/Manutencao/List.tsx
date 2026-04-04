import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip, CircularProgress } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { SmartImporter } from '../../components/SmartImporter'
import { smartImporterConfigs } from '../../config/smartImporterConfigs'
import type { ImportResult } from '../../types/smartImporter'
import { useFilteredData } from '../../lib/utils'
import { useEffect, useState, memo, useMemo, useRef } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import { usePermissions } from '../../hooks/usePermissions'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import TableChartIcon from '@mui/icons-material/TableChart'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

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
  { field: 'tipo', headerName: 'Tipo de Manutenção', width: 180 },
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

export default function ManutencaoListPage() {
  // v0.6.0 - CORREÇÃO: Regex duplicação ticket aceita apenas sufixos de 1-3 dígitos
  const navigate = useNavigate()
  const { items } = useManutencaoStore()
  const manutencaoStore = useManutencaoStore()
  const md = useMasterDataStore()
  const {
    analistasById,
    areasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    sistemasById
  } = md
  const { user } = useAuthStore()
  const { canCreate, canImport, canExport, canDelete } = usePermissions('manutencao')
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [showOnlyMyManutencoes, setShowOnlyMyManutencoes] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const lastFocusSyncRef = useRef(0)
  const focusSyncCooldownMs = 2 * 60 * 1000
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }

  const STORAGE_KEY = 'manutencoes-list-view-v1'
  const FILTER_KEY = 'manutencoes-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'updatedAt', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })


  // Filtrar dados por permissão do usuário
  const filteredItems = useFilteredData(items, user?.role, user?.id, user?.viewOwnDataOnly)
  
  const finalFilteredItems = useMemo(() => {
    if (!showOnlyMyManutencoes) return filteredItems
    return filteredItems.filter(manutencao => {
      // Buscar o analista correspondente ao usuário logado
      const analista = manutencao.analistaId ? analistasById[manutencao.analistaId] : undefined
      
      // Múltiplas verificações para identificar se a manutenção é do usuário
      const check1 = manutencao.analistaId === user?.id
      const check2 = analista && analista.nome === user?.name
      const check3 = user?.role === 'admin' && manutencao.analistaId === 'analista-admin'
      const check4 = manutencao.analista === user?.id // Verificar campo analista também
      const check5 = manutencao.analista === user?.name // Verificar se analista é o nome do usuário
      
      // Verificação adicional: se o usuário é admin, sempre incluir
      const check6 = user?.role === 'admin'
      
      const isMyManutencao = check1 || check2 || check3 || check4 || check5 || check6
      
      return isMyManutencao
    })
  }, [showOnlyMyManutencoes, filteredItems, analistasById, user?.id, user?.name, user?.role])

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
    
    // Carregar preferência do filtro de usuário - SEMPRE inicia como "Minhas manutenções" (true)
    try {
      const filterPreference = localStorage.getItem(FILTER_KEY)
      if (filterPreference !== null) {
        setShowOnlyMyManutencoes(JSON.parse(filterPreference))
      } else {
        // Se não houver preferência salva, manter o padrão "Minhas manutenções" (true)
        setShowOnlyMyManutencoes(true)
      }
    } catch {
      // Em caso de erro, manter o padrão "Minhas manutenções" (true)
      setShowOnlyMyManutencoes(true)
    }
  }, [])

  // Carregar dados mestres e manutenções uma única vez
  useEffect(() => {
    const loadData = async () => {
      // Carregar dados mestres se necessário
      if (md.analistas.length === 0 || md.tiposCadastro.length === 0 || md.padrao.length === 0) {
        await md.syncFromApi?.()
      }
      
      // Carregar manutenções se usuário estiver logado
      if (user?.id) {
        await manutencaoStore.syncFromApi()
      }
    }
    
    loadData()
  }, [user?.id]) // Apenas quando usuário muda

  // Recarregar dados quando a página recebe foco (volta de outras páginas)
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now()
      if (now - lastFocusSyncRef.current < focusSyncCooldownMs) return
      if (user?.id) {
        lastFocusSyncRef.current = now
        manutencaoStore.syncFromApi()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.id]) // Incluir dependência do usuário

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyManutencoes))
    } catch {}
  }, [showOnlyMyManutencoes])

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    if (isDeleting || selectedIds.length === 0) return
    
    setIsDeleting(true)
    try {
      const { api } = await import('../../lib/api.local')
      
      logDev('🗑️ Iniciando exclusão em massa de', selectedIds.length, 'manutenções')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of selectedIds) {
        try {
          await api.delete(`/manutencoes/${id}`)
          successCount++
        } catch (error: any) {
          // Se for erro 404, significa que já foi excluído - ignorar
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            logDev(`⚠️ Manutenção ${id} já foi excluída (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir manutenção ${id}:`, error)
            errorCount++
          }
        }
      }
      
      // Atualizar store local (remover TODOS os IDs, incluindo os 404)
      // Remover todos os IDs selecionados do estado local de uma vez
      // Usar o método interno do store para atualizar o estado
      const currentItems = useManutencaoStore.getState().items
      const filteredItems = currentItems.filter((item) => !selectedIds.includes(item.id))
      // Atualizar o estado do store diretamente
      useManutencaoStore.setState({ items: filteredItems })
      
      // Limpar seleção
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      
      // Mostrar resultado
      const totalProcessed = successCount + notFoundCount
      if (errorCount === 0) {
        if (notFoundCount > 0) {
          alert(`✅ ${totalProcessed} manutenção(ões) removida(s)!\n\n${successCount} excluídas do banco\n${notFoundCount} já haviam sido excluídas (cache limpo)`)
        } else {
          alert(`✅ ${successCount} manutenção(ões) excluída(s) com sucesso!`)
        }
      } else {
        alert(`⚠️ ${totalProcessed} manutenção(ões) removida(s), ${errorCount} erro(s)\n\n${successCount} excluídas\n${notFoundCount} já excluídas anteriormente`)
      }
      
      // Recarregar dados
      await manutencaoStore.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir manutenções')
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

      logDev('🔍 SMART IMPORT MANUTENÇÕES: Processando resultado:', result)

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

          // Função para encontrar ID por nome (com normalização completa e correspondência flexível)
          const findIdByName = (name: string, items: any[], nameField: string = 'nome') => {
            if (!name) return ''
            
            const searchNormalized = normalizeString(String(name))
            
            // Primeiro, tentar correspondência exata (normalizada)
            let item = items.find(item => {
              const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
              return itemNameNormalized === searchNormalized
            })
            
            // Se não encontrou correspondência exata, tentar correspondência parcial
            if (!item) {
              item = items.find(item => {
                const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
                // Verificar se o termo de busca está contido no nome do item
                return itemNameNormalized.includes(searchNormalized) || searchNormalized.includes(itemNameNormalized)
              })
            }
            
            // Se ainda não encontrou, tentar correspondência por palavras-chave
            if (!item) {
              const searchWords = searchNormalized.split(' ').filter(word => word.length > 2)
              if (searchWords.length > 0) {
                item = items.find(item => {
                  const itemNameNormalized = normalizeString(item[nameField] || item.nome || '')
                  return searchWords.some(word => itemNameNormalized.includes(word))
                })
              }
            }
            
            const foundItem = item ? `${item.nome || item[nameField]} (${item.id})` : 'não encontrado'
            logDev(`🔍 SMART IMPORT MANUTENÇÕES: Buscando "${name}" (normalizado: "${searchNormalized}") em ${items.length} itens, encontrado: ${foundItem}`)
            
            if (item) {
              logDev(`✅ SMART IMPORT MANUTENÇÕES: Match encontrado - "${name}" -> "${item.nome || item[nameField]}" (${item.id})`)
            } else {
              logDev(`❌ SMART IMPORT MANUTENÇÕES: Nenhum match encontrado para "${name}"`)
              logDev(`🔍 SMART IMPORT MANUTENÇÕES: Itens disponíveis:`, items.map(i => i.nome || i[nameField]))
            }
            
            return item?.id || ''
          }

                  // Debug: verificar dados disponíveis apenas se necessário
                  if (process.env.NODE_ENV === 'development') {
                    logDev('🔍 SMART IMPORT MANUTENÇÕES: Dados disponíveis para mapeamento:')
                    logDev('  - tiposCadastro:', md.tiposCadastro.length, 'itens')
                    logDev('  - padrao:', md.padrao.length, 'itens')
                    logDev('  - analistas:', md.analistas.length, 'itens')
                  }

                  // Mapear dados para o formato de manutenção
                  const tipoServicoId = findIdByName(data.tipoServico || data.tipoServicoId, md.tiposCadastro)
                  const tipoId = findIdByName(data.tipo || data.tipoId, md.padrao)
                  const analistaId = findIdByName(data.analista || data.analistaId, md.analistas)

                  // Debug: mapeamento de campos apenas em desenvolvimento
                  if (process.env.NODE_ENV === 'development') {
                    logDev('🔍 SMART IMPORT MANUTENÇÕES: Mapeamento de campos:')
                    logDev('  - tipoServico:', data.tipoServico, '-> tipoServicoId:', tipoServicoId)
                    logDev('  - tipo:', data.tipo, '-> tipoId:', tipoId)
                    logDev('  - analista:', data.analista, '-> analistaId:', analistaId)
                  }
          
          const manutencaoData = {
            // Campos obrigatórios
            status: data.status || 'Aberta',
            ...(tipoServicoId && { tipoServicoId }),
            ...(tipoId && { tipoId }),
            
            // Campos opcionais
            descricao: data.descricao || '',
            ...(analistaId && { analistaId }),
            dataInicio: excelDateToISO(data.dataInicio || data.dataInicial) || new Date().toISOString(),
            dataFinal: excelDateToISO(data.dataFinal || data.dataFinalizacao),
            ticket: data.ticket ? String(data.ticket) : `MAN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            solicitante: data.solicitante || '',
            ...(findIdByName(data.area || data.areaId, md.areas) && { areaId: findIdByName(data.area || data.areaId, md.areas) }),
            ...(findIdByName(data.cliente || data.clienteId, md.clientes) && { clienteId: findIdByName(data.cliente || data.clienteId, md.clientes) }),
            ...(findIdByName(data.contrato || data.contratoId, md.contratos, 'codigo') && { contratoId: findIdByName(data.contrato || data.contratoId, md.contratos, 'codigo') }),
            ...(findIdByName(data.operadora || data.operadoraId, md.operadoras) && { operadoraId: findIdByName(data.operadora || data.operadoraId, md.operadoras) }),
            ...(findIdByName(data.produto || data.produtoId, md.produtos) && { produtoId: findIdByName(data.produto || data.produtoId, md.produtos) }),
            ...(findIdByName(data.sistema || data.sistemaId, md.sistemas) && { sistemaId: findIdByName(data.sistema || data.sistemaId, md.sistemas) }),
            observacoes: data.observacoes || data.observacao || '',
            qtdRetornos: data.qtdRetornos || data.quantidadeRetornos || 0,
            qualidade: data.qualidade ? String(data.qualidade) : null,
            total: data.total || data.qtdClientesVinculados || data.clientesVinculados || 0,
            usuariosEmpresa: data.usuariosEmpresa || data.usuarios || 0
          }

          // Campos vazios já são filtrados na construção do objeto

          logDev('🔍 SMART IMPORT MANUTENÇÕES: Salvando manutenção:', manutencaoData)

          // Salvar na API
          const savedManutencao = await api.post('/manutencoes', manutencaoData)
          logDev('✅ SMART IMPORT MANUTENÇÕES: Manutenção salva:', savedManutencao.id)
          
          totalImported++
          totalSavedToDatabase++

        } catch (error) {
          console.error('❌ SMART IMPORT MANUTENÇÕES: Erro ao salvar manutenção:', error)
          errors.push(`Erro ao salvar manutenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
      }

      // Atualizar store local
      if (totalSavedToDatabase > 0) {
        await manutencaoStore.syncFromApi()
      }

      const totalFromResult = result.valid.length
      const successMessage = `${totalImported} de ${totalFromResult} manutenções processadas, ${totalSavedToDatabase} salvas no banco de dados`
      logDev(`✅ SMART IMPORT MANUTENÇÕES: ${successMessage}`)
      logDev(`🔍 SMART IMPORT MANUTENÇÕES: Detalhes do processamento:`)
      logDev(`  - Total de itens válidos no resultado: ${totalFromResult}`)
      logDev(`  - Total de itens processados: ${totalImported}`)
      logDev(`  - Total salvos no banco: ${totalSavedToDatabase}`)
      logDev(`  - Total de erros: ${errors.length}`)

      // Mostrar notificação de sucesso
      if (totalSavedToDatabase > 0) {
        alert(`✅ ${successMessage}`)
      }

      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT MANUTENÇÕES: Alguns erros ocorreram:', errors)
        alert(`⚠️ Alguns erros ocorreram:\n${errors.join('\n')}`)
      }

      // Se não houve sucessos, mostrar mensagem informativa
      if (totalSavedToDatabase === 0 && totalFromResult > 0) {
        alert(`⚠️ Nenhuma manutenção foi salva. Verifique os logs do console para mais detalhes.`)
      }

    } catch (error) {
      console.error('❌ SMART IMPORT MANUTENÇÕES: Erro geral:', error)
      alert('Erro ao importar manutenções')
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

  const tiposCadastroById = useMemo(() => (
    Object.fromEntries(md.tiposCadastro.map((t: any) => [t.id, t]))
  ), [md.tiposCadastro])
  const padraoById = useMemo(() => (
    Object.fromEntries(md.padrao.map((p: any) => [p.id, p]))
  ), [md.padrao])


  const rows = useMemo(() => finalFilteredItems.map((d) => {
    return {
      id: d.id,
      ticket: d.ticket || d.id,
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
        
        // Se d.areaId existe, buscar o nome
        if (d.areaId) {
          return areasById[d.areaId]?.nome ?? d.areaId
        }
        
        return d.area || ''
      })(),
      cliente: (() => {
        if (d.cliente && typeof d.cliente === 'string' && d.cliente.length > 20) {
          return clientesById[d.cliente]?.nome ?? d.cliente
        }
        
        // Se d.clienteId existe, buscar o nome
        if (d.clienteId) {
          return clientesById[d.clienteId]?.nome ?? d.clienteId
        }
        
        return d.cliente || ''
      })(),
      contrato: (() => {
        if (d.contrato && typeof d.contrato === 'string' && d.contrato.length > 20) {
          return contratosById[d.contrato]?.numero ?? d.contrato
        }
        
        // Se d.contratoId existe, buscar o código
        if (d.contratoId) {
          return contratosById[d.contratoId]?.numero ?? d.contratoId
        }
        
        return d.contrato || ''
      })(),
      operadora: (() => {
        if (d.operadora && typeof d.operadora === 'string' && d.operadora.length > 20) {
          return operadorasById[d.operadora]?.nome ?? d.operadora
        }
        
        // Se d.operadoraId existe, buscar o nome
        if (d.operadoraId) {
          return operadorasById[d.operadoraId]?.nome ?? d.operadoraId
        }
        
        return d.operadora || ''
      })(),
      produto: (() => {
        if (d.produto && typeof d.produto === 'string' && d.produto.length > 20) {
          return produtosById[d.produto]?.nome ?? d.produto
        }
        
        // Se d.produtoId existe, buscar o nome
        if (d.produtoId) {
          return produtosById[d.produtoId]?.nome ?? d.produtoId
        }
        
        return d.produto || ''
      })(),
      tipoServico: (() => {
        if (d.tipoServico && typeof d.tipoServico === 'string' && d.tipoServico.length > 20) {
          // Usar tiposCadastro para tipo de serviço
          const tipoServico = tiposCadastroById[d.tipoServico]
          return tipoServico?.nome ?? d.tipoServico
        }
        
        // Se d.tipoServicoId existe, buscar o nome
        if (d.tipoServicoId) {
          const tipoServico = tiposCadastroById[d.tipoServicoId]
          return tipoServico?.nome ?? d.tipoServicoId
        }
        
        return d.tipoServico || ''
      })(),
      tipo: (() => {
        if (d.tipo && typeof d.tipo === 'string' && d.tipo.length > 20) {
        // Buscar o tipo de manutenção nos dados mestres (padrao)
        const tipo = padraoById[d.tipo]
        return tipo?.nome ?? d.tipo
        }
        
        // Se d.tipoId existe, buscar o nome
        if (d.tipoId) {
          const tipo = padraoById[d.tipoId]
          return tipo?.nome ?? d.tipoId
        }
        
        return d.tipo || ''
      })(),
      // Manter o valor original da data (ISO string) para ordenação correta
      // A formatação será feita pelo valueFormatter da coluna
      updatedAt: d.updatedAt || '',
    }
  }), [
    finalFilteredItems,
    analistasById,
    areasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    tiposCadastroById,
    padraoById
  ])
  
  // Ordenar os dados por updatedAt (data de atualização - mais recente primeiro) antes de passar para o DataGrid
  const sortedRows = useMemo(() => (
    [...rows].sort((a, b) => {
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
  ), [rows])
  
  // Debug: mostrar primeiras linhas ordenadas
  logDev('🔍 Manutenção: Total de rows:', sortedRows.length)
  logDev('🔍 Manutenção: Primeiras 5 linhas ordenadas por updatedAt:')
  sortedRows.slice(0, 5).forEach((row, idx) => {
    logDev(`  [${idx}] ID: ${row.id}, updatedAt: ${row.updatedAt}, Data: ${row.updatedAt ? new Date(row.updatedAt).toLocaleString('pt-BR') : 'N/A'}`)
  })

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Manutenções
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyManutencoes}
                      onChange={(e) => setShowOnlyMyManutencoes(e.target.checked)}
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
                      {showOnlyMyManutencoes ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Minhas Manutenções</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todas as Manutenções</span>
                        </>
                      )}
                    </div>
                  }
                />
                
                {/* Contador de manutenções */}
                <Chip
                  label={`${formatIntegerPtBR(finalFilteredItems.length)} manutenção${finalFilteredItems.length !== 1 ? 'ões' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyManutencoes 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                
                {/* Mensagem informativa */}
                {showOnlyMyManutencoes && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas suas manutenções
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
                <PrimaryActionButton startIcon={<AddCircleOutlineIcon />} onClick={() => navigate('/manutencao/nova')} sx={{ minWidth: '140px' }}>
                  Nova Manutenção
                </PrimaryActionButton>
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
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'updatedAt', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
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
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true },
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
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: '#eef0f2',
            },
            '& .MuiDataGrid-row:nth-of-type(odd)': {
              backgroundColor: '#ffffff',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 159, 223, 0.06) !important',
            },
          }}
        />
      </div>

      {/* Modal de Exportação - filtros de data e analista dentro do modal (como Validação/Reajuste/Analytics) */}
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
        data={finalFilteredItems.map(d => ({
          ...d,
          analista: analistasById[d.analistaId]?.nome ?? d.analista ?? 'N/A',
          area: areasById[d.areaId]?.nome ?? d.area ?? 'N/A',
          cliente: clientesById[d.clienteId]?.nome ?? d.cliente ?? 'N/A',
          contrato: contratosById[d.contratoId]?.numero ?? contratosById[d.contratoId]?.codigo ?? d.contrato ?? 'N/A',
          operadora: operadorasById[d.operadoraId]?.nome ?? d.operadora ?? 'N/A',
          produto: produtosById[d.produtoId]?.nome ?? d.produto ?? 'N/A',
          sistema: sistemasById[d.sistemaId]?.nome ?? d.sistema ?? 'N/A',
          tipoServico: tiposCadastroById[d.tipoServicoId]?.nome ?? d.tipoServico ?? 'N/A',
          tipo: padraoById[d.tipoId]?.nome ?? d.tipo ?? 'N/A',
          dataInicio: d.dataInicio ? new Date(d.dataInicio).toLocaleDateString('pt-BR') : '',
          dataFinal: d.dataFinal ? new Date(d.dataFinal).toLocaleDateString('pt-BR') : '',
          createdAt: d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : '',
          updatedAt: d.updatedAt ? new Date(d.updatedAt).toLocaleString('pt-BR') : '',
          qtdRetornos: d.qtdRetornos ?? 0,
          total: d.total ?? 0,
          usuariosEmpresa: d.usuariosEmpresa ?? 0,
          solicitante: md.solicitantesById?.[d.solicitante]?.nome ?? d.solicitante ?? '',
          observacoes: d.observacoes ?? '',
          qualidade: d.qualidade ?? '',
          _dataInicioRaw: d.dataInicio ?? '',
          _dataFinalRaw: d.dataFinal ?? d.dataInicio ?? '',
          _analistaId: d.analistaId ?? ''
        }))}
        moduleName="manutencoes"
        moduleTitle="Manutenções"
        appliedFilters={{
          'Minhas Manutenções': showOnlyMyManutencoes ? 'Sim' : 'Não',
          'Total na lista': finalFilteredItems.length
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
          { key: 'sistema', label: 'Sistema' },
          { key: 'tipoServico', label: 'Tipo de Serviço' },
          { key: 'tipo', label: 'Tipo de Manutenção' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'dataInicio', label: 'Data de Início' },
          { key: 'dataFinal', label: 'Data Final' },
          { key: 'qtdRetornos', label: 'Qtd Retornos' },
          { key: 'qualidade', label: 'Qualidade' },
          { key: 'total', label: 'Total' },
          { key: 'usuariosEmpresa', label: 'Usuários Empresa' },
          { key: 'observacoes', label: 'Observações' },
          { key: 'createdAt', label: 'Criado em' },
          { key: 'updatedAt', label: 'Atualizado em' }
        ]}
      />

      {/* Smart Importer - Importador Inteligente */}
      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs.manutencoes}
        masterData={md}
      />

      {/* Modal de confirmação de exclusão em massa */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => !isDeleting && setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isDeleting}
      >
        <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{formatIntegerPtBR(selectedIds.length)}</strong> manutenção(ões) selecionada(s)?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            ⚠️ Esta ação não pode ser desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            disabled={isDeleting || selectedIds.length === 0}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// 🚀 MELHORIA FASE 2A: React.memo - 40-60% menos re-renders
const ActionCell = memo(function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useManutencaoStore()
  const md = useMasterDataStore()
  const user = useAuthStore((s) => s.user)
  const {
    analistasById,
    areasById,
    clientesById,
    contratosById,
    operadorasById,
    produtosById,
    sistemasById,
    tiposDemandaById
  } = md
  const { canEdit, canDelete } = usePermissions('manutencao')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const d = store.items.find((x) => x.id === id)
      if (!d) return
      const from = d.status
      const next = { ...d, status: newStatus, updatedAt: new Date().toISOString() }
      await store.upsert(next)
      store.log?.({ manutencaoId: id, type: 'status_change', field: 'status', from, to: newStatus })
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
      alert(`Erro ao excluir manutenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const doDuplicate = async () => {
    if (isDuplicating) return // Prevenir múltiplos cliques
    
    const d = store.items.find((x) => x.id === id)
    if (!d) {
      alert('Manutenção não encontrada')
      return
    }
    
    setIsDuplicating(true)
    try {
      // Função para gerar ticket único com sufixo numérico
      const generateUniqueTicket = async (originalTicket: string | undefined): Promise<string | undefined> => {
        if (!originalTicket || originalTicket.trim() === '') {
          return undefined // Se não tinha ticket, retornar undefined
        }
        
        try {
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
            try {
              const existing = await api.getManutencoes(`?ticket=${encodeURIComponent(newTicket)}`)
              if (!Array.isArray(existing) || existing.length === 0) {
                // Ticket disponível encontrado
                return newTicket
              }
            } catch (apiError) {
              // Se houver erro na API, assumir que o ticket está disponível após algumas tentativas
              console.warn(`Erro ao verificar ticket ${newTicket}, tentando próximo:`, apiError)
              if (i >= 5) {
                // Após 5 tentativas com erro, usar o ticket atual
                return newTicket
              }
            }
            // Ticket já existe, tentar próximo sufixo
            suffix++
            newTicket = `${baseTicket}-${suffix}`
          }
          
          // Se não encontrou após 10 tentativas, gerar com timestamp
          const timestamp = Date.now().toString().slice(-4)
          return `${baseTicket}-${timestamp}`
        } catch (error) {
          console.error('Erro ao gerar ticket único:', error)
          // Em caso de erro, gerar ticket com timestamp
          const timestamp = Date.now().toString().slice(-4)
          return `${originalTicket}-${timestamp}`
        }
      }
      
      // Gerar novo ticket único
      const newTicket = await generateUniqueTicket(d.ticket)
      
      // Mesmo padrão de Demandas/List: copiar o restante da linha após tirar metadados e rótulos.
      // IMPORTANTE: não enviar objetos aninhados (ex.: analistaObj) — o Prisma falha no POST e o store
      // cai no retry com payload mínimo, deixando descrição, totais e FKs zerados.
      const looksLikeUuid = (s: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
      const fk = (idVal: string | undefined | null, alt: unknown): string | undefined => {
        if (idVal != null && String(idVal).trim() !== '') return String(idVal).trim()
        if (typeof alt === 'string' && alt.length > 20 && looksLikeUuid(alt)) return alt
        return undefined
      }

      const {
        id: _omit,
        createdAt: _c,
        updatedAt: _u,
        ticket: _ticket,
        analistaObj: _analistaObj,
        // Campo legado/UI; não existe no modelo Prisma Manutencao — evita erro no POST e retry "mínimo"
        periodicidade: _periodicidade,
        analista: _analista,
        area: _area,
        cliente: _cliente,
        contrato: _contrato,
        operadora: _operadora,
        produto: _produto,
        sistema: _sistema,
        tipo: _tipo,
        tipoServico: _tipoServico,
        ...rest
      } = d

      const duplicateData: Record<string, unknown> = {
        ...rest,
        ticket: newTicket || undefined,
        status: 'Aberta',
        clienteId: fk(d.clienteId, d.cliente),
        contratoId: fk(d.contratoId, d.contrato),
        operadoraId: fk(d.operadoraId, d.operadora),
        produtoId: fk(d.produtoId, d.produto),
        sistemaId: fk(d.sistemaId, d.sistema),
        areaId: fk(d.areaId, d.area),
        tipoId: fk(d.tipoId, d.tipo),
        tipoServicoId: fk(d.tipoServicoId, d.tipoServico),
        analistaId: fk(d.analistaId, d.analista),
      }
      
      // Analista do novo chamado = quem duplicou (mesma regra da tela Nova manutenção), não o analista do original
      if (user?.name && md.analistas.length > 0) {
        const analistaCorrespondente = md.analistas.find(
          (a) =>
            a.nome.toLowerCase() === user.name!.toLowerCase() ||
            a.nome.toLowerCase().includes(user.name!.toLowerCase()) ||
            user.name!.toLowerCase().includes(a.nome.toLowerCase())
        )
        if (analistaCorrespondente) {
          duplicateData.analistaId = analistaCorrespondente.id
        }
      }

      // Remover apenas campos undefined/null (manter strings vazias para campos de texto)
      Object.keys(duplicateData).forEach(key => {
        if (duplicateData[key] === undefined || duplicateData[key] === null) {
          delete duplicateData[key]
        }
      })
      
      const duplicated = await store.add(duplicateData)
      
      if (!duplicated || !duplicated.id) {
        throw new Error('Falha ao criar manutenção duplicada: ID não retornado')
      }
      
      // Garantir navegação usando o ID real do backend
      let navigateId = duplicated.id
      try {
        // Se temos um ticket, tentar buscar pelo ticket para garantir que temos o ID correto
        if (newTicket) {
          const { api } = await import('../../lib/api.local')
          const found = await api.getManutencoes(`?ticket=${encodeURIComponent(newTicket)}`)
          if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
            navigateId = found[0].id
          }
        }
      } catch (e) {
        console.warn('Não foi possível confirmar ID pelo ticket; usando ID retornado localmente', e)
      }
      
      // Fechar menu antes de navegar
      handleMenuClose()
      
      navigate(`/manutencao/${navigateId}`)
    } catch (error) {
      console.error('Erro ao duplicar manutenção:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert(`Erro ao duplicar manutenção: ${errorMessage}`)
    } finally {
      setIsDuplicating(false)
    }
  }

  const doExportPdf = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const label = (val?: string, map?: Record<string, { nome?: string }>) => map?.[val || '']?.nome || '-'
    const contrato = contratosById[d.contrato || '']?.codigo || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manutenção ${d.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Manutenção ${d.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${d.status}</td></tr>
      <tr><td class="muted">Cliente</td><td>${label(d.cliente, clientesById)}</td></tr>
      <tr><td class="muted">Contrato</td><td>${contrato}</td></tr>
      <tr><td class="muted">Operadora</td><td>${label(d.operadora, operadorasById)}</td></tr>
      <tr><td class="muted">Produto</td><td>${label(d.produto, produtosById)}</td></tr>
      <tr><td class="muted">Sistema</td><td>${label(d.sistema, sistemasById)}</td></tr>
      <tr><td class="muted">Área</td><td>${label(d.area, areasById)}</td></tr>
      <tr><td class="muted">Analista</td><td>${label(d.analista, analistasById)}</td></tr>
      <tr><td class="muted">Tipo</td><td>${label(d.tipo, tiposDemandaById)}</td></tr>
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
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/manutencao/${id}`) }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver</ListItemText>
        </MenuItem>
        
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); navigate(`/manutencao/${id}/edit`) }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        
        {canEdit && (
          <MenuItem 
            onClick={() => { handleMenuClose(); doDuplicate() }}
            disabled={isDuplicating}
          >
            <ListItemIcon>
              {isDuplicating ? (
                <CircularProgress size={16} />
              ) : (
                <FileCopyIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>
              {isDuplicating ? 'Duplicando...' : 'Duplicar'}
            </ListItemText>
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
            {['Aberta','Em andamento','Transf. Analista','Aguardando validação','Com erros','Concluída','Cancelada'].map(s => (
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
        <DialogTitle>Excluir manutenção</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir esta manutenção?</Typography>
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
})
