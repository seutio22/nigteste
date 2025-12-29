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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
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
  { field: 'total', headerName: 'Total', width: 120 },
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

  const STORAGE_KEY = 'reajustes-list-view-v1'
  const FILTER_KEY = 'reajustes-user-filter-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'updatedAt', sort: 'desc' } // Ordenar por data de atualização (mais recentes primeiro)
  ])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })
  const [showOnlyMyReajustes, setShowOnlyMyReajustes] = useState(true)


  // Filtrar dados por permissão do usuário
  const filteredItems = useFilteredData(items, user?.role, user?.id, false) // false = não filtrar por permissão

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
      
      // Se encontrou o analista correspondente, comparar IDs
      if (analistaCorrespondente) {
        return reajuste.responsavelAnalista === analistaCorrespondente.id
      }
      
      // Se não encontrou correspondência, retornar false (não mostrar)
      return false
    })
  }, [showOnlyMyReajustes, filteredItems, user?.name, md.analistas])

  // Debug logs
  console.log('🔍 ReajustePage: Total de items:', items.length)
  console.log('🔍 ReajustePage: FilteredItems:', filteredItems.length)
  console.log('🔍 ReajustePage: User:', user)
  console.log('🔍 ReajustePage: ShowOnlyMyReajustes:', showOnlyMyReajustes)
  console.log('🔍 ReajustePage: Analistas disponíveis:', md.analistas)
  
  // Debug do filtro
  if (showOnlyMyReajustes && user?.name) {
    const analistaCorrespondente = md.analistas.find(analista => 
      analista.nome.toLowerCase() === user?.name?.toLowerCase() ||
      analista.nome.toLowerCase().includes(user?.name?.toLowerCase() || '') ||
      (user?.name?.toLowerCase() || '').includes(analista.nome.toLowerCase())
    )
    console.log('🔍 ReajustePage: Analista correspondente ao usuário:', analistaCorrespondente)
    
    if (analistaCorrespondente) {
      const meusReajustes = filteredItems.filter(reajuste => reajuste.responsavelAnalista === analistaCorrespondente.id)
      console.log('🔍 ReajustePage: Reajustes do analista correspondente:', meusReajustes.length, meusReajustes)
    }
  }
  
  console.log('🔍 ReajustePage: FinalFilteredItems:', finalFilteredItems.length)


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
    console.log('🔄 ReajusteListPage: Carregando dados do banco...')
    if (store.syncFromApi) {
      store.syncFromApi().catch((error) => {
        console.error('❌ ReajusteListPage: Erro ao carregar dados:', error)
      })
    }
  }, [store.syncFromApi])

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    try {
      console.log('🗑️ Iniciando exclusão em massa de', selectedIds.length, 'reajustes')
      await store.remove(selectedIds)
      setSelectedIds([])
      setBulkDeleteDialogOpen(false)
      alert(`✅ ${selectedIds.length} reajuste(s) removido(s)!`)
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir reajustes')
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
          
          // Debug: Log dos dados recebidos do Excel
          console.log(`🔍 REAJUSTE IMPORT Item ${itemNumber} - Dados do Excel:`, {
            operadora: data.operadora || data.operadoraId,
            analista: data.responsavelAnalista || data.analista || data.responsavelAnalistaId,
            cliente: data.cliente || data.clienteId,
            contrato: data.contrato || data.contratoId,
            produto: data.produto || data.produtoId,
            mes: data.mes,
            ano: data.ano
          })
          
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

          // Função para encontrar nome por busca (seguindo padrão de Manutenção, mas retornando nome ao invés de ID)
          // Retorna o nome encontrado ou string vazia se não encontrar
          const findName = (name: string, items: any[], nameField: string = 'nome') => {
            if (!name || !name.trim()) return ''
            
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
            
            // Se encontrou, retornar o nome do item encontrado (padronizado)
            if (item) {
              return item[nameField] || item.nome || ''
            }
            
            // Se não encontrou, retornar string vazia (seguindo padrão de Manutenção)
            return ''
          }

          // Função para encontrar ID (para analistaId)
          const findId = (name: string, items: any[], nameField: string = 'nome') => {
            if (!name || !name.trim()) return ''
            
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
          
          // Debug: Log dos valores encontrados
          console.log(`🔍 REAJUSTE IMPORT Item ${itemNumber}:`, {
            operadora: { encontrado: !!operadoraNomeEncontrado, valor: operadoraNome },
            analista: { encontrado: !!responsavelAnalistaNomeEncontrado, id: analistaId, valor: responsavelAnalistaNome },
            cliente: { encontrado: !!clienteNomeEncontrado, valor: clienteNome },
            contrato: { encontrado: !!contratoCodigoEncontrado, valor: contratoCodigo },
            produto: { encontrado: !!produtoNomeEncontrado, valor: produtoNome }
          })

          // Validar campos obrigatórios
          if (!operadoraNome || operadoraNome.trim() === '') {
            console.warn(`⚠️ REAJUSTE IMPORT Item ${itemNumber}: Operadora é obrigatória e não foi encontrada. Valor original do Excel: "${data.operadora || data.operadoraId || ''}"`)
            errors.push(`Item ${itemNumber}: Operadora é obrigatória e não foi encontrada.`)
            totalImported++ // Contar como processado mesmo que tenha erro
            continue
          }
          
          if (!responsavelAnalistaNome || responsavelAnalistaNome.trim() === '') {
            console.warn(`⚠️ REAJUSTE IMPORT Item ${itemNumber}: Responsável Analista é obrigatório e não foi encontrado. Valor original do Excel: "${data.responsavelAnalista || data.analista || data.responsavelAnalistaId || ''}"`)
            errors.push(`Item ${itemNumber}: Responsável Analista é obrigatório e não foi encontrado.`)
            totalImported++ // Contar como processado mesmo que tenha erro
            continue
          }

          // Construir payload seguindo padrão de Manutenção
          const reajusteData: any = {
            // Campos obrigatórios (ReajusteLancamento usa String para mes e ano)
            mes: String(data.mes || new Date().getMonth() + 1),
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

          // Debug: Log do payload final antes de enviar
          console.log(`🚀 REAJUSTE IMPORT Item ${itemNumber} - Payload final:`, JSON.stringify(reajusteData, null, 2))

          // Salvar na API (usar endpoint correto para ReajusteLancamento)
          // SEGUINDO PADRÃO DE MANUTENÇÃO: api.post retorna os dados diretamente, não response.data
          try {
            const savedReajuste = await api.post('/reajusteLancamentos', reajusteData)
            console.log(`✅ REAJUSTE IMPORT Item ${itemNumber} - Reajuste salvo:`, savedReajuste?.id || 'sem ID')
            
            // Verificar se os dados foram salvos corretamente
            if (savedReajuste) {
              console.log(`✅ REAJUSTE IMPORT Item ${itemNumber} - Dados salvos:`, {
                id: savedReajuste.id,
                cliente: savedReajuste.cliente,
                contrato: savedReajuste.contrato,
                operadora: savedReajuste.operadora,
                produto: savedReajuste.produto,
                responsavelAnalista: savedReajuste.responsavelAnalista
              })
              
              // Verificar se algum campo importante está vazio
              if (!savedReajuste.cliente || !savedReajuste.contrato || !savedReajuste.operadora || !savedReajuste.responsavelAnalista) {
                console.warn(`⚠️ REAJUSTE IMPORT Item ${itemNumber} - Alguns campos estão vazios após salvar:`, {
                  cliente: savedReajuste.cliente || 'VAZIO',
                  contrato: savedReajuste.contrato || 'VAZIO',
                  operadora: savedReajuste.operadora || 'VAZIO',
                  responsavelAnalista: savedReajuste.responsavelAnalista || 'VAZIO'
                })
              }
            }
            
            totalImported++
            totalSavedToDatabase++
          } catch (apiError: any) {
            console.error(`❌ REAJUSTE IMPORT Item ${itemNumber} - Erro na API:`, apiError)
            console.error(`❌ REAJUSTE IMPORT Item ${itemNumber} - Resposta do erro:`, apiError?.response || apiError?.message)
            errors.push(`Item ${itemNumber}: Erro ao salvar - ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
            // NÃO fazer throw - seguir padrão de Manutenção e continuar processando outros itens
          }

        } catch (error: any) {
          console.error(`❌ REAJUSTE IMPORT Item ${itemNumber} - Erro geral:`, error)
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
      console.log(`✅ SMART IMPORT REAJUSTES: ${successMessage}`)
      console.log(`🔍 SMART IMPORT REAJUSTES: Detalhes do processamento:`)
      console.log(`  - Total de itens válidos no resultado: ${totalFromResult}`)
      console.log(`  - Total de itens processados: ${totalImported}`)
      console.log(`  - Total salvos no banco: ${totalSavedToDatabase}`)
      console.log(`  - Total de erros: ${errors.length}`)
      if (errors.length > 0) {
        console.warn('⚠️ SMART IMPORT REAJUSTES: Erros ocorridos:', errors)
      }

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


  const rows = finalFilteredItems.map((r) => ({
    id: r.id,
    ticket: r.ticket ?? '',
    mesAno: `${r.mes}/${r.ano}`,
    filial: r.filial ?? '',
    operadora: md.operadoras.find(o => o.id === r.operadora)?.nome ?? '',
    responsavelAnalista: md.analistas.find(a => a.id === r.responsavelAnalista)?.nome ?? '',
    cliente: md.clientes.find(c => c.id === r.cliente)?.nome ?? '',
    contrato: md.contratos.find(c => c.id === r.contrato)?.codigo ?? '',
    produto: md.produtos.find(p => p.id === r.produto)?.nome ?? '',
    status: r.status ?? 'Ativo',
    total: r.total ?? 0,
    // Manter o valor original da data (ISO string) para ordenação correta
    // A formatação será feita pelo valueFormatter da coluna
    updatedAt: r.updatedAt || '',
  }))
  
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
          // Gerar campo mesAno a partir de mes e ano
          mesAno: r.mes && r.ano ? `${String(r.mes).padStart(2, '0')}/${r.ano}` : 'N/A',
          // Incluir campo ticket (garantir que seja string ou 'N/A')
          ticket: (r.ticket && typeof r.ticket === 'string' && r.ticket.trim() !== '') ? r.ticket.trim() : 'N/A',
          // Mapear IDs para nomes legíveis
          responsavelAnalista: md.analistas.find(a => a.id === r.responsavelAnalista)?.nome ?? r.responsavelAnalista ?? 'N/A',
          area: md.areas.find(ar => ar.id === r.area)?.nome ?? r.area ?? 'N/A',
          cliente: md.clientes.find(c => c.id === r.cliente)?.nome ?? r.cliente ?? 'N/A',
          contrato: md.contratos.find(c => c.id === r.contrato)?.numero ?? r.contrato ?? 'N/A',
          operadora: md.operadoras.find(o => o.id === r.operadora)?.nome ?? r.operadora ?? 'N/A',
          produto: md.produtos.find(p => p.id === r.produto)?.nome ?? r.produto ?? 'N/A',
          sistema: md.sistemas.find(s => s.id === r.sistema)?.nome ?? r.sistema ?? 'N/A',
          tipo: md.tiposDemanda.find(t => t.id === r.tipo)?.nome ?? r.tipo ?? 'N/A',
          tipoServico: md.tiposServico.find(ts => ts.id === r.tipoServico)?.nome ?? r.tipoServico ?? 'N/A',
          // Formatar datas
          dataInicio: r.dataInicio ? new Date(r.dataInicio).toLocaleString('pt-BR') : 'N/A',
          dataFinal: r.dataFinal ? new Date(r.dataFinal).toLocaleString('pt-BR') : 'N/A',
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString('pt-BR') : 'N/A',
          // Formatar valores monetários
          total: r.total ? `R$ ${r.total.toLocaleString('pt-BR')}` : 'R$ 0,00'
        }))}
        moduleName="reajustes"
        moduleTitle="Reajustes"
        appliedFilters={{
          'Meus Reajustes': showOnlyMyReajustes ? 'Sim' : 'Não',
          'Total de Registros': finalFilteredItems.length
        }}
        columns={[
          { key: 'mesAno', label: 'Mês/Ano' },
          { key: 'ticket', label: 'Ticket' },
          { key: 'filial', label: 'Filial' },
          { key: 'operadora', label: 'Operadora' },
          { key: 'responsavelAnalista', label: 'Analista' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'produto', label: 'Produto' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Total' },
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
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  const doDelete = async () => {
    try {
      await store.remove(id)
      setOpenDelete(false)
    } catch (error) {
      console.error('Erro ao excluir reajuste:', error)
      alert('Erro ao excluir reajuste. Verifique o console para mais detalhes.')
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
      console.error('Erro ao duplicar reajuste:', error)
      alert('Erro ao duplicar reajuste. Verifique o console para mais detalhes.')
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
            {['Ativo','Inativo','Pendente','Aprovado','Rejeitado'].map(s => (
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


