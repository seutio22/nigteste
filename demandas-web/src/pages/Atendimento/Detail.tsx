import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { StatusBadge } from '../../components/StatusBadge'
import { Edit3, ArrowLeft, Clock, Copy, FileText, Lock } from 'lucide-react'
import { Timeline } from '../../components/Timeline'
import { fmt, canEditAtendimento } from '../../lib/utils'

export default function AtendimentoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const atendimentoStore = useAtendimentoStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const atendimento = atendimentoStore.items.find(a => a.id === id)
  
  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  
  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && atendimentoStore.syncTimeline && !timelineSyncedRef.current.has(id)) {
      console.log('🔄 Sincronizando timeline do atendimento (primeira vez):', id)
      timelineSyncedRef.current.add(id)
      atendimentoStore.syncTimeline(id)
    }
  }, [id]) // Apenas quando ID muda, não quando dados mudam


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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Atendimento não encontrado</h1>
          <p className="text-gray-600 mb-6">O atendimento solicitado não foi encontrado no sistema.</p>
          <button
            onClick={() => navigate('/atendimento')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Atendimentos
          </button>
        </div>
      </div>
    )
  }

  const label = (id?: string, arr?: { id: string, nome?: string, codigo?: string }[]) => {
    if (!id || !arr) return '-'
    const item = arr.find(a => a.id === id)
    return item ? (item.nome || item.codigo) || '-' : '-'
  }

  // Funções de ação
  const handleDuplicate = async () => {
    if (!atendimento) return
    const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = atendimento
    try {
      const duplicated = await atendimentoStore.add({ ...rest, status: 'Aberto', ticket: '' })
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
      <tr><td class="muted">Cliente</td><td>${label(atendimento.cliente, md.clientes)}</td></tr>
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
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{label(atendimento.cliente, md.clientes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Contrato</p>
                  <p className="font-medium">{label(atendimento.contrato, md.contratos)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Operadora</p>
                  <p className="font-medium">{label(atendimento.operadora, md.operadoras)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Produto</p>
                  <p className="font-medium">{label(atendimento.produto, md.produtos)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Sistema</p>
                  <p className="font-medium">{label(atendimento.sistema, md.sistemas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Área</p>
                  <p className="font-medium">{label(atendimento.area, md.areas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Solicitante</p>
                  <p className="font-medium">{label(atendimento.solicitante, md.solicitantes)}</p>
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
          {canEditAtendimento(atendimento, user) ? (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Editar Atendimento
              </h2>
              <EditInline atendimento={atendimento} user={user} />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
function EditInline({ atendimento, user }: { atendimento: any; user: any }) {
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
          <select
            value={draft.cliente || ''}
            onChange={(e) => setDraft({ ...draft, cliente: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <select
            value={draft.contrato || ''}
            onChange={(e) => setDraft({ ...draft, contrato: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.contratos.map(ct => <option key={ct.id} value={ct.id}>{ct.codigo}</option>)}
          </select>
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
          <p className="text-xs text-gray-500 mt-1">O analista não pode ser alterado após a criação</p>
        </div>
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
        <button
          onClick={() => setConfirmOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Salvar Alterações
        </button>
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
              <button
                onClick={applySave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
