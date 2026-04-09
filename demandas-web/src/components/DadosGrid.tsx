import React, { useMemo } from 'react'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { IconButton, Chip, FormControlLabel, Switch, Box, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useMasterDataStore } from '../store/masterDataStore'
import type { TabKey, DataMap } from '../types/dadosTypes'

interface DadosGridProps {
  activeTab: TabKey
  data: any[]
  onEdit: (row: any) => void
  onDelete: (id: string) => void
}

export const DadosGrid: React.FC<DadosGridProps> = ({
  activeTab,
  data,
  onEdit,
  onDelete
}) => {
  const { showOnlyActiveContracts, toggleActiveContractsFilter, syncFromApi } = useMasterDataStore()
  
  // Função para lidar com mudança do toggle
  const handleToggleChange = async () => {
    toggleActiveContractsFilter()
    // Sincronização desabilitada temporariamente para evitar travamento
    // TODO: Reabilitar após otimização completa — if (syncFromApi) await syncFromApi()
  }

  const columns = useMemo((): GridColDef[] => {
    const baseColumns: Record<TabKey, GridColDef[]> = {
      clientes: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'grupoEconomico', headerName: 'Grupo econômico', flex: 1 },
      ],
      contratos: [
        { field: 'grupoEconomico', headerName: 'Grupo econômico', width: 180 },
        { field: 'codigo', headerName: 'Código', flex: 1 },
        { 
          field: 'status', 
          headerName: 'Status', 
          width: 120, 
          renderCell: (params) => (
            <Chip 
              label={params.value || 'Ativo'} 
              color={params.value === 'Ativo' ? 'success' : 'default'} 
              size="small" 
              variant={params.value === 'Ativo' ? 'filled' : 'outlined'}
            />
          )
        },
      ],
      operadoras: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      produtos: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      sistemas: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      grupos: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      analistas: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1 },
      ],
      areas: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      areasMailling: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      cargosMailling: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      filiaisMailling: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      tipos: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
          field: 'ativo',
          headerName: 'No cadastro',
          width: 130,
          renderCell: (params) => (
            <Chip
              label={params.value === false ? 'Inativo' : 'Ativo'}
              color={params.value === false ? 'default' : 'success'}
              size="small"
              variant={params.value === false ? 'outlined' : 'filled'}
            />
          ),
        },
      ],
      servicos: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'descricao', headerName: 'Descrição', flex: 2 },
      ],
      solicitantes: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      relatorios: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      modelos: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      'tipos-cadastro': [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'descricao', headerName: 'Descrição', flex: 2 },
      ],
      padrao: [
        { field: 'nome', headerName: 'Nome', flex: 1 },
      ],
      configuracoes: [
        { field: 'chave', headerName: 'Chave', flex: 1 },
        { field: 'valor', headerName: 'Valor', flex: 1 },
        { field: 'tipo', headerName: 'Tipo', width: 150 },
        { field: 'categoria', headerName: 'Categoria', width: 150 },
        { 
          field: 'ativo', 
          headerName: 'Ativo', 
          width: 100, 
          renderCell: (params) => (
            <Chip 
              label={params.value ? 'Sim' : 'Não'} 
              color={params.value ? 'success' : 'default'} 
              size="small" 
            />
          )
        },
      ],
      categorias: [{ field: 'nome', headerName: 'Nome', flex: 1 }],
      periodicidades: [{ field: 'nome', headerName: 'Nome', flex: 1 }],
      status: [{ field: 'nome', headerName: 'Nome', flex: 1 }],
    }

    const baseCols = baseColumns[activeTab] || []
    
    // Adicionar coluna de ações
    const actionsColumn: GridColDef = {
      field: 'acoes',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex gap-1">
          <IconButton 
            color="primary" 
            size="small" 
            onClick={() => onEdit(params.row)}
            title="Editar"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            color="error" 
            size="small" 
            onClick={() => onDelete(params.row.id)}
            title="Excluir"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      )
    }

    return [...baseCols, actionsColumn]
  }, [activeTab, onEdit, onDelete])

  return (
    <div style={{ height: 600, width: '100%' }}>
      {/* Toggle para filtrar apenas contratos ativos - apenas na aba de contratos */}
      {activeTab === 'contratos' && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyActiveContracts}
                onChange={handleToggleChange}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Mostrar apenas contratos ativos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {showOnlyActiveContracts 
                    ? 'Mostrando apenas contratos ativos' 
                    : 'Mostrando todos os contratos (ativos e inativos)'
                  }
                </Typography>
              </Box>
            }
          />
        </Box>
      )}
      
      <DataGrid
        rows={data}
        columns={columns}
        getRowId={(r) => (r as any).id}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        sx={{
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #e0e0e0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            borderBottom: '2px solid #e0e0e0',
          },
        }}
      />
    </div>
  )
}
