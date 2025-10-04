import { SidebarProvider } from './contexts/SidebarContext'
import { AppRoutes } from './routes/AppRoutes'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/authStore'
import { useMasterDataStore } from './store/masterDataStore'
import { useDynamicSync } from './hooks/useDynamicSync'
import { useDeadlineNotifications } from './hooks/useDeadlineNotifications'
import { FullScreenLoading } from './components/BeautifulLoading'
import { useEffect } from 'react'
import './utils/force-cache-bust' // Force cache bust

function App() {
  // Aplicar tema global
  useTheme()
  
  // Inicializar store de autenticação
  const { initialize, user, loading } = useAuthStore()
  
  // Sistema de sincronização dinâmica baseado na navegação
  useDynamicSync()
  
  // Sistema de notificações de vencimento (1 dia antes)
  useDeadlineNotifications()
  
  useEffect(() => {
    initialize()
  }, [initialize])
  
  // Mostrar loading bonito enquanto carrega
  if (loading) {
    return <FullScreenLoading message="Inicializando sistema..." />
  }

  return (
    <SidebarProvider>
      <AppRoutes />
    </SidebarProvider>
  )
}

export default App


