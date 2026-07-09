import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mapApiValidacaoToEntry, useValidationStore } from '../../store/validationStore'
import { formatContratoLabel, relationId, validateContratoParaCliente } from '../../utils/validationRelations'
import { filterContratosDoCliente } from '../../utils/manutencaoContratos'
import { ContratoLocalAutocomplete } from '../../components/ContratoLocalAutocomplete'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, Edit3, Save, Clock } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt, calcTempo } from '../../lib/utils'
import { ValidationEntry } from '../../types/validation'
import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { createPerfLogger } from '../../utils/perf'

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
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Validação
            </h2>
            <EditInline validation={validation} />
          </div>

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
                  {Array.isArray(validation.estruturaEdge) 
                    ? validation.estruturaEdge.length > 0 
                      ? validation.estruturaEdge.join(', ') 
                      : '-'
                    : validation.estruturaEdge || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-apoio-400">Estrutura MOVE</p>
                <p className="font-medium">
                  {Array.isArray(validation.estruturaMove) 
                    ? validation.estruturaMove.length > 0 
                      ? validation.estruturaMove.join(', ') 
                      : '-'
                    : validation.estruturaMove || '-'}
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
                <p className="font-medium">{validation.itensConcluidos || '-'}</p>
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
  const md = useMasterDataStore()
  const store = useValidationStore()
  const { user } = useAuthStore()
  
  // Normalizar estruturaEdge e estruturaMove para garantir que sejam sempre arrays
  const normalizeArrayField = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }
  
  const [draft, setDraft] = useState(() => ({
    ...validation,
    estruturaEdge: normalizeArrayField(validation.estruturaEdge),
    estruturaMove: normalizeArrayField(validation.estruturaMove)
  }))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Buscar o grupo econômico do cliente selecionado
  // Normalizar cliente para garantir que seja sempre um ID (string)
  const clienteIdNormalized = draft.cliente != null && typeof draft.cliente === 'object'
    ? (draft.cliente as { id: string }).id
    : draft.cliente
    
  const clienteSelecionadoData = clienteIdNormalized 
    ? md.clientes.find(cliente => cliente.id === clienteIdNormalized)
    : null

  const contratosDoCliente = clienteIdNormalized
    ? filterContratosDoCliente(
        md.contratos,
        clienteIdNormalized,
        clienteSelecionadoData?.grupoEconomico || null
      )
    : []

  const produtosFiltrados = draft.operadora
    ? md.produtos.filter((p) => p.operadoraId === draft.operadora || !p.operadoraId)
    : md.produtos

  // Nome do analista responsável
  const analistaResponsavelNome = (() => {
    const a = draft.analista ?? validation.analista
    if (a == null) return '-'
    if (typeof a === 'string') {
      return md.analistas.find(x => x.id === a)?.nome || a || '-'
    }
    if (typeof a === 'object' && a !== null) {
      return (a as { nome?: string }).nome || '-'
    }
    return '-'
  })()

  useEffect(() => {
    // Normalizar valores da validação antes de definir no draft
    // Analista: sempre usar o da validação (quem criou/responsável), nunca o usuário que está acessando
    const clienteNorm = relationId(validation.cliente, validation.clienteId) || undefined
    const contratoNorm = relationId(validation.contrato, validation.contratoId) || undefined
    const operadoraNorm = relationId(validation.operadora, validation.operadoraId) || undefined
    const produtoNorm = relationId(validation.produto, validation.produtoId) || undefined
    const normalizedDraft = {
      ...validation,
      tipo: validation.tipo || '',
      cliente: clienteNorm,
      clienteId: clienteNorm,
      contrato: contratoNorm,
      contratoId: contratoNorm,
      operadora: operadoraNorm,
      operadoraId: operadoraNorm,
      produto: produtoNorm,
      produtoId: produtoNorm,
      analista: validation.analista != null && typeof validation.analista === 'object'
        ? (validation.analista as { id: string }).id
        : validation.analista || '',
      solicitante: validation.solicitante != null && typeof validation.solicitante === 'object'
        ? (validation.solicitante as { id: string }).id
        : validation.solicitante || '',
      estruturaEdge: normalizeArrayField(validation.estruturaEdge),
      estruturaMove: normalizeArrayField(validation.estruturaMove)
    }
    setDraft(normalizedDraft)
  }, [validation.id, validation.tipo, validation.contrato, validation.contratoId, validation.cliente, validation.clienteId, validation.operadora, validation.operadoraId, validation.produto, validation.produtoId, validation.analista, validation.estruturaEdge, validation.estruturaMove])

  const changedKeys = ((): string[] => {
    // Excluir 'total' da lista pois é calculado automaticamente
    const keys = ['analista', 'dataInicio', 'dataFinal', 'status', 'ticket', 'solicitante', 'demanda', 'tipo', 'descricao', 'observacoes', 'cliente', 'contrato', 'operadora', 'produto', 'vigencia', 'qtdRetornos', 'qualidade', 'estruturaEdge', 'estruturaMove', 'formalizacao', 'itensPendentes', 'itensConcluidos'] as const
    
    const changed = keys.filter((k) => {
      // Obter valores originais da validação (usar IDs para campos de relacionamento)
      let validationValue: any
      switch (k) {
        case 'analista': validationValue = validation.analista; break
        case 'dataInicio': validationValue = validation.dataInicio; break
        case 'dataFinal': validationValue = validation.dataFinal; break
        case 'status': validationValue = validation.status; break
        case 'ticket': validationValue = validation.ticket; break
        case 'solicitante': validationValue = validation.solicitante; break
        case 'demanda': validationValue = validation.demanda; break
        case 'tipo': validationValue = validation.tipo; break
        case 'descricao': validationValue = validation.descricao; break
        case 'observacoes': validationValue = validation.observacoes; break
        case 'cliente': validationValue = validation.cliente; break
        case 'contrato': validationValue = relationId(validation.contrato, validation.contratoId); break
        case 'operadora': validationValue = validation.operadora; break
        case 'produto': validationValue = validation.produto; break
        case 'vigencia': validationValue = validation.vigencia; break
        case 'qtdRetornos': validationValue = validation.qtdRetornos; break
        case 'qualidade': validationValue = validation.qualidade; break
        case 'estruturaEdge': validationValue = validation.estruturaEdge; break
        case 'estruturaMove': validationValue = validation.estruturaMove; break
        case 'formalizacao': validationValue = validation.formalizacao; break
        case 'itensPendentes': validationValue = validation.itensPendentes; break
        case 'itensConcluidos': validationValue = validation.itensConcluidos; break
        default: validationValue = undefined
      }
      
      // Obter valores do draft
      let draftValue: any
      switch (k) {
        case 'analista': draftValue = draft.analista; break
        case 'dataInicio': draftValue = draft.dataInicio; break
        case 'dataFinal': draftValue = draft.dataFinal; break
        case 'status': draftValue = draft.status; break
        case 'ticket': draftValue = draft.ticket; break
        case 'solicitante': draftValue = draft.solicitante; break
        case 'demanda': draftValue = draft.demanda; break
        case 'tipo': draftValue = draft.tipo; break
        case 'descricao': draftValue = draft.descricao; break
        case 'observacoes': draftValue = draft.observacoes; break
        case 'cliente': draftValue = draft.cliente; break
        case 'contrato': draftValue = draft.contrato; break
        case 'operadora': draftValue = draft.operadora; break
        case 'produto': draftValue = draft.produto; break
        case 'vigencia': draftValue = draft.vigencia; break
        case 'qtdRetornos': draftValue = draft.qtdRetornos; break
        case 'qualidade': draftValue = draft.qualidade; break
        case 'estruturaEdge': draftValue = draft.estruturaEdge; break
        case 'estruturaMove': draftValue = draft.estruturaMove; break
        case 'formalizacao': draftValue = draft.formalizacao; break
        case 'itensPendentes': draftValue = draft.itensPendentes; break
        case 'itensConcluidos': draftValue = draft.itensConcluidos; break
        default: draftValue = undefined
      }
      
      // Comparação especial para arrays
      if (k === 'estruturaEdge' || k === 'estruturaMove') {
        const valArray = Array.isArray(validationValue) ? validationValue : []
        const draftArray = Array.isArray(draftValue) ? draftValue : []
        // Comparar arrays ordenados para detectar mudanças reais
        return JSON.stringify([...valArray].sort()) !== JSON.stringify([...draftArray].sort())
      }
      
      // Função helper para normalizar valores de objetos relacionados para IDs
      const normalizeValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        // Se for objeto (relacionamento populado), extrair o ID
        if (typeof value === 'object' && value !== null && 'id' in value) {
          return String(value.id).trim()
        }
        return String(value).trim()
      }
      
      // Normalizar valores antes de comparar
      const normalizedValidation = normalizeValue(validationValue)
      const normalizedDraft = normalizeValue(draftValue)
      
      // Debug específico para tipo
      if (k === 'tipo') {
        console.log(`🔍 Comparando ${k}:`, {
          validationValue,
          draftValue,
          normalizedValidation,
          normalizedDraft,
          changed: normalizedValidation !== normalizedDraft
        })
      }
      
      return normalizedValidation !== normalizedDraft
    })
    
    return changed
  })()

  // Função para calcular o total baseado nos campos EDGE e MOVE
  const calcularTotal = () => {
    let total = 0
    
    // Somar todos os valores selecionados no EDGE
    if (draft.estruturaEdge && Array.isArray(draft.estruturaEdge)) {
      draft.estruturaEdge.forEach(valor => {
        const numeroEdge = parseInt(valor.split('-')[0])
        if (!isNaN(numeroEdge)) {
          total += numeroEdge
        }
      })
    }
    
    // Somar todos os valores selecionados no MOVE
    if (draft.estruturaMove && Array.isArray(draft.estruturaMove)) {
      draft.estruturaMove.forEach(valor => {
        const numeroMove = parseInt(valor.split('-')[0])
        if (!isNaN(numeroMove)) {
          total += numeroMove
        }
      })
    }
    
    return total
  }

  // Calcular total automaticamente e atualizar o draft
  const totalCalculado = calcularTotal()
  
  // Atualizar o total no draft quando EDGE ou MOVE mudarem
  useEffect(() => {
    if (draft.estruturaEdge !== validation.estruturaEdge || draft.estruturaMove !== validation.estruturaMove) {
      setDraft(prev => ({ ...prev, total: totalCalculado }))
    }
  }, [draft.estruturaEdge, draft.estruturaMove])

  async function applySave() {
    if (isSaving) return
    try {
      setIsSaving(true)
      // Obter dados do usuário atual
      const { user: currentUser } = useAuthStore.getState()
      console.log('🔍 ValidationDetailPage: Usuário atual:', currentUser)
      
      if (!currentUser) {
        console.error('❌ ValidationDetailPage: Usuário não encontrado!')
        return
      }
      
      if (!currentUser.name) {
        console.error('❌ ValidationDetailPage: Nome do usuário não encontrado!')
        return
      }
      
      // Debug: mostrar apenas os campos que realmente mudaram
      console.log('🔍 Campos detectados como alterados:', changedKeys)
      console.log('🔍 Draft atual:', draft)
      console.log('🔍 Validation original:', validation)
      
      if (changedKeys.length === 0) {
        console.log('⚠️ Nenhuma alteração detectada, não salvando')
        setConfirmOpen(false)
        return
      }
      
      // Debug: mostrar o que será enviado
      const contratoErr = validateContratoParaCliente(
        typeof draft.contrato === 'string' ? draft.contrato : relationId(draft.contrato, validation.contratoId),
        clienteIdNormalized,
        contratosDoCliente,
        md.contratos
      )
      if (contratoErr) {
        alert(contratoErr)
        setConfirmOpen(false)
        return
      }

      const dataToSave = {
        ...draft,
        total: totalCalculado,
        cliente: relationId(draft.cliente) || undefined,
        clienteId: relationId(draft.cliente) || undefined,
        contrato: relationId(draft.contrato) || undefined,
        contratoId: relationId(draft.contrato) || undefined,
        operadora: relationId(draft.operadora) || undefined,
        operadoraId: relationId(draft.operadora) || undefined,
        produto: relationId(draft.produto) || undefined,
        produtoId: relationId(draft.produto) || undefined,
      }
      console.log('🔍 Dados que serão salvos:', dataToSave)
      
      await store.upsert(dataToSave as ValidationEntry)

      setConfirmOpen(false)

      // Histórico em background — não bloqueia o fechamento do modal
      void Promise.all(
        changedKeys.map((k) => {
          const convertIdToName = (id: string | undefined, fieldType: string) => {
            if (!id) return 'N/A'
            switch (fieldType) {
              case 'cliente':
                return md.clientes.find((c) => c.id === id)?.nome || id
              case 'contrato':
                return md.contratos.find((c) => c.id === id)?.codigo || md.contratos.find((c) => c.id === id)?.numero || id
              case 'operadora':
                return md.operadoras.find((o) => o.id === id)?.nome || id
              case 'produto':
                return md.produtos.find((p) => p.id === id)?.nome || id
              case 'analista':
                return md.analistas.find((a) => a.id === id)?.nome || id
              case 'solicitante':
                return md.solicitantes.find((s) => s.id === id)?.nome || id
              default:
                return id
            }
          }

          const from =
            k === 'status'
              ? String(validation.status ?? '')
              : k === 'ticket'
                ? String(validation.ticket ?? '')
                : k === 'solicitante'
                  ? convertIdToName(validation.solicitante, 'solicitante')
                  : k === 'tipo'
                    ? String(validation.tipo ?? '')
                    : k === 'descricao'
                      ? String(validation.descricao ?? '')
                      : k === 'observacoes'
                        ? String(validation.observacoes ?? '')
                        : k === 'cliente'
                          ? convertIdToName(relationId(validation.cliente, validation.clienteId), 'cliente')
                          : k === 'contrato'
                            ? convertIdToName(relationId(validation.contrato, validation.contratoId), 'contrato')
                            : k === 'operadora'
                              ? convertIdToName(relationId(validation.operadora, validation.operadoraId), 'operadora')
                              : k === 'produto'
                                ? convertIdToName(relationId(validation.produto, validation.produtoId), 'produto')
                                : k === 'analista'
                                  ? convertIdToName(relationId(validation.analista, validation.analistaId), 'analista')
                                  : k === 'dataInicio'
                                    ? String(validation.dataInicio ?? '')
                                    : k === 'dataFinal'
                                      ? String(validation.dataFinal ?? '')
                                      : k === 'vigencia'
                                        ? String(validation.vigencia ?? '')
                                        : k === 'qtdRetornos'
                                          ? String(validation.qtdRetornos ?? '')
                                          : k === 'qualidade'
                                            ? String(validation.qualidade ?? '')
                                            : k === 'formalizacao'
                                              ? String(validation.formalizacao ?? '')
                                              : k === 'itensPendentes'
                                                ? String(validation.itensPendentes ?? '')
                                                : k === 'itensConcluidos'
                                                  ? String(validation.itensConcluidos ?? '')
                                                  : String(validation.observacoes ?? '')

          const to =
            k === 'status'
              ? String(draft.status ?? '')
              : k === 'ticket'
                ? String(draft.ticket ?? '')
                : k === 'solicitante'
                  ? convertIdToName(draft.solicitante, 'solicitante')
                  : k === 'tipo'
                    ? String(draft.tipo ?? '')
                    : k === 'descricao'
                      ? String(draft.descricao ?? '')
                      : k === 'observacoes'
                        ? String(draft.observacoes ?? '')
                        : k === 'cliente'
                          ? convertIdToName(draft.cliente, 'cliente')
                          : k === 'contrato'
                            ? convertIdToName(draft.contrato, 'contrato')
                            : k === 'operadora'
                              ? convertIdToName(draft.operadora, 'operadora')
                              : k === 'produto'
                                ? convertIdToName(draft.produto, 'produto')
                                : k === 'analista'
                                  ? convertIdToName(draft.analista, 'analista')
                                  : k === 'dataInicio'
                                    ? String(draft.dataInicio ?? '')
                                    : k === 'dataFinal'
                                      ? String(draft.dataFinal ?? '')
                                      : k === 'vigencia'
                                        ? String(draft.vigencia ?? '')
                                        : k === 'qtdRetornos'
                                          ? String(draft.qtdRetornos ?? '')
                                          : k === 'qualidade'
                                            ? String(draft.qualidade ?? '')
                                            : k === 'formalizacao'
                                              ? String(draft.formalizacao ?? '')
                                              : k === 'itensPendentes'
                                                ? String(draft.itensPendentes ?? '')
                                                : k === 'itensConcluidos'
                                                  ? String(draft.itensConcluidos ?? '')
                                                  : String(draft.observacoes ?? '')

          if (k === 'status') {
            return store.log({
              validationId: validation.id,
              type: 'status_change' as const,
              field: 'status',
              from,
              to,
              user: currentUser?.name,
            })
          }

          return store.log({
            validationId: validation.id,
            type: 'field_change' as const,
            field: k,
            from,
            to,
            user: currentUser?.name,
          })
        })
      )
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar validação:', error)
      const reason =
        (typeof error?.message === 'string' && error.message.trim())
          ? error.message.trim()
          : 'Erro desconhecido'

      const fieldLabel: Record<string, string> = {
        status: 'Status',
        ticket: 'Ticket',
        solicitante: 'Solicitante',
        tipo: 'Tipo',
        descricao: 'Descrição',
        observacoes: 'Observações',
        cliente: 'Cliente',
        contrato: 'Contrato',
        operadora: 'Operadora',
        produto: 'Produto',
        analista: 'Analista',
        dataInicio: 'Data de início',
        dataFinal: 'Data final',
        vigencia: 'Vigência',
        qtdRetornos: 'Qtd. retornos',
        qualidade: 'Qualidade',
        formalizacao: 'Formalização',
        itensPendentes: 'Itens pendentes',
        itensConcluidos: 'Itens concluídos',
        total: 'Total',
        estruturaEdge: 'Estrutura EDGE',
        estruturaMove: 'Estrutura MOVE'
      }

      const changedLabels = (Array.isArray(changedKeys) ? changedKeys : [])
        .map((k) => fieldLabel[k] || k)
        .filter(Boolean)

      const fieldsPart =
        changedLabels.length > 0
          ? ` Campos não salvos: ${changedLabels.join(', ')}.`
          : ''

      alert(`Falha ao salvar — nenhuma alteração foi aplicada.${fieldsPart} Motivo: ${reason}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Analista e Status - analista somente leitura (definido na criação), como em Manutenção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analista responsável</label>
          <input
            type="text"
            value={analistaResponsavelNome}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            placeholder="Definido na criação"
          />
          <p className="text-xs text-apoio-400 mt-1">
            ⚠️ O analista responsável é definido na criação e não pode ser alterado
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {['Em andamento', 'Transf. Analista', 'Aguardando validação', 'Com erros', 'Em reajuste', 'Concluído Parcialmente', 'Concluída', 'Cancelada'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início *</label>
          <input
            type="date"
            value={draft.dataInicio ? (typeof draft.dataInicio === 'string' ? draft.dataInicio.split('T')[0] : draft.dataInicio) : ''}
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={draft.dataFinal ? (typeof draft.dataFinal === 'string' ? draft.dataFinal.split('T')[0] : draft.dataFinal) : ''}
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Ticket e Solicitante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nº Ticket</label>
          <input
            type="text"
            value={draft.ticket}
            onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            placeholder="Número do ticket"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
          <select
            value={draft.solicitante != null && typeof draft.solicitante === 'object' 
              ? (draft.solicitante as { id: string }).id 
              : (draft.solicitante || '')}
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Tipo de Demanda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Demanda *</label>
          <select
            value={draft.tipo || ''}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione o tipo</option>
            <option value="Total">Total</option>
            <option value="SUB">SUB</option>
          </select>
        </div>
      </div>

      {/* Cliente, contrato, operadora e produto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option?.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find(c => c.id === (clienteIdNormalized || '')) || null}
            onChange={(_, newValue) => setDraft({
              ...draft,
              cliente: newValue?.id || undefined,
              clienteId: newValue?.id || undefined,
              contrato: undefined,
              contratoId: undefined,
            })}
            renderInput={(params) => (
              <TextField {...params} placeholder="Digite para buscar..." variant="outlined" size="small" fullWidth />
            )}
            noOptionsText="Nenhum cliente encontrado"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operadora</label>
          <select
            value={draft.operadora != null && typeof draft.operadora === 'object'
              ? (draft.operadora as { id: string }).id
              : (draft.operadora || '')}
            onChange={(e) => setDraft({
              ...draft,
              operadora: e.target.value || undefined,
              operadoraId: e.target.value || undefined,
              produto: undefined,
              produtoId: undefined,
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione uma operadora</option>
            {md.operadoras.map(op => <option key={op.id} value={op.id}>{op.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <ContratoLocalAutocomplete
            valueId={typeof draft.contrato === 'string' ? draft.contrato : relationId(draft.contrato, validation.contratoId)}
            onChangeId={(id) => setDraft({
              ...draft,
              contrato: id || undefined,
              contratoId: id || undefined,
            })}
            contratos={contratosDoCliente}
            disabled={!clienteIdNormalized}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
          <select
            value={draft.produto != null && typeof draft.produto === 'object'
              ? (draft.produto as { id: string }).id
              : (draft.produto || '')}
            onChange={(e) => setDraft({
              ...draft,
              produto: e.target.value || undefined,
              produtoId: e.target.value || undefined,
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um produto</option>
            {produtosFiltrados.map(produto => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Vigência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vigência</label>
          <input
            type="date"
            value={draft.vigencia ? (typeof draft.vigencia === 'string' ? draft.vigencia.split('T')[0] : draft.vigencia) : ''}
            onChange={(e) => setDraft({ ...draft, vigencia: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Qtd de Retornos e Qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qtd de retornos</label>
          <input
            type="number"
            value={draft.qtdRetornos ?? ''}
            onChange={(e) => setDraft({ ...draft, qtdRetornos: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade</label>
          <select
            value={draft.qualidade}
            onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione a qualidade</option>
            <option value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</option>
            <option value="1">1 - MEDIANO - NO MÁX 2 RETORNOS</option>
            <option value="2">2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS</option>
            <option value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO</option>
          </select>
        </div>
      </div>

      {/* Estrutura EDGE, MOVE e Formalização */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estrutura EDGE (Multi-seleção) - {draft.estruturaEdge?.length || 0} item(s)
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
            {[
              { value: "0", label: "0- Sem erros" },
              { value: "1-CODIGO_CONTRATO", label: "1-ERRO CODIGO CONTRATO" },
              { value: "1-CNPJ", label: "1-ERRO CNPJ" },
              { value: "1-CODIGO_SUB", label: "1-ERRO CODIGO SUB" },
              { value: "1-VIGENCIA", label: "1-ERRO VIGENCIA" },
              { value: "1-ASSOCIACAO_MOVE", label: "1-ERRO ASSOCIAÇÃO NO MOVE" },
              { value: "1-RAZAO_SOCIAL", label: "1-ERRO RAZÃO SOCIAL" },
              { value: "1-PLANO_COBERTURAS", label: "1-ERRO Plano; Cadastrado/Coberturas" },
              { value: "1-FINANCEIRO", label: "1-ERRO Financeiro" },
              { value: "1-LIMITE_TECNICO", label: "1-ERRO Limite Técnico" },
              { value: "1-COPARTICIPACAO", label: "1-ERRO Coparticipação" },
              { value: "1-CONTRIBUICAO", label: "1-ERRO Contribuição" },
              { value: "1-DADOS_GERAIS", label: "1-ERRO Dados Gerais" },
              { value: "1-ACESSOS", label: "1-ERRO ACESSOS" },
              { value: "1-ERRO_EQUIPE_ATENDIMENTO_MDS", label: "1-ERRO EQUIPE ATENDIMENTO MDS" }
            ].map((option) => {
              const estruturaEdgeArray = Array.isArray(draft.estruturaEdge) ? draft.estruturaEdge : []
              return (
                <label key={option.value} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={estruturaEdgeArray.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(draft.estruturaEdge) ? draft.estruturaEdge : []
                      if (e.target.checked) {
                        setDraft({ ...draft, estruturaEdge: [...currentValues, option.value] })
                      } else {
                        setDraft({ ...draft, estruturaEdge: currentValues.filter(v => v !== option.value) })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estrutura MOVE (Multi-seleção) - {draft.estruturaMove?.length || 0} item(s)
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
            {[
              { value: "0", label: "0- Sem erros" },
              { value: "1-CODIGO_CONTRATO", label: "1-ERRO CODIGO CONTRATO" },
              { value: "1-CNPJ", label: "1-ERRO CNPJ" },
              { value: "1-CODIGO_SUB", label: "1-ERRO CODIGO SUB" },
              { value: "1-VIGENCIA", label: "1-ERRO VIGENCIA" },
              { value: "1-ASSOCIACAO_MOVE", label: "1-ERRO ASSOCIAÇÃO NO MOVE" },
              { value: "1-RAZAO_SOCIAL", label: "1-ERRO RAZÃO SOCIAL" }
            ].map((option) => {
              const estruturaMoveArray = Array.isArray(draft.estruturaMove) ? draft.estruturaMove : []
              return (
                <label key={option.value} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={estruturaMoveArray.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(draft.estruturaMove) ? draft.estruturaMove : []
                      if (e.target.checked) {
                        setDraft({ ...draft, estruturaMove: [...currentValues, option.value] })
                      } else {
                        setDraft({ ...draft, estruturaMove: currentValues.filter(v => v !== option.value) })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Formalização</label>
          <select
            value={draft.formalizacao}
            onChange={(e) => setDraft({ ...draft, formalizacao: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione o status</option>
            <option value="0">0 - FORMALIZAÇÃO COMPLETA</option>
            <option value="1">1 - FORMALIZAÇÃO PARCIAL</option>
            <option value="2">2 - SEM FORMALIZAÇÃO</option>
          </select>
        </div>
      </div>

      {/* Itens Pendentes e Concluídos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Itens Pendentes</label>
          <input
            type="number"
            value={draft.itensPendentes ?? ''}
            onChange={(e) => setDraft({ ...draft, itensPendentes: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-apoio-400 mt-1">Quantidade de itens pendentes</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Itens Concluídos</label>
          <input
            type="number"
            value={draft.itensConcluidos ?? ''}
            onChange={(e) => setDraft({ ...draft, itensConcluidos: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-apoio-400 mt-1">Quantidade de itens concluídos</p>
        </div>
      </div>

      {/* Total */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Total *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={totalCalculado}
          readOnly
          placeholder="Total"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', fontSize: '1.1rem', fontWeight: 'bold' }}
        />
        <p className="text-xs text-apoio-400 mt-1">
          Calculado automaticamente: EDGE ({draft.estruturaEdge?.length || 0} seleções) + MOVE ({draft.estruturaMove?.length || 0} seleções) = {totalCalculado}
        </p>
      </div>


      {/* Descrição do Chamado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição do chamado</label>
        <textarea
          value={draft.descricao}
          onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
          placeholder="Descrição detalhada do chamado"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
        <textarea
          value={draft.observacoes}
          onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
          placeholder="Observações gerais sobre a validação..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>


      {/* Botão de salvar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <PrimaryActionButton
          disabled={changedKeys.length === 0}
          onClick={() => setConfirmOpen(true)}
          startIcon={<SaveIcon />}
        >
          Salvar alterações
        </PrimaryActionButton>
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
              Aplicar {changedKeys.length} alteração(ões) nesta validação?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={applySave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

