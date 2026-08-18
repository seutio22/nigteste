import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

interface UseInactivityTimeoutOptions {
  timeout?: number
  warningTime?: number
  onWarning?: () => void
  onTimeout?: () => void
}

export function useInactivityTimeout({
  timeout = 30 * 60 * 1000,
  warningTime = 5 * 60 * 1000,
  onWarning,
  onTimeout
}: UseInactivityTimeoutOptions = {}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isWarningShownRef = useRef<boolean>(false)

  const { user } = useAuthStore()
  const onWarningRef = useRef(onWarning)
  const onTimeoutRef = useRef(onTimeout)
  onWarningRef.current = onWarning
  onTimeoutRef.current = onTimeout

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
  }, [])

  const scheduleFromLastActivity = useCallback(() => {
    if (!user) return

    clearTimers()

    const elapsed = Date.now() - lastActivityRef.current
    const remaining = timeout - elapsed

    if (remaining <= 0) {
      onTimeoutRef.current?.()
      return
    }

    const warnIn = timeout - warningTime - elapsed
    if (warnIn <= 0) {
      if (!isWarningShownRef.current) {
        isWarningShownRef.current = true
        onWarningRef.current?.()
      }
    } else {
      warningTimeoutRef.current = setTimeout(() => {
        if (!isWarningShownRef.current) {
          isWarningShownRef.current = true
          onWarningRef.current?.()
        }
      }, warnIn)
    }

    timeoutRef.current = setTimeout(() => {
      onTimeoutRef.current?.()
    }, remaining)
  }, [user, timeout, warningTime, clearTimers])

  const resetTimeout = useCallback(() => {
    if (!user) return

    lastActivityRef.current = Date.now()
    isWarningShownRef.current = false
    scheduleFromLastActivity()
  }, [user, scheduleFromLastActivity])

  const checkActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActivityRef.current > 1000) {
      resetTimeout()
    }
  }, [resetTimeout])

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    events.forEach((event) => {
      document.addEventListener(event, checkActivity, true)
    })

    const onVisibility = () => {
      if (document.hidden) return
      scheduleFromLastActivity()
    }
    document.addEventListener('visibilitychange', onVisibility)

    resetTimeout()

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, checkActivity, true)
      })
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimers()
    }
  }, [user, checkActivity, resetTimeout, scheduleFromLastActivity, clearTimers])

  return {
    resetTimeout,
    isActive: !!user
  }
}
