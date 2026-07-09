import { useNavigate, useParams } from 'react-router-dom'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { EmailComunicacaoModal } from '../../components/EmailComunicacaoModal'
import { fmt } from '../../lib/utils'
import { fixEncoding } from '../../utils/encodingFix'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Save, Edit3, Clock, ArrowLeft } from 'lucide-react'
import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { Save as SaveIcon, Email as EmailIcon } from '@mui/icons-material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { createPerfLogger } from '../../utils/perf'
import { qualidadeFromQtdRetornos } from '../../utils/qualidadeRetornos'
import {
  ManutencaoContratosVinculosResumo,
  ManutencaoContratosVinculosSection,
} from '../../components/ManutencaoContratosVinculosSection'
import { QualificacaoManutencaoPanel } from '../../components/manutencao/QualificacaoManutencaoPanel'
import {
  contratosVinculosToApi,
  deriveContratosIds,
  emptyContratoVinculoRow,
  parseContratosVinculos,
  rowsToVinculos,
  vinculosToLabel,
  vinculosToRows,
  type ContratoVinculoRow,
} from '../../utils/manutencaoContratos'

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

export default function ManutencaoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, timeline, syncFromApi, syncTimeline, isLoading } = useManutencaoStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const perfRef = useRef(createPerfLogger('Manutencao/Editar'))
  const perfReadyRef = useRef(false)
  const d = items.find((x) => x.id === id)
  
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

  // Carregar dados quando a página for acessada (otimizado)
  useEffect(() => {
    const loadData = async () => {
      // Carregar manutenções se necessário
      if (items.length === 0 || !d) {
        await syncFromApi?.()
      }
      
      // Carregar dados mestres se necessário
      if (md.analistas.length === 0 || md.tiposCadastro.length === 0 || md.padrao.length === 0) {
        await md.syncFromApi?.()
      }
      
      // Sincronizar timeline apenas uma vez
      if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
        console.log('🔄 Sincronizando timeline da manutenção:', id)
        timelineSyncedRef.current.add(id)
        syncTimeline(id)
      }
    }
    
    loadData()
  }, [id]) // Apenas quando ID muda

  // Verificar se os dados mestres estão carregados
  useEffect(() => {
    // Para manutenções antigas, cliente/contrato podem não existir ou a lista pode demorar.
    // Não travar a tela exigindo `clientes`/`contratos`; basta ter o essencial para renderizar.
    const isLoaded =
      md.tiposCadastro.length > 0 &&
      md.padrao.length > 0 &&
      md.sistemas.length > 0 &&
      md.areas.length > 0 &&
      md.analistas.length > 0
    setMasterDataLoaded(isLoaded)
  }, [
    md.tiposCadastro.length,
    md.padrao.length,
    md.sistemas.length,
    md.areas.length,
    md.analistas.length,
  ])

  // Debug removido para limpeza do console
  
  // Debug removido para limpeza do console

  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    return fixEncoding(result)
  }

  // Função específica para exibir cliente com grupo econômico
  const labelCliente = (id?: string) => {
    if (!id) return '-'
    const cliente = md.clientes.find(c => c.id === id)
    if (!cliente) return '-'
    
    if (cliente.grupoEconomico) {
      return `${fixEncoding(cliente.nome)} (${fixEncoding(cliente.grupoEconomico)})`
    }
    return fixEncoding(cliente.nome)
  }
  
  const labelContratos = (item: {
    contratosVinculos?: unknown
    contratosIds?: unknown
    contratoId?: string | null
    operadoraId?: string | null
    produtoId?: string | null
  }) => {
    const vinculos = parseContratosVinculos(item?.contratosVinculos, {
      contratosIds: item?.contratosIds,
      contratoId: item?.contratoId,
      operadoraId: item?.operadoraId,
      produtoId: item?.produtoId,
    })
    if (!vinculos.length) return '-'
    return fixEncoding(vinculosToLabel(vinculos, md.contratos, md.operadoras, md.produtos))
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
        <h1 className="text-2xl font-bold mb-4">Manutenção não encontrada</h1>
        <p>ID: {id}</p>
        <p>Total de manutenções carregadas: {items.length}</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">
            IDs disponíveis: {items.slice(0, 3).map(item => item.id.substring(0, 8)).join(', ')}
            {items.length > 3 && '...'}
          </p>
          <button 
            onClick={() => navigate('/manutencao')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Voltar à Lista
          </button>
          <button 
            onClick={() => {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/manutencao')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Manutenção {d.ticket || '#' + id}
          </h1>
          <p className="text-gray-600 mt-1">
            Criada em {fmt(d.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrimaryActionButton
            onClick={() => setEmailModalOpen(true)}
            startIcon={<EmailIcon />}
            title="Comunicar alteração por e-mail"
          >
            Comunicar
          </PrimaryActionButton>
          <StatusBadge status={d.status ?? 'Aberta'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Informações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo da Manutenção */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Manutenção</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Serviço</p>
                  <p className="font-medium">{label(d.tipoServicoId, md.tiposCadastro)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Manutenção</p>
                  <p className="font-medium">{label(d.tipoId, md.padrao)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Sistema</p>
                  <p className="font-medium">{label(d.sistemaId, md.sistemas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Área</p>
                  <p className="font-medium">{label(d.areaId, md.areas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{labelCliente(d.clienteId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Contrato</p>
                  <div className="font-medium">
                    <ManutencaoContratosVinculosResumo
                      item={d}
                      contratos={md.contratos}
                      operadoras={md.operadoras}
                      produtos={md.produtos}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição - Com muito mais espaço */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {fixEncoding(d.descricao) || 'Nenhuma descrição fornecida para esta manutenção.'}
              </p>
            </div>
          </div>

          {/* Edição da Manutenção */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Manutenção
            </h2>
            <EditInline d={d} />
          </div>

          {/* (Removido) Informações Adicionais */}
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
                  <p className="font-medium">{d.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Última Atualização</p>
                  <p className="font-medium">{fmt(d.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <QualificacaoManutencaoPanel manutencaoId={d.id} ticket={d.ticket} embedded />
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <Timeline entityId={id!} entityType="manutencao" />
          </div>
        </div>
      </div>

      {/* Modal de E-mail */}
      {emailModalOpen && (
        <EmailComunicacaoModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          manutencao={d}
        />
      )}
    </div>
  )
}

// Componente de Edição Inline
function EditInline({ d }: { d: any }) {
  const md = useMasterDataStore()
  const store = useManutencaoStore()
  const { user: currentUser } = useAuthStore()
  const [draft, setDraft] = useState(d)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sistemasIds, setSistemasIds] = useState<string[]>([])
  const [sistemasTotais, setSistemasTotais] = useState<Record<string, number>>({})
  const [contratosVinculosRows, setContratosVinculosRows] = useState<ContratoVinculoRow[]>([emptyContratoVinculoRow()])

  const sectionCardCls =
    'rounded-2xl border border-slate-200/50 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02] sm:p-6'
  const sectionHeaderCls = 'mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3'
  const sectionBarCls =
    'h-7 w-1 shrink-0 rounded-full bg-[#009FDF] shadow-[0_0_0_3px_rgba(0,159,223,0.14)]'
  // Mesmo padrão visual do Cadastro (Detail.tsx)
  const inputCls =
    'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#009FDF] focus:ring-2 focus:ring-[#009FDF]/20'
  const inputReadonlyCls =
    'w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-600'

  // Função label local para o componente EditInline
  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    return fixEncoding(result)
  }

  useEffect(() => {
    setDraft(d)
  }, [d])

  useEffect(() => {
    const parseSistemasIds = (raw: unknown): string[] => {
      if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean)
      if (typeof raw === 'string') {
        const t = raw.trim()
        if (!t) return []
        try {
          if (t.startsWith('[')) {
            const j = JSON.parse(t)
            if (Array.isArray(j)) return j.map(String).map((s) => s.trim()).filter(Boolean)
          }
        } catch {
          /* ignore */
        }
      }
      return []
    }

    let initial = parseSistemasIds((d as any)?.sistemasIds)
    if (!initial.length && d?.sistemaId) initial = [String(d.sistemaId)]

    let nextTotais: Record<string, number> = {}
    const rawTotais = (d as any)?.sistemasTotais
    if (rawTotais && typeof rawTotais === 'object' && !Array.isArray(rawTotais)) {
      for (const [k, v] of Object.entries(rawTotais as Record<string, unknown>)) {
        const n = Number(v)
        if (k && Number.isFinite(n) && n >= 0) nextTotais[String(k)] = n
      }
    }
    if (!Object.keys(nextTotais).length && initial[0]) {
      const n = typeof d.total === 'number' ? d.total : d.total ? Number(d.total) : 0
      nextTotais = { [initial[0]]: Number.isFinite(n) ? n : 0 }
    }

    setSistemasIds(initial)
    setSistemasTotais(nextTotais)
    const vinculos = parseContratosVinculos((d as any)?.contratosVinculos, {
      contratosIds: (d as any)?.contratosIds,
      contratoId: d?.contratoId,
      operadoraId: d?.operadoraId,
      produtoId: d?.produtoId,
    })
    setContratosVinculosRows(vinculosToRows(vinculos))
  }, [d?.id])

  const clienteIdNormalized = draft.clienteId
  const grupoDoCliente = md.clientes.find(cl => cl.id === clienteIdNormalized)?.grupoEconomico
  const contratosDoCliente = md.contratos.filter(c =>
    c.clienteId === clienteIdNormalized ||
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente)
  )

  const padroesParaEdicao = useMemo(() => {
    const all = md.padrao || []
    const active = all.filter((p: any) => p?.ativo !== false)
    const currentId = draft?.tipoId ? String(draft.tipoId) : ''
    if (!currentId) return active
    const current = all.find((p: any) => String(p?.id) === currentId)
    if (current && current.ativo === false && !active.some((p: any) => String(p?.id) === currentId)) {
      return [current, ...active]
    }
    return active
  }, [md.padrao, draft?.tipoId])

  const changedKeys = useMemo((): string[] => {
    const changed: string[] = []

    const isDiff = (a: unknown, b: unknown) => String(a ?? '') !== String(b ?? '')

    // campos simples do draft
    const simpleKeys = [
      'status',
      'ticket',
      'clienteId',
      'operadoraId',
      'produtoId',
      'areaId',
      'tipoId',
      'tipoServicoId',
      'descricao',
      'solicitante',
      'dataInicio',
      'dataFinal',
      'qtdRetornos',
      'qualidade',
      'observacoes',
    ] as const

    for (const k of simpleKeys) {
      if (isDiff((d as any)?.[k], (draft as any)?.[k])) changed.push(k)
    }

    // sistemas (novos campos) — não dependem do draft (são state)
    const normIds = (raw: unknown): string[] => {
      const arr = Array.isArray(raw) ? raw : []
      return [...new Set(arr.map(String).map((s) => s.trim()).filter(Boolean))].sort()
    }
    const serializeVinculos = (list: ReturnType<typeof rowsToVinculos>) =>
      JSON.stringify(
        list
          .map((v) => ({ c: v.contratoId, o: v.operadoraId || '', p: v.produtoId || '' }))
          .sort((a, b) => a.c.localeCompare(b.c))
      )
    const dV = parseContratosVinculos((d as any)?.contratosVinculos, {
      contratosIds: (d as any)?.contratosIds,
      contratoId: (d as any)?.contratoId,
      operadoraId: (d as any)?.operadoraId,
      produtoId: (d as any)?.produtoId,
    })
    const stV = rowsToVinculos(contratosVinculosRows)
    if (serializeVinculos(dV) !== serializeVinculos(stV)) changed.push('contratosVinculos')

    const dSis = normIds((d as any)?.sistemasIds ?? ((d as any)?.sistemaId ? [String((d as any).sistemaId)] : []))
    const stSis = normIds(sistemasIds)
    if (JSON.stringify(dSis) !== JSON.stringify(stSis)) changed.push('sistemasIds')

    const normTotais = (raw: unknown): Record<string, number> => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const n = Number(v)
        if (k && Number.isFinite(n) && n >= 0) out[String(k)] = n
      }
      return out
    }
    const dTotais = normTotais((d as any)?.sistemasTotais)
    const stTotais = normTotais(sistemasTotais)
    if (JSON.stringify(Object.entries(dTotais).sort()) !== JSON.stringify(Object.entries(stTotais).sort())) {
      changed.push('sistemasTotais')
    }

    // total (soma) é derivado dos totais por sistema
    const totalSum = sistemasIds.reduce((acc, sid) => acc + (sistemasTotais[sid] ?? 0), 0) || null
    if (isDiff((d as any)?.total, totalSum)) changed.push('total')

    // sistemaId (compatibilidade) = primeiro sistema selecionado
    const sistemaPrincipalId = sistemasIds[0] || null
    if (isDiff((d as any)?.sistemaId, sistemaPrincipalId)) changed.push('sistemaId')

    return [...new Set(changed)]
  }, [d, draft, sistemasIds, sistemasTotais, contratosVinculosRows])

  async function applySave() {
    try {
      if (!currentUser?.name) {
        alert('Erro: Usuário não encontrado. Faça login novamente.')
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
      const sistemaPrincipalId = sistemasIds[0] || null
      const totalSum = sistemasIds.reduce((acc, sid) => acc + (sistemasTotais[sid] ?? 0), 0)
      const vinculosApi = contratosVinculosToApi(contratosVinculosRows)
      const contratosIds = vinculosApi ? deriveContratosIds(vinculosApi) : []
      const updatePayload = {
        status: draft.status,
        ticket: draft.ticket || null,
        solicitante: draft.solicitante && draft.solicitante.trim() ? draft.solicitante.trim() : null,
        descricao: draft.descricao || null,
        observacoes: draft.observacoes || null,
        qualidade: draft.qualidade || null,
        qtdRetornos: draft.qtdRetornos || null,
        total: totalSum || null,
        dataInicio: formatDateForAPI(draft.dataInicio),
        dataFinal: formatDateForAPI(draft.dataFinal),
        // Sempre incluir todos os campos de ID, mesmo que sejam vazios
        analistaId: draft.analistaId || null,
        clienteId: draft.clienteId || null,
        contratosVinculos: vinculosApi,
        contratoId: contratosIds[0] || null,
        contratosIds: contratosIds.length ? contratosIds : null,
        operadoraId: vinculosApi?.[0]?.operadoraId || null,
        produtoId: vinculosApi?.[0]?.produtoId || null,
        sistemaId: sistemaPrincipalId,
        sistemasIds: sistemasIds.length ? sistemasIds : null,
        sistemasTotais: Object.keys(sistemasTotais).length ? sistemasTotais : null,
        areaId: draft.areaId || null,
        tipoId: draft.tipoId || null,
        tipoServicoId: draft.tipoServicoId || null,
      }
      
      // Atualizar manutenção no backend
      await api.updateManutencao(d.id, updatePayload)
      
      // Atualizar no store local
      store.upsert({
        ...draft,
        contratosVinculos: vinculosApi,
        contratoId: contratosIds[0] || null,
        contratosIds: contratosIds.length ? contratosIds : null,
        operadoraId: vinculosApi?.[0]?.operadoraId || null,
        produtoId: vinculosApi?.[0]?.produtoId || null,
        sistemaId: sistemaPrincipalId,
        sistemasIds,
        sistemasTotais,
        total: totalSum || null,
      })
      
      // Log das mudanças no timeline
      changedKeys.forEach((k) => {
        const sistemasLabel = (id: string) => fixEncoding(md.sistemas.find((s) => s.id === id)?.nome) || id
        const sistemasIdsToText = (ids: string[]) => (ids.length ? ids.map(sistemasLabel).join(', ') : '—')
        const contratoLabel = (id: string) => {
          const c = md.contratos.find((x) => x.id === id)
          return fixEncoding(c?.codigo || c?.numero) || id
        }
        const contratosIdsToText = (ids: string[]) => (ids.length ? ids.map(contratoLabel).join(', ') : '—')
        const totalsToText = (totais: Record<string, number>) => {
          const entries = Object.entries(totais)
            .filter(([sid]) => !!sid)
            .sort(([a], [b]) => a.localeCompare(b))
          if (!entries.length) return '—'
          return entries.map(([sid, v]) => `${sistemasLabel(sid)}=${Number(v)}`).join('; ')
        }

        // Função para converter ID em nome para logs
        const convertIdToName = (id: string | undefined, fieldType: string) => {
          if (!id) return 'N/A'
          
          switch (fieldType) {
            case 'clienteId':
              return fixEncoding(md.clientes.find(c => c.id === id)?.nome) || id
            case 'contratoId':
              const contrato = md.contratos.find(c => c.id === id)
              return fixEncoding(contrato?.codigo || contrato?.numero) || id
            case 'operadoraId':
              return fixEncoding(md.operadoras.find(o => o.id === id)?.nome) || id
            case 'produtoId':
              return fixEncoding(md.produtos.find(p => p.id === id)?.nome) || id
            case 'sistemaId':
              return fixEncoding(md.sistemas.find(s => s.id === id)?.nome) || id
            case 'areaId':
              return fixEncoding(md.areas.find(a => a.id === id)?.nome) || id
            case 'tipoId':
              return fixEncoding(md.padrao.find(t => t.id === id)?.nome) || id
            case 'tipoServicoId':
              return fixEncoding(md.tiposCadastro.find(ts => ts.id === id)?.nome) || id
            case 'solicitante':
              return fixEncoding(md.solicitantes.find(s => s.id === id)?.nome) || id
            default:
              return id
          }
        }
        
        const fieldMapping: { [key: string]: string } = {
          'clienteId': 'cliente',
          'contratoId': 'contrato', 
          'operadoraId': 'operadora',
          'produtoId': 'produto',
          'sistemaId': 'sistema',
          'areaId': 'area',
          'tipoId': 'tipo',
          'tipoServicoId': 'tipoServico'
        }
        
        const fieldName = fieldMapping[k] || k
        
        const legacyIds = Array.isArray((d as any)?.sistemasIds) ? ((d as any).sistemasIds as any[]).map(String) : []
        const legacyFallback = legacyIds.length ? legacyIds : (d?.sistemaId ? [String(d.sistemaId)] : [])
        const fromSistemasIds = legacyFallback.map((s) => s.trim()).filter(Boolean)
        const toSistemasIds = sistemasIds
        const fromVinculos = parseContratosVinculos((d as any)?.contratosVinculos, {
          contratosIds: (d as any)?.contratosIds,
          contratoId: d?.contratoId,
          operadoraId: d?.operadoraId,
          produtoId: d?.produtoId,
        })
        const toVinculos = rowsToVinculos(contratosVinculosRows)
        const vinculosToText = (list: typeof fromVinculos) =>
          list.length
            ? fixEncoding(vinculosToLabel(list, md.contratos, md.operadoras, md.produtos))
            : '—'

        const fromTotais = (d as any)?.sistemasTotais && typeof (d as any).sistemasTotais === 'object' && !Array.isArray((d as any).sistemasTotais)
          ? (d as any).sistemasTotais as Record<string, number>
          : {}
        const toTotais = sistemasTotais

        const from = k === 'contratosVinculos'
          ? vinculosToText(fromVinculos)
          : k === 'sistemasIds'
          ? sistemasIdsToText(fromSistemasIds)
          : k === 'sistemasTotais'
            ? totalsToText(fromTotais)
            : k === 'total'
              ? String((d as any)?.total ?? '')
              : k === 'sistemaId'
                ? convertIdToName((d as any)?.sistemaId, 'sistemaId')
                : k === 'status' ? String(d.status ?? '') : k === 'ticket' ? String(d.ticket ?? '') : k === 'clienteId' ? convertIdToName(d.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(d.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(d.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(d.produtoId, 'produtoId') : k === 'areaId' ? convertIdToName(d.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(d.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(d.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(d.descricao ?? '') : k === 'solicitante' ? convertIdToName(d.solicitante, 'solicitante') : k === 'dataInicio' ? String(d.dataInicio ?? '') : k === 'dataFinal' ? String(d.dataFinal ?? '') : k === 'qtdRetornos' ? String(d.qtdRetornos ?? '') : k === 'qualidade' ? String(d.qualidade ?? '') : k === 'usuariosEmpresa' ? String(d.usuariosEmpresa ?? '') : String(d.observacoes ?? '')

        const to = k === 'contratosVinculos'
          ? vinculosToText(toVinculos)
          : k === 'sistemasIds'
          ? sistemasIdsToText(toSistemasIds)
          : k === 'sistemasTotais'
            ? totalsToText(toTotais)
            : k === 'total'
              ? String(totalSum || '')
              : k === 'sistemaId'
                ? convertIdToName(String(sistemaPrincipalId || ''), 'sistemaId')
                : k === 'status' ? String(draft.status ?? '') : k === 'ticket' ? String(draft.ticket ?? '') : k === 'clienteId' ? convertIdToName(draft.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(draft.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(draft.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(draft.produtoId, 'produtoId') : k === 'areaId' ? convertIdToName(draft.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(draft.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(draft.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(draft.descricao ?? '') : k === 'solicitante' ? convertIdToName(draft.solicitante, 'solicitante') : k === 'dataInicio' ? String(draft.dataInicio ?? '') : k === 'dataFinal' ? String(draft.dataFinal ?? '') : k === 'qtdRetornos' ? String(draft.qtdRetornos ?? '') : k === 'qualidade' ? String(draft.qualidade ?? '') : k === 'usuariosEmpresa' ? String(draft.usuariosEmpresa ?? '') : String(draft.observacoes ?? '')

        const fieldNameFinal =
          k === 'contratosVinculos'
            ? 'contratos'
            : k === 'sistemasIds'
            ? 'sistemas'
            : k === 'sistemasTotais'
              ? 'totaisPorSistema'
              : k === 'total'
                ? 'total'
                : fieldName
        
        if (k === 'status') {
          store.log({ 
            manutencaoId: d.id, 
            type: 'status_change' as const, 
            field: 'status', 
            from, 
            to,
            user: currentUser.name
          })
        } else {
          store.log({ 
            manutencaoId: d.id, 
            type: 'field_change' as const, 
            field: fieldNameFinal, 
            from, 
            to,
            user: currentUser.name
          })
        }
      })
      
      setConfirmOpen(false)
      // Re-sincronizar timeline do servidor para evitar duplicatas no histórico
      if (d.id && store.syncTimeline) {
        await store.syncTimeline(d.id)
      }
      alert('Manutenção atualizada com sucesso!')
      
    } catch (error: any) {
      
      let errorMessage = 'Erro desconhecido ao atualizar manutenção'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.status) {
        errorMessage = `Erro HTTP ${error.status}: ${error.statusText || 'Erro no servidor'}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      alert(`Erro ao atualizar manutenção: ${errorMessage}`)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-2">
      <div className={sectionCardCls}>
        <div className={sectionHeaderCls}>
          <span className={sectionBarCls} aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Identificação</h3>
        </div>
        <div className="space-y-3">
          {/* Status (não ocupar a linha inteira) */}
          <div className="max-w-[320px]">
            <label className={labelCls}>Status *</label>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className={inputCls}
            >
              {['Aberta', 'Em andamento', 'Transf. Analista', 'Aguardando validação', 'Com erros', 'Concluído Parcialmente', 'Concluída', 'Cancelada'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

      {/* Primeira linha - Cliente e Contrato */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Cliente</label>
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find(c => c.id === draft.clienteId) || null}
            onChange={(_, newValue) => {
              setDraft({ ...draft, clienteId: newValue?.id || undefined, contratoId: undefined })
              setContratosVinculosRows([emptyContratoVinculoRow()])
            }}
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
                    {fixEncoding(option.nome)}
                  </Typography>
                  {option.grupoEconomico && (
                    <Typography variant="caption" color="text.secondary">
                      Grupo: {fixEncoding(option.grupoEconomico)}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText="Nenhum cliente encontrado"
            loading={md.clientes.length === 0}
            loadingText="Carregando clientes..."
            filterOptions={(options, { inputValue }) => {
              return options.filter(option =>
                option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(inputValue.toLowerCase()))
              )
            }}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Contratos, operadora e produto</label>
        <ManutencaoContratosVinculosSection
          rows={contratosVinculosRows}
          onChange={setContratosVinculosRows}
          contratos={contratosDoCliente}
          operadoras={md.operadoras}
          produtos={md.produtos}
          clienteSelected={!!clienteIdNormalized}
          textFieldProps={{ size: 'small', margin: 'none', fullWidth: true, variant: 'outlined' }}
        />
      </div>

      {/* Terceira linha - Ticket, Solicitante e Área */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            value={draft.solicitante || ''}
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Área</label>
          <select
            value={draft.areaId || ''}
            onChange={(e) => setDraft({ ...draft, areaId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Quinta linha - Analista */}
      <div>
        <label className={labelCls}>Analista Responsável</label>
        <input
          type="text"
          value={label(draft.analistaId, md.analistas)}
          readOnly
          className={inputReadonlyCls}
          placeholder="Definido na criação"
        />
        <p className="mt-1 text-xs text-slate-500">
          ⚠️ O analista responsável é definido na criação e não pode ser alterado
        </p>
      </div>

      {/* Sexta linha - Tipo de Serviço e Tipo de Manutenção */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls}>Tipo de Serviço</label>
          <select
            value={draft.tipoServicoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoServicoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {md.tiposCadastro.map(ts => <option key={ts.id} value={ts.id}>{ts.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo de Manutenção</label>
          <select
            value={draft.tipoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {padroesParaEdicao.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sexta linha - Datas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className={sectionCardCls}>
        <div className={sectionHeaderCls}>
          <span className={sectionBarCls} aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Operação</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Sistemas</label>
            <Autocomplete
              multiple
              options={md.sistemas}
              getOptionLabel={(option) => option.nome || ''}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              value={md.sistemas.filter((s) => sistemasIds.includes(s.id))}
              onChange={(_, newValue) => {
                const ids = (newValue ?? []).map((s) => s.id)
                setSistemasIds(ids)
                setSistemasTotais((prev) => {
                  const next: Record<string, number> = {}
                  for (const id of ids) next[id] = prev[id] ?? 0
                  return next
                })
                setDraft({ ...draft, sistemaId: ids[0] || undefined })
              }}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Selecione um ou mais sistemas" />
              )}
            />
          </div>
        </div>

        {sistemasIds.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {sistemasIds.map((sid) => {
              const nome = md.sistemas.find((s) => s.id === sid)?.nome || sid
              return (
                <div key={sid}>
                  <label className={labelCls}>{`Total - ${nome}`}</label>
                  <input
                    type="number"
                    min="0"
                    value={String(sistemasTotais[sid] ?? 0)}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = raw === '' ? 0 : Number(raw)
                      setSistemasTotais((prev) => ({ ...prev, [sid]: Number.isFinite(n) ? n : 0 }))
                    }}
                    className={inputCls}
                  />
                </div>
              )
            })}

            {/* Total (soma) — solicitado para ficar no módulo Operação */}
            <div>
              <label className={labelCls}>Total (soma)</label>
              <input
                type="number"
                min="0"
                value={String(sistemasIds.reduce((acc, sid) => acc + (sistemasTotais[sid] ?? 0), 0))}
                readOnly
                placeholder="0"
                className={inputReadonlyCls}
              />
            </div>
          </div>
        )}
      </div>

      <div className={sectionCardCls}>
        <div className={sectionHeaderCls}>
          <span className={sectionBarCls} aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Métricas</h3>
        </div>
        <div className="space-y-3">
          {/* Quantidade de Retornos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Quantidade de Retornos</label>
              <input
                type="number"
                min="0"
                value={draft.qtdRetornos || ''}
                onChange={(e) => {
                  const qtd = e.target.value ? parseInt(e.target.value) : undefined
                  const q = qualidadeFromQtdRetornos(qtd)
                  setDraft({ ...draft, qtdRetornos: qtd, qualidade: q ?? draft.qualidade })
                }}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* Qualidade */}
          <div>
            <label className={labelCls}>Qualidade</label>
            <input
              type="text"
              value={getQualidadeLabel(draft.qualidade)}
              readOnly
              className={inputReadonlyCls}
            />
            <p className="mt-1 text-xs text-slate-500">Definida automaticamente pela quantidade de retornos</p>
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div className={sectionCardCls}>
        <div className={sectionHeaderCls}>
          <span className={sectionBarCls} aria-hidden />
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-800">Descrição e notas</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              value={draft.descricao ?? ''}
              onChange={(e) => setDraft({ ...draft, descricao: e.target.value || undefined })}
              rows={10}
              placeholder="Descreva detalhadamente a manutenção..."
              className={`${inputCls} resize-y min-h-[220px] leading-relaxed`}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelCls}>Observações</label>
            <textarea
              value={draft.observacoes ?? ''}
              onChange={(e) => setDraft({ ...draft, observacoes: e.target.value || undefined })}
              rows={6}
              placeholder="Observações adicionais..."
              className={`${inputCls} resize-y min-h-[140px] leading-relaxed`}
            />
          </div>
        </div>
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
              Aplicar {changedKeys.length} alteração(ões) nesta manutenção?
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

