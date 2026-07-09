/**
 * 🔄 HOOK DE LIMPEZA AUTOMÁTICA DO LOCALSTORAGE
 * 
 * Este hook implementa limpeza automática periódica do localStorage
 * para garantir que dados sensíveis sejam removidos automaticamente.
 * 
 * ⚙️ Configurações:
 * - Intervalo padrão: 5 minutos
 * - Executa apenas quando há dados do sistema
 * - Log discreto das operações
 * - Não interfere na experiência do usuário
 */

import { useEffect, useRef } from 'react'
import { clearAllSystemData, checkSystemDataInStorage } from '../utils/logoutCleanup'

interface UseAutoCleanupOptions {
  /** Intervalo em minutos (padrão: 5) */
  intervalMinutes?: number
  /** Se deve executar limpeza imediatamente ao montar (padrão: false) */
  runOnMount?: boolean
  /** Se deve logar as operações (padrão: true) */
  enableLogging?: boolean
}

/**
 * Hook para limpeza automática do localStorage
 * 
 * @param options Configurações do hook
 * @returns Objeto com controles da limpeza automática
 */
export function useAutoCleanup(options: UseAutoCleanupOptions = {}) {
  const {
    intervalMinutes = 5,
    runOnMount = false,
    enableLogging = true
  } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(false)

  const log = (message: string) => {
    if (enableLogging) {
      console.log(`🔄 [AutoCleanup] ${message}`)
    }
  }

  const executeCleanup = () => {
    const systemKeys = checkSystemDataInStorage()
    
    if (systemKeys.length > 0) {
      log(`Encontrados ${systemKeys.length} itens do sistema - executando limpeza`)
      clearAllSystemData()
      log('Limpeza automática concluída')
    } else {
      log('Nenhum dado do sistema encontrado - pulando limpeza')
    }
  }

  const startAutoCleanup = () => {
    if (isActiveRef.current) {
      log('Limpeza automática já está ativa')
      return
    }

    const intervalMs = intervalMinutes * 60 * 1000
    log(`Iniciando limpeza automática (intervalo: ${intervalMinutes} minutos)`)
    
    intervalRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      executeCleanup()
    }, intervalMs)
    isActiveRef.current = true
  }

  const stopAutoCleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      isActiveRef.current = false
      log('Limpeza automática parada')
    }
  }

  const restartAutoCleanup = () => {
    stopAutoCleanup()
    startAutoCleanup()
  }

  // Efeito para gerenciar o ciclo de vida da limpeza automática
  useEffect(() => {
    // Executar limpeza imediata se solicitado
    if (runOnMount) {
      executeCleanup()
    }

    // Iniciar limpeza automática
    startAutoCleanup()

    // Cleanup ao desmontar
    return () => {
      stopAutoCleanup()
    }
  }, [intervalMinutes, runOnMount])

  return {
    /** Executa limpeza manual */
    executeCleanup,
    /** Inicia limpeza automática */
    startAutoCleanup,
    /** Para limpeza automática */
    stopAutoCleanup,
    /** Reinicia limpeza automática */
    restartAutoCleanup,
    /** Verifica se está ativa */
    isActive: isActiveRef.current
  }
}

/**
 * Hook simplificado que apenas executa a limpeza automática
 * sem controles manuais - ideal para uso em componentes principais
 */
export function useSimpleAutoCleanup(intervalMinutes: number = 5) {
  useEffect(() => {
    if (import.meta.env.DEV) return

    const intervalMs = intervalMinutes * 60 * 1000
    
    const cleanup = () => {
      const systemKeys = checkSystemDataInStorage()
      if (systemKeys.length > 0) {
        console.log(`🔄 [AutoCleanup] Limpando ${systemKeys.length} itens automaticamente`)
        clearAllSystemData()
      }
    }

    // Executar limpeza imediata
    cleanup()

    // Configurar limpeza periódica
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      cleanup()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMinutes])
}
