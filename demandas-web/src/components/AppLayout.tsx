import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '../contexts/SidebarContext'
import { useMasterDataStore } from '../store/masterDataStore'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useValidationStore } from '../store/validationStore'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useProjectStore } from '../store/projectStore'
import { motion } from 'framer-motion'

export function AppLayout() {
  const { isCollapsed, isMobile } = useSidebar()
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)
  const syncComunicados = useComunicadoStore((s) => s.syncFromApi)
  const syncValidacoes = useValidationStore((s) => s.syncFromApi)
  const syncDemandas = useDemandStore((s) => s.syncFromApi)
  const syncManutencoes = useManutencaoStore((s) => s.syncFromApi)
  const syncProjetos = useProjectStore((s) => s.syncFromApi)
  const comunicadoCount = useComunicadoStore((s) => s.items.length)

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
    </div>
  )
}
