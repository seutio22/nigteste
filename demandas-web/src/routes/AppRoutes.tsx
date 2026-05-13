import { Route, Routes, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'

// Importações estáticas para evitar problemas de importação dinâmica no Vercel
import LoginPage from '../pages/Login'
import HomePage from '../pages/Home'
import DashboardPage from '../pages/Dashboard'
import DemandListPage from '../pages/Demandas/List'
import DemandNewPage from '../pages/Demandas/New'
import DemandDetailPage from '../pages/Demandas/Detail'
import ManutencaoListPage from '../pages/Manutencao/List'
import ManutencaoNewPage from '../pages/Manutencao/New'
import ManutencaoDetailPage from '../pages/Manutencao/ManutencaoDetailPage' // v0.5.10
import AtendimentoListPage from '../pages/Atendimento/List'
import AtendimentoNewPage from '../pages/Atendimento/New'
import AtendimentoDetailPage from '../pages/Atendimento/Detail'
import ComunicadoListPage from '../pages/Comunicados/List'
import ComunicadoNewPage from '../pages/Comunicados/New'
import ComunicadoDetailPage from '../pages/Comunicados/Detail'
import ValidationListPage from '../pages/Validacao/List'
import ValidationNewPage from '../pages/Validacao/New'
import ValidationDetailPage from '../pages/Validacao/Detail'
import ReajusteListPage from '../pages/Reajuste/List'
import ReajusteNewPage from '../pages/Reajuste/New'
import ReajusteDetailPage from '../pages/Reajuste/Detail'
import MaillingListPage from '../pages/Mailling/List'
import AnalyticsPage from '../pages/Analytics'
import AnalyticsNewPage from '../pages/Analytics/New'
import AnalyticsDetailPage from '../pages/Analytics/Detail'
import DadosLayoutPage from '../pages/DadosLayout'
import DadosNigPage from '../pages/DadosNig'
import DadosProdutividadePage from '../pages/DadosProdutividade'
import DadosPlacementPage from '../pages/DadosPlacement'
import PlacementFilaListPage from '../pages/Placement/Fila/List'
import PlacementFilaNewPage from '../pages/Placement/Fila/New'
import PlacementFilaDetailPage from '../pages/Placement/Fila/Detail'
import AdminUsersPage from '../pages/Admin/Users'
import KanbanPage from '../pages/Kanban'
import ProjectListPage from '../pages/Projetos/ListSimple'
import ProjectNewPage from '../pages/Projetos/New'
import ProjectDetailPage from '../pages/Projetos/Detail'
import ShareProjectPage from '../pages/ShareProject'
import NotificationsPage from '../pages/NotificationsPage'

export function AppRoutes() {
  return (
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
          <Route path="notificacoes" element={
            <ProtectedRoute module="home">
              <NotificationsPage />
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
              <ProtectedRoute module="reajuste" action="create">
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
              <ProtectedRoute module="analytics" action="create">
                <AnalyticsNewPage />
              </ProtectedRoute>
            } />
            <Route path=":id" element={
              <ProtectedRoute module="analytics">
                <AnalyticsDetailPage />
              </ProtectedRoute>
            } />
          </Route>
          
          <Route path="placement">
            <Route path="fila">
              <Route index element={
                <ProtectedRoute module="placementFila">
                  <PlacementFilaListPage />
                </ProtectedRoute>
              } />
              <Route path="nova" element={
                <ProtectedRoute module="placementFila" action="create">
                  <PlacementFilaNewPage />
                </ProtectedRoute>
              } />
              <Route path=":id" element={
                <ProtectedRoute module="placementFila">
                  <PlacementFilaDetailPage />
                </ProtectedRoute>
              } />
              <Route path=":id/edit" element={
                <ProtectedRoute module="placementFila" action="edit">
                  <PlacementFilaDetailPage />
                </ProtectedRoute>
              } />
            </Route>
          </Route>

          <Route
            path="dados"
            element={
              <ProtectedRoute module="dados">
                <DadosLayoutPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="nig" replace />} />
            <Route path="nig" element={<DadosNigPage />} />
            <Route path="produtividade" element={<DadosProdutividadePage />} />
            <Route path="placement" element={<DadosPlacementPage />} />
          </Route>
          
          {/* Rota admin/limpeza removida - página de limpeza de duplicatas removida */}
          
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
              <ProtectedRoute module="projetos" action="create">
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
  )
}


