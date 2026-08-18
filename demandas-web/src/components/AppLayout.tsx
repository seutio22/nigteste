import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TimeoutWarning } from './TimeoutWarning'
import { useSidebar } from '../contexts/SidebarContext'
import { useMasterDataStore } from '../store/masterDataStore'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useValidationStore } from '../store/validationStore'
import { clearDemandLocalCache, useDemandStore } from '../store/demandStore'
import { purgeOversizedPersistEntries } from '../lib/safePersistStorage'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useProjectStore } from '../store/projectStore'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { useAuthStore } from '../store/authStore'
import { useSimpleAutoCleanup } from '../hooks/useAutoCleanup'
import { motion } from 'framer-motion'

const globalLastSync = new Map<string, number>()
const globalSyncInFlight = new Set<string>()

export function AppLayout() {
  const { isCollapsed, isMobile } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const compactMain = location.pathname.startsWith('/placement')
  const { logout, checkLoginExpiration } = useAuthStore()
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }
  const syncCooldownMs = 2 * 60 * 1000

  const shouldSync = (key: string) => {
    const now = Date.now()
    const last = globalLastSync.get(key) || 0
    if (now - last < syncCooldownMs) return false
    globalLastSync.set(key, now)
    return true
  }

  const runSync = (key: string, syncFn: () => Promise<void>) => {
    if (!shouldSync(key) || globalSyncInFlight.has(key)) return
    globalSyncInFlight.add(key)
    syncFn()
      .catch((error) => {
        console.error(`❌ AppLayout: Erro no sync ${key}:`, error)
      })
      .finally(() => {
        globalSyncInFlight.delete(key)
      })
  }
  
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)
  const syncComunicados = useComunicadoStore((s) => s.syncFromApi)
  const syncValidacoes = useValidationStore((s) => s.syncFromApi)
  const syncDemandas = useDemandStore((s) => s.syncFromApi)
  const syncManutencoes = useManutencaoStore((s) => s.syncFromApi)
  const syncProjetos = useProjectStore((s) => s.syncFromApi)
  const comunicadoCount = useComunicadoStore((s) => s.items.length)

  // Fim do dia: logout total à meia-noite (não é adiado ao renovar a sessão)
  useEffect(() => {
    const checkExpiration = () => {
      const expired = checkLoginExpiration()
      if (expired) {
        logDev('⏰ Fim do dia — logout total e redirecionamento para login')
        navigate('/login')
      }
    }

    checkExpiration()

    let midnightTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleMidnightLogout = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      const ms = Math.max(1000, nextMidnight.getTime() - now.getTime())
      midnightTimer = setTimeout(() => {
        checkExpiration()
        scheduleMidnightLogout()
      }, ms)
    }
    scheduleMidnightLogout()

    const interval = setInterval(checkExpiration, 60 * 1000)
    const onVisibility = () => {
      if (!document.hidden) checkExpiration()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkLoginExpiration, navigate])

  // Sistema de timeout por inatividade
  const { resetTimeout } = useInactivityTimeout({
    timeout: 30 * 60 * 1000,
    warningTime: 5 * 60 * 1000,
    onWarning: () => {
      logDev('⚠️ Aviso: Sessão expirando em 5 minutos')
      setShowTimeoutWarning(true)
    },
    onTimeout: () => {
      logDev('🔒 Timeout: Fazendo logout automático por inatividade')
      handleLogout()
    }
  })

  const handleLogout = () => {
    logDev('🔒 Timeout: Executando logout automático por inatividade')
    // O logout já limpa todos os dados automaticamente
    logout()
    navigate('/login')
  }

  const handleExtendSession = () => {
    logDev('✅ Sessão estendida pelo usuário')
    setShowTimeoutWarning(false)
    resetTimeout()
  }

  useEffect(() => {
    clearDemandLocalCache()
    purgeOversizedPersistEntries()
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined' && document.hidden) return
    
    // Inicializar dados mestres apenas se necessário (removido para evitar conflito)
    // if (syncMasterData) {
    //   console.log('🔍 AppLayout: Chamando syncMasterData...')
    //   syncMasterData().catch((error) => {
    //     console.error('❌ AppLayout: Erro no syncMasterData:', error)
    //   })
    // }
    
    // Inicializar dados automaticamente
    if (syncComunicados) {
      runSync('comunicados', syncComunicados)
    }
    
    if (syncValidacoes) {
      runSync('validacoes', syncValidacoes)
    }
    
    if (syncDemandas) {
      runSync('demandas', syncDemandas)
    }
    
    if (syncManutencoes) {
      runSync('manutencoes', syncManutencoes)
    }
    
    if (syncProjetos) {
      runSync('projetos', syncProjetos)
    }
  }, [syncMasterData, syncComunicados, syncValidacoes, syncDemandas, syncManutencoes, syncProjetos])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0d1114] transition-colors duration-300">
      <Sidebar />
      
      <motion.div
        initial={{ marginLeft: 0 }}
        animate={{ 
          marginLeft: isMobile 
            ? 0 // Mobile: sem margin (menu é overlay)
            : isCollapsed ? '4rem' : '17.5rem' // Desktop: margin normal
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen"
      >
        <Header />
        
        <main className={compactMain ? 'px-3 pt-2 pb-3' : 'p-6'}>
          <motion.div
            initial={{ opacity: 1, y: compactMain ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: compactMain ? 0 : 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>

      {/* Modal de aviso de timeout */}
      <TimeoutWarning
        open={showTimeoutWarning}
        onExtend={handleExtendSession}
        onLogout={handleLogout}
        timeRemaining={5 * 60}
      />
    </div>
  )
}
