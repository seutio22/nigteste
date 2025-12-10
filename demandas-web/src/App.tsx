import { SidebarProvider } from './contexts/SidebarContext'
import { AppRoutes } from './routes/AppRoutes'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/authStore'
import { useMasterDataStore } from './store/masterDataStore'
import { useDynamicSync } from './hooks/useDynamicSync'
import { useDeadlineNotifications } from './hooks/useDeadlineNotifications'
import { FullScreenLoading } from './components/BeautifulLoading'
import { ErrorBoundary } from './components/ErrorBoundary'
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
  
  useEffect(() => {
    // O initialize() já é chamado automaticamente pelo onRehydrateStorage do persist
    // Não precisamos chamar novamente aqui para evitar duplicação
    // Apenas garantir que loading seja false se já tiver passado muito tempo
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading ainda true após timeout, forçando false')
        useAuthStore.getState().setLoading(false)
      }
    }, 2000) // Timeout de segurança de 2 segundos
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [loading])
  
  // Mostrar loading bonito enquanto carrega
  if (loading) {
    return <FullScreenLoading message="Inicializando sistema..." />
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppRoutes />
      </SidebarProvider>
    </ErrorBoundary>
  )
}

export default App


