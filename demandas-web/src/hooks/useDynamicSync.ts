import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMasterDataStore } from '../store/masterDataStore'
import type { MasterDataState } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'

// Configuração de sincronização por rota
const ROUTE_SYNC_CONFIG = {
  '/dados': {
    entities: ['clientes', 'contratos', 'analistas', 'operadoras', 'produtos', 'sistemas', 'grupos', 'areas', 'tiposDemanda', 'tiposCadastro', 'tiposServico', 'solicitantes', 'relatorios', 'modelos', 'padrao', 'areasMailling', 'cargosMailling', 'filiaisMailling'],
    priority: 'high'
  },
  '/cadastro': {
    entities: ['clientes', 'contratos', 'analistas', 'tiposDemanda', 'tiposServico'],
    priority: 'high'
  },
  '/cadastro/nova': {
    entities: ['analistas', 'tiposDemanda', 'tiposServico', 'operadoras', 'produtos', 'sistemas', 'areas'],
    priority: 'high'
  },
  '/manutencao': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/manutencao/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'high'
  },
  '/atendimento': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/atendimento/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'high'
  },
  '/validacao': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/validacao/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'high'
  },
  '/reajuste': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/reajuste/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'high'
  },
  '/analytics': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'low'
  },
  '/analytics/novo': {
    entities: ['analistas', 'tiposServico', 'sistemas', 'clientes', 'contratos'],
    priority: 'high'
  }
}

// Cache de sincronização por rota
const syncCache = new Map<string, { timestamp: number; entities: string[] }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos

export function useDynamicSync() {
  const location = useLocation()
  const { syncFromApi, isSyncing } = useMasterDataStore()
  const { token, user, loading: authLoading } = useAuthStore()
  const lastSyncRef = useRef<string>('')
  const isSyncingRef = useRef(false)
  const [showSyncIndicator, setShowSyncIndicator] = useState(false)

  useEffect(() => {
    // Não sincronizar se ainda está carregando autenticação ou se não está autenticado
    if (authLoading || !token || !user) {
      return
    }

    const currentPath = location.pathname

    // Match por rota exata ou por prefixo (ex.: /dados/nig -> /dados)
    const routeKeys = Object.keys(ROUTE_SYNC_CONFIG)
    const matchedKey = routeKeys
      .filter((k) => currentPath === k || currentPath.startsWith(`${k}/`))
      .sort((a, b) => b.length - a.length)[0]

    const config = matchedKey
      ? ROUTE_SYNC_CONFIG[matchedKey as keyof typeof ROUTE_SYNC_CONFIG]
      : undefined
    
    if (!config || !syncFromApi || isSyncing || isSyncingRef.current) {
      return
    }
    
    // Verificar cache
    const cacheKey = matchedKey ?? currentPath
    const cached = syncCache.get(cacheKey)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return
    }
    
    // Executar sincronização
    isSyncingRef.current = true
    syncFromApi({ entities: config.entities as (keyof MasterDataState)[] }).then(() => {
      syncCache.set(cacheKey, { timestamp: now, entities: config.entities })
    }).finally(() => {
      isSyncingRef.current = false
    })
  }, [location.pathname, syncFromApi, isSyncing, token, user, authLoading])

  // Função para forçar sincronização (útil para botões de refresh)
  const forceSync = async () => {
    if (!syncFromApi || isSyncing || isSyncingRef.current) return
    
    syncCache.clear() // Limpar cache
    lastSyncRef.current = '' // Limpar referência
    
    try {
      isSyncingRef.current = true
      await syncFromApi({ force: true })
    } finally {
      isSyncingRef.current = false
    }
  }

  return { 
    forceSync, 
    isSyncing, 
    showSyncIndicator
  }
}
