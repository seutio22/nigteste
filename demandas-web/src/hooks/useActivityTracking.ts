import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

interface ActivityTrackingOptions {
  page: string
  action: string
  duration?: number
}

export function useActivityTracking({ page, action, duration = 0 }: ActivityTrackingOptions) {
  const { token } = useAuthStore()
  const startTime = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!token) return

    // Registrar atividade inicial
    const trackActivity = async () => {
      // Temporariamente desabilitado para evitar erros 401
      console.log('🔔 Verificação de notificações temporariamente desabilitada')
      return
      
      try {
        await fetch('https://nigteste-production.up.railway.app/monitoring/activity', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action,
            page,
            duration: duration || Math.floor((Date.now() - startTime.current) / 1000)
          })
        })
      } catch (error) {
        console.error('Erro ao registrar atividade:', error)
      }
    }

    // Registrar atividade inicial
    trackActivity()

    // Configurar tracking de tempo se duration for 0 (tracking automático)
    if (duration === 0) {
      intervalRef.current = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - startTime.current) / 1000)
        if (currentDuration > 0) {
          trackActivity()
        }
      }, 30000) // A cada 30 segundos
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      // Registrar atividade final
      const finalDuration = Math.floor((Date.now() - startTime.current) / 1000)
      if (finalDuration > 0) {
        trackActivity()
      }
    }
  }, [token, page, action, duration])

  return {
    trackActivity: () => {
      // Temporariamente desabilitado para evitar erros 401
      console.log('🔔 Verificação de notificações temporariamente desabilitada')
      return Promise.resolve()
      
      const currentDuration = Math.floor((Date.now() - startTime.current) / 1000)
      return fetch('https://nigteste-production.up.railway.app/monitoring/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          page,
          duration: currentDuration
        })
      })
    }
  }
}
