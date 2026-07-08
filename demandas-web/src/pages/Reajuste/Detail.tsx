import { useParams, useNavigate } from 'react-router-dom'
import { useReajusteStore } from '../../store/reajusteStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useTimelineStore } from '../../store/timelineStore'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt } from '../../lib/utils'
import { createPerfLogger } from '../../utils/perf'
import { ReajusteEditInline } from './ReajusteEditInline'

export default function ReajusteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const store = useReajusteStore()
  const timelineStore = useTimelineStore()
  const md = useMasterDataStore()
  const perfRef = useRef(createPerfLogger('Reajuste/Editar'))
  const perfReadyRef = useRef(false)
  const reajuste = store.items.find(r => r.id === id)
  
  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  const syncedOnceRef = useRef<boolean>(false)
  const [masterDataLoaded, setMasterDataLoaded] = useState(false)
  const [triedDirectFetch, setTriedDirectFetch] = useState(false)

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

  // Carregar apenas dados necessários para visualização e edição simplificada
  useEffect(() => {
    const loadData = async () => {
      if (store.items.length === 0 || !reajuste) {
        await store.syncFromApi?.()
      }
      const needsMasters = md.operadoras.length === 0
      if (needsMasters) {
        await md.syncFromApi?.({ entities: ['operadoras'] })
      }
      if (id && timelineStore.syncTimeline && !timelineSyncedRef.current.has(id)) {
        timelineSyncedRef.current.add(id)
        timelineStore.syncTimeline(id, 'reajuste')
      }
    }
    loadData()
  }, [id])

  useEffect(() => {
    setMasterDataLoaded(true)
  }, [])

  // Fallback extra: se ao recarregar não houver item no store, buscar diretamente por ID
  useEffect(() => {
    if (!reajuste && id) {
      (async () => {
        try {
          // Sync único quando não há itens ou item ainda não carregado
          if (!syncedOnceRef.current && (store.items.length === 0)) {
            syncedOnceRef.current = true
            await store.syncFromApi?.()
          }

          const { api } = await import('../../lib/api.local')
          const fetchedRaw = await api.getReajuste(id)
          const fetched: any = (fetchedRaw && fetchedRaw.id) ? fetchedRaw : fetchedRaw?.data
          if (fetched?.id) {
            if (fetched.id !== id) {
              navigate(`/reajuste/${fetched.id}`)
              setTriedDirectFetch(true)
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
            setTriedDirectFetch(true)
          } else {
            // Nada retornado para este ID
            setTriedDirectFetch(true)
          }
        } catch (e) {
          // Não redirecionar; apenas marcar tentativa concluída (igual Manutenção)
          setTriedDirectFetch(true)
        }
      })()
    }
  }, [reajuste, id])

  // Mostrar carregamento enquanto ainda estamos tentando resolver (sync/masters ou GET direto)
  if (!reajuste && (!masterDataLoaded || !triedDirectFetch)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!reajuste) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Reajuste não encontrado</h2>
          <p className="text-gray-600 mt-2">O reajuste solicitado não foi encontrado.</p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/reajuste')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Voltar à Lista
            </button>
            <button
              onClick={() => store.syncFromApi?.()}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
  const normalizeString = (str: any) => {
    return String(str ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ') // Normaliza espaços
  }

  // Função para buscar por nome (para ReajusteLancamento que armazena nomes como strings)
  const findByName = (name: string | undefined, arr?: { id: string, nome: string }[]) => {
    if (!name || !arr) return null
    const normalizedName = normalizeString(name)
    return arr.find(a => normalizeString(a.nome) === normalizedName) || null
  }

  // Função label que funciona tanto com ID quanto com nome (para compatibilidade)
  const label = (value?: string, arr?: { id: string, nome: string }[]) => {
    if (!value || !arr) return '-'
    // Primeiro tentar buscar por ID
    const byId = arr.find(a => a.id === value)
    if (byId) return byId.nome
    // Se não encontrar por ID, tentar buscar por nome (para ReajusteLancamento)
    const byName = findByName(value, arr)
    if (byName) return byName.nome
    // Se não encontrar, retornar o valor original (pode ser um nome que não está nos dados mestres)
    return value
  }

  // Função específica para exibir cliente com grupo econômico (busca por ID ou nome)
  const labelCliente = (value?: string) => {
    if (!value) return '-'
    // Primeiro tentar buscar por ID
    let cliente = md.clientes.find(c => c.id === value)
    // Se não encontrar por ID, tentar buscar por nome (para ReajusteLancamento)
    if (!cliente) {
      const normalizedValue = normalizeString(value)
      cliente = md.clientes.find(c => normalizeString(c.nome) === normalizedValue) || null
    }
    if (!cliente) {
      // Se não encontrar nos dados mestres, retornar o valor original (pode ser um nome que não está nos dados mestres)
      return value
    }
    
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
                  <p className="text-sm text-apoio-400">Mês/Ano</p>
                  <p className="font-medium">{reajuste.mes}/{reajuste.ano}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Operadora</p>
                  <p className="font-medium">{label(reajuste.operadora, md.operadoras)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Cliente</p>
                  <p className="font-medium">{labelCliente(reajuste.cliente)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Ticket</p>
                  <p className="font-medium">{reajuste.ticket || '-'}</p>
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
            <ReajusteEditInline reajuste={reajuste} />
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
                  <p className="font-medium">{reajuste.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Última Atualização</p>
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
