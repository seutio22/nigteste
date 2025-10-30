import { useParams, useNavigate } from 'react-router-dom'
import { useReajusteStore } from '../../store/reajusteStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useTimelineStore } from '../../store/timelineStore'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, Edit3, Save, Clock } from 'lucide-react'
import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt, calcTempo } from '../../lib/utils'

export default function ReajusteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const store = useReajusteStore()
  const timelineStore = useTimelineStore()
  const md = useMasterDataStore()
  const reajuste = store.items.find(r => r.id === id)
  
  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  
  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && timelineStore.syncTimeline && !timelineSyncedRef.current.has(id)) {
      console.log('🔄 Sincronizando timeline do reajuste (primeira vez):', id)
      timelineSyncedRef.current.add(id)
      timelineStore.syncTimeline(id, 'reajuste')
    }
  }, [id])

  // Fallback extra: se ao recarregar não houver item no store, buscar diretamente por ID
  useEffect(() => {
    if (!reajuste && id) {
      (async () => {
        try {
          const { api } = await import('../../lib/api.local')
          const fetched = await api.getReajuste(id)
          if (fetched?.id) {
            if (fetched.id !== id) {
              navigate(`/reajuste/${fetched.id}`)
              return
            }
            // Inserir diretamente no store para evitar espera do sync
            try {
              const mapped = fetched // payload de reajuste já é compatível com o store
              // Garantir que tenha id/createdAt mínimos
              if (!mapped.id) mapped.id = id
              useReajusteStore.setState((s) => ({ items: [mapped, ...s.items.filter(x => x.id !== mapped.id)] }))
            } catch {}
            // Sincronizar em background
            await store.syncFromApi?.()
          }
        } catch (e) {
          // Fallback final: voltar para a lista
          navigate('/reajuste')
        }
      })()
    }
  }, [reajuste, id])

  if (!reajuste) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Reajuste não encontrado</h2>
          <p className="text-gray-600 mt-2">O reajuste solicitado não foi encontrado.</p>
        </div>
      </div>
    )
  }

  const label = (id?: string, arr?: { id: string, nome: string }[]) => 
    arr?.find(a => a.id === id)?.nome || '-'

  // Função específica para exibir cliente com grupo econômico
  const labelCliente = (id?: string) => {
    if (!id) return '-'
    const cliente = md.clientes.find(c => c.id === id)
    if (!cliente) return '-'
    
    if (cliente.grupoEconomico) {
      return `${cliente.nome} (${cliente.grupoEconomico})`
    }
    return cliente.nome
  }

  // Função para gerar um título amigável para o reajuste
  const getReajusteTitle = (reajuste: any) => {
    // Prioridade 1: Mês/Ano + Cliente (se existir)
    if (reajuste.mes && reajuste.ano) {
      const mesAno = `${reajuste.mes}/${reajuste.ano}`
      if (reajuste.cliente) {
        const clienteNome = md.clientes.find(c => c.id === reajuste.cliente)?.nome
        if (clienteNome) {
          return `${mesAno} - ${clienteNome}`
        }
      }
      return mesAno
    }
    
    // Prioridade 2: Cliente (se existir)
    if (reajuste.cliente) {
      const clienteNome = md.clientes.find(c => c.id === reajuste.cliente)?.nome
      if (clienteNome) {
        return clienteNome
      }
    }
    
    // Prioridade 3: Operadora (se existir)
    if (reajuste.operadora) {
      const operadoraNome = md.operadoras.find(o => o.id === reajuste.operadora)?.nome
      if (operadoraNome) {
        return operadoraNome
      }
    }
    
    // Prioridade 4: Filial (se existir)
    if (reajuste.filial && reajuste.filial.trim()) {
      return reajuste.filial
    }
    
    // Prioridade 5: Descrição (primeiras 30 caracteres)
    if (reajuste.descricao && reajuste.descricao.trim()) {
      const desc = reajuste.descricao.trim()
      return desc.length > 30 ? `${desc.substring(0, 30)}...` : desc
    }
    
    // Prioridade 6: Data de criação formatada
    if (reajuste.createdAt) {
      const date = new Date(reajuste.createdAt)
      return date.toLocaleDateString('pt-BR')
    }
    
    // Fallback: ID curto (primeiros 8 caracteres)
    return reajuste.id.substring(0, 8)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reajuste')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Reajuste {getReajusteTitle(reajuste)}
          </h1>
          <p className="text-gray-600 mt-1">
            Criado em {fmt(reajuste.createdAt)}
          </p>
        </div>
        <StatusBadge status={reajuste.status || 'Ativo'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo do Reajuste */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Reajuste</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Mês/Ano</p>
                  <p className="font-medium">{reajuste.mes}/{reajuste.ano}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{reajuste.status || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Operadora</p>
                  <p className="font-medium">{label(reajuste.operadora, md.operadoras)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Analista Responsável</p>
                  <p className="font-medium">{label(reajuste.responsavelAnalista, md.analistas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{labelCliente(reajuste.cliente)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Ticket</p>
                  <p className="font-medium">{reajuste.ticket || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Solicitante</p>
                  <p className="font-medium">{label(reajuste.solicitante, md.solicitantes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Filial</p>
                  <p className="font-medium">{reajuste.filial || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Responsável da Conta</p>
                  <p className="font-medium">{reajuste.responsavelConta || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-lime-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Qualidade (prazo)</p>
                  <p className="font-medium">{reajuste.qualidade || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Qualidade da Informação</p>
                  <p className="font-medium">{reajuste.qualidadeInformacao || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Planos</p>
                  <p className="font-medium">{reajuste.planos || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Data de Início</p>
                  <p className="font-medium">{reajuste.dataInicio ? new Date(reajuste.dataInicio).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Data de Finalização</p>
                  <p className="font-medium">{reajuste.dataFim ? new Date(reajuste.dataFim).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Data de Atualização</p>
                  <p className="font-medium">{reajuste.dataAtualizacao ? new Date(reajuste.dataAtualizacao).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Itens Pendentes</p>
                  <p className="font-medium">{reajuste.itensPendentes || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Itens Concluídos</p>
                  <p className="font-medium">{reajuste.itensConcluidos || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {reajuste.descricao || 'Nenhuma descrição fornecida para este reajuste.'}
              </p>
            </div>
          </div>

          {/* Edição do Reajuste */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Reajuste
            </h2>
            <EditInline reajuste={reajuste} />
          </div>

          {/* Informações Adicionais */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipo de Reajuste</p>
                <p className="font-medium">{reajuste.tipoReajuste || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Percentual</p>
                <p className="font-medium">{reajuste.percentual ? `${reajuste.percentual}%` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Aplicação</p>
                <p className="font-medium">{reajuste.dataAplicacao || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Observações</p>
                <p className="font-medium">{reajuste.observacoes || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral - Indicadores e Timeline */}
        <div className="space-y-6">
          {/* Indicadores */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Indicadores</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Status Atual</p>
                  <p className="font-medium">{reajuste.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Última Atualização</p>
                  <p className="font-medium">{fmt(reajuste.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Alterações */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <Timeline entityId={id!} entityType="reajuste" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Edição Inline
function EditInline({ reajuste }: { reajuste: any }) {
  const md = useMasterDataStore()
  const store = useReajusteStore()
  const { user } = useAuthStore()
  const [draft, setDraft] = useState(reajuste)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    // Inicializar draft exatamente como o reajuste original (igual páginas Cadastro/Manutenção)
    setDraft(reajuste)
  }, [reajuste])

  const changedKeys = useMemo(() => {
    const keys = ['mes', 'ano', 'dataInicio', 'dataFim', 'status', 'operadora', 'qualidade', 'qualidadeInformacao', 'planos', 'responsavelConta', 'filial', 'ticket', 'solicitante', 'responsavelAnalista', 'cliente', 'contrato', 'produto', 'dataAtualizacao', 'itensPendentes', 'itensConcluidos'] as const
    return keys.filter((k) => {
      const reajusteValue = reajuste[k as keyof typeof reajuste]
      const draftValue = draft[k as keyof typeof draft]
      
      // Normalizar todos os valores: null, undefined, '' → ''
      // Isso evita falsos positivos como null !== ''
      const isChanged = String(reajusteValue ?? '') !== String(draftValue ?? '')
      return isChanged
    })
  }, [reajuste, draft])

  async function applySave() {
    try {
      const { user: currentUser } = useAuthStore.getState()
      
      // Atualizar no store (que salva no banco)
      await store.upsert(draft)
      
      // Log manual apenas dos campos que realmente mudaram (EXATA RÉPLICA de Demandas/Manutenção)
      changedKeys.forEach((k) => {
        // Função para converter ID em nome para logs
        const convertIdToName = (id: string | undefined, fieldType: string) => {
          if (!id) return 'N/A'
          
          switch (fieldType) {
            case 'operadora':
              return md.operadoras.find(o => o.id === id)?.nome || id
            case 'cliente':
              return md.clientes.find(c => c.id === id)?.nome || id
            case 'contrato':
              return md.contratos.find(c => c.id === id)?.codigo || md.contratos.find(c => c.id === id)?.numero || id
            case 'produto':
              return md.produtos.find(p => p.id === id)?.nome || id
            case 'responsavelAnalista':
              return md.analistas.find(a => a.id === id)?.nome || id
            case 'solicitante':
              return md.solicitantes.find(s => s.id === id)?.nome || id
            default:
              return id
          }
        }
        
        // Converter valores para string legível (IDs para nomes) - IGUAL OUTRAS PÁGINAS
        const fieldsWithIdConversion = ['operadora', 'cliente', 'contrato', 'produto', 'responsavelAnalista', 'solicitante']
        
        const from = fieldsWithIdConversion.includes(k) 
          ? convertIdToName((reajuste as any)[k], k)
          : String((reajuste as any)[k] ?? '')
        
        const to = fieldsWithIdConversion.includes(k)
          ? convertIdToName((draft as any)[k], k)
          : String((draft as any)[k] ?? '')
        
        // Mapear campos para nomes legíveis
        const fieldMapping: { [key: string]: string } = {
          'mes': 'Mês',
          'ano': 'Ano',
          'dataInicio': 'Data de Início',
          'dataFim': 'Data de Finalização',
          'status': 'Status',
          'operadora': 'Operadora',
          'qualidade': 'Qualidade (prazo)',
          'qualidadeInformacao': 'Qualidade da Informação',
          'planos': 'Planos',
          'responsavelConta': 'Responsável da Conta',
          'filial': 'Filial',
          'ticket': 'Ticket',
          'solicitante': 'Solicitante',
          'responsavelAnalista': 'Analista Responsável',
          'cliente': 'Cliente',
          'contrato': 'Contrato',
          'produto': 'Produto',
          'dataAtualizacao': 'Data de Atualização',
          'itensPendentes': 'Itens Pendentes',
          'itensConcluidos': 'Itens Concluídos'
        }
        
        const fieldLabel = fieldMapping[k] || k
        
        store.log({ 
          reajusteId: reajuste.id, 
          type: 'field_change', 
          field: fieldLabel, 
          from, 
          to,
          user: currentUser?.name || 'Usuário desconhecido'
        })
      })
      
      setConfirmOpen(false)
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert('Erro ao salvar alterações. Tente novamente.')
    }
  }


  // Filtrar contratos por cliente (igual à página de criação)
  const selectedClienteId = draft.cliente
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  const contratosDoCliente = md.contratos.filter((c: any) => 
    c.clienteId === selectedClienteId || 
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente)
  )

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mês */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mês *</label>
            <select
              value={draft.mes || ''}
              onChange={(e) => setDraft({ ...draft, mes: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione o mês</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          {/* Ano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
            <input
              type="number"
              min="2000"
              value={draft.ano || ''}
              onChange={(e) => setDraft({ ...draft, ano: e.target.value || undefined })}
              placeholder="Ex: 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              value={draft.status || ''}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione...</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Ticket */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticket</label>
            <input
              type="text"
              value={draft.ticket || ''}
              onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
              placeholder="Número do ticket"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
            <input
              type="date"
              value={draft.dataInicio ? draft.dataInicio.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Data de Finalização */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Finalização</label>
            <input
              type="date"
              value={draft.dataFim ? draft.dataFim.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataFim: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Informações do Cliente e Operadora */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Cliente e Operadora</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Operadora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Operadora *</label>
            <select
              value={draft.operadora || ''}
              onChange={(e) => setDraft({ ...draft, operadora: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione...</option>
              {md.operadoras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
            <Autocomplete
              options={md.clientes}
              getOptionLabel={(option) => option?.nome || ''}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              value={md.clientes.find(c => c.id === (draft.cliente || '')) || null}
              onChange={(_, newValue) => setDraft({ ...draft, cliente: newValue?.id || undefined, contrato: '' })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Digite para buscar..."
                  variant="outlined"
                  size="small"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {option.nome}
                    </Typography>
                    {option.grupoEconomico && (
                      <Typography variant="caption" color="text.secondary">
                        Grupo: {option.grupoEconomico}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              noOptionsText="Nenhum cliente encontrado"
              loading={md.clientes.length === 0}
              loadingText="Carregando clientes..."
              filterOptions={(options, { inputValue }) => {
                const term = inputValue.toLowerCase()
                return options.filter(option =>
                  option.nome.toLowerCase().includes(term) ||
                  (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(term))
                )
              }}
            />
          </div>

          {/* Contrato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
            <Autocomplete
              options={contratosDoCliente}
              getOptionLabel={(option: any) => option?.codigo || option?.numero || ''}
              isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
              value={contratosDoCliente.find((c: any) => c.id === (draft.contrato || '')) || null}
              onChange={(_, newValue: any | null) => setDraft({ ...draft, contrato: newValue?.id || undefined })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={selectedClienteId ? 'Digite para buscar...' : 'Selecione um cliente primeiro'}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={!selectedClienteId}
                />
              )}
              renderOption={(props, option: any) => (
                <Box component="li" {...props} key={option.id}>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {option.codigo || option.numero}
                    </Typography>
                    {option.grupoEconomico && (
                      <Typography variant="caption" color="text.secondary">
                        Grupo: {option.grupoEconomico}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              noOptionsText={selectedClienteId ? 'Nenhum contrato encontrado' : 'Selecione um cliente primeiro'}
              loading={contratosDoCliente.length === 0 && !!selectedClienteId}
              loadingText="Carregando contratos..."
              filterOptions={(options, { inputValue }) => {
                const term = inputValue.toLowerCase()
                return options.filter((option: any) =>
                  (option.codigo && option.codigo.toLowerCase().includes(term)) ||
                  (option.numero && option.numero.toLowerCase().includes(term)) ||
                  (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(term))
                )
              }}
            />
          </div>

          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
            <select
              value={draft.produto || ''}
              onChange={(e) => setDraft({ ...draft, produto: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              {md.produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Informações de Responsabilidade */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Responsabilidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Analista Responsável */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Analista Responsável *</label>
            <select
              value={draft.responsavelAnalista || ''}
              onChange={(e) => setDraft({ ...draft, responsavelAnalista: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              required
              disabled
            >
              <option value="">Selecione...</option>
              {md.analistas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Analista vinculado ao usuário: {user?.name || 'Carregando...'}
            </p>
          </div>

          {/* Responsável da Conta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável da Conta</label>
            <input
              type="text"
              value={draft.responsavelConta || ''}
              onChange={(e) => setDraft({ ...draft, responsavelConta: e.target.value || undefined })}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Solicitante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
            <select
              value={draft.solicitante || ''}
              onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              {md.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          {/* Filial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filial</label>
            <input
              type="text"
              value={draft.filial || ''}
              onChange={(e) => setDraft({ ...draft, filial: e.target.value || undefined })}
              placeholder="Nome da filial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Informações de Qualidade e Planos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Qualidade e Planos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Qualidade (prazo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade (prazo)</label>
            <select
              value={draft.qualidade || ''}
              onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="ANTIGO">ANTIGO</option>
              <option value="FORA DO PRAZO">FORA DO PRAZO</option>
              <option value="NO PRAZO">NO PRAZO</option>
            </select>
          </div>

          {/* Qualidade da Informação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade da Informação</label>
            <select
              value={draft.qualidadeInformacao || ''}
              onChange={(e) => setDraft({ ...draft, qualidadeInformacao: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="ERRO NOS DADOS">ERRO NOS DADOS</option>
              <option value="FALTA DE DADOS">FALTA DE DADOS</option>
              <option value="OK">OK</option>
            </select>
          </div>

          {/* Planos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Planos</label>
            <select
              value={draft.planos || ''}
              onChange={(e) => setDraft({ ...draft, planos: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="PENDENTE ATUALIZAÇÃO">PENDENTE ATUALIZAÇÃO</option>
              <option value="OK">OK</option>
            </select>
          </div>

          {/* Data de Atualização */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Atualização</label>
            <input
              type="date"
              value={draft.dataAtualizacao ? draft.dataAtualizacao.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataAtualizacao: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Itens Pendentes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itens Pendentes</label>
            <input
              type="number"
              min="0"
              value={draft.itensPendentes || ''}
              onChange={(e) => setDraft({ ...draft, itensPendentes: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Itens Concluídos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itens Concluídos</label>
            <input
              type="number"
              min="0"
              value={draft.itensConcluidos || ''}
              onChange={(e) => setDraft({ ...draft, itensConcluidos: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Botão de salvar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          disabled={changedKeys.length === 0}
          onClick={() => setConfirmOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          <Save className="w-4 h-4 mr-2 inline" />
          Salvar alterações
        </button>
        {changedKeys.length > 0 && (
          <span className="text-sm text-gray-600">
            {changedKeys.length} alteração(ões) pendente(s)
          </span>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar alterações</h3>
            <p className="text-gray-600 mb-6">
              Aplicar {changedKeys.length} alteração(ões) neste reajuste?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={applySave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente Timeline será importado

