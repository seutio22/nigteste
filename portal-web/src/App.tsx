import { Navigate, Route, Routes } from 'react-router-dom'
import { Box, CssBaseline, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { AuthProvider, useAuth } from './context/AuthContext'
import { portalTheme } from './theme'
import PortalLayout from './components/PortalLayout'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CasesListPage from './pages/CasesListPage'
import CaseDetailPage from './pages/CaseDetailPage'
import NewCasePage from './pages/NewCasePage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import AdminHubPage from './pages/AdminHubPage'
import ManagerCasesPage from './pages/ManagerCasesPage'
import OperationsQueuePage from './pages/OperationsQueuePage'
import NotFoundPage from './pages/NotFoundPage'
import HelpPage from './pages/HelpPage'
import ApolicePage from './pages/ApolicePage'
import ApoliceDadosSeguroPage from './pages/ApoliceDadosSeguroPage'

function PrivateLayout() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Carregando…</Typography>
      </Box>
    )
  }
  if (!user) return <Navigate to="/entrar" replace />
  return <PortalLayout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/entrar" replace />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route element={<PrivateLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="solicitacoes" element={<CasesListPage />} />
        <Route path="solicitacoes/nova" element={<NewCasePage />} />
        <Route path="solicitacoes/:id" element={<CaseDetailPage />} />
        <Route path="areas" element={<Navigate to="/solicitacoes/nova" replace />} />
        <Route path="conta" element={<AccountPage />} />
        <Route path="ajuda" element={<HelpPage />} />
        <Route path="apolice" element={<ApolicePage />} />
        <Route path="apolice/dados/:apoliceId" element={<ApoliceDadosSeguroPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/centro" element={<AdminHubPage />} />
        <Route path="gestao/solicitacoes" element={<ManagerCasesPage />} />
        <Route path="operacao/fila" element={<OperationsQueuePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={portalTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
