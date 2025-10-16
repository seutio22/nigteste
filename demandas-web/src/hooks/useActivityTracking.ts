import { useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

interface TrackingData {
  action: string
  page?: string
  endpoint?: string
  duration?: number
  metadata?: any
}

export function useActivityTracking() {
  const { user, token } = useAuthStore()

  // Função para registrar atividade
  const trackActivity = useCallback(async (data: TrackingData) => {
    if (!user || !token) return

    try {
      const response = await fetch('https://nigteste-production.up.railway.app/monitoring/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          ...data
        })
      })

      if (!response.ok) {
        console.error('Erro ao registrar atividade:', response.status)
      }
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
    }
  }, [user, token])

  // Função para iniciar sessão
  const startSession = useCallback(async () => {
    if (!user || !token) return

    try {
      const response = await fetch('https://nigteste-production.up.railway.app/monitoring/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      if (response.ok) {
        const { session } = await response.json()
        localStorage.setItem('sessionId', session.sessionId)
        console.log('✅ Sessão iniciada:', session.sessionId)
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
    }
  }, [user, token])

  // Função para finalizar sessão
  const endSession = useCallback(async () => {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId || !token) return

    try {
      await fetch('https://nigteste-production.up.railway.app/monitoring/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId
        })
      })

      localStorage.removeItem('sessionId')
      console.log('✅ Sessão finalizada')
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
    }
  }, [token])

  // Função para trackear visualização de página
  const trackPageView = useCallback((page: string) => {
    trackActivity({
      action: 'page_view',
      page,
      metadata: {
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    })
  }, [trackActivity])

  // Função para trackear chamadas de API
  const trackApiCall = useCallback((endpoint: string, method: string, statusCode?: number) => {
    trackActivity({
      action: 'api_call',
      endpoint,
      metadata: {
        method,
        statusCode,
        timestamp: new Date().toISOString()
      }
    })
  }, [trackActivity])

  // Função para trackear ações do usuário
  const trackUserAction = useCallback((action: string, details?: any) => {
    trackActivity({
      action,
      metadata: {
        details,
        timestamp: new Date().toISOString()
      }
    })
  }, [trackActivity])

  // Iniciar sessão quando o usuário fizer login
  useEffect(() => {
    if (user && token) {
      startSession()
    }
  }, [user, token, startSession])

  // Finalizar sessão quando a página for fechada
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      endSession()
    }
  }, [endSession])

  return {
    trackActivity,
    trackPageView,
    trackApiCall,
    trackUserAction,
    startSession,
    endSession
  }
}