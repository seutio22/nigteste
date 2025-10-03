import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

interface UseInactivityTimeoutOptions {
  timeout?: number // Tempo em milissegundos (padrão: 30 minutos)
  warningTime?: number // Tempo de aviso em milissegundos (padrão: 5 minutos)
  onWarning?: () => void // Callback quando próximo do timeout
  onTimeout?: () => void // Callback quando timeout ocorre
}

export function useInactivityTimeout({
  timeout = 30 * 60 * 1000, // 30 minutos
  warningTime = 5 * 60 * 1000, // 5 minutos
  onWarning,
  onTimeout
}: UseInactivityTimeoutOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isWarningShownRef = useRef<boolean>(false)
  
  const { user } = useAuthStore()

  // Função para resetar o timeout
  const resetTimeout = useCallback(() => {
    if (!user) return // Não ativar se usuário não estiver logado
    
    const now = Date.now()
    lastActivityRef.current = now
    isWarningShownRef.current = false
    
    // Limpar timeouts existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    
    // Configurar timeout de aviso
    warningTimeoutRef.current = setTimeout(() => {
      if (onWarning && !isWarningShownRef.current) {
        isWarningShownRef.current = true
        onWarning()
      }
    }, timeout - warningTime)
    
    // Configurar timeout principal
    timeoutRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout()
      }
    }, timeout)
    
    console.log(`🔄 Timeout resetado - próximo aviso em ${Math.round((timeout - warningTime) / 1000 / 60)} minutos`)
  }, [user, timeout, warningTime, onWarning, onTimeout])

  // Função para verificar se usuário está ativo
  const checkActivity = useCallback(() => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    
    // Se passou muito tempo desde a última atividade, resetar
    if (timeSinceLastActivity > 1000) { // 1 segundo de tolerância
      resetTimeout()
    }
  }, [resetTimeout])

  // Eventos que indicam atividade do usuário
  useEffect(() => {
    if (!user) return

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Adicionar listeners de eventos
    events.forEach(event => {
      document.addEventListener(event, checkActivity, true)
    })

    // Inicializar timeout
    resetTimeout()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, checkActivity, true)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [user, checkActivity, resetTimeout])

  // Retornar função para resetar manualmente
  return {
    resetTimeout,
    isActive: !!user
  }
}
