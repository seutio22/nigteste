import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mapApiValidacaoToEntry, useValidationStore } from '../../store/validationStore'
import { formatContratoLabel } from '../../utils/validationRelations'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, Edit3, Save, Clock } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt, calcTempo } from '../../lib/utils'
import { ValidationEntry } from '../../types/validation'
import { createPerfLogger } from '../../utils/perf'
import {
  ESTRUTURA_EDGE_OPTIONS,
  ESTRUTURA_MOVE_OPTIONS,
  formatEstruturaEntriesForDisplay,
} from './validacaoEstruturaOptions'
import { formatItensConcluidosDisplay } from './validacaoItensConcluidos'
import { usesValidacaoFormularioNovo } from './validacaoFormVersion'
import { useValidacaoEditDraft } from './useValidacaoEditDraft'
import { ValidacaoEditFormLegacy } from './ValidacaoEditFormLegacy'
import { ValidacaoEditFormNovo } from './ValidacaoEditFormNovo'

export default function ValidationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, logs, syncFromApi, syncTimeline, loading } = useValidationStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const perfRef = useRef(createPerfLogger('Validacao/Editar'))
  const perfReadyRef = useRef(false)
  const validation = items.find(v => v.id === id)
  // Removido fallback por sessionStorage para evitar loops; fluxo replica manutenção

  // Fallback extra: buscar diretamente por ID na API quando não encontrado no store (ex.: após refresh)
  useEffect(() => {
    if (!validation && id) {
      (async () => {
        try {
          const { api } = await import('../../lib/api.local')
          const fetchedRaw = await api.getValidacao(id)
          const fetched: any = (fetchedRaw && fetchedRaw.id) ? fetchedRaw : fetchedRaw?.data
          if (fetched?.id) {
            // Navegar para o ID real retornado (cobre caso de ID local vs ID do banco)
            if (fetched.id !== id) {
              try { sessionStorage.setItem('lastValidationId', fetched.id) } catch {}
              navigate(`/validacao/${fetched.id}`)
              return
            }
            // Inserir diretamente no store para evitar espera do sync
            const mapped = mapApiValidacaoToEntry(fetched)
            try {
              useValidationStore.setState((s) => ({ items: [mapped, ...s.items.filter(x => x.id !== mapped.id)] }))
            } catch {}
            // Opcional: sincronizar em background
            syncFromApi()
          }
        } catch (e: any) {
          // Se 404, tentar pelo ticket salvo; caso contrário, voltar à lista
          try {
            const lastTicket = sessionStorage.getItem('lastValidationTicket')
            if (lastTicket) {
              const { api } = await import('../../lib/api.local')
              const found = await api.getValidacoes(`?ticket=${encodeURIComponent(lastTicket)}`)
              if (Array.isArray(found) && found.length > 0 && found[0]?.id) {
                navigate(`/validacao/${found[0].id}`)
                return
              }
            }
          } catch {}
          // Fallback final: voltar para a lista
          navigate('/validacao')
        }
      })()
    }
  }, [validation, id])
  
  // Controles para evitar loops
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  const syncedOnceRef = useRef<boolean>(false)
  
  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
      console.log('🔄 Sincronizando timeline da validação (primeira vez):', id)
      timelineSyncedRef.current.add(id)
      syncTimeline(id)
    }
  }, [id]) // Apenas quando ID muda, não quando dados mudam
  
  // Estado para controlar se os dados mestres estão carregados
  const [masterDataLoaded, setMasterDataLoaded] = useState(false)

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  useEffect(() => {
    if (perfReadyRef.current) return
    if (md.clientes.length && md.contratos.length && md.analistas.length) {
      perfReadyRef.current = true
      perfRef.current.log('data-ready', {
        clientes: md.clientes.length,
        contratos: md.contratos.length,
        analistas: md.analistas.length
      })
    }
  }, [md.clientes.length, md.contratos.length, md.analistas.length])

  // Carregar dados quando a página for acessada (modelo igual Manutenção)
  useEffect(() => {
    if (!id) return

    let cancelled = false

    const loadData = async () => {
      const tasks: Promise<void>[] = []

      if (md.clientes.length === 0 && md.contratos.length === 0 && md.syncFromApi) {
        tasks.push(
          md.syncFromApi().then(() => {
            if (!cancelled) setMasterDataLoaded(true)
          })
        )
      } else {
        setMasterDataLoaded(true)
      }

      tasks.push(
        (async () => {
          try {
            const { api } = await import('../../lib/api.local')
            const fetchedRaw = await api.getValidacao(id)
            const fetched: any = fetchedRaw && fetchedRaw.id ? fetchedRaw : fetchedRaw?.data
            if (cancelled) return
            if (fetched?.id) {
              if (fetched.id !== id) {
                navigate(`/validacao/${fetched.id}`)
                return
              }
              const mapped = mapApiValidacaoToEntry(fetched)
              useValidationStore.setState((s) => ({
                items: [mapped, ...s.items.filter((x) => x.id !== mapped.id)],
              }))
            } else if (!validation) {
              navigate('/validacao')
            }
          } catch {
            if (!cancelled && !validation) {
              navigate('/validacao')
            }
          }
        })()
      )

      if (!syncedOnceRef.current && items.length === 0) {
        syncedOnceRef.current = true
        void syncFromApi()
      }

      await Promise.all(tasks)
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [id])

  // Debug: verificar se a validação foi encontrada
  console.log('🔍 ValidationDetailPage: Verificando validação...')
  console.log('🔍 ValidationDetailPage: ID procurado:', id)
  console.log('🔍 ValidationDetailPage: Items no store:', items.length)
  console.log('🔍 ValidationDetailPage: Items disponíveis:', items.map(item => ({ id: item.id, ticket: item.ticket })))
  console.log('🔍 ValidationDetailPage: Validação encontrada:', !!validation)
  
  if (!validation) return null

  const isFormularioNovo = usesValidacaoFormularioNovo(validation)

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

  // Função para gerar um título amigável para a validação
  const getValidationTitle = (validation: any) => {
    // Prioridade 1: Ticket (se existir)
    if (validation.ticket && validation.ticket.trim()) {
      return `#${validation.ticket}`
    }
    
    // Prioridade 2: Solicitante (se existir)
    if (validation.solicitante && validation.solicitante.trim()) {
      return validation.solicitante
    }
    
    // Prioridade 3: Demanda (se existir)
    if (validation.demanda && validation.demanda.trim()) {
      return validation.demanda
    }
    
    // Prioridade 4: Descrição (primeiras 30 caracteres)
    if (validation.descricao && validation.descricao.trim()) {
      const desc = validation.descricao.trim()
      return desc.length > 30 ? `${desc.substring(0, 30)}...` : desc
    }
    
    // Prioridade 5: Data de criação formatada
    if (validation.createdAt) {
      const date = new Date(validation.createdAt)
      return date.toLocaleDateString('pt-BR')
    }
    
    // Fallback: ID curto (primeiros 8 caracteres)
    return validation.id.substring(0, 8)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/validacao')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Validação {getValidationTitle(validation)}
          </h1>
          <p className="text-gray-600 mt-1">
            Criada em {fmt(validation.createdAt)}
          </p>
        </div>
        <StatusBadge status={validation.status || 'Em validação'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo da Validação */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Validação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Ticket</p>
                  <p className="font-medium">{validation.ticket || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Solicitante</p>
                  <p className="font-medium">{label(validation.solicitante, md.solicitantes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Cliente</p>
                  <p className="font-medium">{(() => {
                    const vc = validation.cliente
                    if (vc != null && typeof vc === 'object') {
                      const o = vc as { nome?: string; grupoEconomico?: string }
                      return o.grupoEconomico ? `${o.nome ?? ''} (${o.grupoEconomico})` : (o.nome ?? '-')
                    }
                    return labelCliente(typeof vc === 'string' ? vc : undefined)
                  })()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Operadora</p>
                  <p className="font-medium">{(() => {
                    const vo = validation.operadora
                    if (vo != null && typeof vo === 'object') return (vo as { nome?: string }).nome ?? '-'
                    return label(typeof vo === 'string' ? vo : undefined, md.operadoras)
                  })()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Contrato</p>
                  <p className="font-medium">{formatContratoLabel(validation.contrato, validation.contratoId, md.contratos)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Produto</p>
                  <p className="font-medium">{(() => {
                    const vp = validation.produto
                    if (vp != null && typeof vp === 'object') return (vp as { nome?: string }).nome ?? '-'
                    return label(typeof vp === 'string' ? vp : undefined, md.produtos)
                  })()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Total</p>
                  <p className="font-medium">R$ {validation.total?.toLocaleString('pt-BR') || '0'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Período</p>
                  <p className="font-medium">{calcTempo(validation.dataInicio, validation.dataFinal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {validation.descricao || 'Nenhuma descrição fornecida para esta validação.'}
              </p>
            </div>
          </div>

          {/* Edição da Validação */}
          {isFormularioNovo ? (
            <EditInline validation={validation} />
          ) : (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Editar Validação
              </h2>
              <EditInline validation={validation} />
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-apoio-400">Data de Início</p>
                <p className="font-medium">{validation.dataInicio || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Data Final</p>
                <p className="font-medium">{validation.dataFinal || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Analista Responsável</p>
                <p className="font-medium">{(() => {
                  const va = validation.analista
                  if (va != null && typeof va === 'object') return (va as { nome?: string }).nome ?? '-'
                  return label(typeof va === 'string' ? va : undefined, md.analistas)
                })()}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Área</p>
                <p className="font-medium">{label(validation.area, md.areas)}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Observações</p>
                <p className="font-medium">{validation.observacoes || '-'}</p>
              </div>
              {/* Novos campos para estruturas EDGE, MOVE e formalização */}
              <div>
                <p className="text-sm text-apoio-400">Estrutura EDGE</p>
                <p className="font-medium">
                  {formatEstruturaEntriesForDisplay(
                    Array.isArray(validation.estruturaEdge) ? validation.estruturaEdge : undefined,
                    ESTRUTURA_EDGE_OPTIONS
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Estrutura MOVE</p>
                <p className="font-medium">
                  {formatEstruturaEntriesForDisplay(
                    Array.isArray(validation.estruturaMove) ? validation.estruturaMove : undefined,
                    ESTRUTURA_MOVE_OPTIONS
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Formalização</p>
                <p className="font-medium">{validation.formalizacao || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Itens Pendentes</p>
                <p className="font-medium">{validation.itensPendentes || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Itens Concluídos</p>
                <p className="font-medium whitespace-pre-line">
                  {formatItensConcluidosDisplay(
                    validation.itensConcluidos,
                    validation.itensConcluidosDetalhe,
                    validation.tipo
                  )}
                </p>
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
                  <p className="text-sm text-apoio-400">Status Atual</p>
                  <p className="font-medium">{validation.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Última Atualização</p>
                  <p className="font-medium">{fmt(validation.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <Timeline entityId={id!} entityType="validacao" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Edição Inline
function EditInline({ validation }: { validation: ValidationEntry }) {
  const isNovo = usesValidacaoFormularioNovo(validation)
  const edit = useValidacaoEditDraft(validation, isNovo ? 'novo' : 'legacy')
  if (isNovo) return <ValidacaoEditFormNovo validation={validation} {...edit} />
  return <ValidacaoEditFormLegacy validation={validation} {...edit} />
}

