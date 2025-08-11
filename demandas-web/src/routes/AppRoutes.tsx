import { Suspense, lazy } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'

const LoginPage = lazy(() => import('@/pages/Login'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const DemandListPage = lazy(() => import('@/pages/Demandas/List'))
const DemandNewPage = lazy(() => import('@/pages/Demandas/New'))
const DemandDetailPage = lazy(() => import('@/pages/Demandas/Detail'))
const ValidationListPage = lazy(() => import('@/pages/Validacao/List'))
const ValidationNewPage = lazy(() => import('@/pages/Validacao/New'))
const ReajusteListPage = lazy(() => import('@/pages/Reajuste/List'))
const ReajusteNewPage = lazy(() => import('@/pages/Reajuste/New'))
const AnalyticsPage = lazy(() => import('@/pages/Analytics'))
const MatrizPage = lazy(() => import('@/pages/Matriz'))
const DadosPage = lazy(() => import('@/pages/Dados'))
const AdminUsersPage = lazy(() => import('@/pages/Admin/Users'))

export function AppRoutes() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>          
          <Route index element={<DashboardPage />} />
          <Route path="cadastro">
            <Route index element={<DemandListPage />} />
            <Route path="nova" element={<DemandNewPage />} />
            <Route path=":id" element={<DemandDetailPage />} />
          </Route>
          <Route path="validacao">
            <Route index element={<ValidationListPage />} />
            <Route path="nova" element={<ValidationNewPage />} />
          </Route>
          <Route path="reajuste">
            <Route index element={<ReajusteListPage />} />
            <Route path="nova" element={<ReajusteNewPage />} />
          </Route>
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="matriz" element={<MatrizPage />} />
          <Route path="dados" element={<DadosPage />} />
          <Route path="admin">
            <Route path="usuarios" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}


