import React, { useState, useMemo } from 'react'
import { Paper, Typography, Box, Button, Alert } from '@mui/material'
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { useOptimizedMasterData } from '../store/optimizedMasterDataStore'
import { usePaginatedData, clearCache } from '../hooks/usePaginatedData'
import OptimizedDataGrid from '../components/OptimizedDataGrid'
import { DadosHeader } from '../components/DadosHeader'
import { DadosTabs } from '../components/DadosTabs'
import { DadosForm } from '../components/DadosForm'
import { DadosHelpModal } from '../components/DadosHelpModal'
import type { TabKey } from '../types/dados'

// Configuração das colunas para cada entidade
const getColumns = (entity: TabKey) => {
  const baseColumns = [
    { field: 'id', headerName: 'ID', width: 100, hide: true },
    { field: 'createdAt', headerName: 'Criado em', width: 150, hide: true },
    { field: 'updatedAt', headerName: 'Atualizado em', width: 150, hide: true }
  ]

  switch (entity) {
    case 'clientes':
      return [
        ...baseColumns,
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 200 },
        { field: 'grupoEconomico', headerName: 'Grupo Econômico', width: 200 }
      ]
    
    case 'contratos':
      return [
        ...baseColumns,
        { field: 'codigo', headerName: 'Código', width: 150 },
        { field: 'cliente', headerName: 'Cliente', flex: 1, minWidth: 200 },
        { field: 'status', headerName: 'Status', width: 100 },
        { field: 'dataInicio', headerName: 'Data Início', width: 120 },
        { field: 'dataFim', headerName: 'Data Fim', width: 120 }
      ]
    
    case 'analistas':
      return [
        ...baseColumns,
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 200 },
        { field: 'email', headerName: 'E-mail', width: 200 },
        { field: 'telefone', headerName: 'Telefone', width: 150 },
        { field: 'cargo', headerName: 'Cargo', width: 150 }
      ]
    
    case 'operadoras':
    case 'produtos':
    case 'sistemas':
    case 'areas':
    case 'tiposServico':
    case 'tiposDemanda':
    case 'tiposCadastro':
    case 'solicitantes':
    case 'relatorios':
    case 'modelos':
      return [
        ...baseColumns,
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 200 },
        { field: 'descricao', headerName: 'Descrição', flex: 1, minWidth: 200 }
      ]
    
    default:
      return [
        ...baseColumns,
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 200 }
      ]
  }
}

export default function DadosOptimizedPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('clientes')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [showOnlyActiveContracts, setShowOnlyActiveContracts] = useState(false)

  const optimizedStore = useOptimizedMasterData()

  // Mapear endpoints
  const endpointMap: Record<TabKey, string> = {
    clientes: 'clientes',
    contratos: 'contratos',
    operadoras: 'operadoras',
    produtos: 'produtos',
    sistemas: 'sistemas',
    analistas: 'analistas',
    areas: 'areas',
    tiposServico: 'tiposServico',
    tiposDemanda: 'tiposDemanda',
    tiposCadastro: 'tiposCadastro',
    solicitantes: 'solicitantes',
    relatorios: 'relatorios',
    modelos: 'modelos',
    padrao: 'padrao',
    configuracoes: 'dados'
  }

  const currentEndpoint = endpointMap[activeTab]
  const columns = getColumns(activeTab)

  // Hook de dados paginados
  const {
    data,
    pagination,
    isLoading,
    error,
    refetch,
    setSearch,
    setLimit
  } = usePaginatedData(currentEndpoint, {
    limit: 50,
    cacheTime: 10 * 60 * 1000 // 10 minutos para dados mestres
  })

  // Filtrar dados se necessário (ex: contratos ativos)
  const filteredData = useMemo(() => {
    if (activeTab === 'contratos' && showOnlyActiveContracts) {
      return data.filter((item: any) => item.status === 'Ativo')
    }
    return data
  }, [data, activeTab, showOnlyActiveContracts])

  // Handlers
  const handleAdd = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingItem(null)
    // Refetch dados após edição
    refetch()
    // Limpar cache para forçar atualização
    clearCache(currentEndpoint)
  }

  const handleRefresh = () => {
    refetch()
    clearCache(currentEndpoint)
  }

  const handleSearch = (searchTerm: string) => {
    setSearch(searchTerm)
  }

  const handleTabChange = (newTab: TabKey) => {
    setActiveTab(newTab)
    // Resetar busca ao trocar de aba
    setSearch('')
  }

  const handleToggleActiveContracts = () => {
    setShowOnlyActiveContracts(!showOnlyActiveContracts)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <DadosHeader
        title="Dados Mestres Otimizados"
        subtitle="Gerenciamento eficiente de dados com paginação e cache inteligente"
        onHelp={() => setIsHelpOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {/* Alert de Performance */}
      <Alert severity="info" sx={{ mb: 2 }}>
        🚀 <strong>Versão Otimizada:</strong> Esta página usa paginação no servidor, 
        cache inteligente e carregamento sob demanda para melhor performance.
      </Alert>

      {/* Tabs */}
      <DadosTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showOnlyActiveContracts={showOnlyActiveContracts}
        onToggleActiveContracts={handleToggleActiveContracts}
      />

      {/* Grid Otimizado */}
      <Box sx={{ mt: 2 }}>
        <OptimizedDataGrid
          endpoint={currentEndpoint}
          columns={columns}
          title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          searchPlaceholder={`Buscar ${activeTab}...`}
          initialPageSize={50}
          pageSizeOptions={[25, 50, 100, 200]}
          cacheTime={10 * 60 * 1000}
          onRowClick={handleEdit}
          customToolbar={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              size="small"
            >
              Adicionar
            </Button>
          }
          additionalFilters={
            activeTab === 'contratos' && (
              <Button
                variant={showOnlyActiveContracts ? "contained" : "outlined"}
                size="small"
                onClick={handleToggleActiveContracts}
              >
                Apenas Ativos
              </Button>
            )
          }
        />
      </Box>

      {/* Formulário */}
      <DadosForm
        open={isFormOpen}
        onClose={handleFormClose}
        activeTab={activeTab}
        editingItem={editingItem}
        onSuccess={handleFormClose}
      />

      {/* Modal de Ajuda */}
      <DadosHelpModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </Box>
  )
}
