import { useNavigate, useParams } from 'react-router-dom'
import { useDemandStore } from '../../store/demandStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt } from '../../lib/utils'
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { Save, Edit3, Clock, ArrowLeft, Mail as MailIcon } from 'lucide-react'
import { Demand } from '../../types/demand'
import { Autocomplete, TextField, Box, Typography } from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { createPerfLogger } from '../../utils/perf'
import { qualidadeFromQtdRetornos } from '../../utils/qualidadeRetornos'

const EmailComunicacaoCadastroEdgeModal = lazy(async () => {
  const m = await import('../../components/EmailComunicacaoCadastroEdgeModal')
  return { default: m.EmailComunicacaoCadastroEdgeModal }
})

// Função para converter código de qualidade em texto legível
const getQualidadeLabel = (value?: string) => {
  const qualidadeMap: { [key: string]: string } = {
    '0': '0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO',
    '1': '1 - MEDIANO - NO MÁX 2 RETORNOS',
    '2': '2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS',
    '3': '3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO'
  }
  return value ? (qualidadeMap[value] || value) : '-'
}

function sistemasResumo(d: Demand, md: { sistemas: { id: string; nome: string }[] }) {
  const raw = d.sistemasIds
  let ids: string[] = []
  if (Array.isArray(raw)) ids = raw.filter((x): x is string => typeof x === 'string')
  const sid =
    typeof d.sistemaId === 'object' && d.sistemaId != null
      ? (d.sistemaId as { id?: string }).id
      : d.sistemaId
  if (!ids.length && sid) ids = [String(sid)]
  if (!ids.length) return d.sistema || '-'
  return ids.map((id) => md.sistemas.find((s) => s.id === id)?.nome || id).join(', ')
}

/** Chamado gravado com métricas por sistema (novo padrão): coluna JSON com pelo menos uma chave de sistema. */
function usesNewCadastroMetricsModel(d: Demand): boolean {
  const sm = (d as any).sistemasMetrics as Record<string, unknown> | null | undefined
  if (!sm || typeof sm !== 'object' || Array.isArray(sm)) return false
  return Object.keys(sm).length > 0
}

/** Dados nos campos globais antigos (fora de sistemasMetrics). */
function hasLegacyGlobalMetricsData(d: Demand): boolean {
  const qu = d.qtdUsuarios
  if (qu != null && String(qu).trim() !== '') return true
  if (d.qtdClientesVinculados != null && !Number.isNaN(Number(d.qtdClientesVinculados))) return true
  if (d.usuariosEmpresa != null && !Number.isNaN(Number(d.usuariosEmpresa))) return true
  return false
}

/** Cadastro antigo: ainda tinha Cliente / Contrato / Operadora / Produto no módulo 2. Novos só sistemas (IDs nulos). */
function isLegacyCadastro(demand: Demand): boolean {
  const nonempty = (v: unknown) => {
    if (v == null) return false
    if (typeof v === 'object') return !!(v as { id?: string }).id
    const s = String(v).trim()
    return s.length > 0
  }
  return (
    nonempty(demand.clienteId) ||
    nonempty(demand.contratoId) ||
    nonempty(demand.operadoraId) ||
    nonempty(demand.produtoId)
  )
}

