import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useMasterDataStore } from '../store/masterDataStore'
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
  Star
} from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const masterDataStore = useMasterDataStore()

  // Atividades recentes baseadas em dados reais
  const recentActivities = [
    // Será preenchido com dados reais do sistema
  ]

  // Carregar dados automaticamente quando a página é carregada
  useEffect(() => {
    console.log('🔍 Home: Carregando dados da API...')
    
    if (user?.id) {
      console.log('🔍 Home: Usuário logado, carregando dados...')
      
      // Carregar dados mestres se necessário
          // Dados mestres são carregados apenas na página Dados Mestres
    // if (masterDataStore.analistas.length === 0) {
    //   masterDataStore.syncFromApi?.()
    // }
      
      // Carregar dados das demandas se necessário
      if (demandStore.items.length === 0) {
        demandStore.syncFromApi()
      }
      
      // Carregar dados de atendimento se necessário
      if (atendimentoStore.items.length === 0) {
        atendimentoStore.syncFromApi()
      }
      
      // Carregar dados de validação se necessário
      if (validationStore.items.length === 0) {
        validationStore.syncFromApi()
      }
      
      // Carregar dados de reajuste se necessário
      if (reajusteStore.items.length === 0) {
        reajusteStore.syncFromApi()
      }
    } else {
      console.log('🔍 Home: Usuário não logado, aguardando...')
    }
  }, [user?.id])

  // Estatísticas reais baseadas nos dados carregados
  const stats = useMemo(() => {
    const totalDemandas = demandStore.items.length
    const demandasPendentes = demandStore.items.filter(d => d.status === 'Pendente').length
    const demandasEmAndamento = demandStore.items.filter(d => d.status === 'Em Andamento').length
    const demandasConcluidas = demandStore.items.filter(d => d.status === 'Concluída').length
    
    const totalAtendimentos = atendimentoStore.items.length
    const atendimentosAbertos = atendimentoStore.items.filter(a => a.status === 'Aberto').length
    const atendimentosResolvidos = atendimentoStore.items.filter(a => a.status === 'Resolvido').length
    
    const totalValidacoes = validationStore.items.length
    const validacoesPendentes = validationStore.items.filter(v => v.status === 'Pendente').length
    const validacoesAprovadas = validationStore.items.filter(v => v.status === 'Aprovada').length
    
    const totalReajustes = reajusteStore.items.length
    const reajustesPendentes = reajusteStore.items.filter(r => !r.aprovado).length
    const reajustesAprovados = reajusteStore.items.filter(r => r.aprovado).length
    
    return {
      demandas: { total: totalDemandas, pendentes: demandasPendentes, emAndamento: demandasEmAndamento, concluidas: demandasConcluidas },
      atendimentos: { total: totalAtendimentos, abertos: atendimentosAbertos, resolvidos: atendimentosResolvidos },
      validacoes: { total: totalValidacoes, pendentes: validacoesPendentes, aprovadas: validacoesAprovadas },
      reajustes: { total: totalReajustes, pendentes: reajustesPendentes, aprovados: reajustesAprovados }
    }
  }, [demandStore.items, atendimentoStore.items, validationStore.items, reajusteStore.items])

  const quickActions = [
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
  ]

  const getStatusIcon = (status: string) => {
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
  }

  const getStatusColor = (status: string) => {
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
              <div className="text-center">
                <div className="text-3xl font-bold">12</div>
                <div className="text-blue-100 text-sm">Tarefas Hoje</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">85%</div>
                <div className="text-blue-100 text-sm">Concluídas</div>
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
              <button
                key={index}
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
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.time}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Resumo do Dia
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">24</div>
                <div className="text-sm text-blue-800">Demandas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">18</div>
                <div className="text-sm text-green-800">Aprovadas</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <div className="text-2xl font-bold text-orange-600">6</div>
                <div className="text-sm text-orange-800">Pendentes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">3</div>
                <div className="text-sm text-purple-800">Reajustes</div>
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
