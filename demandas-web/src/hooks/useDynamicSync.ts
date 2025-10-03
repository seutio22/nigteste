import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const currentPath = location.pathname
    const config = ROUTE_SYNC_CONFIG[currentPath as keyof typeof ROUTE_SYNC_CONFIG]
    
    if (!config || !syncFromApi) {
      return
    }

    // Verificar se já sincronizou recentemente para esta rota
    const cached = syncCache.get(currentPath)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`🔍 useDynamicSync: Cache válido para ${currentPath}, ignorando sincronização`)
      return
    }

    // Evitar múltiplas sincronizações simultâneas
    if (isSyncing) {
      console.log('🔍 useDynamicSync: Sincronização já em andamento, ignorando...')
      return
    }

    // Evitar sincronização duplicada na mesma rota
    if (lastSyncRef.current === currentPath) {
      console.log(`🔍 useDynamicSync: Já sincronizou para ${currentPath}, ignorando...`)
      return
    }

    console.log(`🔄 useDynamicSync: Sincronizando para rota ${currentPath} (prioridade: ${config.priority})`)
    
    // Marcar como sincronizando
    lastSyncRef.current = currentPath
    
    // Sincronizar com delay baseado na prioridade
    const delay = config.priority === 'high' ? 0 : config.priority === 'medium' ? 500 : 1000
    
    setTimeout(async () => {
      try {
        await syncFromApi()
        
        // Atualizar cache
        syncCache.set(currentPath, {
          timestamp: now,
          entities: config.entities
        })
        
        console.log(`✅ useDynamicSync: Sincronização concluída para ${currentPath}`)
      } catch (error) {
        console.error(`❌ useDynamicSync: Erro na sincronização para ${currentPath}:`, error)
      } finally {
        // Limpar referência após um tempo
        setTimeout(() => {
          if (lastSyncRef.current === currentPath) {
            lastSyncRef.current = ''
          }
        }, 5000)
      }
    }, delay)

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

  return { forceSync, isSyncing }
}
