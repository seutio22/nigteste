import { Suspense, lazy } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'

const LoginPage = lazy(() => import('../pages/Login'))
const HomePage = lazy(() => import('../pages/Home'))
const DashboardPage = lazy(() => import('../pages/Dashboard'))
const DemandListPage = lazy(() => import('../pages/Demandas/List'))
const DemandNewPage = lazy(() => import('../pages/Demandas/New'))
const DemandDetailPage = lazy(() => import('../pages/Demandas/Detail'))
const ManutencaoListPage = lazy(() => import('../pages/Manutencao/List'))
const ManutencaoNewPage = lazy(() => import('../pages/Manutencao/New'))
const ManutencaoDetailPage = lazy(() => import('../pages/Manutencao/Detail'))
const AtendimentoListPage = lazy(() => import('../pages/Atendimento/List'))
const AtendimentoNewPage = lazy(() => import('../pages/Atendimento/New'))
const AtendimentoDetailPage = lazy(() => import('../pages/Atendimento/Detail'))
const ComunicadoListPage = lazy(() => import('../pages/Comunicados/List'))
const ComunicadoNewPage = lazy(() => import('../pages/Comunicados/New'))
const ComunicadoDetailPage = lazy(() => import('../pages/Comunicados/Detail'))
const ValidationListPage = lazy(() => import('../pages/Validacao/List'))
const ValidationNewPage = lazy(() => import('../pages/Validacao/New'))
const ValidationDetailPage = lazy(() => import('../pages/Validacao/Detail'))
const ReajusteListPage = lazy(() => import('../pages/Reajuste/List'))
const ReajusteNewPage = lazy(() => import('../pages/Reajuste/New'))
const ReajusteDetailPage = lazy(() => import('../pages/Reajuste/Detail'))
const MaillingListPage = lazy(() => import('../pages/Mailling/List'))
const AnalyticsPage = lazy(() => import('../pages/Analytics'))
const AnalyticsNewPage = lazy(() => import('../pages/Analytics/New'))
const AnalyticsDetailPage = lazy(() => import('../pages/Analytics/Detail'))
const DadosPage = lazy(() => import('../pages/Dados'))
const DataCleanupPage = lazy(() => import('../pages/DataCleanup'))
const AdminUsersPage = lazy(() => import('../pages/Admin/Users'))
const KanbanPage = lazy(() => import('../pages/Kanban'))
const ProjectListPage = lazy(() => import('../pages/Projetos/ListSimple'))
const ProjectNewPage = lazy(() => import('../pages/Projetos/New'))
const ProjectDetailPage = lazy(() => import('../pages/Projetos/Detail'))
const ShareProjectPage = lazy(() => import('../pages/ShareProject'))

export function AppRoutes() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>          
          <Route index element={
            <ProtectedRoute module="home">
              <HomePage />
            </ProtectedRoute>
          } />
          
          <Route path="dashboard" element={
            <ProtectedRoute module="dashboard">
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="cadastro">
            <Route index element={
              <ProtectedRoute module="cadastro">
                <DemandListPage />
              </ProtectedRoute>
            } />
            <Route path="nova" element={
              <ProtectedRoute module="cadastro" action="create">
                <DemandNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="cadastro">
                <DemandDetailPage />
              </ProtectedRoute>
            } />
            <Route path=":id/edit" element={
              <ProtectedRoute module="cadastro" action="edit">
                <DemandDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="manutencao">
            <Route index element={
              <ProtectedRoute module="manutencao">
                <ManutencaoListPage />
              </ProtectedRoute>
            } />
            <Route path="nova" element={
              <ProtectedRoute module="manutencao" action="create">
                <ManutencaoNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="manutencao">
                <ManutencaoDetailPage />
              </ProtectedRoute>
            } />
            <Route path=":id/edit" element={
              <ProtectedRoute module="manutencao" action="edit">
                <ManutencaoDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="atendimento">
            <Route index element={
              <ProtectedRoute module="atendimento">
                <AtendimentoListPage />
              </ProtectedRoute>
            } />
            <Route path="nova" element={
              <ProtectedRoute module="atendimento" action="create">
                <AtendimentoNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="atendimento">
                <AtendimentoDetailPage />
              </ProtectedRoute>
            } />
            <Route path=":id/edit" element={
              <ProtectedRoute module="atendimento" action="edit">
                <AtendimentoDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="comunicados">
            <Route index element={
              <ProtectedRoute module="comunicados">
                <ComunicadoListPage />
              </ProtectedRoute>
            } />
            <Route path="novo" element={
              <ProtectedRoute module="comunicados" action="create">
                <ComunicadoNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="comunicados">
                <ComunicadoDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="kanban" element={
            <ProtectedRoute module="kanban">
              <KanbanPage />
            </ProtectedRoute>
          } />
          
          <Route path="validacao">
            <Route index element={
              <ProtectedRoute module="validacao">
                <ValidationListPage />
              </ProtectedRoute>
            } />
            <Route path="nova" element={
              <ProtectedRoute module="validacao" action="create">
                <ValidationNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="validacao">
                <ValidationDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="reajuste">
            <Route index element={
              <ProtectedRoute module="reajuste">
                <ReajusteListPage />
              </ProtectedRoute>
            } />
            <Route path="nova" element={
              <ProtectedRoute module="reajuste" requiredPermission="create">
                <ReajusteNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="reajuste">
                <ReajusteDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="mailling" element={
            <ProtectedRoute module="mailling">
              <MaillingListPage />
            </ProtectedRoute>
          } />
          
          <Route path="analytics">
            <Route index element={
              <ProtectedRoute module="analytics">
                <AnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="novo" element={
              <ProtectedRoute module="analytics" requiredPermission="create">
                <AnalyticsNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="analytics">
                <AnalyticsDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="dados" element={
            <ProtectedRoute module="dados">
              <DadosPage />
            </ProtectedRoute>
          } />
          
          <Route path="admin/limpeza" element={
            <ProtectedRoute module="admin">
              <DataCleanupPage />
            </ProtectedRoute>
          } />
          
          <Route path="admin">
            <Route path="usuarios" element={
              <ProtectedRoute module="usuarios">
                <AdminUsersPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="projetos">
            <Route index element={
              <ProtectedRoute module="projetos">
                <ProjectListPage />
              </ProtectedRoute>
            } />
            <Route path="novo" element={
              <ProtectedRoute module="projetos" requiredPermission="create">
                <ProjectNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="projetos">
                <ProjectDetailPage />
              </ProtectedRoute>
            } />
          </Route>
        </Route>
        
        {/* Rota pública para compartilhamento */}
        <Route path="/share/:token" element={<ShareProjectPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}


