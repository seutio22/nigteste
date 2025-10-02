import { SidebarProvider } from './contexts/SidebarContext'
import { AppRoutes } from './routes/AppRoutes'
import { useTheme } from './hooks/useTheme'
import { useAuthStore } from './store/authStore'
import { useMasterDataStore } from './store/masterDataStore'
import { useEffect } from 'react'
import './utils/force-cache-bust' // Force cache bust

function App() {
  // Aplicar tema global
  useTheme()
  
  // Inicializar store de autenticação
  const { initialize, user, loading } = useAuthStore()
  
  // Inicializar sincronização de dados mestres
  const syncFromApi = useMasterDataStore((state) => state.syncFromApi)
  
  useEffect(() => {
    initialize()
  }, [initialize])
  
  useEffect(() => {
    // Sincronizar dados mestres quando a aplicação inicia
    if (syncFromApi) {
      syncFromApi().catch((error) => {
        console.error('❌ App: Erro na sincronização inicial:', error)
      })
    }
  }, [syncFromApi])
  
  return (
    <SidebarProvider>
      <AppRoutes />
    </SidebarProvider>
  )
}

export default App