export default function DemandDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, timeline, syncFromApi, syncTimeline, isLoading } = useDemandStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const perfRef = useRef(createPerfLogger('Cadastro/Editar'))
  const perfReadyRef = useRef(false)
  const d = items.find((x) => x.id === id)
  const legacyCadastro = useMemo(() => (d ? isLegacyCadastro(d) : false), [d])

  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  
  // Estado para controlar se os dados mestres estão carregados
  const [masterDataLoaded, setMasterDataLoaded] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

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

  // Carregar demandas + dados mestres + timeline ao abrir / trocar chamado (mesmo padrão que Manutenção)
  useEffect(() => {
    const loadData = async () => {
      if (items.length === 0 || !d) {
        await syncFromApi?.(!(items.length > 0 && !!d))
      }
      if (md.analistas.length === 0 || md.tiposServico.length === 0 || md.tiposDemanda.length === 0) {
        await md.syncFromApi?.()
      }
      if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
        timelineSyncedRef.current.add(id)
        syncTimeline(id)
      }
    }
    void loadData()
  }, [id])

  // Dados mestres: cadastro novo não precisa de clientes/contratos/etc. no módulo 2
  useEffect(() => {
    const legacy = d ? isLegacyCadastro(d) : false
    const base =
      md.tiposServico.length > 0 &&
      md.tiposDemanda.length > 0 &&
      md.sistemas.length > 0 &&
      md.areas.length > 0 &&
      md.analistas.length > 0
    const legacyExtra =
      md.clientes.length > 0 &&
      md.contratos.length > 0 &&
      md.operadoras.length > 0 &&
      md.produtos.length > 0
    setMasterDataLoaded(base && (!legacy || legacyExtra))
  }, [
    d,
    legacyCadastro,
    md.tiposServico.length,
    md.tiposDemanda.length,
    md.sistemas.length,
    md.areas.length,
    md.analistas.length,
    md.clientes.length,
    md.contratos.length,
    md.operadoras.length,
    md.produtos.length,
  ])

  const label = (id?: string | any, arr?: { id: string, nome: string }[]) => {
    // 🐛 CORREÇÃO: Se id for um objeto, extrair o id ou nome
    if (!id) return '-'
    
    // Se id for um objeto, tentar extrair o id ou nome
    let actualId: string | undefined
    if (typeof id === 'object' && id !== null) {
      actualId = id.id || id.nome
      // Se o objeto tem nome, retornar diretamente
      if (id.nome && typeof id.nome === 'string') {
        return id.nome
      }
    } else {
      actualId = String(id)
    }
    
    if (!actualId) return '-'
    
    const result = arr?.find(a => a.id === actualId)?.nome || '-'
    
    // Garantir que sempre retornamos uma string
    if (typeof result !== 'string') {
      return '-'
    }
    
    return result
  }

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
  
  const labelContrato = (id?: string) => {
    if (!id) return '-'
    const contrato = md.contratos.find(c => c.id === id)
    if (!contrato) return '-'
    return contrato.codigo || contrato.numero || `ID: ${id.substring(0, 8)}...`
  }

  // Mostrar carregamento apenas se realmente estiver carregando
  if ((isLoading && items.length === 0) || (d && !masterDataLoaded)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading && items.length === 0 ? 'Carregando dados...' : 'Carregando dados mestres...'}
          </p>
        </div>
      </div>
    )
  }

  if (!d) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Cadastro não encontrado</h1>
        <p>ID: {id}</p>
        <p>Total de demandas carregadas: {items.length}</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">
            IDs disponíveis: {items.slice(0, 3).map(item => item.id.substring(0, 8)).join(', ')}
            {items.length > 3 && '...'}
          </p>
          <button 
            onClick={() => navigate('/cadastro')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Voltar à Lista
          </button>
          <button 
            onClick={() => {
              console.log('🔄 Tentando recarregar dados...')
              syncFromApi?.()
            }}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  const newMetricsView = usesNewCadastroMetricsModel(d)
  const showLegacyMetricsView = !newMetricsView && (hasLegacyGlobalMetricsData(d) || legacyCadastro)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/cadastro')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Cadastro {d.ticket || '#' + id}
          </h1>
          <p className="text-gray-600 mt-1">
            Criada em {fmt(d.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrimaryActionButton
            onClick={() => setEmailModalOpen(true)}
            startIcon={<MailIcon />}
            title="Comunicar por e-mail (Edge, Move Local ou MOVE)"
          >
            Comunicar
          </PrimaryActionButton>
          <StatusBadge status={d.status ?? 'Em andamento'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Informações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo da Demanda */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Cadastro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Tipo de Serviço</p>
                  <p className="font-medium">{label(d.tipoServicoId, md.tiposServico)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Tipo de Demanda</p>
                  <p className="font-medium">{label(d.tipoId, md.tiposDemanda)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Sistemas</p>
                  <p className="font-medium">{sistemasResumo(d, md)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Área</p>
                  <p className="font-medium">{label(d.areaId, md.areas)}</p>
                </div>
              </div>
              {legacyCadastro && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-apoio-400">Cliente</p>
                      <p className="font-medium">{labelCliente(d.clienteId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-apoio-400">Contrato</p>
                      <p className="font-medium">{labelContrato(d.contratoId)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Descrição - Com muito mais espaço */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {d.descricao || 'Nenhuma descrição fornecida para esta demanda.'}
              </p>
            </div>
          </div>

          {/* Edição da Demanda */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Cadastro
            </h2>
            <EditInline d={d} legacyCadastro={legacyCadastro} newMetricsModel={newMetricsView} />
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
                  <p className="font-medium">{d.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Última Atualização</p>
                  <p className="font-medium">{fmt(d.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <Timeline entityId={id!} entityType="demanda" />
          </div>
        </div>
      </div>

      {emailModalOpen && (
        <Suspense fallback={null}>
          <EmailComunicacaoCadastroEdgeModal
            open={emailModalOpen}
            onClose={() => setEmailModalOpen(false)}
            demanda={d as any}
          />
        </Suspense>
      )}
    </div>
  )
}

// Componente de Edição Inline
function EditInline({
  d,
  legacyCadastro,
  newMetricsModel,
}: {
  d: Demand
  legacyCadastro: boolean
  /** True quando a demanda já tem `sistemasMetrics` na BD (novo padrão). */
  newMetricsModel: boolean
}) {
  const md = useMasterDataStore()
  const store = useDemandStore()
  const [draft, setDraft] = useState(d)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const sistemasSelecionados = useMemo(() => {
    const ids = new Set(((draft as Demand).sistemasIds || []).filter(Boolean))
    return md.sistemas.filter((s) => ids.has(s.id))
  }, [md.sistemas, (draft as Demand).sistemasIds])

  const showLegacyEdit = !newMetricsModel && (hasLegacyGlobalMetricsData(d) || legacyCadastro)

  const inputCls =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#009FDF] focus:ring-2 focus:ring-[#009FDF]/20'
  const inputReadonlyCls =
    'w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-600'

  const resolveSolicitanteName = (value?: string | null) => {
    if (!value) return undefined
    return md.solicitantesById?.[value]?.nome
      || md.solicitantes.find(s => s.id === value || s.nome === value)?.nome
      || value
  }

  const resolveSolicitanteId = (value?: string | null) => {
    if (!value) return ''
    if (md.solicitantesById?.[value]) return value
    const found = md.solicitantes.find(s => s.id === value || s.nome === value)
    return found?.id || value
  }

  const tiposDemandaParaEdicao = useMemo(() => {
    const all = md.tiposDemanda
    const active = all.filter((t) => t.ativo !== false)
    const rawId = typeof draft.tipoId === 'object' ? (draft.tipoId as { id?: string })?.id : draft.tipoId
    const idStr = rawId ? String(rawId) : ''
    if (!idStr) return active
    const current = all.find((t) => t.id === idStr)
    if (current && !active.some((t) => t.id === idStr)) {
      return [current, ...active]
    }
    return active
  }, [md.tiposDemanda, draft.tipoId])

  // Função label local para o componente EditInline
  const label = (id?: string | any, arr?: { id: string, nome: string }[]) => {
    // 🐛 CORREÇÃO: Se id for um objeto, extrair o id ou nome
    if (!id) return '-'
    
    // Se id for um objeto, tentar extrair o id ou nome
    let actualId: string | undefined
    if (typeof id === 'object' && id !== null) {
      actualId = id.id || id.nome
      // Se o objeto tem nome, retornar diretamente
      if (id.nome && typeof id.nome === 'string') {
        return id.nome
      }
    } else {
      actualId = String(id)
    }
    
    if (!actualId) return '-'
    
    const result = arr?.find(a => a.id === actualId)?.nome || '-'
    
    // Garantir que sempre retornamos uma string
    if (typeof result !== 'string') {
      return '-'
    }
    
    return result
  }

  useEffect(() => {
    // 🐛 CORREÇÃO: Normalizar dados para garantir que IDs sejam strings, não objetos
    const normalizedDraft = { ...d }
    
    // Normalizar analistaId
    if (normalizedDraft.analistaId && typeof normalizedDraft.analistaId === 'object') {
      normalizedDraft.analistaId = (normalizedDraft.analistaId as any).id || (normalizedDraft.analistaId as any).nome || ''
    }
    
    // Normalizar outros IDs que podem vir como objetos
    const idFields = ['areaId', 'clienteId', 'contratoId', 'operadoraId', 'produtoId', 'sistemaId', 'tipoId', 'tipoServicoId'] as const
    idFields.forEach(field => {
      if (normalizedDraft[field] && typeof normalizedDraft[field] === 'object') {
        (normalizedDraft as any)[field] = (normalizedDraft[field] as any).id || (normalizedDraft[field] as any).nome || ''
      }
    })

    const legacy = d as Demand & { periodicidade?: string }
    if (legacy.periodicidade != null && String(legacy.periodicidade).trim() !== '' && (normalizedDraft.qtdUsuarios == null || normalizedDraft.qtdUsuarios === '')) {
      normalizedDraft.qtdUsuarios = legacy.periodicidade
    }

    const rawSis = d.sistemasIds
    let sistemasIds: string[] = []
    if (Array.isArray(rawSis)) sistemasIds = rawSis.filter((x): x is string => typeof x === 'string')
    const sidNorm =
      typeof normalizedDraft.sistemaId === 'string' || typeof normalizedDraft.sistemaId === 'number'
        ? String(normalizedDraft.sistemaId)
        : (normalizedDraft.sistemaId as { id?: string } | undefined)?.id
    if (!sistemasIds.length && sidNorm) sistemasIds = [sidNorm]
    ;(normalizedDraft as Demand).sistemasIds = sistemasIds

    // Normalizar sistemasMetrics (novo fluxo) — garantir objeto
    const rawMetrics = (d as any).sistemasMetrics
    const parsedMetrics =
      rawMetrics && typeof rawMetrics === 'object' && !Array.isArray(rawMetrics) ? rawMetrics : undefined
    ;(normalizedDraft as any).sistemasMetrics = parsedMetrics

    const qualidadeAuto = qualidadeFromQtdRetornos(normalizedDraft.qtdRetornos)
    if (qualidadeAuto !== undefined) {
      ;(normalizedDraft as Demand).qualidade = qualidadeAuto as any
    }

    setDraft(normalizedDraft)
  }, [d])

  const contratosDoGrupo = md.contratos.filter(c => 
    c.grupoEconomico === md.clientes.find(cl => cl.id === draft.clienteId)?.grupoEconomico
  )

  const changedKeys = useMemo(() => {
    const keys = ['status', 'ticket', 'clienteId', 'contratoId', 'operadoraId', 'produtoId', 'sistemaId', 'sistemasIds', 'sistemasMetrics', 'areaId', 'tipoId', 'tipoServicoId', 'analistaId', 'descricao', 'solicitante', 'dataInicio', 'dataFinal', 'qtdUsuarios', 'qtdRetornos', 'qualidade', 'qtdClientesVinculados', 'usuariosEmpresa', 'observacoes'] as const
    return keys.filter((k) => {
      if (k === 'sistemasIds') {
        return JSON.stringify((d as Demand).sistemasIds ?? []) !== JSON.stringify((draft as Demand).sistemasIds ?? [])
      }
      if (k === 'sistemasMetrics') {
        return JSON.stringify((d as any).sistemasMetrics ?? {}) !== JSON.stringify((draft as any).sistemasMetrics ?? {})
      }
      const dValue = (d as any)[k]
      const draftValue = (draft as any)[k]
      return String(dValue ?? '') !== String(draftValue ?? '')
    })
  }, [d, draft])


  async function applySave() {
    try {
      // Obter dados do usuário atual
      const { user: currentUser } = useAuthStore.getState()
      console.log('🔍 DemandDetailPage: Usuário atual:', currentUser)
      console.log('🔍 DemandDetailPage: currentUser?.id:', currentUser?.id)
      console.log('🔍 DemandDetailPage: currentUser?.name:', currentUser?.name)
      
      // Teste direto: verificar se o usuário está definido
      if (!currentUser) {
        console.error('❌ DemandDetailPage: Usuário não encontrado!')
        console.log('❌ DemandDetailPage: Estado completo do authStore:', useAuthStore.getState())
        return
      }
      
      if (!currentUser.name) {
        console.error('❌ DemandDetailPage: Nome do usuário não encontrado!')
        console.log('❌ DemandDetailPage: Usuário completo:', currentUser)
        return
      }
      
      // Função para converter data para formato ISO-8601
      const formatDateForAPI = (dateString: string | null): string | null => {
        if (!dateString) return null
        // Se já está no formato ISO completo, retorna como está
        if (dateString.includes('T') && dateString.includes('Z')) return dateString
        // Se é apenas data (YYYY-MM-DD), adiciona horário
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return `${dateString}T00:00:00.000Z`
        }
        return dateString
      }

      // Preparar payload seguro para o backend
      // NOTA: userId não deve ser alterado durante edição (é quem criou originalmente)
      const updatePayload = {
        status: draft.status,
        ticket: draft.ticket || null,
        analistaId: draft.analistaId || null,
        solicitante: resolveSolicitanteName(draft.solicitante) || null,
        descricao: draft.descricao || null,
        observacoes: draft.observacoes || null,
        qualidade:
          (() => {
            const auto = qualidadeFromQtdRetornos(draft.qtdRetornos)
            return auto !== undefined ? auto : draft.qualidade || null
          })(),
        sistemasMetrics: (draft as any).sistemasMetrics ?? null,
        qtdUsuarios: draft.qtdUsuarios ?? null,
        qtdRetornos: draft.qtdRetornos !== undefined && draft.qtdRetornos !== null ? Number(draft.qtdRetornos) : null,
        qtdClientesVinculados: draft.qtdClientesVinculados !== undefined && draft.qtdClientesVinculados !== null ? Number(draft.qtdClientesVinculados) : null,
        usuariosEmpresa: draft.usuariosEmpresa !== undefined && draft.usuariosEmpresa !== null ? Number(draft.usuariosEmpresa) : null,
        dataInicio: formatDateForAPI(draft.dataInicio),
        dataFinal: formatDateForAPI(draft.dataFinal),
        // 🐛 CORREÇÃO: Normalizar IDs antes de enviar (garantir que sejam strings)
        ...(draft.clienteId && { clienteId: typeof draft.clienteId === 'object' ? (draft.clienteId as any)?.id : draft.clienteId }),
        ...(draft.contratoId && { contratoId: typeof draft.contratoId === 'object' ? (draft.contratoId as any)?.id : draft.contratoId }),
        ...(draft.operadoraId && { operadoraId: typeof draft.operadoraId === 'object' ? (draft.operadoraId as any)?.id : draft.operadoraId }),
        ...(draft.produtoId && { produtoId: typeof draft.produtoId === 'object' ? (draft.produtoId as any)?.id : draft.produtoId }),
        ...(() => {
          const arr = Array.isArray(draft.sistemasIds) ? draft.sistemasIds.filter(Boolean) : []
          const legacySid =
            typeof draft.sistemaId === 'object' && draft.sistemaId
              ? (draft.sistemaId as { id?: string }).id
              : draft.sistemaId
          const sistemaIdFinal = (arr[0] || legacySid || null) as string | null
          return {
            sistemaId: sistemaIdFinal,
            sistemasIds: arr.length ? arr : null,
          }
        })(),
        ...(draft.areaId && { areaId: typeof draft.areaId === 'object' ? (draft.areaId as any)?.id : draft.areaId }),
        ...(draft.tipoId && { tipoId: typeof draft.tipoId === 'object' ? (draft.tipoId as any)?.id : draft.tipoId }),
        ...(draft.tipoServicoId && { tipoServicoId: typeof draft.tipoServicoId === 'object' ? (draft.tipoServicoId as any)?.id : draft.tipoServicoId }),
        ...(draft.analistaId && { analistaId: typeof draft.analistaId === 'object' ? (draft.analistaId as any)?.id : draft.analistaId }),
      }
      
      console.log('🔍 DemandDetailPage: Atualizando demanda no backend...')
      console.log('🔍 DemandDetailPage: Payload:', JSON.stringify(updatePayload, null, 2))
      
      try {
        await api.updateDemanda(d.id, updatePayload)
        console.log('🔍 DemandDetailPage: Demanda atualizada no backend com sucesso')
      } catch (updateError: any) {
        console.log('🔍 DemandDetailPage: Erro na atualização, tentando criar novo registro...')
        console.log('🔍 DemandDetailPage: Erro:', updateError?.message)
        console.log('🔍 DemandDetailPage: Status do erro:', updateError?.status)
        
        // Extrair status da mensagem se não estiver disponível diretamente
        const errorStatus = updateError?.status || (updateError?.message?.includes('status: 500') ? 500 : null)
        console.log('🔍 DemandDetailPage: Status extraído:', errorStatus)
        
        // Se o erro for 500 e indicar que o registro não foi encontrado, criar um novo
        if (errorStatus === 500 || updateError?.message?.includes('P2025') || updateError?.message?.includes('No record was found')) {
          console.log('🔍 DemandDetailPage: Registro não encontrado, criando novo...')
          
          try {
            // Criar novo registro com o payload
            const newDemanda = await api.createDemanda(updatePayload)
            console.log('🔍 DemandDetailPage: Novo registro criado:', newDemanda)
            
            // Atualizar o ID no draft para o novo ID
            draft.id = newDemanda.id
            console.log('🔍 DemandDetailPage: ID atualizado para:', newDemanda.id)
            
          } catch (createError: any) {
            console.error('❌ DemandDetailPage: Erro ao criar novo registro:', createError)
            throw new Error(`Erro ao criar novo registro: ${createError?.message || 'Erro desconhecido'}`)
          }
          
        } else {
          // Re-lançar o erro se não for o caso específico
          console.error('❌ DemandDetailPage: Erro não tratado:', updateError)
          throw updateError
        }
      }
      
      // Atualizar no store local
      store.upsert(draft)
      
      // Log das mudanças
      changedKeys.forEach((k) => {
        if (k === 'sistemasIds') {
          const idsToNames = (ids: unknown) =>
            Array.isArray(ids)
              ? (ids as string[]).map((id) => md.sistemas.find((s) => s.id === id)?.nome || id).join(', ')
              : ''
          store.log({
            demandaId: d.id,
            type: 'field_change' as const,
            field: 'sistemas',
            from: idsToNames((d as Demand).sistemasIds),
            to: idsToNames((draft as Demand).sistemasIds),
            user: currentUser?.name,
          })
          return
        }
        if (k === 'sistemasMetrics') {
          const sistemasLabel = (id: string) => md.sistemas.find((s) => s.id === id)?.nome || id
          const metricsToText = (raw: unknown) => {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '—'
            const entries = Object.entries(raw as Record<string, any>).sort(([a], [b]) => a.localeCompare(b))
            if (!entries.length) return '—'
            const parts: string[] = []
            for (const [sid, v] of entries) {
              if (!sid || !v || typeof v !== 'object' || Array.isArray(v)) continue
              const qU = (v as any).qtdUsuarios
              const qC = (v as any).qtdClientesVinculados
              const segs: string[] = []
              if (qU !== undefined && qU !== null && qU !== '') segs.push(`usuários=${Number(qU)}`)
              if (qC !== undefined && qC !== null && qC !== '') segs.push(`clientes=${Number(qC)}`)
              if (!segs.length) continue
              parts.push(`${sistemasLabel(sid)}: ${segs.join(', ')}`)
            }
            return parts.length ? parts.join(' | ') : '—'
          }

          store.log({
            demandaId: d.id,
            type: 'field_change' as const,
            field: 'métricas por sistema',
            from: metricsToText((d as any).sistemasMetrics),
            to: metricsToText((draft as any).sistemasMetrics),
            user: currentUser?.name,
          })
          return
        }
        // Função para converter ID em nome para logs
        const convertIdToName = (id: string | undefined, fieldType: string) => {
          if (!id) return 'N/A'
          
          switch (fieldType) {
            case 'clienteId':
              return md.clientes.find(c => c.id === id)?.nome || id
            case 'contratoId':
              return md.contratos.find(c => c.id === id)?.codigo || id
            case 'operadoraId':
              return md.operadoras.find(o => o.id === id)?.nome || id
            case 'produtoId':
              return md.produtos.find(p => p.id === id)?.nome || id
            case 'sistemaId':
              return md.sistemas.find(s => s.id === id)?.nome || id
            case 'areaId':
              return md.areas.find(a => a.id === id)?.nome || id
            case 'tipoId':
              return md.tiposDemanda.find(t => t.id === id)?.nome || id
            case 'tipoServicoId':
              return md.tiposServico.find(ts => ts.id === id)?.nome || id
            case 'analistaId':
              return md.analistas.find(a => a.id === id)?.nome || id
            case 'solicitante':
              return resolveSolicitanteName(id) || id
            default:
              return id
          }
        }
        
        // Converter valores para string legível (IDs para nomes)
        // NOTA: 'solicitante' não é ID, mas está aqui para manter compatibilidade com convertIdToName (retorna o próprio valor)
        const fieldsWithIdConversion = ['clienteId', 'contratoId', 'operadoraId', 'produtoId', 'sistemaId', 'areaId', 'tipoId', 'tipoServicoId', 'analistaId', 'solicitante']
        
        // 🐛 CORREÇÃO: Normalizar valores antes de converter
        const fromValue = (d as any)[k]
        const toValue = (draft as any)[k]
        const normalizedFrom = typeof fromValue === 'object' ? (fromValue?.id || fromValue?.nome || '') : fromValue
        const normalizedTo = typeof toValue === 'object' ? (toValue?.id || toValue?.nome || '') : toValue
        
        const from = fieldsWithIdConversion.includes(k) 
          ? convertIdToName(normalizedFrom, k)
          : String(normalizedFrom ?? '')
        
        const to = fieldsWithIdConversion.includes(k)
          ? convertIdToName(normalizedTo, k)
          : String(normalizedTo ?? '')
        if (k === 'status') {
          store.log({ 
            demandaId: d.id, 
            type: 'status_change' as const, 
            field: 'status', 
            from, 
            to,
            user: currentUser?.name
          })
        } else {
          // Mapear campos de ID para nomes de campo legíveis
          const fieldMapping: { [key: string]: string } = {
            'clienteId': 'cliente',
            'contratoId': 'contrato', 
            'operadoraId': 'operadora',
            'produtoId': 'produto',
            'sistemaId': 'sistema',
            'areaId': 'area',
            'tipoId': 'tipo',
            'tipoServicoId': 'tipoServico',
            'analistaId': 'analista',
            'qtdUsuarios': 'Qtd de usuários',
            'qtdRetornos': 'Quantidade de Retornos',
            'qtdClientesVinculados': 'QTD Clientes Vinculados',
            'usuariosEmpresa': 'Usuários Empresa'
          }
          
          const fieldName = fieldMapping[k] || k
          
          console.log('🔍 DemandDetailPage: Criando log para campo:', {
            campoOriginal: k,
            campoMapeado: fieldName,
            valorAnterior: from,
            valorNovo: to,
            demandaId: d.id,
            user: currentUser?.name
          })
          
          const logData = { 
            demandaId: d.id, 
            type: 'field_change' as const, 
            field: fieldName, 
            from, 
            to,
            user: currentUser?.name
          }
          
          console.log('🔍 DemandDetailPage: Dados do log:', logData)
          console.log('🔍 DemandDetailPage: Verificando se usuário está definido:', {
            'currentUser existe': !!currentUser,
            'currentUser.id': currentUser?.id,
            'currentUser.name': currentUser?.name,
            'logData.user': logData.user,
          })
          
          store.log(logData)
          
          // Verificar se o log foi adicionado
          setTimeout(() => {
            const currentTimeline = store.timeline.filter(t => t.demandaId === d.id)
            console.log('🔍 DemandDetailPage: Timeline atual após log:', currentTimeline.length, 'eventos')
            console.log('🔍 DemandDetailPage: Último evento:', currentTimeline[0])
          }, 100)
          
          console.log('✅ DemandDetailPage: Log criado com sucesso')
        }
      })
      
      setConfirmOpen(false)
      console.log('✅ DemandDetailPage: Demanda atualizada com sucesso')
      
    } catch (error: any) {
      console.error('❌ DemandDetailPage: Erro ao atualizar demanda:', error)
      console.error('❌ DemandDetailPage: Tipo do erro:', typeof error)
      console.error('❌ DemandDetailPage: Error message:', error?.message)
      console.error('❌ DemandDetailPage: Error status:', error?.status)
      console.error('❌ DemandDetailPage: Error response:', error?.response)
      
      let errorMessage = 'Erro desconhecido ao atualizar demanda'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.status) {
        errorMessage = `Erro HTTP ${error.status}: ${error.statusText || 'Erro no servidor'}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      alert(`Erro ao atualizar demanda: ${errorMessage}\n\nVerifique o console para mais detalhes.`)
    }
  }

  const solicitanteSelectValue = resolveSolicitanteId(draft.solicitante)

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-2">
      {/* Status */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
        <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Estado</h3>
        </div>
        <label className={labelCls}>Status *</label>
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          className={inputCls}
        >
          {['Em andamento', 'Transf. Analista', 'Aguardando aprovação', 'Com erros', 'Em reajuste', 'Concluído Parcialmente', 'Concluída', 'Cancelada'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!legacyCadastro && (
        <p className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-white px-4 py-3 text-sm leading-relaxed text-slate-600">
          Este cadastro segue o fluxo atual: apenas <strong className="font-semibold text-slate-800">Sistemas</strong> no vínculo operacional. Cliente, Contrato,
          Operadora e Produto aparecem só em registos antigos que já tinham esses dados.
        </p>
      )}

      {/* Cliente / Contrato / Operadora / Produto — só cadastros legados */}
      {legacyCadastro && (
      <>
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Cliente e contrato</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Cliente</label>
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find(c => c.id === (typeof draft.clienteId === 'object' ? (draft.clienteId as any)?.id : draft.clienteId)) || null}
            onChange={(_, newValue) => setDraft({ ...draft, clienteId: newValue?.id || undefined })}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite para buscar..."
                className="w-full"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    '&:hover': {
                      borderColor: '#009FDF'
                    },
                    '&.Mui-focused': {
                      borderColor: '#009FDF',
                      boxShadow: '0 0 0 2px rgba(0, 159, 223, 0.1)'
                    }
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id} className="px-3 py-2 hover:bg-gray-50">
                <div>
                  <div className="font-medium text-gray-900">
                    {option.nome}
                  </div>
                  {option.grupoEconomico && (
                    <div className="text-sm text-apoio-400">
                      Grupo: {option.grupoEconomico}
                    </div>
                  )}
                </div>
              </li>
            )}
            noOptionsText="Nenhum cliente encontrado"
            loading={md.clientes.length === 0}
            loadingText="Carregando clientes..."
            filterOptions={(options, { inputValue }) => {
              const filtered = options.filter(option =>
                option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(inputValue.toLowerCase()))
              )
              return filtered
            }}
          />
        </div>
        <div>
          <label className={labelCls}>Contrato</label>
          <select
            value={typeof draft.contratoId === 'object' ? ((draft.contratoId as any)?.id || '') : (draft.contratoId || '')}
            onChange={(e) => setDraft({ ...draft, contratoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {contratosDoGrupo.map(ct => <option key={ct.id} value={ct.id}>{ct.codigo}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Operadora</label>
          <Autocomplete
            options={md.operadoras}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.operadoras.find(o => o.id === (typeof draft.operadoraId === 'object' ? (draft.operadoraId as any)?.id : draft.operadoraId)) || null}
            onChange={(_, newValue) => setDraft({ ...draft, operadoraId: newValue?.id || undefined })}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite para buscar..."
                className="w-full"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Typography variant="body1" fontWeight="medium">
                  {option.nome}
                </Typography>
              </Box>
            )}
            noOptionsText="Nenhuma operadora encontrada"
            loading={md.operadoras.length === 0}
            loadingText="Carregando operadoras..."
            filterOptions={(options, { inputValue }) => {
              const filtered = options.filter(option =>
                option.nome.toLowerCase().includes(inputValue.toLowerCase())
              )
              return filtered
            }}
          />
        </div>
        <div>
          <label className={labelCls}>Produto</label>
          <select
            value={typeof draft.produtoId === 'object' ? ((draft.produtoId as any)?.id || '') : (draft.produtoId || '')}
            onChange={(e) => setDraft({ ...draft, produtoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>
      </div>
      </>
      )}

      {/* Sistemas (multi) e Área */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Operação</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Sistemas</label>
          <Autocomplete
            multiple
            options={md.sistemas}
            getOptionLabel={(o) => o.nome}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={md.sistemas.filter((s) => (draft.sistemasIds || []).includes(s.id))}
            onChange={(_, v) => {
              const ids = v.map((x) => x.id)
              // Garantir que `sistemasMetrics` tenha uma chave por sistema selecionado,
              // mesmo quando o utilizador não preenche os valores (permite editar depois).
              const currentMetrics = (((draft as any).sistemasMetrics || {}) as Record<string, any>) ?? {}
              const nextMetrics: Record<string, any> = { ...currentMetrics }
              let metricsChanged = false
              for (const sid of ids) {
                if (!nextMetrics[sid] || typeof nextMetrics[sid] !== 'object') {
                  nextMetrics[sid] = {}
                  metricsChanged = true
                }
              }
              for (const sid of Object.keys(nextMetrics)) {
                if (!ids.includes(sid)) {
                  delete nextMetrics[sid]
                  metricsChanged = true
                }
              }
              setDraft({
                ...draft,
                sistemasIds: ids,
                sistemaId: ids[0] || undefined,
                ...(metricsChanged ? { sistemasMetrics: nextMetrics } : null),
              })
            }}
            renderInput={(params) => (
              <TextField {...params} size="small" placeholder="Um ou mais sistemas" className="w-full" />
            )}
          />
        </div>
        <div>
          <label className={labelCls}>Área</label>
          <select
            value={typeof draft.areaId === 'object' ? ((draft.areaId as any)?.id || '') : (draft.areaId || '')}
            onChange={(e) => setDraft({ ...draft, areaId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Métricas por sistema — dentro do módulo Sistemas */}
      <div className="mt-4 space-y-3">
        {sistemasSelecionados.map((s) => {
          const metrics = ((draft as any).sistemasMetrics || {}) as Record<string, any>
          const m = metrics[s.id] || {}
          return (
            <div
              key={s.id}
              className="rounded-xl border border-sky-200/40 bg-gradient-to-br from-sky-50/50 via-white to-white p-3.5 shadow-sm"
            >
              <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-sky-900/80">{s.nome}</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Qtd de usuários</label>
                  <input
                    type="number"
                    value={m.qtdUsuarios ?? ''}
                    onChange={(e) => {
                      const next = { ...(metrics || {}) }
                      next[s.id] = { ...(next[s.id] || {}), qtdUsuarios: e.target.value ? Number(e.target.value) : undefined }
                      setDraft({ ...draft, sistemasMetrics: next } as any)
                    }}
                    placeholder="Digite um número"
                    min="0"
                    step="1"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Qtd de clientes vinculados</label>
                  <input
                    type="number"
                    value={m.qtdClientesVinculados ?? ''}
                    onChange={(e) => {
                      const next = { ...(metrics || {}) }
                      next[s.id] = { ...(next[s.id] || {}), qtdClientesVinculados: e.target.value ? Number(e.target.value) : undefined }
                      setDraft({ ...draft, sistemasMetrics: next } as any)
                    }}
                    placeholder="Digite um número"
                    min="0"
                    step="1"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )
        })}
        {sistemasSelecionados.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Selecione um ou mais sistemas para preencher as métricas.
          </div>
        )}
      </div>

      {/* Legado (cadastros antigos): manter métricas globais dentro do módulo Sistemas */}
      {showLegacyEdit && (
        <div className="mt-4 rounded-xl border border-amber-200/50 bg-amber-50/40 p-3.5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900/80">
            Métricas (legado)
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Qtd de usuários</label>
              <input
                type="text"
                inputMode="numeric"
                value={draft.qtdUsuarios ?? ''}
                onChange={(e) => setDraft({ ...draft, qtdUsuarios: e.target.value || undefined })}
                placeholder="Digite um número"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>QTD Clientes Vinculados — EDGE</label>
              <input
                type="number"
                min="0"
                value={draft.qtdClientesVinculados ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    qtdClientesVinculados: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Usuários Empresa — MOVE</label>
              <input
                type="number"
                min="0"
                value={draft.usuariosEmpresa ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, usuariosEmpresa: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Registo e classificação</h3>
      </div>
      <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Nº Ticket</label>
          <input
            type="text"
            value={draft.ticket || ''}
            onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            placeholder="Número do ticket"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Solicitante</label>
          <select
            value={solicitanteSelectValue}
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Quinta linha - Analista */}
      <div>
        <label className={labelCls}>Analista Responsável</label>
        <input
          type="text"
          value={label(typeof draft.analistaId === 'object' ? (draft.analistaId as any)?.id : draft.analistaId, md.analistas)}
          readOnly
          className={inputReadonlyCls}
          placeholder="Definido na criação"
        />
        <p className="text-xs text-apoio-400 mt-1">
          ⚠️ O analista responsável é definido na criação e não pode ser alterado
        </p>
      </div>

      {/* Sexta linha - Tipo de Serviço e Tipo de Demanda */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Tipo de Serviço</label>
          <select
            value={typeof draft.tipoServicoId === 'object' ? ((draft.tipoServicoId as any)?.id || '') : (draft.tipoServicoId || '')}
            onChange={(e) => setDraft({ ...draft, tipoServicoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.tiposServico.map(tc => <option key={tc.id} value={tc.id}>{tc.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo de Demanda</label>
          <select
            value={typeof draft.tipoId === 'object' ? ((draft.tipoId as any)?.id || '') : (draft.tipoId || '')}
            onChange={(e) => setDraft({ ...draft, tipoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {tiposDemandaParaEdicao.map(ts => <option key={ts.id} value={ts.id}>{ts.nome}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            No cadastro de novas demandas só aparecem tipos ativos (Dados → Tipos). Aqui o tipo atual da demanda continua listado mesmo se estiver inativo.
          </p>
        </div>
      </div>

      {/* Sétima linha - Datas */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Data de Início</label>
          <input
            type="date"
            value={draft.dataInicio ? draft.dataInicio.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value || undefined })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Data Final</label>
          <input
            type="date"
            value={draft.dataFinal ? draft.dataFinal.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            className={inputCls}
          />
        </div>
      </div>
      </div>
      </div>

      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
        <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Métricas</h3>
      </div>
      <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls}>Quantidade de Retornos</label>
          <input
            type="number"
            min="0"
            value={draft.qtdRetornos ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              const qtdRetornos = raw === '' ? undefined : parseInt(raw, 10)
              const q = qualidadeFromQtdRetornos(qtdRetornos)
              setDraft({
                ...draft,
                qtdRetornos,
                ...(q !== undefined ? { qualidade: q } : {}),
              })
            }}
            placeholder="0"
            className={inputCls}
          />
        </div>
      </div>

      {/* Qualidade — só leitura; derivada dos retornos */}
      <div>
        <label className={labelCls}>Qualidade</label>
        <div
          className={`${inputCls} cursor-default bg-slate-50 text-slate-800`}
          tabIndex={-1}
          aria-readonly
        >
          {(() => {
            const code = qualidadeFromQtdRetornos(draft.qtdRetornos)
            const label =
              code !== undefined ? getQualidadeLabel(code) : getQualidadeLabel(draft.qualidade)
            return label === '-' ? '—' : label
          })()}
        </div>
        <p className="mt-1 text-xs text-slate-500">Calculada automaticamente a partir da quantidade de retornos.</p>
      </div>

      </div>
      </div>

      <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6">
        <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <span className="h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]" aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Descrição e notas</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              value={draft.descricao ?? ''}
              onChange={(e) => setDraft({ ...draft, descricao: e.target.value || undefined })}
              rows={10}
              placeholder="Descreva o pedido com escopo, contexto e detalhes…"
              className={`${inputCls} min-h-[220px] resize-y leading-relaxed`}
            />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <label className={labelCls}>Observações</label>
            <textarea
              value={draft.observacoes ?? ''}
              onChange={(e) => setDraft({ ...draft, observacoes: e.target.value || undefined })}
              rows={6}
              placeholder="Notas adicionais, restrições, contatos, histórico…"
              className={`${inputCls} min-h-[140px] resize-y leading-relaxed`}
            />
          </div>
        </div>
      </div>

      {/* Botão de salvar */}
      <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
        <div className="flex gap-2">
          <PrimaryActionButton
            disabled={changedKeys.length === 0}
            onClick={() => setConfirmOpen(true)}
            startIcon={<SaveIcon />}
          >
            Salvar alterações
          </PrimaryActionButton>
        </div>
        
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
              Aplicar {changedKeys.length} alteração(ões) nesta demanda?
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



