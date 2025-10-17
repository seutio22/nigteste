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
import { useState, useEffect, useRef } from 'react'
import { Save, Edit3, Clock, ArrowLeft, Mail } from 'lucide-react'

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
  const d = items.find((x) => x.id === id)
  
  // Controle para sincronizar timeline apenas uma vez
  const timelineSyncedRef = useRef<Set<string>>(new Set())
  
  // Estado para controlar se os dados mestres estão carregados
  const [masterDataLoaded, setMasterDataLoaded] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  // Carregar dados quando a página for acessada (apenas uma vez)
  useEffect(() => {
    
    // Forçar carregamento de manutenções se não existirem
    if (items.length === 0) {
      syncFromApi?.()
    } else {
      if (!d) {
        syncFromApi?.()
      }
    }
    
    // Forçar carregamento de dados mestres se não existirem
    if (md.analistas.length === 0 || md.tiposCadastro.length === 0 || md.padrao.length === 0) {
      md.syncFromApi?.()
    }
  }, []) // Executar apenas uma vez quando o componente for montado

  // Sincronizar timeline apenas uma vez quando a página carrega
  useEffect(() => {
    if (id && syncTimeline && !timelineSyncedRef.current.has(id)) {
      console.log('🔄 Sincronizando timeline da manutenção (primeira vez):', id)
      timelineSyncedRef.current.add(id)
      syncTimeline(id)
    }
  }, [id]) // Apenas quando ID muda, não quando dados mudam

  // Tentar recarregar se a manutenção específica não for encontrada após o carregamento inicial
  useEffect(() => {
    if (items.length > 0 && !d && id) {
      syncFromApi?.()
    }
  }, [items.length, d, id])

  // Forçar sincronização dos dados mestres quando a manutenção for encontrada
  useEffect(() => {
    if (d && (md.tiposCadastro.length === 0 || md.padrao.length === 0)) {
      md.syncFromApi?.()
    }
  }, [d, md.tiposCadastro.length, md.padrao.length, md.clientes.length, md.contratos.length, md.syncFromApi])

  // Verificar se os dados mestres estão carregados
  useEffect(() => {
    const isLoaded = md.tiposCadastro.length > 0 && md.padrao.length > 0 && md.clientes.length > 0
    setMasterDataLoaded(isLoaded)
  }, [md.tiposCadastro.length, md.padrao.length, md.clientes.length, md.contratos.length])

  // Debug removido para limpeza do console
  
  // Debug removido para limpeza do console

  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    return fixEncoding(result)
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
          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Comunicar alteração por e-mail"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">📧 Comunicar</span>
          </button>
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
                  <p className="font-medium">{label(d.clienteId, md.clientes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Contrato</p>
                  <p className="font-medium">{labelContrato(d.contratoId)}</p>
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

          {/* Informações Adicionais */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipo de Serviço</p>
                <p className="font-medium">{label(d.tipoServicoId, md.tiposCadastro)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Analista</p>
                <p className="font-medium">{label(d.analistaId, md.analistas)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Solicitante</p>
                <p className="font-medium">{label(d.solicitante, md.solicitantes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo de Manutenção</p>
                <p className="font-medium">{label(d.tipoId, md.padrao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de Início</p>
                <p className="font-medium">{fmt(d.dataInicio)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Final</p>
                <p className="font-medium">{fmt(d.dataFinal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Criado por</p>
                <p className="font-medium">{d.user?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantidade de Retornos</p>
                <p className="font-medium">{d.qtdRetornos || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Qualidade</p>
                <p className="font-medium text-xs leading-tight">{getQualidadeLabel(d.qualidade)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">QTD Clientes Vinculados - EDGE</p>
                <p className="font-medium">{d.qtdClientesVinculados || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Usuários Empresa - MOVE</p>
                <p className="font-medium">{d.usuariosEmpresa || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Observações</p>
                <p className="font-medium">{d.observacoes || '-'}</p>
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

  // Função label local para o componente EditInline
  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    return fixEncoding(result)
  }

  useEffect(() => {
    setDraft(d)
  }, [d])

  const contratosDoGrupo = md.contratos.filter(c => 
    c.grupoEconomico === md.clientes.find(cl => cl.id === draft.clienteId)?.grupoEconomico
  )

  const changedKeys = ((): string[] => {
    const keys = ['status', 'ticket', 'clienteId', 'contratoId', 'operadoraId', 'produtoId', 'sistemaId', 'areaId', 'tipoId', 'tipoServicoId', 'descricao', 'solicitante', 'dataInicio', 'dataFinal', 'qtdRetornos', 'qualidade', 'qtdClientesVinculados', 'usuariosEmpresa', 'observacoes'] as const
    
    const changed = keys.filter((k) => {
      const dValue = k === 'status' ? d.status : k === 'ticket' ? d.ticket : k === 'clienteId' ? d.clienteId : k === 'contratoId' ? d.contratoId : k === 'operadoraId' ? d.operadoraId : k === 'produtoId' ? d.produtoId : k === 'sistemaId' ? d.sistemaId : k === 'areaId' ? d.areaId : k === 'tipoId' ? d.tipoId : k === 'tipoServicoId' ? d.tipoServicoId : k === 'descricao' ? d.descricao : k === 'solicitante' ? d.solicitante : k === 'dataInicio' ? d.dataInicio : k === 'dataFinal' ? d.dataFinal : k === 'qtdRetornos' ? d.qtdRetornos : k === 'qualidade' ? d.qualidade : k === 'qtdClientesVinculados' ? d.qtdClientesVinculados : k === 'usuariosEmpresa' ? d.usuariosEmpresa : d.observacoes
      const draftValue = k === 'status' ? draft.status : k === 'ticket' ? draft.ticket : k === 'clienteId' ? draft.clienteId : k === 'contratoId' ? draft.contratoId : k === 'operadoraId' ? draft.operadoraId : k === 'produtoId' ? draft.produtoId : k === 'sistemaId' ? draft.sistemaId : k === 'areaId' ? draft.areaId : k === 'tipoId' ? draft.tipoId : k === 'tipoServicoId' ? draft.tipoServicoId : k === 'descricao' ? draft.descricao : k === 'solicitante' ? draft.solicitante : k === 'dataInicio' ? draft.dataInicio : k === 'dataFinal' ? draft.dataFinal : k === 'qtdRetornos' ? draft.qtdRetornos : k === 'qualidade' ? draft.qualidade : k === 'qtdClientesVinculados' ? draft.qtdClientesVinculados : k === 'usuariosEmpresa' ? draft.usuariosEmpresa : draft.observacoes
      
      const isChanged = String(dValue ?? '') !== String(draftValue ?? '')
      return isChanged
    })
    
    return changed
  })()

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
      const updatePayload = {
        status: draft.status,
        ticket: draft.ticket || null,
        solicitante: draft.solicitante && draft.solicitante.trim() ? draft.solicitante.trim() : null,
        descricao: draft.descricao || null,
        observacoes: draft.observacoes || null,
        qualidade: draft.qualidade || null,
        qtdRetornos: draft.qtdRetornos || null,
        qtdClientesVinculados: draft.qtdClientesVinculados || null,
        usuariosEmpresa: draft.usuariosEmpresa || null,
        dataInicio: formatDateForAPI(draft.dataInicio),
        dataFinal: formatDateForAPI(draft.dataFinal),
        // Sempre incluir todos os campos de ID, mesmo que sejam vazios
        analistaId: draft.analistaId || null,
        clienteId: draft.clienteId || null,
        contratoId: draft.contratoId || null,
        operadoraId: draft.operadoraId || null,
        produtoId: draft.produtoId || null,
        sistemaId: draft.sistemaId || null,
        areaId: draft.areaId || null,
        tipoId: draft.tipoId || null,
        tipoServicoId: draft.tipoServicoId || null,
      }
      
      // Atualizar manutenção no backend
      await api.updateManutencao(d.id, updatePayload)
      
      // Atualizar no store local
      store.upsert(draft)
      
      // Log das mudanças no timeline
      changedKeys.forEach((k) => {
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
        
        const from = k === 'status' ? String(d.status ?? '') : k === 'ticket' ? String(d.ticket ?? '') : k === 'clienteId' ? convertIdToName(d.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(d.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(d.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(d.produtoId, 'produtoId') : k === 'sistemaId' ? convertIdToName(d.sistemaId, 'sistemaId') : k === 'areaId' ? convertIdToName(d.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(d.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(d.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(d.descricao ?? '') : k === 'solicitante' ? convertIdToName(d.solicitante, 'solicitante') : k === 'dataInicio' ? String(d.dataInicio ?? '') : k === 'dataFinal' ? String(d.dataFinal ?? '') : k === 'qtdRetornos' ? String(d.qtdRetornos ?? '') : k === 'qualidade' ? String(d.qualidade ?? '') : k === 'qtdClientesVinculados' ? String(d.qtdClientesVinculados ?? '') : k === 'usuariosEmpresa' ? String(d.usuariosEmpresa ?? '') : String(d.observacoes ?? '')
        const to = k === 'status' ? String(draft.status ?? '') : k === 'ticket' ? String(draft.ticket ?? '') : k === 'clienteId' ? convertIdToName(draft.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(draft.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(draft.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(draft.produtoId, 'produtoId') : k === 'sistemaId' ? convertIdToName(draft.sistemaId, 'sistemaId') : k === 'areaId' ? convertIdToName(draft.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(draft.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(draft.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(draft.descricao ?? '') : k === 'solicitante' ? convertIdToName(draft.solicitante, 'solicitante') : k === 'dataInicio' ? String(draft.dataInicio ?? '') : k === 'dataFinal' ? String(draft.dataFinal ?? '') : k === 'qtdRetornos' ? String(draft.qtdRetornos ?? '') : k === 'qualidade' ? String(draft.qualidade ?? '') : k === 'qtdClientesVinculados' ? String(draft.qtdClientesVinculados ?? '') : k === 'usuariosEmpresa' ? String(draft.usuariosEmpresa ?? '') : String(draft.observacoes ?? '')
        
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
            field: fieldName, 
            from, 
            to,
            user: currentUser.name
          })
        }
      })
      
      setConfirmOpen(false)
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
    <div className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {['Aberta', 'Em andamento', 'Aguardando validação', 'Com erros', 'Em reajuste', 'Concluída', 'Cancelada'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Primeira linha - Cliente e Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <select
            value={draft.clienteId || ''}
            onChange={(e) => setDraft({ ...draft, clienteId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato</label>
          <select
            value={draft.contratoId || ''}
            onChange={(e) => setDraft({ ...draft, contratoId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {contratosDoGrupo.map(ct => <option key={ct.id} value={ct.id}>{ct.codigo}</option>)}
          </select>
        </div>
      </div>

      {/* Segunda linha - Operadora e Produto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operadora</label>
          <select
            value={draft.operadoraId || ''}
            onChange={(e) => setDraft({ ...draft, operadoraId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.operadoras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
          <select
            value={draft.produtoId || ''}
            onChange={(e) => setDraft({ ...draft, produtoId: e.target.value || undefined })}
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
            value={draft.sistemaId || ''}
            onChange={(e) => setDraft({ ...draft, sistemaId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.sistemas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
          <select
            value={draft.areaId || ''}
            onChange={(e) => setDraft({ ...draft, areaId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Quarta linha - Ticket e Solicitante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">N┬║ Ticket</label>
          <input
            type="text"
            value={draft.ticket || ''}
            onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            placeholder="N├║mero do ticket"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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

      {/* Quinta linha - Analista */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Analista Respons├ível</label>
        <input
          type="text"
          value={label(draft.analistaId, md.analistas)}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          placeholder="Definido na cria├º├úo"
        />
        <p className="text-xs text-gray-500 mt-1">
          ⚠️ O analista responsável é definido na criação e não pode ser alterado
        </p>
      </div>

      {/* Sexta linha - Tipo de Serviço e Tipo de Manutenção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Serviço</label>
          <select
            value={draft.tipoServicoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoServicoId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.tiposCadastro.map(ts => <option key={ts.id} value={ts.id}>{ts.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Manutenção</label>
          <select
            value={draft.tipoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.padrao.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Sexta linha - Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de In├¡cio</label>
          <input
            type="date"
            value={draft.dataInicio ? draft.dataInicio.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={draft.dataFinal ? draft.dataFinal.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* S├®tima linha - Quantidade de Retornos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Retornos</label>
          <input
            type="number"
            min="0"
            value={draft.qtdRetornos || ''}
            onChange={(e) => setDraft({ ...draft, qtdRetornos: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Nona linha - Qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade</label>
          <select
            value={draft.qualidade || ''}
            onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            <option value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</option>
            <option value="1">1 - MEDIANO - NO M├üX 2 RETORNOS</option>
            <option value="2">2 - BOM - NO M├üX 1 RETORNO; TODOS OS ITENS COMPLETOS</option>
            <option value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERA├ç├âO</option>
          </select>
        </div>
      </div>

      {/* D├®cima linha - QTD Clientes Vinculados e Usu├írios Empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">QTD Clientes Vinculados - EDGE</label>
          <input
            type="number"
            min="0"
            value={draft.qtdClientesVinculados || ''}
            onChange={(e) => setDraft({ ...draft, qtdClientesVinculados: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usu├írios Empresa - MOVE</label>
          <input
            type="number"
            min="0"
            value={draft.usuariosEmpresa || ''}
            onChange={(e) => setDraft({ ...draft, usuariosEmpresa: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
        <textarea
          value={draft.descricao ?? ''}
          onChange={(e) => setDraft({ ...draft, descricao: e.target.value || undefined })}
          rows={6}
          placeholder="Descreva detalhadamente a manutenção..."
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar altera├º├Áes</h3>
            <p className="text-gray-600 mb-6">
              Aplicar {changedKeys.length} altera├º├úo(├Áes) nesta manuten├º├úo?
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

