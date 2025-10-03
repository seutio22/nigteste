import { SidebarProvider } from './contexts/SidebarContext'
import { AppRoutes } from './routes/AppRoutes'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/authStore'
import { useMasterDataStore } from './store/masterDataStore'
import { useDynamicSync } from './hooks/useDynamicSync'
import { useEffect } from 'react'
import './utils/force-cache-bust' // Force cache bust

function App() {
  // Aplicar tema global
  useTheme()
  
  // Inicializar store de autenticação
  const { initialize, user, loading } = useAuthStore()
  
  // Sistema de sincronização dinâmica baseado na navegação
  useDynamicSync()
  
  useEffect(() => {
    initialize()
  }, [initialize])
  
  return (
    <SidebarProvider>
      <AppRoutes />
    </SidebarProvider>
  )
}

export default App


