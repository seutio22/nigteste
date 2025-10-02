import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '../contexts/SidebarContext'
import { motion } from 'framer-motion'

export function AppLayout() {
  const { isCollapsed, isMobile } = useSidebar()

  // Removido useEffect para evitar problemas de inicialização

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
