import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMasterDataStore } from '../store/masterDataStore'

// Configuração de sincronização por rota
const ROUTE_SYNC_CONFIG = {
  '/dados': {
    entities: ['clientes', 'contratos', 'analistas', 'operadoras', 'produtos', 'sistemas', 'areas'],
    priority: 'high'
  },
  '/cadastro': {
    entities: ['clientes', 'contratos', 'analistas', 'tiposDemanda', 'tiposServico'],
    priority: 'high'
  },
  '/cadastro/nova': {
    entities: ['clientes', 'contratos', 'analistas', 'tiposDemanda', 'tiposServico', 'operadoras', 'produtos', 'sistemas', 'areas'],
    priority: 'high'
  },
  '/manutencao': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/manutencao/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas', 'clientes', 'contratos'],
    priority: 'high'
  },
  '/atendimento': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/atendimento/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas', 'clientes', 'contratos'],
    priority: 'high'
  },
  '/validacao': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/validacao/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas', 'clientes', 'contratos'],
    priority: 'high'
  },
  '/reajuste': {
    entities: ['analistas', 'tiposServico', 'sistemas'],
    priority: 'medium'
  },
  '/reajuste/nova': {
    entities: ['analistas', 'tiposServico', 'sistemas', 'clientes', 'contratos'],
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
  const lastSyncRef = useRef<string>('')
  const [showSyncIndicator, setShowSyncIndicator] = useState(false)

  useEffect(() => {
    // SINCRONIZAÇÃO COMPLETAMENTE DESABILITADA - CAUSANDO PROBLEMAS DE MEMÓRIA
    console.log('🔧 useDynamicSync: Sincronização dinâmica desabilitada - causando problemas de memória')
    // TODO: Implementar sistema mais leve no futuro
    // const currentPath = location.pathname
    // const config = ROUTE_SYNC_CONFIG[currentPath as keyof typeof ROUTE_SYNC_CONFIG]
    // ... resto do código comentado
  }, [location.pathname, syncFromApi, isSyncing])

  // Função para forçar sincronização (útil para botões de refresh)
  const forceSync = async () => {
    if (!syncFromApi || isSyncing) return
    
    console.log('🔄 useDynamicSync: Forçando sincronização...')
    syncCache.clear() // Limpar cache
    lastSyncRef.current = '' // Limpar referência
    
    try {
      await syncFromApi()
      console.log('✅ useDynamicSync: Sincronização forçada concluída')
    } catch (error) {
      console.error('❌ useDynamicSync: Erro na sincronização forçada:', error)
    }
  }

  return { 
    forceSync, 
    isSyncing, 
    showSyncIndicator
  }
}
