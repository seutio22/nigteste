import React, { useEffect } from 'react'
import { Clock, Edit, TrendingUp, Plus, Trash2, MessageSquare } from 'lucide-react'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useTimelineStore } from '../store/timelineStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { fmt } from '../lib/utils'
import { VALIDACAO_TIMELINE_FIELD_LABELS } from '../pages/Validacao/validacaoTimelineFormat'

interface TimelineProps {
  entityId: string
  entityType: 'atendimento' | 'reajuste' | 'demanda' | 'manutencao' | 'analytics' | 'validacao'
}

export function Timeline({ entityId, entityType }: TimelineProps) {
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const timelineStore = useTimelineStore()
  const reportStore = useReportStore()
  const masterDataStore = useMasterDataStore()
  
  // Filtrar eventos baseado no tipo de entidade
  const events = (() => {
    switch (entityType) {
      case 'demanda':
        return demandStore.timeline.filter(event => event.demandaId === entityId)
      case 'manutencao':
        return manutencaoStore.timeline.filter(event => event.manutencaoId === entityId)
      case 'atendimento':
        return atendimentoStore.timeline.filter(event => event.atendimentoId === entityId)
      case 'validacao':
        return validationStore.logs.filter(event => event.validationId === entityId)
      case 'reajuste':
        return timelineStore.getEventsByEntity(entityId, 'reajuste')
      case 'analytics':
        return reportStore.getEventsByReport(entityId)
      default:
        return []
    }
  })().sort((a, b) => b.timestamp.localeCompare(a.timestamp))


  // Carregar dados mestres quando o componente for renderizado
  useEffect(() => {
    if (masterDataStore.syncFromApi) {
      masterDataStore.syncFromApi()
    }
  }, [masterDataStore])


  // Função para converter ID em nome
  const getLabel = (id: string | undefined, items: any[], field: string = 'nome') => {
    if (!id) return 'N/A'
    
    const item = items.find(i => i.id === id)
    return item ? item[field] : id
  }

  // Função para converter nome do campo em label amigável
  const getFieldLabel = (fieldName: string) => {
    if (entityType === 'validacao' && VALIDACAO_TIMELINE_FIELD_LABELS[fieldName]) {
      return VALIDACAO_TIMELINE_FIELD_LABELS[fieldName]
    }
    const fieldLabels: { [key: string]: string } = {
      'area': 'Área',
      'cliente': 'Cliente',
      'contrato': 'Contrato',
      'operadora': 'Operadora',
      'produto': 'Produto',
      'sistema': 'Sistema',
      'analista': 'Analista',
      'tipo': entityType === 'manutencao' ? 'Tipo de Manutenção' : 'Tipo de Demanda',
      'tipoServico': 'Tipo de Serviço',
      'tipoServicoId': 'Tipo de Serviço',
      'tipoId': entityType === 'manutencao' ? 'Tipo de Manutenção' : 'Tipo de Demanda',
      'descricao': 'Descrição',
      'solicitante': 'Solicitante',
      'dataInicio': 'Data de Início',
      'dataFinal': 'Data Final',
      'periodicidade': entityType === 'demanda' ? 'Qtd de usuários' : 'Periodicidade',
      'qtdUsuarios': 'Qtd de usuários',
      'qtdRetornos': 'Quantidade de Retornos',
      'qualidade': 'Qualidade',
      'observacoes': 'Observações',
      'status': 'Status',
      'mes': 'Mês',
      'ano': 'Ano',
      'filial': 'Filial',
      'valorTotal': 'Valor Total',
      'tipoReajuste': 'Tipo de Reajuste',
      'percentual': 'Percentual',
      'dataAplicacao': 'Data de Aplicação',
      'responsavelAnalista': 'Analista Responsável',
      'qtdClientesVinculados': 'QTD Clientes Vinculados - EDGE',
      'usuariosEmpresa': 'Usuários Empresa - MOVE'
    }
    return fieldLabels[fieldName] || fieldName
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Sem eventos até o momento.</p>
      </div>
    )
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'status_change':
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case 'field_change':
        return <Edit className="w-4 h-4 text-orange-500" />
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-purple-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'create':
        return 'border-l-green-500 bg-green-50'
      case 'status_change':
        return 'border-l-blue-500 bg-blue-50'
      case 'field_change':
        return 'border-l-orange-500 bg-orange-50'
      case 'comment':
        return 'border-l-purple-500 bg-purple-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getEventDescription = (event: any) => {
    switch (event.type) {
      case 'create':
        return event.comment || 'Item criado'
      case 'status_change':
        return `Status alterado de "${event.from || 'N/A'}" para "${event.to || 'N/A'}"`
      case 'field_change':
        const fieldLabel = getFieldLabel(event.field)
        let fromValue = event.from || 'N/A'
        let toValue = event.to || 'N/A'
        
        // Converter IDs para nomes baseado no campo
        if (event.field === 'area') {
          fromValue = getLabel(event.from, masterDataStore.areas)
          toValue = getLabel(event.to, masterDataStore.areas)
        } else if (event.field === 'cliente') {
          fromValue = getLabel(event.from, masterDataStore.clientes)
          toValue = getLabel(event.to, masterDataStore.clientes)
        } else if (event.field === 'contrato') {
          fromValue = getLabel(event.from, masterDataStore.contratos, 'codigo')
          toValue = getLabel(event.to, masterDataStore.contratos, 'codigo')
        } else if (event.field === 'operadora') {
          fromValue = getLabel(event.from, masterDataStore.operadoras)
          toValue = getLabel(event.to, masterDataStore.operadoras)
        } else if (event.field === 'produto') {
          fromValue = getLabel(event.from, masterDataStore.produtos)
          toValue = getLabel(event.to, masterDataStore.produtos)
        } else if (event.field === 'sistema') {
          fromValue = getLabel(event.from, masterDataStore.sistemas)
          toValue = getLabel(event.to, masterDataStore.sistemas)
        } else if (event.field === 'analista') {
          fromValue = getLabel(event.from, masterDataStore.analistas)
          toValue = getLabel(event.to, masterDataStore.analistas)
        } else if (event.field === 'tipo' && entityType !== 'validacao') {
          fromValue = getLabel(event.from, masterDataStore.tiposDemanda)
          toValue = getLabel(event.to, masterDataStore.tiposDemanda)
        } else if (event.field === 'tipoServico') {
          fromValue = getLabel(event.from, masterDataStore.tiposServico)
          toValue = getLabel(event.to, masterDataStore.tiposServico)
        } else if (event.field === 'solicitante') {
          fromValue = getLabel(event.from, masterDataStore.solicitantes)
          toValue = getLabel(event.to, masterDataStore.solicitantes)
        } else if (event.field === 'tipoServicoId') {
          // Para manutenções, usar tiposCadastro
          fromValue = getLabel(event.from, masterDataStore.tiposCadastro)
          toValue = getLabel(event.to, masterDataStore.tiposCadastro)
        } else if (event.field === 'tipoId' && entityType === 'manutencao') {
          // Para manutenções, usar padrao
          fromValue = getLabel(event.from, masterDataStore.padrao)
          toValue = getLabel(event.to, masterDataStore.padrao)
        } else if (event.field === 'tipoId' && entityType === 'demanda') {
          // Para demandas, usar tiposDemanda
          fromValue = getLabel(event.from, masterDataStore.tiposDemanda)
          toValue = getLabel(event.to, masterDataStore.tiposDemanda)
        }
        
        return `Campo "${fieldLabel}" alterado de "${fromValue}" para "${toValue}"`
      case 'comment':
        return event.comment || 'Comentário adicionado'
      default:
        return 'Evento registrado'
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Alterações</h3>
      
      <div className="space-y-3">
        {events.map((event, index) => (
          <div
            key={event.id || `event-${index}`}
            className={`p-4 rounded-lg border-l-4 ${getEventColor(event.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    {getEventDescription(event)}
                  </p>
                  <span className="text-xs text-gray-500">
                    {fmt(event.timestamp)}
                  </span>
                </div>
                
                {(() => {
                  const hasUser = !!(event.user || event.userName)
                  const userDisplay = event.user || event.userName || 'Administrador'
                  
                  // Sempre mostrar o usuário, mesmo que seja "Usuário não encontrado"
                  return (
                    <p className="text-xs text-gray-600">
                      Por: {userDisplay}
                    </p>
                  )
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
