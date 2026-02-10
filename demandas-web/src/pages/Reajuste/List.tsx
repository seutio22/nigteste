import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useReajusteStore } from '../../store/reajusteStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { useFilteredData } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { SmartImporter } from '../../components/SmartImporter'
import { smartImporterConfigs } from '../../config/smartImporterConfigs'
import type { ImportResult } from '../../types/smartImporter'
import { useEffect, useState, useMemo } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import { usePermissions } from '../../hooks/usePermissions'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import TableChartIcon from '@mui/icons-material/TableChart'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'ticket', headerName: 'Ticket', width: 140 },
  { field: 'mesAno', headerName: 'Mês/Ano', width: 120 },
  { field: 'filial', headerName: 'Filial', width: 140 },
  { field: 'operadora', headerName: 'Operadora', width: 160 },
  { field: 'responsavelAnalista', headerName: 'Analista', width: 160 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'produto', headerName: 'Produto', width: 160 },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusBadge status={String(p.value ?? '')} /> },
  { 
    field: 'total', 
    headerName: 'Total', 
    width: 120,
    type: 'number',
    valueFormatter: (value) => {
      if (!value && value !== 0) return '-'
      return Number(value).toLocaleString('pt-BR')
    },
    sortComparator: (v1, v2) => {
      const num1 = Number(v1) || 0
      const num2 = Number(v2) || 0
      return num1 - num2
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

export default function ReajusteListPage() {
  // FORÇAR DEPLOY - Exclusão em massa + Importador Inteligente - v1.0
  const navigate = useNavigate()
  const store = useReajusteStore()
  const { items } = store
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const { canCreate, canImport, canExport, canDelete } = usePermissions('reajuste')
  
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const STORAGE_KEY = 'reajustes-list-view-v1'
  const FILTER_KEY = 'reajustes-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'updatedAt', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [showOnlyMyReajustes, setShowOnlyMyReajustes] = useState(true)
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }


  // Filtrar dados por permissão do usuário
  const filteredItems = useFilteredData(items, user?.role, user?.id, false) // false = não filtrar por permissão

  // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
  const normalizeString = (str: any) => {
    return String(str ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ') // Normaliza espaços
  }

  // Aplicar filtro adicional para reajustes do usuário logado (otimizado com useMemo)
  const finalFilteredItems = useMemo(() => {
    if (!showOnlyMyReajustes) return filteredItems
    
    return filteredItems.filter(reajuste => {
      // Buscar o analista correspondente ao usuário logado
      const analistaCorrespondente = md.analistas.find(analista => 
        analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
        analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
        (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
      )
      
      if (!reajuste.responsavelAnalista) return false
      
      // ReajusteLancamento armazena responsavelAnalista como string (nome) ou ID
      // Verificar se é um ID (UUID) ou um nome (string)
      const isId = reajuste.responsavelAnalista.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      
      if (isId) {
        // Se for ID, comparar diretamente
      if (analistaCorrespondente) {
        return reajuste.responsavelAnalista === analistaCorrespondente.id
        }
      } else {
        // Se for nome (string), comparar nomes normalizados
        if (analistaCorrespondente) {
          const reajusteAnalistaNormalized = normalizeString(reajuste.responsavelAnalista)
          const analistaNomeNormalized = normalizeString(analistaCorrespondente.nome)
          return reajusteAnalistaNormalized === analistaNomeNormalized
        }
      }
      
      // Se não encontrou correspondência, retornar false (não mostrar)
      return false
    })
  }, [showOnlyMyReajustes, filteredItems, user?.name, md.analistas])



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
        setShowOnlyMyReajustes(JSON.parse(filterPreference))
      } else {
        // Se não houver preferência salva, manter o padrão "Meus cadastros" (true)
        setShowOnlyMyReajustes(true)
      }
    } catch {
      // Em caso de erro, manter o padrão "Meus cadastros" (true)
      setShowOnlyMyReajustes(true)
    }
  }, [])

  // Persistir preferência do filtro de usuário
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(showOnlyMyReajustes))
    } catch {}
  }, [showOnlyMyReajustes])

  // Carregar dados do banco de dados ao iniciar
  useEffect(() => {
    if (store.syncFromApi) {
      store.syncFromApi().catch(() => {
        // Erro silencioso - dados serão carregados quando necessário
      })
    }
  }, [store.syncFromApi])

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    if (isDeleting || selectedIds.length === 0) return
    const idsToDelete = [...selectedIds]
    setIsDeleting(true)
    try {
      const { api } = await import('../../lib/api.local')
      
      logDev('🗑️ Iniciando exclusão em massa de', idsToDelete.length, 'reajustes')
      
      let successCount = 0
      let errorCount = 0
      let notFoundCount = 0
      
      for (const id of idsToDelete) {
        try {
          await api.delete(`/reajusteLancamentos/${id}`)
          successCount++
        } catch (error: any) {
          // Se for erro 404, significa que já foi excluído - ignorar
          if (error?.message?.includes('404') || error?.response?.status === 404) {
            logDev(`⚠️ Reajuste ${id} já foi excluído (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir reajuste ${id}:`, error)
            errorCount++
          }
        }
      }
      
      // Atualizar store local (remover TODOS os IDs, incluindo os 404)
      const currentItems = useReajusteStore.getState().items
      const filteredItems = currentItems.filter((item) => !idsToDelete.includes(item.id))
      useReajusteStore.setState({ items: filteredItems })
      
      // Limpar seleção
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      
      // Mostrar resultado
      const totalProcessed = successCount + notFoundCount
      if (errorCount === 0) {
        if (notFoundCount > 0) {
          alert(`✅ ${totalProcessed} reajuste(s) removido(s)!\n\n${successCount} excluídos do banco\n${notFoundCount} já haviam sido excluídos (cache limpo)`)
        } else {
          alert(`✅ ${successCount} reajuste(s) excluído(s) com sucesso!`)
        }
      } else {
        alert(`⚠️ ${totalProcessed} reajuste(s) removido(s), ${errorCount} erro(s)\n\n${successCount} excluídos\n${notFoundCount} já excluídos anteriormente`)
      }
      
      // Recarregar dados
      await store.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir reajustes')
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
      for (let itemIndex = 0; itemIndex < result.valid.length; itemIndex++) {
        const item = result.valid[itemIndex]
        const itemNumber = itemIndex + 1
        
        try {
          const data = item.isCorrected ? item.correctedData : item.data
          
          // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
          const normalizeString = (str: any) => {
            if (str === null || str === undefined) return ''
            const strValue = String(str).trim()
            if (!strValue) return ''
            return strValue
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
              .replace(/\s+/g, ' ') // Normaliza espaços
          }

          // Função para encontrar nome por busca (seguindo padrão de Manutenção, mas retornando nome ao invés de ID)
          // Retorna o nome encontrado ou string vazia se não encontrar
          const findName = (name: string, items: any[], nameField: string = 'nome') => {
            const nameStr = String(name || '').trim()
            if (!nameStr) return ''
            
            const searchNormalized = normalizeString(nameStr)
            
            // Primeiro, tentar correspondência exata (normalizada)
            let item = items.find(item => {
              const itemValue = item[nameField] ?? item.nome ?? ''
              const itemNameNormalized = normalizeString(itemValue)
              return itemNameNormalized === searchNormalized
            })
            
            // Se não encontrou correspondência exata, tentar correspondência parcial
            if (!item) {
              item = items.find(item => {
                const itemValue = item[nameField] ?? item.nome ?? ''
                const itemNameNormalized = normalizeString(itemValue)
                // Verificar se o termo de busca está contido no nome do item
                return itemNameNormalized.includes(searchNormalized) || searchNormalized.includes(itemNameNormalized)
              })
            }
            
            // Se ainda não encontrou, tentar correspondência por palavras-chave
            if (!item) {
              const searchWords = searchNormalized.split(' ').filter(word => word.length > 2)
              if (searchWords.length > 0) {
                item = items.find(item => {
                  const itemValue = item[nameField] ?? item.nome ?? ''
                  const itemNameNormalized = normalizeString(itemValue)
                  return searchWords.some(word => itemNameNormalized.includes(word))
                })
              }
            }
            
            // Se encontrou, retornar o nome do item encontrado (padronizado)
            if (item) {
              return item[nameField] || item.nome || ''
            }
            
            // Se não encontrou, retornar string vazia (seguindo padrão de Manutenção)
            return ''
          }

          // Função para encontrar ID (para analistaId)
          const findId = (name: string, items: any[], nameField: string = 'nome') => {
            const nameStr = String(name || '').trim()
            if (!nameStr) return ''
            
            const searchNormalized = normalizeString(nameStr)
            
            // Primeiro, tentar correspondência exata (normalizada)
            let item = items.find(item => {
              const itemValue = item[nameField] ?? item.nome ?? ''
              const itemNameNormalized = normalizeString(itemValue)
              return itemNameNormalized === searchNormalized
            })
            
            // Se não encontrou correspondência exata, tentar correspondência parcial
            if (!item) {
              item = items.find(item => {
                const itemValue = item[nameField] ?? item.nome ?? ''
                const itemNameNormalized = normalizeString(itemValue)
                return itemNameNormalized.includes(searchNormalized) || searchNormalized.includes(itemNameNormalized)
              })
            }
            
            // Se ainda não encontrou, tentar correspondência por palavras-chave
            if (!item) {
              const searchWords = searchNormalized.split(' ').filter(word => word.length > 2)
              if (searchWords.length > 0) {
                item = items.find(item => {
                  const itemValue = item[nameField] ?? item.nome ?? ''
                  const itemNameNormalized = normalizeString(itemValue)
                  return searchWords.some(word => itemNameNormalized.includes(word))
                })
              }
            }
            
            return item?.id || ''
          }

          // Mapear dados para o formato de ReajusteLancamento
          // SEGUINDO PADRÃO DE MANUTENÇÃO: buscar nomes e usar valores originais do Excel se não encontrar
          // O modelo ReajusteLancamento usa strings (nomes) para operadora, cliente, contrato, produto
          
          // Buscar nomes nos dados mestres (seguindo padrão de Manutenção)
          const operadoraNomeEncontrado = findName(data.operadora || data.operadoraId || '', md.operadoras, 'nome')
          const responsavelAnalistaNomeEncontrado = findName(data.responsavelAnalista || data.analista || data.responsavelAnalistaId || '', md.analistas, 'nome')
          const clienteNomeEncontrado = findName(data.cliente || data.clienteId || '', md.clientes, 'nome')
          
          // Para contratos, buscar por codigo primeiro, depois por numero
          const contratoValue = data.contrato || data.contratoId || ''
          let contratoCodigoEncontrado = findName(contratoValue, md.contratos, 'codigo')

          // Se não encontrou por codigo, tentar buscar por numero
          if (!contratoCodigoEncontrado && contratoValue) {
            const contratoEncontrado = md.contratos.find(c => {
              const cNumero = normalizeString(String(c.numero || ''))
              const searchNormalized = normalizeString(contratoValue)
              return cNumero === searchNormalized || cNumero.includes(searchNormalized) || searchNormalized.includes(cNumero)
            })
            if (contratoEncontrado) {
              contratoCodigoEncontrado = contratoEncontrado.codigo || contratoEncontrado.numero || ''
            }
          }
          
          const produtoNomeEncontrado = findName(data.produto || data.produtoId || '', md.produtos, 'nome')
          
          // Buscar ID do analista (para analistaId)
          const analistaId = findId(data.responsavelAnalista || data.analista || data.responsavelAnalistaId || '', md.analistas, 'nome')
          
          // Usar nomes encontrados OU valores originais do Excel (se não encontrar, preservar original)
          // IMPORTANTE: Sempre preservar valores originais do Excel se não encontrar correspondência
          const operadoraNome = operadoraNomeEncontrado || String(data.operadora || data.operadoraId || '').trim()
          const responsavelAnalistaNome = responsavelAnalistaNomeEncontrado || String(data.responsavelAnalista || data.analista || data.responsavelAnalistaId || '').trim()
          const clienteNome = clienteNomeEncontrado || String(data.cliente || data.clienteId || '').trim()
          const contratoCodigo = contratoCodigoEncontrado || String(data.contrato || data.contratoId || '').trim()
          const produtoNome = produtoNomeEncontrado || String(data.produto || data.produtoId || '').trim()

          // Validar campos obrigatórios
          if (!operadoraNome || operadoraNome.trim() === '') {
            errors.push(`Item ${itemNumber}: Operadora é obrigatória e não foi encontrada.`)
            totalImported++ // Contar como processado mesmo que tenha erro
            continue
          }
          
          if (!responsavelAnalistaNome || responsavelAnalistaNome.trim() === '') {
            errors.push(`Item ${itemNumber}: Responsável Analista é obrigatório e não foi encontrado.`)
            totalImported++ // Contar como processado mesmo que tenha erro
            continue
          }

          // Função para converter nome do mês para número
          const converterMesParaNumero = (mes: any): string => {
            if (!mes) return String(new Date().getMonth() + 1)
            
            const mesStr = String(mes).trim()
            
            // Se já é um número (1-12), retornar como string
            const mesNum = Number(mesStr)
            if (!isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
              return String(mesNum)
            }
            
            // Se é um nome do mês, converter para número
            const mesesMap: { [key: string]: string } = {
              'janeiro': '1', 'fevereiro': '2', 'março': '3', 'marco': '3', 'abril': '4',
              'maio': '5', 'junho': '6', 'julho': '7', 'agosto': '8',
              'setembro': '9', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
            }
            
            const mesLower = mesStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
            if (mesesMap[mesLower]) {
              return mesesMap[mesLower]
            }
            
            // Se não conseguir converter, usar o valor original como string
            return mesStr
          }

          // Construir payload seguindo padrão de Manutenção
          const reajusteData: any = {
            // Campos obrigatórios (ReajusteLancamento usa String para mes e ano)
            mes: converterMesParaNumero(data.mes),
            ano: String(data.ano || new Date().getFullYear()),
            status: data.status || 'Em andamento',
            operadora: operadoraNome, // String, obrigatório
            responsavelAnalista: responsavelAnalistaNome, // String, obrigatório
          }

          // Adicionar analistaId se encontrado (seguindo padrão de Manutenção)
          if (analistaId) {
            reajusteData.analistaId = analistaId
          }
          
          // Campos opcionais - SEGUINDO PADRÃO DE MANUTENÇÃO: só adicionar se tiver valor válido
          // IMPORTANTE: Preservar valores originais do Excel mesmo se não encontrar correspondência
          if (clienteNome && clienteNome.trim() !== '') {
            reajusteData.cliente = clienteNome
          }
          
          if (contratoCodigo && contratoCodigo.trim() !== '') {
            reajusteData.contrato = contratoCodigo
          }
          
          if (produtoNome && produtoNome.trim() !== '') {
            reajusteData.produto = produtoNome
          }

          // Outros campos opcionais
          const dataInicioValue = excelDateToISO(data.dataInicio || data.dataInicial)
          if (dataInicioValue) {
            reajusteData.dataInicio = dataInicioValue
          } else {
            reajusteData.dataInicio = new Date().toISOString()
          }

          const dataFimValue = excelDateToISO(data.dataFim || data.dataFinal || data.dataFinalizacao)
          if (dataFimValue) {
            reajusteData.dataFim = dataFimValue
          }

          if (data.filial && String(data.filial).trim() !== '') {
            reajusteData.filial = String(data.filial).trim()
          }

          if (data.ticket && String(data.ticket).trim() !== '') {
            reajusteData.ticket = String(data.ticket).trim()
          }

          if (data.solicitante && String(data.solicitante).trim() !== '') {
            reajusteData.solicitante = String(data.solicitante).trim()
          }

          if (data.qualidade !== undefined && data.qualidade !== null && data.qualidade !== '') {
            reajusteData.qualidade = String(data.qualidade)
          }

          if (data.qualidadeInformacao && String(data.qualidadeInformacao).trim() !== '') {
            reajusteData.qualidadeInformacao = String(data.qualidadeInformacao).trim()
          }

          if (data.planos && String(data.planos).trim() !== '') {
            reajusteData.planos = String(data.planos).trim()
          }

          if (data.responsavelConta && String(data.responsavelConta).trim() !== '') {
            reajusteData.responsavelConta = String(data.responsavelConta).trim()
          }

          const dataAtualizacaoValue = excelDateToISO(data.dataAtualizacao)
          if (dataAtualizacaoValue) {
            reajusteData.dataAtualizacao = dataAtualizacaoValue
          } else {
            reajusteData.dataAtualizacao = new Date().toISOString()
          }

          if (data.itensPendentes !== undefined && data.itensPendentes !== null) {
            reajusteData.itensPendentes = Number(data.itensPendentes) || 0
          }

          if (data.itensConcluidos !== undefined && data.itensConcluidos !== null) {
            reajusteData.itensConcluidos = Number(data.itensConcluidos) || 0
          }

          // Salvar na API (usar endpoint correto para ReajusteLancamento)
          // SEGUINDO PADRÃO DE MANUTENÇÃO: api.post retorna os dados diretamente, não response.data
          try {
            const savedReajuste = await api.post('/reajusteLancamentos', reajusteData)
          totalImported++
          totalSavedToDatabase++
          } catch (apiError: any) {
            errors.push(`Item ${itemNumber}: Erro ao salvar - ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
            // NÃO fazer throw - seguir padrão de Manutenção e continuar processando outros itens
          }

        } catch (error: any) {
          const errorDetails = error?.response?.data || error?.message || JSON.stringify(error)
          errors.push(`Item ${itemNumber} (${item.isCorrected ? item.correctedData?.ticket || item.correctedData?.mes + '/' + item.correctedData?.ano : item.data?.ticket || item.data?.mes + '/' + item.data?.ano || 'sem identificação'}): ${errorDetails}`)
        }
      }

      // Atualizar store local
      if (totalSavedToDatabase > 0) {
        await store.syncFromApi()
      }

      const totalFromResult = result.valid.length
      const successMessage = `${totalImported} de ${totalFromResult} reajustes processados, ${totalSavedToDatabase} salvos no banco de dados`

      // Mostrar notificação de sucesso
      if (totalSavedToDatabase > 0) {
        alert(`✅ ${successMessage}`)
      }

      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT REAJUSTES: Alguns erros ocorreram:', errors)
        alert(`⚠️ Alguns erros ocorreram:\n${errors.join('\n')}`)
      }

      // Se não houve sucessos, mostrar mensagem informativa
      if (totalSavedToDatabase === 0 && totalFromResult > 0) {
        alert(`⚠️ Nenhum reajuste foi salvo. Verifique os logs do console para mais detalhes.`)
      }

    } catch (error) {
      alert('Erro ao importar reajustes')
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

  // Função para buscar por nome quando não encontrar por ID (para ReajusteLancamento que armazena nomes)
  const findByName = (value: string | undefined, arr: { id: string, nome: string }[]) => {
    if (!value) return null
    const normalizedValue = normalizeString(value)
    return arr.find(a => normalizeString(a.nome) === normalizedValue) || null
  }

  // Função para buscar contrato por código ou número
  const findContratoByCodigo = (value: string | undefined, arr: any[]) => {
    if (!value) return null
    const normalizedValue = normalizeString(value)
    return arr.find((c: any) => 
      normalizeString(c.codigo) === normalizedValue || 
      normalizeString(c.numero) === normalizedValue
    ) || null
  }

  const rows = finalFilteredItems.map((r) => {
    // ReajusteLancamento armazena operadora, cliente, contrato, produto como strings (nomes)
    // Tentar buscar por ID primeiro, depois por nome
    let operadoraNome = ''
    if (r.operadora) {
      // Verificar se é um ID (UUID) ou um nome (string)
      const isId = r.operadora.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (isId) {
        operadoraNome = md.operadoras.find(o => o.id === r.operadora)?.nome ?? ''
      } else {
        // É um nome, buscar nos dados mestres
        const found = findByName(r.operadora, md.operadoras)
        operadoraNome = found?.nome ?? r.operadora // Se não encontrar, usar o valor original
      }
    }

    let analistaNome = ''
    if (r.responsavelAnalista) {
      const isId = r.responsavelAnalista.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (isId) {
        analistaNome = md.analistas.find(a => a.id === r.responsavelAnalista)?.nome ?? ''
      } else {
        const found = findByName(r.responsavelAnalista, md.analistas)
        analistaNome = found?.nome ?? r.responsavelAnalista
      }
    }

    let clienteNome = ''
    if (r.cliente) {
      const isId = r.cliente.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (isId) {
        clienteNome = md.clientes.find(c => c.id === r.cliente)?.nome ?? ''
      } else {
        const found = findByName(r.cliente, md.clientes)
        clienteNome = found?.nome ?? r.cliente
      }
    }

    let contratoCodigo = ''
    if (r.contrato) {
      const isId = r.contrato.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (isId) {
        contratoCodigo = md.contratos.find(c => c.id === r.contrato)?.codigo ?? md.contratos.find(c => c.id === r.contrato)?.numero ?? ''
      } else {
        // É um código/número, buscar nos dados mestres
        const found = findContratoByCodigo(r.contrato, md.contratos)
        contratoCodigo = found?.codigo ?? found?.numero ?? r.contrato
      }
    }

    let produtoNome = ''
    if (r.produto) {
      const isId = r.produto.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (isId) {
        produtoNome = md.produtos.find(p => p.id === r.produto)?.nome ?? ''
      } else {
        const found = findByName(r.produto, md.produtos)
        produtoNome = found?.nome ?? r.produto
      }
    }

    return {
    id: r.id,
    ticket: r.ticket ?? '',
    mesAno: `${r.mes}/${r.ano}`,
    filial: r.filial ?? '',
      operadora: operadoraNome,
      responsavelAnalista: analistaNome,
      cliente: clienteNome,
      contrato: contratoCodigo,
      produto: produtoNome,
    status: r.status ?? 'Ativo',
      total: r.itensConcluidos ?? 0,
    // Manter o valor original da data (ISO string) para ordenação correta
    // A formatação será feita pelo valueFormatter da coluna
    updatedAt: r.updatedAt || '',
    }
  })
  
  // Ordenar os dados por updatedAt (mais recente primeiro) antes de passar para o DataGrid
  const sortedRows = [...rows].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return dateB - dateA // Ordem decrescente (mais recente primeiro)
  })

  // Usar apenas dados reais
  const hasData = sortedRows.length > 0

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Reajuste
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyMyReajustes}
                      onChange={(e) => setShowOnlyMyReajustes(e.target.checked)}
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
                      {showOnlyMyReajustes ? (
                        <>
                          <PersonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-slate-600">Meus Reajustes</span>
                        </>
                      ) : (
                        <>
                          <GroupIcon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-600">Todos os Reajustes</span>
                        </>
                      )}
                    </div>
                  }
                />
                
                {/* Contador de reajustes */}
                <Chip
                  label={`${finalFilteredItems.length} reajuste${finalFilteredItems.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className={`${
                    showOnlyMyReajustes 
                      ? 'border-blue-300 text-blue-600 bg-blue-50' 
                      : 'border-slate-300 text-slate-600 bg-slate-50'
                  }`}
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Mensagem informativa */}
                {showOnlyMyReajustes && (
                  <Typography 
                    variant="caption" 
                    className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                  >
                    Mostrando apenas seus reajustes
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
                  onClick={() => navigate('/reajuste/nova')}
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
                  Novo Reajuste
                </Button>
              )}
            </Stack>
          </div>
        </div>
      </div>
      
      {/* Informações sobre dados */}
      {!hasData && (
        <Box sx={{ mx: 2, mb: 1, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            ℹ️ Nenhum reajuste encontrado. Clique em "Novo Reajuste" para criar o primeiro.
          </Typography>
        </Box>
      )}

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
          onRowDoubleClick={(p) => navigate(`/reajuste/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ 
            toolbar: { 
              showQuickFilter: true, 
              quickFilterProps: { 
                debounceMs: 300,
                placeholder: 'Buscar reajustes... (ex: filial, operadora, analista)'
              },
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
            height: '100%',
            minHeight: '500px', // Altura mínima aumentada para caber mais itens
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
              backgroundColor: 'background.default',
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
        config={smartImporterConfigs.reajustes}
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
            Tem certeza que deseja excluir <strong>{selectedIds.length}</strong> reajuste(s) selecionado(s)?
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

      {/* Modal de Exportação - filtros de data e analista dentro do modal (como Validação) */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        formats={['excel']}
        filterOptions={{
          showDateFilter: true,
          showAnalistaFilter: true,
          analistas: md.analistas
        }}
        data={finalFilteredItems.map(r => {
          const isUuid = (v: string | undefined) => v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
          const orNa = (v: string | undefined) => (!v || isUuid(v)) ? 'N/A' : v

          let operadoraNome = ''
          if (r.operadora) {
            if (isUuid(r.operadora)) operadoraNome = md.operadoras.find(o => o.id === r.operadora)?.nome ?? ''
            else operadoraNome = findByName(r.operadora, md.operadoras)?.nome ?? r.operadora
          }
          let analistaNome = ''
          if (r.responsavelAnalista) {
            if (isUuid(r.responsavelAnalista)) analistaNome = md.analistas.find(a => a.id === r.responsavelAnalista)?.nome ?? ''
            else analistaNome = findByName(r.responsavelAnalista, md.analistas)?.nome ?? r.responsavelAnalista
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
          let produtoNome = ''
          if (r.produto) {
            if (isUuid(r.produto)) produtoNome = md.produtos.find(p => p.id === r.produto)?.nome ?? ''
            else produtoNome = findByName(r.produto, md.produtos)?.nome ?? r.produto
          }

          let solicitanteNome = ''
          const solicitanteVal = (r as any).solicitante
          if (solicitanteVal) {
            if (isUuid(solicitanteVal)) solicitanteNome = md.solicitantes.find(s => s.id === solicitanteVal)?.nome ?? ''
            else solicitanteNome = findByName(solicitanteVal, md.solicitantes)?.nome ?? solicitanteVal
          }

          const responsavelId = isUuid(r.responsavelAnalista) ? r.responsavelAnalista : (md.analistas.find(a => a.nome === r.responsavelAnalista || normalizeString(a.nome) === normalizeString(String(r.responsavelAnalista ?? '')))?.id ?? '')

          const dataFim = (r as any).dataFim ?? r.dataFinal
          const dataAtualizacao = (r as any).dataAtualizacao
          const mes = r.mes != null && r.mes !== '' ? String(r.mes) : ''
          const ano = r.ano != null && r.ano !== '' ? String(r.ano) : ''
          return {
            ...r,
            mes,
            ano,
            mesAno: r.mes != null && r.ano != null && r.mes !== '' && r.ano !== '' ? `${String(r.mes).padStart(2, '0')}/${r.ano}` : '',
            ticket: (r.ticket && typeof r.ticket === 'string' && r.ticket.trim() !== '') ? r.ticket.trim() : '',
            filial: r.filial?.trim() ?? '',
            operadora: orNa(operadoraNome),
            responsavelAnalista: orNa(analistaNome),
            cliente: orNa(clienteNome),
            contrato: orNa(contratoLabel),
            produto: orNa(produtoNome),
            status: r.status?.trim() ?? '',
            dataInicio: r.dataInicio ? new Date(r.dataInicio).toLocaleString('pt-BR') : '',
            dataFinal: dataFim ? new Date(dataFim).toLocaleString('pt-BR') : '',
            dataAtualizacao: dataAtualizacao ? new Date(dataAtualizacao).toLocaleString('pt-BR') : '',
            qualidade: (r as any).qualidade?.trim() ?? '',
            qualidadeInformacao: (r as any).qualidadeInformacao?.trim() ?? '',
            planos: (r as any).planos?.trim() ?? '',
            responsavelConta: (r as any).responsavelConta?.trim() ?? '',
            solicitante: orNa(solicitanteNome),
            itensPendentes: (r as any).itensPendentes ?? '',
            itensConcluidos: (r as any).itensConcluidos ?? '',
            total: r.total != null ? Number(r.total) : (r.itensConcluidos ?? 0),
            dataAplicacao: (r as any).dataAplicacao ? new Date((r as any).dataAplicacao).toLocaleString('pt-BR') : '',
            observacoes: (r as any).observacoes?.trim() ?? '',
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : '',
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString('pt-BR') : '',
            _dataInicioRaw: r.dataInicio ?? dataAtualizacao ?? '',
            _dataFinalRaw: r.dataFinal ?? dataFim ?? r.dataInicio ?? dataAtualizacao ?? '',
            _analistaId: responsavelId
          }
        })}
        moduleName="reajustes"
        moduleTitle="Reajustes"
        appliedFilters={{
          'Meus Reajustes': showOnlyMyReajustes ? 'Sim' : 'Não',
          'Total na lista': finalFilteredItems.length
        }}
        columns={[
          { key: 'mes', label: 'Mês' },
          { key: 'ano', label: 'Ano' },
          { key: 'mesAno', label: 'Mês/Ano' },
          { key: 'ticket', label: 'Ticket' },
          { key: 'filial', label: 'Filial' },
          { key: 'operadora', label: 'Operadora' },
          { key: 'responsavelAnalista', label: 'Analista' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'produto', label: 'Produto' },
          { key: 'status', label: 'Status' },
          { key: 'dataInicio', label: 'Data Início' },
          { key: 'dataFinal', label: 'Data Fim' },
          { key: 'dataAtualizacao', label: 'Data Atualização' },
          { key: 'qualidade', label: 'Qualidade' },
          { key: 'qualidadeInformacao', label: 'Qualidade Informação' },
          { key: 'planos', label: 'Planos' },
          { key: 'responsavelConta', label: 'Responsável Conta' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'itensPendentes', label: 'Itens Pendentes' },
          { key: 'itensConcluidos', label: 'Itens Concluídos' },
          { key: 'total', label: 'Total' },
          { key: 'dataAplicacao', label: 'Data Aplicação' },
          { key: 'observacoes', label: 'Observações' },
          { key: 'createdAt', label: 'Criado em' },
          { key: 'updatedAt', label: 'Atualizado em' }
        ]}
      />
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useReajusteStore()
  const md = useMasterDataStore()
  const { canEdit, canDelete } = usePermissions('reajuste')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = async () => {
    try {
      const r = store.items.find((x) => x.id === id)
      if (!r) return
      const from = r.status
      const next = { ...r, status: newStatus, updatedAt: new Date().toISOString() }
      await store.upsert(next)
      store.log?.({ reajusteId: id, type: 'status_change', field: 'status', from, to: newStatus })
      setOpenStatus(false)
    } catch (error) {
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  const doDelete = async () => {
    try {
      await store.remove(id)
      setOpenDelete(false)
    } catch (error) {
      alert('Erro ao excluir reajuste.')
    }
  }

  const doDuplicate = async () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    
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
          // Buscar reajustes com o mesmo ticket
          const allReajustes = await api.getReajustes()
          const existing = Array.isArray(allReajustes) ? allReajustes.filter((r: any) => r.ticket === newTicket) : []
          
          if (existing.length === 0) {
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
      const newTicket = await generateUniqueTicket(r.ticket)
      
      const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _ticket, ...rest } = r
      const duplicated = await store.add({ 
        ...rest, 
        ticket: newTicket, // Usar novo ticket com sufixo
        status: 'Ativo', 
        updatedAt: new Date().toISOString() 
      })
      
      // Garantir navegação usando o ID real do backend
      let navigateId = duplicated?.id
      try {
        const { api } = await import('../../lib/api.local')
        const allReajustes = await api.getReajustes()
        const found = Array.isArray(allReajustes) ? allReajustes.find((r: any) => r.ticket === newTicket) : null
        if (found?.id) {
          navigateId = found.id
        }
      } catch (e) {
        console.warn('Não foi possível confirmar ID pelo ticket; usando ID retornado localmente', e)
      }
      
      navigate(`/reajuste/${navigateId}`)
    } catch (error) {
      alert('Erro ao duplicar reajuste.')
    }
  }

  const doExportPdf = () => {
    const r = store.items.find((x) => x.id === id)
    if (!r) return
    const label = (val?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === val)?.nome || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Reajuste ${r.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Reajuste ${r.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${r.status}</td></tr>
      <tr><td class="muted">Mês/Ano</td><td>${r.mes}/${r.ano}</td></tr>
      <tr><td class="muted">Filial</td><td>${r.filial || '-'}</td></tr>
      <tr><td class="muted">Operadora</td><td>${label(r.operadora, md.operadoras)}</td></tr>
      <tr><td class="muted">Analista</td><td>${label(r.responsavelAnalista, md.analistas)}</td></tr>
      <tr><td class="muted">Cliente</td><td>${label(r.cliente, md.clientes)}</td></tr>
      <tr><td class="muted">Contrato</td><td>${label(r.contrato, md.contratos.map(c => ({ id: c.id, nome: c.codigo })))}</td></tr>
      <tr><td class="muted">Produto</td><td>${label(r.produto, md.produtos)}</td></tr>
      <tr><td class="muted">Total</td><td>R$ ${r.total?.toLocaleString('pt-BR') || '0'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(r.updatedAt || new Date()).toLocaleString('pt-BR')}</td></tr>
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
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/reajuste/${id}`) }}>
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
          <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
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
            {['Ativo','Inativo','Pendente','Transf. Analista','Aprovado','Rejeitado'].map(s => (
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
        <DialogTitle>Excluir reajuste</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir este reajuste?</Typography>
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


