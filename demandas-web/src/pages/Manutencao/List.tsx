import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Chip } from '@mui/material'
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
import { useEffect, useState } from 'react'
import ExportDataModal from '../../components/ExportDataModal'
import { usePermissions } from '../../hooks/usePermissions'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
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
  { field: 'updatedAt', headerName: 'Atualizado em', width: 160 },
]

export default function ManutencaoListPage() {
  const navigate = useNavigate()
  const { items } = useManutencaoStore()
  const manutencaoStore = useManutencaoStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const { canCreate, canImport, canExport, canDelete } = usePermissions('manutencao')
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [showOnlyMyManutencoes, setShowOnlyMyManutencoes] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

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
  
  const finalFilteredItems = showOnlyMyManutencoes
    ? items.filter(manutencao => {
        // Buscar o analista correspondente ao usuário logado
        const analista = md.analistas.find(a => a.id === manutencao.analistaId)
        
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
    : items

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
      if (user?.id) {
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
    try {
      const { api } = await import('../../lib/api.local')
      
      console.log('🗑️ Iniciando exclusão em massa de', selectedIds.length, 'manutenções')
      
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
            console.log(`⚠️ Manutenção ${id} já foi excluída (404) - removendo do cache local`)
            notFoundCount++
          } else {
            console.error(`❌ Erro ao excluir manutenção ${id}:`, error)
            errorCount++
          }
        }
      }
      
      // Atualizar store local (remover TODOS os IDs, incluindo os 404)
      manutencaoStore.remove(selectedIds)
      
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
      manutencaoStore.syncFromApi()
    } catch (error) {
      console.error('❌ Erro na exclusão em massa:', error)
      alert('Erro ao excluir manutenções')
    }
  }

  // Função do Importador Inteligente
  const handleSmartImport = async (result: ImportResult) => {
    try {
      const { api } = await import('../../lib/api.local')
      let totalImported = 0
      let totalSavedToDatabase = 0
      const errors: string[] = []

      console.log('🔍 SMART IMPORT MANUTENÇÕES: Processando resultado:', result)

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
            console.log(`🔍 SMART IMPORT MANUTENÇÕES: Buscando "${name}" (normalizado: "${searchNormalized}") em ${items.length} itens, encontrado: ${foundItem}`)
            
            if (item) {
              console.log(`✅ SMART IMPORT MANUTENÇÕES: Match encontrado - "${name}" -> "${item.nome || item[nameField]}" (${item.id})`)
            } else {
              console.log(`❌ SMART IMPORT MANUTENÇÕES: Nenhum match encontrado para "${name}"`)
              console.log(`🔍 SMART IMPORT MANUTENÇÕES: Itens disponíveis:`, items.map(i => i.nome || i[nameField]))
            }
            
            return item?.id || ''
          }

                  // Debug: verificar dados disponíveis apenas se necessário
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔍 SMART IMPORT MANUTENÇÕES: Dados disponíveis para mapeamento:')
                    console.log('  - tiposCadastro:', md.tiposCadastro.length, 'itens')
                    console.log('  - padrao:', md.padrao.length, 'itens')
                    console.log('  - analistas:', md.analistas.length, 'itens')
                  }

                  // Mapear dados para o formato de manutenção
                  const tipoServicoId = findIdByName(data.tipoServico || data.tipoServicoId, md.tiposCadastro)
                  const tipoId = findIdByName(data.tipo || data.tipoId, md.padrao)
                  const analistaId = findIdByName(data.analista || data.analistaId, md.analistas)

                  // Debug: mapeamento de campos apenas em desenvolvimento
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔍 SMART IMPORT MANUTENÇÕES: Mapeamento de campos:')
                    console.log('  - tipoServico:', data.tipoServico, '-> tipoServicoId:', tipoServicoId)
                    console.log('  - tipo:', data.tipo, '-> tipoId:', tipoId)
                    console.log('  - analista:', data.analista, '-> analistaId:', analistaId)
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
            qtdClientesVinculados: data.qtdClientesVinculados || data.clientesVinculados || 0,
            usuariosEmpresa: data.usuariosEmpresa || data.usuarios || 0
          }

          // Campos vazios já são filtrados na construção do objeto

          console.log('🔍 SMART IMPORT MANUTENÇÕES: Salvando manutenção:', manutencaoData)

          // Salvar na API
          const savedManutencao = await api.post('/manutencoes', manutencaoData)
          console.log('✅ SMART IMPORT MANUTENÇÕES: Manutenção salva:', savedManutencao.id)
          
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
      console.log(`✅ SMART IMPORT MANUTENÇÕES: ${successMessage}`)
      console.log(`🔍 SMART IMPORT MANUTENÇÕES: Detalhes do processamento:`)
      console.log(`  - Total de itens válidos no resultado: ${totalFromResult}`)
      console.log(`  - Total de itens processados: ${totalImported}`)
      console.log(`  - Total salvos no banco: ${totalSavedToDatabase}`)
      console.log(`  - Total de erros: ${errors.length}`)

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


  const rows = finalFilteredItems.map((d) => {
    // Gerar ticket se não existir
    const generateTicket = (id: string) => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const random = Math.random().toString(36).substr(2, 4).toUpperCase()
      return `MAN-${year}${month}${day}-${random}`
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
          return md.analistas.find(a => a.id === d.analista)?.nome ?? d.analista
        }
        
        // Se d.analistaId existe, buscar o nome
        if (d.analistaId) {
          return md.analistas.find(a => a.id === d.analistaId)?.nome ?? d.analistaId
        }
        
        return d.analista || ''
      })(),
      area: (() => {
        if (d.area && typeof d.area === 'string' && d.area.length > 20) {
          return md.areas.find(ar => ar.id === d.area)?.nome ?? d.area
        }
        
        // Se d.areaId existe, buscar o nome
        if (d.areaId) {
          return md.areas.find(ar => ar.id === d.areaId)?.nome ?? d.areaId
        }
        
        return d.area || ''
      })(),
      cliente: (() => {
        if (d.cliente && typeof d.cliente === 'string' && d.cliente.length > 20) {
          return md.clientes.find(c => c.id === d.cliente)?.nome ?? d.cliente
        }
        
        // Se d.clienteId existe, buscar o nome
        if (d.clienteId) {
          return md.clientes.find(c => c.id === d.clienteId)?.nome ?? d.clienteId
        }
        
        return d.cliente || ''
      })(),
      contrato: (() => {
        if (d.contrato && typeof d.contrato === 'string' && d.contrato.length > 20) {
          return md.contratos.find(c => c.id === d.contrato)?.numero ?? d.contrato
        }
        
        // Se d.contratoId existe, buscar o código
        if (d.contratoId) {
          return md.contratos.find(c => c.id === d.contratoId)?.numero ?? d.contratoId
        }
        
        return d.contrato || ''
      })(),
      operadora: (() => {
        if (d.operadora && typeof d.operadora === 'string' && d.operadora.length > 20) {
          return md.operadoras.find(o => o.id === d.operadora)?.nome ?? d.operadora
        }
        
        // Se d.operadoraId existe, buscar o nome
        if (d.operadoraId) {
          return md.operadoras.find(o => o.id === d.operadoraId)?.nome ?? d.operadoraId
        }
        
        return d.operadora || ''
      })(),
      produto: (() => {
        if (d.produto && typeof d.produto === 'string' && d.produto.length > 20) {
          return md.produtos.find(p => p.id === d.produto)?.nome ?? d.produto
        }
        
        // Se d.produtoId existe, buscar o nome
        if (d.produtoId) {
          return md.produtos.find(p => p.id === d.produtoId)?.nome ?? d.produtoId
        }
        
        return d.produto || ''
      })(),
      tipoServico: (() => {
        if (d.tipoServico && typeof d.tipoServico === 'string' && d.tipoServico.length > 20) {
          // Usar tiposCadastro para tipo de serviço
          const tipoServico = md.tiposCadastro.find(ts => ts.id === d.tipoServico)
          return tipoServico?.nome ?? d.tipoServico
        }
        
        // Se d.tipoServicoId existe, buscar o nome
        if (d.tipoServicoId) {
          const tipoServico = md.tiposCadastro.find(ts => ts.id === d.tipoServicoId)
          return tipoServico?.nome ?? d.tipoServicoId
        }
        
        return d.tipoServico || ''
      })(),
      tipo: (() => {
        if (d.tipo && typeof d.tipo === 'string' && d.tipo.length > 20) {
        // Buscar o tipo de manutenção nos dados mestres (padrao)
        const tipo = md.padrao.find(p => p.id === d.tipo)
        return tipo?.nome ?? d.tipo
        }
        
        // Se d.tipoId existe, buscar o nome
        if (d.tipoId) {
          const tipo = md.padrao.find(p => p.id === d.tipoId)
          return tipo?.nome ?? d.tipoId
        }
        
        return d.tipo || ''
      })(),
      updatedAt: new Date(d.updatedAt).toLocaleString('pt-BR'),
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
                  label={`${finalFilteredItems.length} manutenção${finalFilteredItems.length !== 1 ? 'ões' : ''}`}
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
                  onClick={() => navigate('/manutencao/nova')}
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
                  Nova Manutenção
                </Button>
              )}
            </Stack>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6" style={{ minHeight: '400px' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
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

      {/* Modal de Exportação */}
      <ExportDataModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={finalFilteredItems.map(d => ({
          ...d,
          // Mapear IDs para nomes legíveis
          analista: md.analistas.find(a => a.id === d.analistaId)?.nome ?? d.analista ?? 'N/A',
          area: md.areas.find(ar => ar.id === d.areaId)?.nome ?? d.area ?? 'N/A',
          cliente: md.clientes.find(c => c.id === d.clienteId)?.nome ?? d.cliente ?? 'N/A',
          contrato: md.contratos.find(c => c.id === d.contratoId)?.numero ?? d.contrato ?? 'N/A',
          operadora: md.operadoras.find(o => o.id === d.operadoraId)?.nome ?? d.operadora ?? 'N/A',
          produto: md.produtos.find(p => p.id === d.produtoId)?.nome ?? d.produto ?? 'N/A',
          sistema: md.sistemas.find(s => s.id === d.sistemaId)?.nome ?? d.sistema ?? 'N/A',
          tipoServico: md.tiposCadastro.find(ts => ts.id === d.tipoServicoId)?.nome ?? d.tipoServico ?? 'N/A',
          tipo: md.padrao.find(p => p.id === d.tipoId)?.nome ?? d.tipo ?? 'N/A',
          // Formatar datas
          dataInicio: d.dataInicio ? new Date(d.dataInicio).toLocaleDateString('pt-BR') : 'N/A',
          dataFinal: d.dataFinal ? new Date(d.dataFinal).toLocaleDateString('pt-BR') : 'N/A',
          createdAt: d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : 'N/A',
          updatedAt: d.updatedAt ? new Date(d.updatedAt).toLocaleString('pt-BR') : 'N/A',
          // Campos numéricos
          qtdRetornos: d.qtdRetornos ?? 0,
          qtdClientesVinculados: d.qtdClientesVinculados ?? 0,
          usuariosEmpresa: d.usuariosEmpresa ?? 0,
          // Campos de texto
          solicitante: d.solicitante ?? 'N/A',
          observacoes: d.observacoes ?? 'N/A',
          qualidade: d.qualidade ?? 'N/A'
        }))}
        moduleName="manutencoes"
        moduleTitle="Manutenções"
        appliedFilters={{
          'Minhas Manutenções': showOnlyMyManutencoes ? 'Sim' : 'Não',
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
          { key: 'sistema', label: 'Sistema' },
          { key: 'tipoServico', label: 'Tipo de Serviço' },
          { key: 'tipo', label: 'Tipo de Manutenção' },
          { key: 'solicitante', label: 'Solicitante' },
          { key: 'dataInicio', label: 'Data de Início' },
          { key: 'dataFinal', label: 'Data Final' },
          { key: 'qtdRetornos', label: 'Qtd Retornos' },
          { key: 'qualidade', label: 'Qualidade' },
          { key: 'qtdClientesVinculados', label: 'Qtd Clientes Vinculados' },
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
        onClose={() => setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{selectedIds.length}</strong> manutenção(ões) selecionada(s)?
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
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useManutencaoStore()
  const md = useMasterDataStore()
  const { canEdit, canDelete } = usePermissions('manutencao')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const from = d.status
    const next = { ...d, status: newStatus, updatedAt: new Date().toISOString() }
    store.upsert(next)
    store.log?.({ demandaId: id, type: 'status_change', field: 'status', from, to: newStatus })
    setOpenStatus(false)
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
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    
    try {
      // Função para gerar ticket único com sufixo numérico
      const generateUniqueTicket = async (originalTicket: string | undefined): Promise<string | undefined> => {
        if (!originalTicket || originalTicket.trim() === '') {
          return undefined // Se não tinha ticket, retornar undefined
        }
        
        // Verificar se o ticket original já tem sufixo numérico (ex: "1212-1")
        const ticketMatch = originalTicket.match(/^(.+)-(\d+)$/)
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
          const existing = await api.getManutencoes(`?ticket=${encodeURIComponent(newTicket)}`)
          if (!Array.isArray(existing) || existing.length === 0) {
            // Ticket disponível encontrado
            console.log(`✅ Ticket único gerado: ${newTicket}`)
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
      
      const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _ticket, ...rest } = d
      const duplicated = await store.add({ 
        ...rest, 
        ticket: newTicket, // Usar novo ticket com sufixo
        status: 'Aberta', 
        updatedAt: new Date().toISOString() 
      })
      navigate(`/manutencao/${duplicated.id}`)
    } catch (error) {
      console.error('Erro ao duplicar manutenção:', error)
      alert('Erro ao duplicar manutenção. Verifique o console para mais detalhes.')
    }
  }

  const doExportPdf = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const label = (val?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === val)?.nome || '-'
    const contrato = md.contratos.find(c => c.id === d.contrato)?.codigo || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manutenção ${d.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Manutenção ${d.id}</h1>
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
            {['Aberta','Em andamento','Aguardando validação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => (
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
