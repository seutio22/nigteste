import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TimeoutWarning } from './TimeoutWarning'
import { useSidebar } from '../contexts/SidebarContext'
import { useMasterDataStore } from '../store/masterDataStore'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useValidationStore } from '../store/validationStore'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useProjectStore } from '../store/projectStore'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { useAuthStore } from '../store/authStore'
import { useSimpleAutoCleanup } from '../hooks/useAutoCleanup'
import { motion } from 'framer-motion'

export function AppLayout() {
  const { isCollapsed, isMobile } = useSidebar()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)
  const syncComunicados = useComunicadoStore((s) => s.syncFromApi)
  const syncValidacoes = useValidationStore((s) => s.syncFromApi)
  const syncDemandas = useDemandStore((s) => s.syncFromApi)
  const syncManutencoes = useManutencaoStore((s) => s.syncFromApi)
  const syncProjetos = useProjectStore((s) => s.syncFromApi)
  const comunicadoCount = useComunicadoStore((s) => s.items.length)

  // Limpeza automática do localStorage a cada 5 minutos
  useSimpleAutoCleanup(5)

  // Sistema de timeout por inatividade
  const { resetTimeout } = useInactivityTimeout({
    timeout: 30 * 60 * 1000, // 30 minutos
    warningTime: 5 * 60 * 1000, // 5 minutos de aviso
    onWarning: () => {
      console.log('⚠️ Aviso: Sessão expirando em 5 minutos')
      setShowTimeoutWarning(true)
    },
    onTimeout: () => {
      console.log('🔒 Timeout: Fazendo logout automático por inatividade')
      handleLogout()
    }
  })

  const handleLogout = () => {
    console.log('🔒 Timeout: Executando logout automático por inatividade')
    // O logout já limpa todos os dados automaticamente
    logout()
    navigate('/login')
  }

  const handleExtendSession = () => {
    console.log('✅ Sessão estendida pelo usuário')
    setShowTimeoutWarning(false)
    resetTimeout()
  }

  useEffect(() => {
    
    // Inicializar dados mestres apenas se necessário (removido para evitar conflito)
    // if (syncMasterData) {
    //   console.log('🔍 AppLayout: Chamando syncMasterData...')
    //   syncMasterData().catch((error) => {
    //     console.error('❌ AppLayout: Erro no syncMasterData:', error)
    //   })
    // }
    
    // Inicializar dados automaticamente
    if (syncComunicados) {
      syncComunicados().catch((error) => {
        console.error('❌ AppLayout: Erro no syncComunicados:', error)
      })
    }
    
    if (syncValidacoes) {
      syncValidacoes().catch((error) => {
        console.error('❌ AppLayout: Erro no syncValidacoes:', error)
      })
    }
    
    if (syncDemandas) {
      syncDemandas().catch((error) => {
        console.error('❌ AppLayout: Erro no syncDemandas:', error)
      })
    }
    
    if (syncManutencoes) {
      syncManutencoes().catch((error) => {
        console.error('❌ AppLayout: Erro no syncManutencoes:', error)
      })
    }
    
    if (syncProjetos) {
      syncProjetos().catch((error) => {
        console.error('❌ AppLayout: Erro no syncProjetos:', error)
      })
    }
  }, [syncMasterData, syncComunicados, syncValidacoes, syncDemandas, syncManutencoes, syncProjetos])

  return (
    <div className="min-h-screen bg-neutral-50">
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
        
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
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
        timeRemaining={5 * 60} // 5 minutos em segundos
      />
    </div>
  )
}
