import { SidebarProvider } from './contexts/SidebarContext'
import { AppRoutes } from './routes/AppRoutes'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/authStore'
import { useMasterDataStore } from './store/masterDataStore'
import { useDynamicSync } from './hooks/useDynamicSync'
import { useDeadlineNotifications } from './hooks/useDeadlineNotifications'
import { useUserAlerts } from './hooks/useUserAlerts'
import { FullScreenLoading } from './components/BeautifulLoading'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppActivityBridge } from './components/AppActivityBridge'
import { AlertDeliveryHost } from './components/AlertDeliveryHost'
import { useEffect } from 'react'
import './utils/force-cache-bust' // Force cache bust
import './utils/smart-cache-cleaner' // Sistema inteligente de limpeza

function App() {
  // Aplicar tema global
  useTheme()
  
  // Inicializar store de autenticação
  const { initialize, user, loading, token } = useAuthStore()
  
  // Sistema de sincronização dinâmica baseado na navegação
  useDynamicSync()
  
  // Sistema de notificações de vencimento (1 dia antes)
  useDeadlineNotifications()
  // Alertas manuais criados por admin/gerente
  useUserAlerts()
  
  useEffect(() => {
    // Garantir que a UI não fique presa no loading (tela branca) se a reidratação falhar
    const timeoutId = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('[Nexus] Timeout de autenticação — liberando interface')
        useAuthStore.getState().setLoading(false)
      }
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [])
  
  // Mostrar loading bonito enquanto carrega
  if (loading) {
    return <FullScreenLoading message="Inicializando sistema..." />
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppActivityBridge />
        <AlertDeliveryHost />
        <AppRoutes />
      </SidebarProvider>
    </ErrorBoundary>
  )
}

export default App


