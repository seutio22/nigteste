import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { Edit3, ArrowLeft, Clock, Copy, FileText, Lock } from 'lucide-react'
import { Timeline } from '../../components/Timeline'
import { fmt, canEditAtendimento } from '../../lib/utils'
import { api } from '../../lib/api.local'
import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { createPerfLogger } from '../../utils/perf'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function AtendimentoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { items, syncFromApi, syncTimeline, isLoading, add } = useAtendimentoStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const perfRef = useRef(createPerfLogger('Atendimento/Editar'))
  const perfReadyRef = useRef(false)
  const atendimento = items.find((a) => a.id === id)

  // Nomes de solicitantes resolvidos por ID (quando não vêm da API — ex.: registro antigo ou excluído)
  const [resolvedSolicitanteById, setResolvedSolicitanteById] = useState<Record<string, string | 'deleted'>>({})
  const resolvedFetchRef = useRef<Set<string>>(new Set())

  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    perfRef.current.log('mount')
  }, [])

  // Mesmo padrão da página Demandas (Cadastro): forçar syncFromApi quando não tem lista ou quando o item não está na lista
  useEffect(() => {
    if (items.length === 0) {
      syncFromApi?.()
    } else if (!atendimento && id) {
      syncFromApi?.(true)
    }
    if (md.analistas.length === 0 || md.areas.length === 0 || md.solicitantes.length === 0) {
      md.syncFromApi?.()
    }
  }, [])

  // Tentar recarregar se o atendimento não for encontrado após o carregamento inicial (igual Demandas)
  useEffect(() => {
    if (items.length > 0 && !atendimento && id) {
      syncFromApi?.(true)
    }
  }, [items.length, atendimento, id])

  // Se o atendimento tem solicitante (UUID) que não está na lista de solicitantes, forçar sync dos dados mestres para carregar o nome
  useEffect(() => {
    if (!atendimento?.solicitante) return
    const inList = md.solicitantes.some(s => String(s.id).trim() === String(atendimento.solicitante).trim())
    if (!inList) md.syncFromApi?.({ entities: ['solicitantes'] })
  }, [atendimento?.id, atendimento?.solicitante, md.solicitantes.length])

  // Fallback: buscar nome do solicitante por ID quando não veio na API (registro antigo ou solicitante excluído)
  useEffect(() => {
    const sid = atendimento?.solicitante?.trim()
    if (!sid || !UUID_REGEX.test(sid)) return
    if (atendimento.solicitanteNome || md.solicitantesById?.[sid]) return
    if (resolvedFetchRef.current.has(sid)) return
    resolvedFetchRef.current.add(sid)
    api.getSolicitante(sid).then((s) => {
      setResolvedSolicitanteById((prev) => ({ ...prev, [sid]: s ? s.nome : 'deleted' }))
    }).catch(() => {
      setResolvedSolicitanteById((prev) => ({ ...prev, [sid]: 'deleted' }))
    })
  }, [atendimento?.id, atendimento?.solicitante, atendimento?.solicitanteNome, md.solicitantesById])

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

  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
      timelineSyncedRef.current.add(id)
      syncTimeline(id)
    }
  }, [id, syncTimeline])


  console.log('🔍 AtendimentoDetailPage: Renderizando...', {
    id,
    atendimento,
    masterDataStore: {
      clientes: md.clientes.length,
      areas: md.areas.length,
      operadoras: md.operadoras.length,
      produtos: md.produtos.length,
      sistemas: md.sistemas.length,
      analistas: md.analistas.length,
      tiposDemanda: md.tiposDemanda.length,
      tiposServico: md.tiposServico.length
    }
  })

  if (!atendimento) {
    return (
      <div className="p-6">
        <div className="text-center">
          {isLoading ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Carregando atendimento...</h1>
              <p className="text-gray-600 mb-6">Aguarde enquanto os dados são carregados.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Atendimento não encontrado</h1>
              <p className="text-gray-600 mb-6">O atendimento solicitado não foi encontrado no sistema.</p>
              <button
                onClick={() => navigate('/atendimento')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Voltar para Atendimentos
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const label = (id?: string, arr?: { id: string, nome?: string, codigo?: string }[]) => {
    if (!id || !arr) return '-'
    const item = arr.find(a => a.id === id)
    return item ? (item.nome || item.codigo) || '-' : '-'
  }

  // Solicitante: mesmo padrão da página Demandas — resolver por ID ou por nome
  const normId = (v: string | undefined) => (v ?? '').trim()
  const solicitanteLabel = (solicitanteValue?: string) => {
    if (!solicitanteValue) return ''
    const v = normId(solicitanteValue)
    const byId = md.solicitantesById?.[v] ?? md.solicitantes.find(s => normId(s.id) === v)
    if (byId?.nome) return byId.nome
    const byName = md.solicitantes.find(s => normId(s.nome) === v)
    if (byName?.nome) return byName.nome
    // ID de solicitante excluído (não está na lista): deixar em branco
    return UUID_REGEX.test(v) ? '' : solicitanteValue
  }
  const solicitanteInList = (value?: string) => value && md.solicitantes.some(s => normId(s.id) === normId(value) || normId(s.nome) === normId(value))

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

  // Funções de ação
  const handleDuplicate = async () => {
    if (!atendimento) return
    const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = atendimento
    try {
      const duplicated = await add({ ...rest, status: 'Aberto', ticket: '' })
      navigate(`/atendimento/${duplicated.id}`)
    } catch (error) {
      console.error('Erro ao duplicar atendimento:', error)
    }
  }

  const handleExportPdf = () => {
    if (!atendimento) return
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atendimento ${atendimento.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Atendimento ${atendimento.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${atendimento.status}</td></tr>
      <tr><td class="muted">Cliente</td><td>${labelCliente(atendimento.cliente)}</td></tr>
      <tr><td class="muted">Contrato</td><td>${label(atendimento.contrato, md.contratos)}</td></tr>
      <tr><td class="muted">Operadora</td><td>${label(atendimento.operadora, md.operadoras)}</td></tr>
      <tr><td class="muted">Produto</td><td>${label(atendimento.produto, md.produtos)}</td></tr>
      <tr><td class="muted">Sistema</td><td>${label(atendimento.sistema, md.sistemas)}</td></tr>
      <tr><td class="muted">Área</td><td>${label(atendimento.area, md.areas)}</td></tr>
      <tr><td class="muted">Analista</td><td>${label(atendimento.analista, md.analistas)}</td></tr>
      <tr><td class="muted">Tipo</td><td>${label(atendimento.tipo, md.tiposDemanda)}</td></tr>
      <tr><td class="muted">Descrição</td><td>${atendimento.descricao ?? '-'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(atendimento.updatedAt || new Date()).toLocaleString('pt-BR')}</td></tr>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/atendimento')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Atendimento {atendimento.ticket || '#' + id}
          </h1>
          <p className="text-gray-600 mt-1">
            Criado em {fmt(atendimento.createdAt || new Date().toISOString())}
          </p>
        </div>
        <StatusBadge status={atendimento.status ?? 'Aberto'} />
        
        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDuplicate()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Duplicar atendimento"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleExportPdf()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Exportar PDF"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Informações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo do Atendimento */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Atendimento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Cliente</p>
                  <p className="font-medium">{labelCliente(atendimento.cliente)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Contrato</p>
                  <p className="font-medium">{label(atendimento.contrato, md.contratos)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Operadora</p>
                  <p className="font-medium">{label(atendimento.operadora, md.operadoras)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Produto</p>
                  <p className="font-medium">{label(atendimento.produto, md.produtos)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Sistema</p>
                  <p className="font-medium">{label(atendimento.sistema, md.sistemas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Área</p>
                  <p className="font-medium">{label(atendimento.area, md.areas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-apoio-400">Solicitante</p>
                  <p className="font-medium">{atendimento.solicitanteNome ?? (resolvedSolicitanteById[atendimento.solicitante] === 'deleted' ? '' : resolvedSolicitanteById[atendimento.solicitante]) ?? solicitanteLabel(atendimento.solicitante)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {atendimento.descricao || 'Nenhuma descrição fornecida para este atendimento.'}
              </p>
            </div>
          </div>

          {/* Edição do Atendimento */}
          {canEditAtendimento(atendimento, user, atendimento.analista ? md.analistas.find(a => a.id === atendimento.analista)?.nome : undefined) ? (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Editar Atendimento
              </h2>
              <EditInline atendimento={atendimento} user={user} resolvedSolicitanteById={resolvedSolicitanteById} />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-center py-8 text-apoio-400">
                <div className="text-center">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-apoio-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Acesso Restrito</h3>
                  <p className="text-sm">
                    Você só pode editar atendimentos atribuídos a você.
                    {user?.role !== 'admin' && ' Apenas administradores podem editar todos os atendimentos.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral - Indicadores e Timeline */}
        <div className="space-y-6">
          {/* Indicadores */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicadores</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {atendimento.qtdRetornos || 0}
                </div>
                <div className="text-sm text-blue-800">Retornos</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {atendimento.dataInicio ? new Date(atendimento.dataInicio).toLocaleDateString('pt-BR') : '-'}
                </div>
                <div className="text-sm text-green-800">Data Início</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {atendimento.dataFinal ? new Date(atendimento.dataFinal).toLocaleDateString('pt-BR') : '-'}
                </div>
                <div className="text-sm text-orange-800">Data Final</div>
              </div>
            </div>
          </div>

                  {/* Timeline */}
        <Timeline entityId={id!} entityType="atendimento" />
        </div>
      </div>


    </div>
  )
}

// Componente de Edição Inline - EXATAMENTE como na página de demandas
function EditInline({
  atendimento,
  user,
  resolvedSolicitanteById
}: {
  atendimento: any
  user: any
  resolvedSolicitanteById: Record<string, string | 'deleted'>
}) {
  const md = useMasterDataStore()
  const atendimentoStore = useAtendimentoStore()
  // Inicializar draft com valores corretos - converter strings vazias para undefined
  const [draft, setDraft] = useState(() => {
    if (!atendimento) return null
    return {
      ...atendimento,
      cliente: atendimento.cliente || undefined,
      contrato: atendimento.contrato || undefined,
      operadora: atendimento.operadora || undefined,
      produto: atendimento.produto || undefined,
      sistema: atendimento.sistema || undefined,
      area: atendimento.area || undefined,
      analista: atendimento.analista || undefined,
      tipo: atendimento.tipo || undefined,
      tipoServico: atendimento.tipoServico || undefined,
    }
  })
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (atendimento) {
      setDraft({
        ...atendimento,
        cliente: atendimento.cliente || undefined,
        contrato: atendimento.contrato || undefined,
        operadora: atendimento.operadora || undefined,
        produto: atendimento.produto || undefined,
        sistema: atendimento.sistema || undefined,
        area: atendimento.area || undefined,
        analista: atendimento.analista || undefined,
        tipo: atendimento.tipo || undefined,
        tipoServico: atendimento.tipoServico || undefined,
      })
    }
  }, [atendimento.id])

  const clienteIdNormalized = typeof draft.cliente === 'object' && draft.cliente !== null
    ? draft.cliente.id
    : draft.cliente
  const grupoDoCliente = md.clientes.find(c => c.id === clienteIdNormalized)?.grupoEconomico
  const contratosFiltrados = md.contratos.filter((c: any) =>
    c.clienteId === clienteIdNormalized ||
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente)
  )

  const normIdS = (v: string | undefined) => (v ?? '').trim()
  const solicitanteLabelS = (val?: string) => {
    if (!val) return ''
    const v = normIdS(val)
    const byId = md.solicitantesById?.[v] ?? md.solicitantes.find(s => normIdS(s.id) === v)
    if (byId?.nome) return byId.nome
    const byName = md.solicitantes.find(s => normIdS(s.nome) === v)
    if (byName?.nome) return byName.nome
    // ID de solicitante excluído: deixar em branco
    return UUID_REGEX.test(v) ? '' : val
  }
  const solicitanteInList = (value?: string) => value && md.solicitantes.some(s => normIdS(s.id) === normIdS(value) || normIdS(s.nome) === normIdS(value))
  // Igual Demandas: normalizar valor do select para ID (quando o registro veio com nome)
  const resolveSolicitanteId = (value?: string | null) => {
    if (!value) return ''
    const v = normIdS(value)
    if (md.solicitantesById?.[v]) return value
    const found = md.solicitantes.find(s => normIdS(s.id) === v || normIdS(s.nome) === v)
    return found?.id ?? value
  }

  const changedKeys = ((): string[] => {
    const keys = ['status', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area', 'analista', 'tipo', 'tipoServico', 'descricao', 'solicitante', 'dataInicio', 'dataFinal', 'periodicidade', 'qtdRetornos', 'qualidade', 'observacoes'] as const
    return keys.filter((k) => {
      const dValue = (atendimento as any)[k]
      const draftValue = draft[k]
      return String(dValue ?? '') !== String(draftValue ?? '')
    })
  })()

  async function applySave() {
    try {
      // Usar o store para atualizar (que faz o mapeamento correto)
      await atendimentoStore.update(atendimento.id, draft, user)
      setConfirmOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar atendimento:', error)
      alert('Erro ao atualizar atendimento: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {['Aberto', 'Em andamento', 'Aguardando validação', 'Com erros', 'Em reajuste', 'Concluído', 'Cancelado'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Primeira linha - Cliente e Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find(c => c.id === draft.cliente) || null}
            onChange={(_, newValue) => setDraft({ ...draft, cliente: newValue?.id || undefined, contrato: undefined })}
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
              return options.filter(option =>
                option.nome.toLowerCase().includes(inputValue.toLowerCase()) ||
                (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(inputValue.toLowerCase()))
              )
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <Autocomplete
            options={contratosFiltrados}
            getOptionLabel={(option: any) => option?.codigo || option?.numero || ''}
            isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
            value={contratosFiltrados.find((c: any) => c.id === (typeof draft.contrato === 'object' ? draft.contrato?.id : draft.contrato)) || null}
            onChange={(_, newValue: any | null) => setDraft({ ...draft, contrato: newValue?.id || undefined })}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={clienteIdNormalized ? 'Digite para buscar...' : 'Selecione um cliente primeiro'}
                variant="outlined"
                size="small"
                fullWidth
                disabled={!clienteIdNormalized}
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
            noOptionsText={clienteIdNormalized ? 'Nenhum contrato encontrado' : 'Selecione um cliente primeiro'}
            loading={contratosFiltrados.length === 0 && !!clienteIdNormalized}
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
      </div>

      {/* Segunda linha - Operadora e Produto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operadora</label>
          <select
            value={draft.operadora || ''}
            onChange={(e) => setDraft({ ...draft, operadora: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.operadoras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
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

      {/* Terceira linha - Sistema e Área */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sistema</label>
          <select
            value={draft.sistema || ''}
            onChange={(e) => setDraft({ ...draft, sistema: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.sistemas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
          <select
            value={draft.area || ''}
            onChange={(e) => setDraft({ ...draft, area: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Quarta linha - Analista e Solicitante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analista *</label>
          <select
            value={draft.analista || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          >
            <option value="">Selecione...</option>
            {md.analistas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <p className="text-xs text-apoio-400 mt-1">O analista não pode ser alterado após a criação</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
          <select
            value={resolveSolicitanteId(draft.solicitante)}
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            {draft.solicitante && !solicitanteInList(draft.solicitante) && (
              <option value={draft.solicitante}>{resolvedSolicitanteById[draft.solicitante] === 'deleted' ? ' ' : (draft.solicitanteNome ?? solicitanteLabelS(draft.solicitante)) || ' '}</option>
            )}
          </select>
        </div>
      </div>

      {/* Quinta linha - Tipo de Serviço e Canal de Atendimento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Serviço *</label>
          <select
            value={draft.tipoServico || ''}
            onChange={(e) => setDraft({ ...draft, tipoServico: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            <option value="duvida">Dúvida</option>
            <option value="solicitacao">Solicitação</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Canal de Atendimento *</label>
          <select
            value={draft.tipo || ''}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            <option value="teams">Teams</option>
            <option value="email">E-mail</option>
            <option value="ligacao">Ligação</option>
            <option value="mensagem">Mensagem</option>
          </select>
        </div>
      </div>

      {/* Sexta linha - Data de Início e Data Final */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início *</label>
          <input
            type="date"
            value={draft.dataInicio || ''}
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={draft.dataFinal || ''}
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Campos de texto */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
          <textarea
            value={draft.descricao || ''}
            onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descreva o atendimento..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
          <textarea
            value={draft.observacoes || ''}
            onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Observações adicionais..."
          />
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <PrimaryActionButton onClick={() => setConfirmOpen(true)}>
          Salvar Alterações
        </PrimaryActionButton>
      </div>

      {/* Modal de Confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar Alterações</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja salvar as alterações neste atendimento?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <PrimaryActionButton onClick={applySave} sx={{ ml: 1 }}>
                Salvar
              </PrimaryActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
