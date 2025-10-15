import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReportStore } from '../../store/reportStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useTimelineStore } from '../../store/timelineStore'
import { ReportStatusBadge } from '../../components/ReportStatusBadge'
import { PriorityBadge } from '../../components/PriorityBadge'
import { ArrowLeft, Edit3, Save, Clock } from 'lucide-react'

export default function AnalyticsDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { items, update, syncTimeline } = useReportStore()
  const md = useMasterDataStore()
  
  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  
  // Sincronizar dados mestres ao abrir a página
  useEffect(() => {
    if (md.syncFromApi) {
      console.log('🔄 AnalyticsDetailPage: Sincronizando dados mestres...')
      md.syncFromApi()
    }
  }, [])
  
  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
      console.log('🔄 Sincronizando timeline do analytics (primeira vez):', id)
      timelineSyncedRef.current.add(id)
      syncTimeline(id)
    }
  }, [id])
  
  const report = items.find(r => r.id === id)
  
  console.log('🔍 AnalyticsDetailPage: ID:', id)
  console.log('🔍 AnalyticsDetailPage: Items no store:', items.length)
  console.log('🔍 AnalyticsDetailPage: Report encontrado:', !!report)
  
  if (report) {
    console.log('🔍 AnalyticsDetailPage: Report.analista:', report.analista)
    console.log('🔍 AnalyticsDetailPage: Analistas carregados:', md.analistas.length)
    console.log('🔍 AnalyticsDetailPage: Analista encontrado:', md.analistas.find(a => a.id === report.analista))
    console.log('🔍 AnalyticsDetailPage: Report.contrato:', report.contrato)
    console.log('🔍 AnalyticsDetailPage: Contrato encontrado:', md.contratos.find(c => c.id === report.contrato))
  }

  if (!report) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Relatório não encontrado</h2>
          <p className="text-gray-600 mt-2">O relatório solicitado não foi encontrado.</p>
        </div>
      </div>
    )
  }

  const label = (id?: string, arr?: { id: string, nome: string }[]) => 
    arr?.find(a => a.id === id)?.nome || '-'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {report.titulo}
          </h1>
          <p className="text-gray-600 mt-1">
            Criado em {new Date(report.dataCriacao).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PriorityBadge priority={report.prioridade} />
          <ReportStatusBadge status={report.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo do Relatório */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Relatório</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{report.tipo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Analista</p>
                  <p className="font-medium">{report.analista || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Área</p>
                  <p className="font-medium">{label(report.area, md.areas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{label(report.cliente, md.clientes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Contrato</p>
                  <p className="font-medium">
                    {report.contrato ? 
                      (md.contratos.find(c => c.id === report.contrato)?.nome || 
                       md.contratos.find(c => c.id === report.contrato)?.codigo || 
                       md.contratos.find(c => c.id === report.contrato)?.numero || 
                       report.contrato) : 
                      '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Data de Entrega</p>
                  <p className="font-medium">
                    {report.dataEntrega ? report.dataEntrega.split('T')[0].split('-').reverse().join('/') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h2>
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">
                {report.descricao || 'Nenhuma descrição fornecida para este relatório.'}
              </p>
            </div>
          </div>

          {/* Edição do Relatório */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Relatório
            </h2>
            <EditInline report={report} />
          </div>

          {/* Informações Adicionais */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Solicitante</p>
                <p className="font-medium">{label(report.solicitante, md.solicitantes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo de Solicitação</p>
                <p className="font-medium">{label(report.tipoSolicitacao, md.relatorios)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Solicitação</p>
                <p className="font-medium">{label(report.solicitacao, md.modelos)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ticket</p>
                <p className="font-medium">{report.ticket || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total (Quantitativo)</p>
                <p className="font-medium">{report.total || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Observações</p>
                <p className="font-medium">{report.observacoes || '-'}</p>
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
                  <p className="font-medium">{report.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Prioridade</p>
                  <p className="font-medium">{report.prioridade}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Última Atualização</p>
                  <p className="font-medium">{new Date(report.dataAtualizacao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Alterações</h2>
            <Timeline entityId={id!} entityType="analytics" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Edição Inline
function EditInline({ report }: { report: any }) {
  const md = useMasterDataStore()
  const { update } = useReportStore()
  const [draft, setDraft] = useState(report)
  const [confirmOpen, setConfirmOpen] = useState(false)
  
  const label = (id?: string, arr?: { id: string, nome: string }[]) => 
    arr?.find(a => a.id === id)?.nome || '-'

  // Filtrar contratos por cliente selecionado (igual à página cadastro)
  const selectedClienteId = draft.cliente
  const grupoDoCliente = md.clientes.find(c => c.id === selectedClienteId)?.grupoEconomico
  const contratosDoCliente = md.contratos.filter((c: any) => 
    c.clienteId === selectedClienteId || 
    (grupoDoCliente && c.grupoEconomico === grupoDoCliente)
  )

  // Limpar contrato quando cliente for alterado
  useEffect(() => {
    if (selectedClienteId && selectedClienteId !== draft.contrato) {
      setDraft(prev => ({ ...prev, contrato: '' }))
    }
  }, [selectedClienteId])

  useEffect(() => {
    setDraft(report)
  }, [report.id])

  const changedKeys = ((): string[] => {
    const keys = ['titulo', 'descricao', 'tipo', 'status', 'analista', 'area', 'cliente', 'contrato', 'dataInicio', 'dataFinalizacao', 'dataEntrega', 'prioridade', 'solicitante', 'solicitacao', 'tipoSolicitacao', 'observacoes'] as const
    return keys.filter((k) => {
      const reportValue = report[k as keyof typeof report]
      const draftValue = draft[k as keyof typeof draft]
      return String(reportValue ?? '') !== String(draftValue ?? '')
    })
  })()

  function applySave() {
    // Atualizar no store
    update(report.id, draft)
    
    // Log das mudanças manualmente (igual à página demandas)
    changedKeys.forEach((k) => {
      // Função para converter ID em nome para logs
      const convertIdToName = (id: string | undefined, fieldType: string) => {
        if (!id) return 'N/A'
        
        switch (fieldType) {
          case 'cliente':
            return md.clientes.find(c => c.id === id)?.nome || id
          case 'contrato':
            const contrato = md.contratos.find(c => c.id === id)
            return contrato?.codigo || contrato?.numero || contrato?.nome || id
          case 'area':
            return md.areas.find(a => a.id === id)?.nome || id
          case 'solicitante':
            return md.solicitantes.find(s => s.id === id)?.nome || id
          case 'tipoSolicitacao':
            return md.relatorios.find(r => r.id === id)?.nome || id
          case 'solicitacao':
            return md.modelos.find(m => m.id === id)?.nome || id
          default:
            return id
        }
      }
      
      const from = k === 'titulo' ? String(report.titulo ?? '') : 
                   k === 'descricao' ? String(report.descricao ?? '') :
                   k === 'ticket' ? String(report.ticket ?? '') :
                   k === 'total' ? String(report.total ?? '') :
                   k === 'tipo' ? String(report.tipo ?? '') :
                   k === 'status' ? String(report.status ?? '') :
                   k === 'cliente' ? convertIdToName(report.cliente, 'cliente') :
                   k === 'contrato' ? convertIdToName(report.contrato, 'contrato') :
                   k === 'area' ? convertIdToName(report.area, 'area') :
                   k === 'solicitante' ? convertIdToName(report.solicitante, 'solicitante') :
                   k === 'tipoSolicitacao' ? convertIdToName(report.tipoSolicitacao, 'tipoSolicitacao') :
                   k === 'solicitacao' ? convertIdToName(report.solicitacao, 'solicitacao') :
                   k === 'dataInicio' ? String(report.dataInicio ?? '') :
                   k === 'dataFinalizacao' ? String(report.dataFinalizacao ?? '') :
                   k === 'dataEntrega' ? String(report.dataEntrega ?? '') :
                   k === 'prioridade' ? String(report.prioridade ?? '') :
                   String(report.observacoes ?? '')
                   
      const to = k === 'titulo' ? String(draft.titulo ?? '') : 
                 k === 'descricao' ? String(draft.descricao ?? '') :
                 k === 'ticket' ? String(draft.ticket ?? '') :
                 k === 'total' ? String(draft.total ?? '') :
                 k === 'tipo' ? String(draft.tipo ?? '') :
                 k === 'status' ? String(draft.status ?? '') :
                 k === 'cliente' ? convertIdToName(draft.cliente, 'cliente') :
                 k === 'contrato' ? convertIdToName(draft.contrato, 'contrato') :
                 k === 'area' ? convertIdToName(draft.area, 'area') :
                 k === 'solicitante' ? convertIdToName(draft.solicitante, 'solicitante') :
                 k === 'tipoSolicitacao' ? convertIdToName(draft.tipoSolicitacao, 'tipoSolicitacao') :
                 k === 'solicitacao' ? convertIdToName(draft.solicitacao, 'solicitacao') :
                 k === 'dataInicio' ? String(draft.dataInicio ?? '') :
                 k === 'dataFinalizacao' ? String(draft.dataFinalizacao ?? '') :
                 k === 'dataEntrega' ? String(draft.dataEntrega ?? '') :
                 k === 'prioridade' ? String(draft.prioridade ?? '') :
                 String(draft.observacoes ?? '')
      
      // Adicionar evento na timeline usando o store
      const { addTimelineEvent } = useReportStore.getState()
      addTimelineEvent({
        reportId: report.id,
        type: 'updated',
        field: k,
        from,
        to,
        message: `Campo "${k}" alterado de "${from || 'vazio'}" para "${to || 'vazio'}"`,
        user: 'Sistema'
      })
    })
    
    setConfirmOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
        <input
          type="text"
          value={draft.titulo}
          onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
          placeholder="Título do relatório"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tipo e Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
          <select
            value={draft.tipo}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Ticket e Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total (Quantitativo)</label>
          <input
            type="number"
            value={draft.total || ''}
            onChange={(e) => setDraft({ ...draft, total: e.target.value || undefined })}
            placeholder="Quantidade total"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Analista e Área */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analista</label>
          <input
            type="text"
            value={label(draft.analista, md.analistas)}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            placeholder="Definido na criação"
          />
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ O analista responsável é definido na criação e não pode ser alterado
          </p>
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

      {/* Cliente e Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <select
            value={draft.cliente || ''}
            onChange={(e) => setDraft({ ...draft, cliente: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um cliente</option>
            {md.clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <select
            value={draft.contrato || ''}
            onChange={(e) => setDraft({ ...draft, contrato: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Nenhum</option>
            {contratosDoCliente.length > 0 ? (
              contratosDoCliente.map(ct => (
                <option key={ct.id} value={ct.id}>
                  {(ct as any).codigo || (ct as any).numero || ct.nome}
                </option>
              ))
            ) : (
              <option disabled>
                {selectedClienteId ? 'Nenhum contrato encontrado para este cliente' : 'Selecione um cliente primeiro'}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
          <input
            type="date"
            value={draft.dataInicio ? draft.dataInicio.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Finalização</label>
          <input
            type="date"
            value={draft.dataFinalizacao ? draft.dataFinalizacao.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataFinalizacao: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrega</label>
          <input
            type="date"
            value={draft.dataEntrega ? draft.dataEntrega.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataEntrega: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Prioridade */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
          <select
            value={draft.prioridade}
            onChange={(e) => setDraft({ ...draft, prioridade: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      {/* Solicitação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Solicitante</label>
          <select
            value={draft.solicitante || ''}
            onChange={(e) => setDraft({ ...draft, solicitante: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um solicitante</option>
            {md.solicitantes.map(solicitante => (
              <option key={solicitante.id} value={solicitante.id}>
                {solicitante.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Solicitação</label>
          <select
            value={draft.tipoSolicitacao || ''}
            onChange={(e) => setDraft({ ...draft, tipoSolicitacao: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um tipo</option>
            {md.relatorios.map(relatorio => (
              <option key={relatorio.id} value={relatorio.id}>
                {relatorio.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Solicitação */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Solicitação</label>
        <select
          value={draft.solicitacao || ''}
          onChange={(e) => setDraft({ ...draft, solicitacao: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione uma solicitação</option>
          {md.modelos.map(modelo => (
            <option key={modelo.id} value={modelo.id}>
              {modelo.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
        <textarea
          value={draft.descricao ?? ''}
          onChange={(e) => setDraft({ ...draft, descricao: e.target.value || undefined })}
          rows={6}
          placeholder="Descreva detalhadamente o relatório..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
        <textarea
          value={draft.observacoes ?? ''}
          onChange={(e) => setDraft({ ...draft, observacoes: e.target.value || undefined })}
          rows={4}
          placeholder="Observações adicionais..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
        />
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
              Aplicar {changedKeys.length} alteração(ões) neste relatório?
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

// Componente Timeline
function Timeline({ reportId }: { reportId: string }) {
  const { events } = useTimelineStore()
  const reportEvents = events.filter(event => event.reportId === reportId)
  
  if (reportEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Sem eventos até o momento.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {reportEvents.map((event, index) => (
        <div key={event.id || `event-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{event.comment}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{event.user}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {new Date(event.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
