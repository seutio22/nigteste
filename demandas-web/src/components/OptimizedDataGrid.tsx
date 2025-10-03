import React, { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid'
import usePaginatedData from '../hooks/usePaginatedData'

export interface OptimizedDataGridProps {
  endpoint: string
  columns: GridColDef[]
  title?: string
  searchPlaceholder?: string
  initialPageSize?: number
  pageSizeOptions?: number[]
  showSearch?: boolean
  showPageSize?: boolean
  showRefresh?: boolean
  cacheTime?: number
  onRowClick?: (row: any) => void
  getRowId?: (row: any) => string
  customToolbar?: React.ReactNode
  additionalFilters?: React.ReactNode
}

export default function OptimizedDataGrid({
  endpoint,
  columns,
  title,
  searchPlaceholder = 'Buscar...',
  initialPageSize = 50,
  pageSizeOptions = [25, 50, 100, 200],
  showSearch = true,
  showPageSize = true,
  showRefresh = true,
  cacheTime,
  onRowClick,
  getRowId = (row) => row.id,
  customToolbar,
  additionalFilters
}: OptimizedDataGridProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pageSize, setPageSize] = useState(initialPageSize)

  // Debounce da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data,
    pagination,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit
  } = usePaginatedData(endpoint, {
    limit: pageSize,
    search: debouncedSearch,
    cacheTime
  })

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
  }, [setPage])

  const handlePageSizeChange = useCallback((event: any) => {
    const newPageSize = event.target.value
    setPageSize(newPageSize)
    setLimit(newPageSize)
  }, [setLimit])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }, [])

  // Configurar colunas com ações
  const enhancedColumns = useMemo(() => {
    const cols = [...columns]
    
    // Adicionar coluna de ações se não existir
    const hasActions = cols.some(col => col.field === 'acoes')
    if (!hasActions && onRowClick) {
      cols.unshift({
        field: 'acoes',
        headerName: 'Ações',
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Ver detalhes">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onRowClick(params.row)
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      })
    }
    
    return cols
  }, [columns, onRowClick])

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar dados: {error}
        </Alert>
        <Box display="flex" gap={2}>
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {(title || showSearch || showRefresh || additionalFilters) && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            {title && (
              <Typography variant="h6" component="h2">
                {title}
              </Typography>
            )}
            
            <Box display="flex" gap={1} alignItems="center">
              {showRefresh && (
                <Tooltip title="Atualizar dados">
                  <IconButton onClick={handleRefresh} disabled={isLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
              {customToolbar}
            </Box>
          </Box>

          {/* Filtros */}
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            {showSearch && (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 250 }}
              />
            )}
            
            {showPageSize && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Itens por página</InputLabel>
                <Select
                  value={pageSize}
                  label="Itens por página"
                  onChange={handlePageSizeChange}
                >
                  {pageSizeOptions.map(size => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {additionalFilters}
          </Box>
        </Box>
      )}

      {/* DataGrid */}
      <Box sx={{ flex: 1, minHeight: 400 }}>
        <DataGrid
          rows={data}
          columns={enhancedColumns}
          getRowId={getRowId}
          loading={isLoading}
          components={{
            Toolbar: customToolbar ? undefined : GridToolbar
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: false, // Usamos nossa própria busca
              csvOptions: { disableToolbarButton: false },
              printOptions: { disableToolbarButton: false }
            }
          }}
          onRowClick={onRowClick}
          disableSelectionOnClick
          disableColumnMenu
          pageSize={pageSize}
          hideFooterPagination // Usamos nossa própria paginação
          hideFooter
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f0f0f0'
            }
          }}
        />
      </Box>

      {/* Paginação customizada */}
      {pagination && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} itens
            </Typography>
            
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              disabled={isLoading}
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Paper>
  )
}
