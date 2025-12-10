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
    // Inicializar apenas uma vez quando o componente monta
    let mounted = true
    
    const initAuth = () => {
      try {
        if (mounted) {
          initialize()
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar autenticação:', error)
        if (mounted) {
          // Em caso de erro, garantir que loading seja false para não travar a aplicação
          useAuthStore.getState().setLoading(false)
        }
      }
    }
    
    // Usar setTimeout para garantir que o estado do persist já foi reidratado
    const timeoutId = setTimeout(() => {
      initAuth()
    }, 0)
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, []) // Remover initialize das dependências para evitar loops
  
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


