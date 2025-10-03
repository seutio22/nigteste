import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../lib/api'

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

export interface UsePaginatedDataOptions {
  page?: number
  limit?: number
  search?: string
  enabled?: boolean
  cacheTime?: number // em milissegundos
}

export interface UsePaginatedDataReturn<T> {
  data: T[]
  pagination: PaginationInfo | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  setPage: (page: number) => void
  setSearch: (search: string) => void
  setLimit: (limit: number) => void
}

// Cache global para otimização
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

function usePaginatedData<T = any>(
  endpoint: string,
  options: UsePaginatedDataOptions = {}
): UsePaginatedDataReturn<T> {
  const {
    page: initialPage = 1,
    limit: initialLimit = 50,
    search: initialSearch = '',
    enabled = true,
    cacheTime = 5 * 60 * 1000 // 5 minutos
  } = options

  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [search, setSearch] = useState(initialSearch)
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gerar chave do cache baseada nos parâmetros
  const cacheKey = useMemo(() => {
    return `${endpoint}:${page}:${limit}:${search}`
  }, [endpoint, page, limit, search])

  // Verificar se os dados estão em cache
  const getCachedData = useCallback(() => {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    // Remove dados expirados do cache
    if (cached) {
      cache.delete(cacheKey)
    }
    return null
  }, [cacheKey])

  // Buscar dados da API
  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      // Verificar cache primeiro
      const cachedData = getCachedData()
      if (cachedData) {
        console.log(`🎯 Cache hit para ${cacheKey}`)
        setData(cachedData.data)
        setPagination(cachedData.pagination)
        setIsLoading(false)
        return
      }

      console.log(`🔄 Buscando dados de ${endpoint} - Página: ${page}, Limite: ${limit}, Busca: "${search}"`)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      })

      const response = await api.get(`${endpoint}?${params}`)
      
      // Armazenar no cache
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
        ttl: cacheTime
      })

      setData(response.data || [])
      setPagination(response.pagination || null)
      
      console.log(`✅ Dados carregados: ${response.data?.length || 0} itens, Total: ${response.pagination?.total || 0}`)
    } catch (err: any) {
      console.error(`❌ Erro ao buscar dados de ${endpoint}:`, err)
      setError(err.message || 'Erro ao carregar dados')
      setData([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, page, limit, search, enabled, cacheTime, getCachedData, cacheKey])

  // Função para refetch manual
  const refetch = useCallback(async () => {
    // Limpar cache para forçar nova busca
    cache.delete(cacheKey)
    await fetchData()
  }, [fetchData, cacheKey])

  // Buscar dados quando os parâmetros mudarem
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Funções para atualizar parâmetros
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setPage(1) // Resetar para primeira página ao buscar
  }, [])

  const handleSetLimit = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Resetar para primeira página ao mudar limite
  }, [])

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch,
    setPage: handleSetPage,
    setSearch: handleSetSearch,
    setLimit: handleSetLimit
  }
}

export default usePaginatedData

// Hook específico para dados mestres (mais otimizado)
export function useMasterData<T = any>(
  endpoint: string,
  options: Omit<UsePaginatedDataOptions, 'limit'> = {}
) {
  return usePaginatedData<T>(endpoint, {
    ...options,
    limit: 100, // Limite maior para dados mestres
    cacheTime: 10 * 60 * 1000 // 10 minutos de cache para dados mestres
  })
}

// Hook para limpar cache quando necessário
export function clearCache(endpoint?: string) {
  if (endpoint) {
    // Limpar cache específico
    const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith(endpoint))
    keysToDelete.forEach(key => cache.delete(key))
  } else {
    // Limpar todo o cache
    cache.clear()
  }
}
