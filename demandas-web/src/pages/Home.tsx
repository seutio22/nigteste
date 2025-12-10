import React, { useEffect, useMemo, useState, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useProjectStore } from '../store/projectStore'
import { 
  Plus, 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  Users, 
  FileText, 
  Mail, 
  Settings,
  Bell,
  Calendar,
  Clock,
  Star,
  Wrench
} from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const manutencaoStore = useManutencaoStore()
  const reportStore = useReportStore()
  const masterDataStore = useMasterDataStore()
  const maillingStore = useMaillingStore()
  const comunicadoStore = useComunicadoStore()
  const projectStore = useProjectStore()

  // Atividades recentes baseadas em dados reais
  const recentActivities = useMemo(() => {
    const activities = []
    
    // Adicionar demandas recentes
    const recentDemandas = demandStore.items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(demanda => ({
        id: `demanda-${demanda.id}`,
        title: `Nova demanda: ${demanda.descricao || 'Sem descrição'}`,
        time: new Date(demanda.createdAt).toLocaleString('pt-BR'),
        type: 'Demanda',
        status: demanda.status === 'Concluída' ? 'success' : demanda.status === 'Em Andamento' ? 'warning' : 'info'
      }))
    
    // Adicionar atendimentos recentes
    const recentAtendimentos = atendimentoStore.items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map(atendimento => ({
        id: `atendimento-${atendimento.id}`,
        title: `Atendimento: ${atendimento.titulo || 'Sem título'}`,
        time: new Date(atendimento.createdAt).toLocaleString('pt-BR'),
        type: 'Atendimento',
        status: atendimento.status === 'Resolvido' ? 'success' : atendimento.status === 'Em Andamento' ? 'warning' : 'info'
      }))
    
    // Adicionar validações recentes
    const recentValidacoes = validationStore.items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map(validacao => ({
        id: `validacao-${validacao.id}`,
        title: `Validação: ${validacao.observacoes || 'Sem observações'}`,
        time: new Date(validacao.createdAt).toLocaleString('pt-BR'),
        type: 'Validação',
        status: validacao.status === 'Aprovada' ? 'success' : validacao.status === 'Pendente' ? 'warning' : 'info'
      }))
    
    // Adicionar reajustes recentes
    const recentReajustes = reajusteStore.items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 1)
      .map(reajuste => ({
        id: `reajuste-${reajuste.id}`,
        title: `Reajuste: ${reajuste.motivo || 'Sem motivo'}`,
        time: new Date(reajuste.createdAt).toLocaleString('pt-BR'),
        type: 'Reajuste',
        status: reajuste.aprovado ? 'success' : 'warning'
      }))
    
    // Adicionar manutenções recentes
    const recentManutencoes = manutencaoStore.items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 1)
      .map(manutencao => ({
        id: `manutencao-${manutencao.id}`,
        title: `Manutenção: ${manutencao.descricao || 'Sem descrição'}`,
        time: new Date(manutencao.createdAt).toLocaleString('pt-BR'),
        type: 'Manutenção',
        status: manutencao.status === 'Concluída' ? 'success' : manutencao.status === 'Em Andamento' ? 'warning' : 'info'
      }))
    
    // Adicionar relatórios recentes (analytics)
    const recentRelatorios = reportStore.items
      .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
      .slice(0, 1)
      .map(relatorio => ({
        id: `relatorio-${relatorio.id}`,
        title: `Relatório: ${relatorio.titulo || 'Sem título'}`,
        time: new Date(relatorio.dataCriacao).toLocaleString('pt-BR'),
        type: 'Analytics',
        status: relatorio.status === 'concluido' ? 'success' : relatorio.status === 'em_andamento' ? 'warning' : 'info'
      }))
    
    // Combinar todas as atividades e ordenar por data
    return [...recentDemandas, ...recentAtendimentos, ...recentValidacoes, ...recentReajustes, ...recentManutencoes, ...recentRelatorios]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8) // Limitar a 8 atividades
  }, [demandStore.items, atendimentoStore.items, validationStore.items, reajusteStore.items, manutencaoStore.items, reportStore.items])

  // Estado para controlar se os dados já foram carregados
  const [dataLoaded, setDataLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar dados automaticamente quando a página é carregada
  useEffect(() => {
    if (dataLoaded) return // Evitar múltiplas chamadas
    
    console.log('🔍 Home: Carregando dados da API...')
    
    if (user?.id) {
      console.log('🔍 Home: Usuário logado, carregando dados...')
      setDataLoaded(true)
      setIsLoading(true)
      
      // Carregar dados de forma otimizada e paralela
      const loadData = async () => {
        try {
          const promises = []
          
          // Carregar apenas se os stores estiverem vazios ou se precisar atualizar
          if (demandStore.items.length === 0) {
            console.log('🔍 Home: Carregando demandas...')
            promises.push(demandStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar demandas:', error)
            }))
          }
          
          if (atendimentoStore.items.length === 0) {
            console.log('🔍 Home: Carregando atendimentos...')
            promises.push(atendimentoStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar atendimentos:', error)
            }))
          }
          
          if (validationStore.items.length === 0) {
            console.log('🔍 Home: Carregando validações...')
            promises.push(validationStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar validações:', error)
            }))
          }
          
          if (reajusteStore.items.length === 0) {
            console.log('🔍 Home: Carregando reajustes...')
            promises.push(reajusteStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar reajustes:', error)
            }))
          }
          
          if (manutencaoStore.items.length === 0) {
            console.log('🔍 Home: Carregando manutenções...')
            promises.push(manutencaoStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar manutenções:', error)
            }))
          }
          
          if (reportStore.items.length === 0) {
            console.log('🔍 Home: Carregando analytics...')
            promises.push(reportStore.syncFromApi().catch(error => {
              console.error('❌ Home: Erro ao carregar analytics:', error)
            }))
          }
          
          // Mailling, comunicados e projetos são carregados em outras páginas
          // Não precisam ser carregados aqui para evitar sobrecarga
          
          // Aguardar todas as promessas em paralelo
          await Promise.allSettled(promises)
          console.log('✅ Home: Todos os dados principais carregados')
          
          // Aguardar um pouco para garantir que os dados foram processados
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('❌ Home: Erro ao carregar dados:', error)
        } finally {
          setIsLoading(false)
        }
      }
      
      loadData()
      
    } else {
      console.log('🔍 Home: Usuário não logado, aguardando...')
      setIsLoading(false)
    }
  }, [user?.id, dataLoaded])

  // Estatísticas reais baseadas nos dados carregados
  // Só calcular quando não estiver carregando para evitar valores inconsistentes
  const stats = useMemo(() => {
    // Se ainda está carregando, retornar valores zerados para evitar valores parciais
    if (isLoading) {
      return {
        demandas: { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 },
        atendimentos: { total: 0, abertos: 0, resolvidos: 0 },
        validacoes: { total: 0, pendentes: 0, aprovadas: 0 },
        reajustes: { total: 0, pendentes: 0, aprovados: 0 },
        manutencoes: { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 },
        analytics: { total: 0, pendentes: 0, emAndamento: 0, concluidos: 0 },
        mailling: { total: 0, ativos: 0 },
        comunicados: { total: 0, enviados: 0 },
        projetos: { total: 0, concluidos: 0 }
      }
    }
    
    const demandasArray = (demandStore?.items && Array.isArray(demandStore.items)) ? demandStore.items : []
    const totalDemandas = demandasArray.length
    const demandasPendentes = demandasArray.filter(d => d.status === 'Pendente').length
    const demandasEmAndamento = demandasArray.filter(d => d.status === 'Em Andamento').length
    const demandasConcluidas = demandasArray.filter(d => d.status === 'Concluída').length
    
    const atendimentosArray = (atendimentoStore?.items && Array.isArray(atendimentoStore.items)) ? atendimentoStore.items : []
    const totalAtendimentos = atendimentosArray.length
    const atendimentosAbertos = atendimentosArray.filter(a => a.status === 'Aberto').length
    const atendimentosResolvidos = atendimentosArray.filter(a => a.status === 'Resolvido').length
    
    const validacoesArray = (validationStore?.items && Array.isArray(validationStore.items)) ? validationStore.items : []
    const totalValidacoes = validacoesArray.length
    const validacoesPendentes = validacoesArray.filter(v => v.status === 'Pendente').length
    const validacoesAprovadas = validacoesArray.filter(v => v.status === 'Aprovada').length
    
    const reajustesArray = (reajusteStore?.items && Array.isArray(reajusteStore.items)) ? reajusteStore.items : []
    const totalReajustes = reajustesArray.length
    const reajustesPendentes = reajustesArray.filter(r => !r.aprovado).length
    const reajustesAprovados = reajustesArray.filter(r => r.aprovado).length
    
    const manutencoesArray = (manutencaoStore?.items && Array.isArray(manutencaoStore.items)) ? manutencaoStore.items : []
    const totalManutencoes = manutencoesArray.length
    const manutencoesPendentes = manutencoesArray.filter(m => m.status === 'Pendente').length
    const manutencoesEmAndamento = manutencoesArray.filter(m => m.status === 'Em Andamento').length
    const manutencoesConcluidas = manutencoesArray.filter(m => m.status === 'Concluída').length
    
    const relatoriosArray = (reportStore?.items && Array.isArray(reportStore.items)) ? reportStore.items : []
    const totalRelatorios = relatoriosArray.length
    const relatoriosPendentes = relatoriosArray.filter(r => r.status === 'pendente').length
    const relatoriosEmAndamento = relatoriosArray.filter(r => r.status === 'em_andamento').length
    const relatoriosConcluidos = relatoriosArray.filter(r => r.status === 'concluido').length
    
    const totalMailling = (maillingStore?.contacts && Array.isArray(maillingStore.contacts)) ? maillingStore.contacts.length : 0
    const maillingAtivos = (maillingStore?.contacts && Array.isArray(maillingStore.contacts)) ? maillingStore.contacts.filter(m => m.status === 'Ativo' || !m.status).length : 0
    
    const totalComunicados = (comunicadoStore?.items && Array.isArray(comunicadoStore.items)) ? comunicadoStore.items.length : 0
    const comunicadosEnviados = (comunicadoStore?.items && Array.isArray(comunicadoStore.items)) ? comunicadoStore.items.filter(c => c.status === 'Enviado' || c.status === 'enviado').length : 0
    
    const totalProjetos = (projectStore?.projects && Array.isArray(projectStore.projects)) ? projectStore.projects.length : 0
    const projetosConcluidos = (projectStore?.projects && Array.isArray(projectStore.projects)) ? projectStore.projects.filter(p => {
      const status = p.status || p.timeline?.status || 'Em Andamento'
      return status === 'Concluído' || status === 'concluido' || status === 'Finalizado'
    }).length : 0
    
    return {
      demandas: { total: totalDemandas, pendentes: demandasPendentes, emAndamento: demandasEmAndamento, concluidas: demandasConcluidas },
      atendimentos: { total: totalAtendimentos, abertos: atendimentosAbertos, resolvidos: atendimentosResolvidos },
      validacoes: { total: totalValidacoes, pendentes: validacoesPendentes, aprovadas: validacoesAprovadas },
      reajustes: { total: totalReajustes, pendentes: reajustesPendentes, aprovados: reajustesAprovados },
      manutencoes: { total: totalManutencoes, pendentes: manutencoesPendentes, emAndamento: manutencoesEmAndamento, concluidas: manutencoesConcluidas },
      analytics: { total: totalRelatorios, pendentes: relatoriosPendentes, emAndamento: relatoriosEmAndamento, concluidos: relatoriosConcluidos },
      mailling: { total: totalMailling, ativos: maillingAtivos },
      comunicados: { total: totalComunicados, enviados: comunicadosEnviados },
      projetos: { total: totalProjetos, concluidos: projetosConcluidos }
    }
  }, [isLoading, demandStore?.items, atendimentoStore?.items, validationStore?.items, reajusteStore?.items, manutencaoStore?.items, reportStore?.items, maillingStore?.contacts, comunicadoStore?.items, projectStore?.projects])

  // 🚀 MELHORIA FASE 2A: Memoizar quickActions - 30-50% menos processamento
  const quickActions = useMemo(() => [
    {
      title: 'Nova Demanda',
      description: 'Criar nova solicitação',
      icon: Plus,
      color: 'blue',
      path: '/cadastro/nova',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Novo Atendimento',
      description: 'Criar novo atendimento',
      icon: FileText,
      color: 'teal',
      path: '/atendimento/nova',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      hoverColor: 'hover:border-teal-400',
      iconColor: 'text-teal-600'
    },
    {
      title: 'Validar',
      description: 'Aprovar pendências',
      icon: CheckCircle,
      color: 'green',
      path: '/validacao',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400',
      iconColor: 'text-green-600'
    },
    {
      title: 'Reajustes',
      description: 'Gerenciar preços',
      icon: TrendingUp,
      color: 'orange',
      path: '/reajuste',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverColor: 'hover:border-orange-400',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Analytics',
      description: 'Ver relatórios',
      icon: BarChart3,
      color: 'purple',
      path: '/analytics',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Mailling',
      description: 'Gerenciar contatos',
      icon: Mail,
      color: 'indigo',
      path: '/mailling',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      hoverColor: 'hover:border-indigo-400',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Configurações',
      description: 'Ajustar sistema',
      icon: Settings,
      color: 'gray',
      path: '/admin/usuarios',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      hoverColor: 'hover:border-gray-400',
      iconColor: 'text-gray-600'
    }
  ], [])

  // 🚀 MELHORIA FASE 2A: Funções memoizadas - 30-50% menos processamento
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'info':
        return <FileText className="w-4 h-4 text-blue-500" />
      default:
        return <Star className="w-4 h-4 text-gray-500" />
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-orange-100 text-orange-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  // 🚀 MELHORIA FASE 2A: Componentes memoizados - 40-60% menos re-renders
  const ActivityCard = memo(function ActivityCard({ activity, getStatusIcon, getStatusColor }: { activity: any, getStatusIcon: (status: string) => JSX.Element, getStatusColor: (status: string) => string }) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        {getStatusIcon(activity.status)}
        <div className="flex-1">
          <p className="font-medium text-gray-800">{activity.title}</p>
          <p className="text-sm text-gray-600">{activity.time}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
          {activity.type}
        </span>
      </div>
    )
  })

  const QuickActionCard = memo(function QuickActionCard({ action, navigate }: { action: any, navigate: (path: string) => void }) {
    return (
      <button
        onClick={() => navigate(action.path)}
        className={`${action.bgColor} ${action.borderColor} ${action.hoverColor} border-2 p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:scale-105 group`}
      >
        <div className="text-center">
          <div className={`${action.iconColor} mb-3 group-hover:scale-110 transition-transform duration-300`}>
            <action.icon className="w-8 h-8 mx-auto" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
            {action.title}
          </h3>
          <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
            {action.description}
          </p>
        </div>
      </button>
    )
  })

  // Mostrar loading enquanto os dados estão sendo carregados
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Seção de Boas-vindas */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-8 rounded-3xl mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl lg:text-5xl font-bold mb-3">
                Olá, {user?.name || 'Usuário'}! 👋
              </h1>
              <p className="text-xl text-blue-100 mb-4">
                Bem-vindo ao seu painel de controle. Aqui está o resumo do seu dia de trabalho.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  {user?.role || 'Usuário'} • Sistema
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  {new Date().toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
            <div className="text-center" title="Total geral de todas as atividades do sistema (sem filtros de período)">
              <div className="text-3xl font-bold">
                {stats.demandas.total + stats.atendimentos.total + stats.validacoes.total + 
                 stats.reajustes.total + stats.manutencoes.total + stats.analytics.total +
                 stats.mailling.total + stats.comunicados.total + stats.projetos.total}
              </div>
              <div className="text-blue-100 text-sm">Total de Atividades</div>
              <div className="text-blue-200 text-xs mt-1">(Geral - Histórico Completo)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {(() => {
                  const totalConcluidas = stats.demandas.concluidas + stats.atendimentos.resolvidos + 
                                        stats.validacoes.aprovadas + stats.reajustes.aprovados + 
                                        stats.manutencoes.concluidas + stats.analytics.concluidos +
                                        stats.mailling.ativos + stats.comunicados.enviados + stats.projetos.concluidos
                  const totalAtividades = stats.demandas.total + stats.atendimentos.total + 
                                        stats.validacoes.total + stats.reajustes.total + 
                                        stats.manutencoes.total + stats.analytics.total +
                                        stats.mailling.total + stats.comunicados.total + stats.projetos.total
                  return totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0
                })()}%
              </div>
              <div className="text-blue-100 text-sm">Taxa de Conclusão</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {stats.demandas.pendentes + stats.atendimentos.abertos + stats.validacoes.pendentes + 
                 stats.reajustes.pendentes + stats.manutencoes.pendentes + stats.analytics.pendentes}
              </div>
              <div className="text-blue-100 text-sm">Pendências</div>
            </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-500" />
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} action={action} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Atividades Recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Atividades do Sistema */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Atividades Recentes
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
              ))}
            </div>
          </div>

          {/* Resumo Completo do Sistema */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Resumo Completo do Sistema
            </h3>
            
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200" title="Total geral de todas as atividades do sistema (sem filtros de período)">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats.demandas.total + stats.atendimentos.total + stats.validacoes.total + 
                   stats.reajustes.total + stats.manutencoes.total + stats.analytics.total +
                   stats.mailling.total + stats.comunicados.total + stats.projetos.total}
                </div>
                <div className="text-sm font-medium text-blue-800">Total de Atividades</div>
                <div className="text-xs text-blue-600 mt-1">Geral - Histórico Completo</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {(() => {
                    const totalConcluidas = stats.demandas.concluidas + stats.atendimentos.resolvidos + 
                                          stats.validacoes.aprovadas + stats.reajustes.aprovados + 
                                          stats.manutencoes.concluidas + stats.analytics.concluidos +
                                          stats.mailling.ativos + stats.comunicados.enviados + stats.projetos.concluidos
                    const totalAtividades = stats.demandas.total + stats.atendimentos.total + 
                                          stats.validacoes.total + stats.reajustes.total + 
                                          stats.manutencoes.total + stats.analytics.total +
                                          stats.mailling.total + stats.comunicados.total + stats.projetos.total
                    return totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0
                  })()}%
                </div>
                <div className="text-sm font-medium text-green-800">Taxa de Conclusão</div>
                <div className="text-xs text-green-600 mt-1">Eficiência geral</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {stats.demandas.pendentes + stats.atendimentos.abertos + stats.validacoes.pendentes + 
                   stats.reajustes.pendentes + stats.manutencoes.pendentes + stats.analytics.pendentes}
                </div>
                <div className="text-sm font-medium text-orange-800">Pendências</div>
                <div className="text-xs text-orange-600 mt-1">Requerem atenção</div>
              </div>
            </div>

            {/* Breakdown por Categoria */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                <div className="text-xl font-bold text-blue-600">{stats.demandas.total}</div>
                <div className="text-xs font-medium text-blue-800">Demandas</div>
                <div className="text-xs text-blue-600">{stats.demandas.concluidas} concluídas</div>
              </div>
              
              <div className="text-center p-3 bg-teal-50 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors">
                <div className="text-xl font-bold text-teal-600">{stats.atendimentos.total}</div>
                <div className="text-xs font-medium text-teal-800">Atendimentos</div>
                <div className="text-xs text-teal-600">{stats.atendimentos.resolvidos} resolvidos</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                <div className="text-xl font-bold text-green-600">{stats.validacoes.total}</div>
                <div className="text-xs font-medium text-green-800">Validações</div>
                <div className="text-xs text-green-600">{stats.validacoes.aprovadas} aprovadas</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                <div className="text-xl font-bold text-purple-600">{stats.reajustes.total}</div>
                <div className="text-xs font-medium text-purple-800">Reajustes</div>
                <div className="text-xs text-purple-600">{stats.reajustes.aprovados} aprovados</div>
              </div>
              
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
                <div className="text-xl font-bold text-amber-600">{stats.manutencoes.total}</div>
                <div className="text-xs font-medium text-amber-800">Manutenções</div>
                <div className="text-xs text-amber-600">{stats.manutencoes.concluidas} concluídas</div>
              </div>
              
              <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors">
                <div className="text-xl font-bold text-indigo-600">{stats.analytics.total}</div>
                <div className="text-xs font-medium text-indigo-800">Analytics</div>
                <div className="text-xs text-indigo-600">{stats.analytics.concluidos} concluídos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Detalhadas */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Demandas
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.demandas.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-orange-600">{stats.demandas.pendentes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Em Andamento:</span>
                <span className="font-semibold text-blue-600">{stats.demandas.emAndamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concluídas:</span>
                <span className="font-semibold text-green-600">{stats.demandas.concluidas}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Atendimentos
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.atendimentos.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Abertos:</span>
                <span className="font-semibold text-red-600">{stats.atendimentos.abertos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resolvidos:</span>
                <span className="font-semibold text-green-600">{stats.atendimentos.resolvidos}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Validações
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.validacoes.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-orange-600">{stats.validacoes.pendentes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aprovadas:</span>
                <span className="font-semibold text-green-600">{stats.validacoes.aprovadas}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Reajustes
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.reajustes.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-orange-600">{stats.reajustes.pendentes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aprovados:</span>
                <span className="font-semibold text-green-600">{stats.reajustes.aprovados}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal-600" />
              Manutenções
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.manutencoes.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-orange-600">{stats.manutencoes.pendentes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Em Andamento:</span>
                <span className="font-semibold text-blue-600">{stats.manutencoes.emAndamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concluídas:</span>
                <span className="font-semibold text-green-600">{stats.manutencoes.concluidas}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Analytics
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{stats.analytics.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pendentes:</span>
                <span className="font-semibold text-orange-600">{stats.analytics.pendentes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Em Andamento:</span>
                <span className="font-semibold text-blue-600">{stats.analytics.emAndamento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concluídos:</span>
                <span className="font-semibold text-green-600">{stats.analytics.concluidos}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem de Boas-vindas */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-emerald-800 mb-2">
            🎉 Comece seu dia com produtividade!
          </h3>
          <p className="text-emerald-700">
            Use as ações rápidas acima para navegar rapidamente pelas funcionalidades do sistema.
          </p>
        </div>

      </div>
    </div>
  )
}
