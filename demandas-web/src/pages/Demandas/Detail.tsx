import { useNavigate, useParams } from 'react-router-dom'
import { useDemandStore } from '../../store/demandStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api.local'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { fmt } from '../../lib/utils'
import { useState, useEffect } from 'react'
import { Save, Edit3, Clock, ArrowLeft } from 'lucide-react'
import { Demand } from '../../types/demand'
import { Autocomplete, TextField, Box, Typography } from '@mui/material'

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

export default function DemandDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, timeline, syncFromApi, isLoading } = useDemandStore()
  const md = useMasterDataStore()
  const { user } = useAuthStore()
  const d = items.find((x) => x.id === id)
  
  
  // Estado para controlar se os dados mestres estão carregados
  const [masterDataLoaded, setMasterDataLoaded] = useState(false)

  // Carregar dados quando a página for acessada (apenas uma vez)
  useEffect(() => {
    
    // Forçar carregamento de demandas se não existirem
    if (items.length === 0) {
      syncFromApi?.()
    } else {
      if (!d) {
        syncFromApi?.()
      }
    }
    
    // Forçar carregamento de dados mestres se não existirem
    if (md.analistas.length === 0 || md.tiposServico.length === 0 || md.tiposDemanda.length === 0) {
      md.syncFromApi?.()
    }
  }, []) // Executar apenas uma vez quando o componente for montado

  // Tentar recarregar se a demanda específica não for encontrada após o carregamento inicial
  useEffect(() => {
    if (items.length > 0 && !d && id) {
      syncFromApi?.()
    }
  }, [items.length, d, id])

  // Forçar sincronização dos dados mestres quando a demanda for encontrada
  useEffect(() => {
    if (d && (md.tiposServico.length === 0 || md.tiposDemanda.length === 0)) {
      md.syncFromApi?.()
    }
  }, [d, md.tiposServico.length, md.tiposDemanda.length, md.clientes.length, md.contratos.length, md.syncFromApi])

  // Verificar se os dados mestres estão carregados
  useEffect(() => {
    const isLoaded = md.tiposServico.length > 0 && md.tiposDemanda.length > 0 && md.clientes.length > 0
    setMasterDataLoaded(isLoaded)
  }, [md.tiposServico.length, md.tiposDemanda.length, md.clientes.length, md.contratos.length])

  console.log('DetailPage render:', { 
    id, 
    totalItems: items.length, 
    demandaEncontrada: !!d, 
    demandaData: d,
    masterDataLoaded: {
      analistas: md.analistas.length,
      clientes: md.clientes.length,
      areas: md.areas.length,
      tiposServico: md.tiposServico.length,
      tiposDemanda: md.tiposDemanda.length,
      contratos: md.contratos.length,
      sistemas: md.sistemas.length
    }
  })
  
  // Debug específico para o resumo
  if (d) {
    console.log('🔍 Resumo Debug:', {
      tipoServicoId: d.tipoServicoId,
      tipoId: d.tipoId,
      sistemaId: d.sistemaId,
      areaId: d.areaId,
      clienteId: d.clienteId,
      contratoId: d.contratoId,
      tiposServicoDisponiveis: md.tiposServico.map(ts => ({ id: ts.id, nome: ts.nome })),
      tiposDemandaDisponiveis: md.tiposDemanda.map(td => ({ id: td.id, nome: td.nome })),
      sistemasDisponiveis: md.sistemas.map(s => ({ id: s.id, nome: s.nome })),
      areasDisponiveis: md.areas.map(a => ({ id: a.id, nome: a.nome })),
      clientesDisponiveis: md.clientes.map(c => ({ id: c.id, nome: c.nome })),
      contratosDisponiveis: md.contratos.map(c => ({ id: c.id, codigo: c.codigo, numero: c.numero }))
    })
  }

  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    
    // Debug para verificar se os dados estão disponíveis
    if (result === '-' && id) {
      console.log('🔍 DemandDetailPage: Dados não encontrados para ID:', {
        id,
        arrLength: arr?.length || 0,
        arr: arr?.map(a => ({ id: a.id, nome: a.nome })) || []
      })
    }
    
    return result
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
        <StatusBadge status={d.status ?? 'Aberta'} />
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
                  <p className="text-sm text-gray-500">Tipo de Serviço</p>
                  <p className="font-medium">{label(d.tipoServicoId, md.tiposServico)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Demanda</p>
                  <p className="font-medium">{label(d.tipoId, md.tiposDemanda)}</p>
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
            <EditInline d={d} />
          </div>

          {/* Informações Adicionais */}
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipo de Serviço</p>
                <p className="font-medium">{label(d.tipoServicoId, md.tiposServico)}</p>
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
                <p className="text-sm text-gray-500">Tipo de Demanda</p>
                <p className="font-medium">{label(d.tipoId, md.tiposDemanda)}</p>
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
                <p className="font-medium">{d.analista || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Análise quantitativa</p>
                <p className="font-medium">{d.periodicidade || '-'}</p>
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
            <Timeline entityId={id!} entityType="demanda" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Edição Inline
function EditInline({ d }: { d: Demand }) {
  const md = useMasterDataStore()
  const store = useDemandStore()
  const [draft, setDraft] = useState(d)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Função label local para o componente EditInline
  const label = (id?: string, arr?: { id: string, nome: string }[]) => {
    if (!id) return '-'
    const result = arr?.find(a => a.id === id)?.nome || '-'
    console.log('🔍 EditInline label:', { id, arrLength: arr?.length, result })
    return result
  }

  useEffect(() => {
    console.log('🔍 DemandDetailPage: Atualizando draft com dados:', d)
    console.log('🔍 DemandDetailPage: dataInicio:', d.dataInicio, 'dataFinal:', d.dataFinal, 'tipo:', d.tipo)
    console.log('🔍 DemandDetailPage: analistaId:', d.analistaId, 'analistas disponíveis:', md.analistas.length)
    setDraft(d)
  }, [d])

  const contratosDoGrupo = md.contratos.filter(c => 
    c.grupoEconomico === md.clientes.find(cl => cl.id === draft.clienteId)?.grupoEconomico
  )

  const changedKeys = ((): string[] => {
    const keys = ['status', 'ticket', 'clienteId', 'contratoId', 'operadoraId', 'produtoId', 'sistemaId', 'areaId', 'tipoId', 'tipoServicoId', 'descricao', 'solicitante', 'dataInicio', 'dataFinal', 'qtdRetornos', 'qualidade', 'qtdClientesVinculados', 'usuariosEmpresa', 'observacoes'] as const
    
    console.log('🔍 DemandDetailPage: Verificando mudanças...')
    console.log('🔍 DemandDetailPage: Dados originais:', d)
    console.log('🔍 DemandDetailPage: Dados do draft:', draft)
    
    const changed = keys.filter((k) => {
      const dValue = k === 'status' ? d.status : k === 'ticket' ? d.ticket : k === 'clienteId' ? d.clienteId : k === 'contratoId' ? d.contratoId : k === 'operadoraId' ? d.operadoraId : k === 'produtoId' ? d.produtoId : k === 'sistemaId' ? d.sistemaId : k === 'areaId' ? d.areaId : k === 'tipoId' ? d.tipoId : k === 'tipoServicoId' ? d.tipoServicoId : k === 'descricao' ? d.descricao : k === 'solicitante' ? d.solicitante : k === 'dataInicio' ? d.dataInicio : k === 'dataFinal' ? d.dataFinal : k === 'qtdRetornos' ? d.qtdRetornos : k === 'qualidade' ? d.qualidade : k === 'qtdClientesVinculados' ? d.qtdClientesVinculados : k === 'usuariosEmpresa' ? d.usuariosEmpresa : d.observacoes
      const draftValue = k === 'status' ? draft.status : k === 'ticket' ? draft.ticket : k === 'clienteId' ? draft.clienteId : k === 'contratoId' ? draft.contratoId : k === 'operadoraId' ? draft.operadoraId : k === 'produtoId' ? draft.produtoId : k === 'sistemaId' ? draft.sistemaId : k === 'areaId' ? draft.areaId : k === 'tipoId' ? draft.tipoId : k === 'tipoServicoId' ? draft.tipoServicoId : k === 'descricao' ? draft.descricao : k === 'solicitante' ? draft.solicitante : k === 'dataInicio' ? draft.dataInicio : k === 'dataFinal' ? draft.dataFinal : k === 'qtdRetornos' ? draft.qtdRetornos : k === 'qualidade' ? draft.qualidade : k === 'qtdClientesVinculados' ? draft.qtdClientesVinculados : k === 'usuariosEmpresa' ? draft.usuariosEmpresa : draft.observacoes
      
      const isChanged = String(dValue ?? '') !== String(draftValue ?? '')
      
      if (isChanged) {
        console.log(`🔍 DemandDetailPage: Campo ${k} mudou:`, {
          original: dValue,
          draft: draftValue,
          originalString: String(dValue ?? ''),
          draftString: String(draftValue ?? '')
        })
      }
      
      return isChanged
    })
    
    return changed
  })()


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
        solicitante: draft.solicitante || null,
        descricao: draft.descricao || null,
        observacoes: draft.observacoes || null,
        qualidade: draft.qualidade || null,
        qtdRetornos: draft.qtdRetornos || null,
        qtdClientesVinculados: draft.qtdClientesVinculados || null,
        usuariosEmpresa: draft.usuariosEmpresa || null,
        dataInicio: formatDateForAPI(draft.dataInicio),
        dataFinal: formatDateForAPI(draft.dataFinal),
        // Apenas incluir IDs se não estiverem vazios
        ...(draft.clienteId && { clienteId: draft.clienteId }),
        ...(draft.contratoId && { contratoId: draft.contratoId }),
        ...(draft.operadoraId && { operadoraId: draft.operadoraId }),
        ...(draft.produtoId && { produtoId: draft.produtoId }),
        ...(draft.sistemaId && { sistemaId: draft.sistemaId }),
        ...(draft.areaId && { areaId: draft.areaId }),
        ...(draft.tipoId && { tipoId: draft.tipoId }),
        ...(draft.tipoServicoId && { tipoServicoId: draft.tipoServicoId }),
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
        // Função para converter ID em nome para logs
        const convertIdToName = (id: string | undefined, fieldType: string) => {
          if (!id) return 'N/A'
          
          switch (fieldType) {
            case 'clienteId':
              return md.clientes.find(c => c.id === id)?.nome || id
            case 'contratoId':
              return md.contratos.find(c => c.id === id)?.codigo || md.contratos.find(c => c.id === id)?.numero || id
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
            case 'solicitante':
              return md.solicitantes.find(s => s.id === id)?.nome || id
            default:
              return id
          }
        }
        
        const from = k === 'status' ? String(d.status ?? '') : k === 'ticket' ? String(d.ticket ?? '') : k === 'clienteId' ? convertIdToName(d.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(d.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(d.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(d.produtoId, 'produtoId') : k === 'sistemaId' ? convertIdToName(d.sistemaId, 'sistemaId') : k === 'areaId' ? convertIdToName(d.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(d.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(d.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(d.descricao ?? '') : k === 'solicitante' ? convertIdToName(d.solicitante, 'solicitante') : k === 'dataInicio' ? String(d.dataInicio ?? '') : k === 'dataFinal' ? String(d.dataFinal ?? '') : k === 'qtdRetornos' ? String(d.qtdRetornos ?? '') : k === 'qualidade' ? String(d.qualidade ?? '') : k === 'qtdClientesVinculados' ? String(d.qtdClientesVinculados ?? '') : k === 'usuariosEmpresa' ? String(d.usuariosEmpresa ?? '') : String(d.observacoes ?? '')
        const to = k === 'status' ? String(draft.status ?? '') : k === 'ticket' ? String(draft.ticket ?? '') : k === 'clienteId' ? convertIdToName(draft.clienteId, 'clienteId') : k === 'contratoId' ? convertIdToName(draft.contratoId, 'contratoId') : k === 'operadoraId' ? convertIdToName(draft.operadoraId, 'operadoraId') : k === 'produtoId' ? convertIdToName(draft.produtoId, 'produtoId') : k === 'sistemaId' ? convertIdToName(draft.sistemaId, 'sistemaId') : k === 'areaId' ? convertIdToName(draft.areaId, 'areaId') : k === 'tipoId' ? convertIdToName(draft.tipoId, 'tipoId') : k === 'tipoServicoId' ? convertIdToName(draft.tipoServicoId, 'tipoServicoId') : k === 'descricao' ? String(draft.descricao ?? '') : k === 'solicitante' ? convertIdToName(draft.solicitante, 'solicitante') : k === 'dataInicio' ? String(draft.dataInicio ?? '') : k === 'dataFinal' ? String(draft.dataFinal ?? '') : k === 'qtdRetornos' ? String(draft.qtdRetornos ?? '') : k === 'qualidade' ? String(draft.qualidade ?? '') : k === 'qtdClientesVinculados' ? String(draft.qtdClientesVinculados ?? '') : k === 'usuariosEmpresa' ? String(draft.usuariosEmpresa ?? '') : String(draft.observacoes ?? '')
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
            'tipoServicoId': 'tipoServico'
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
          <Autocomplete
            options={md.clientes}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.clientes.find(c => c.id === draft.clienteId) || null}
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
                      borderColor: '#3b82f6'
                    },
                    '&.Mui-focused': {
                      borderColor: '#3b82f6',
                      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                    }
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} className="px-3 py-2 hover:bg-gray-50">
                <div>
                  <div className="font-medium text-gray-900">
                    {option.nome}
                  </div>
                  {option.grupoEconomico && (
                    <div className="text-sm text-gray-500">
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
          <Autocomplete
            options={md.operadoras}
            getOptionLabel={(option) => option.nome || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={md.operadoras.find(o => o.id === draft.operadoraId) || null}
            onChange={(_, newValue) => setDraft({ ...draft, operadoraId: newValue?.id || undefined })}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Digite para buscar..."
                className="w-full"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Nº Ticket</label>
          <input
            type="text"
            value={draft.ticket || ''}
            onChange={(e) => setDraft({ ...draft, ticket: e.target.value || undefined })}
            placeholder="Número do ticket"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Analista Responsável</label>
        <input
          type="text"
          value={label(draft.analistaId, md.analistas)}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          placeholder="Definido na criação"
        />
        <p className="text-xs text-gray-500 mt-1">
          ⚠️ O analista responsável é definido na criação e não pode ser alterado
        </p>
      </div>

      {/* Sexta linha - Tipo de Serviço e Tipo de Demanda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Serviço</label>
          <select
            value={draft.tipoServicoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoServicoId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.tiposServico.map(tc => <option key={tc.id} value={tc.id}>{tc.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Demanda</label>
          <select
            value={draft.tipoId || ''}
            onChange={(e) => setDraft({ ...draft, tipoId: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {md.tiposDemanda.map(ts => <option key={ts.id} value={ts.id}>{ts.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Sétima linha - Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
          <input
            type="date"
            value={draft.dataFinal ? draft.dataFinal.split('T')[0] : ''}
            onChange={(e) => setDraft({ ...draft, dataFinal: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Oitava linha - Análise quantitativa e Quantidade de Retornos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Análise quantitativa</label>
          <input
            type="number"
            value={draft.periodicidade || ''}
            onChange={(e) => setDraft({ ...draft, periodicidade: e.target.value || undefined })}
            placeholder="Digite um número"
            min="0"
            step="any"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Campo numérico livre para análise quantitativa</p>
        </div>
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade</label>
        <select
          value={draft.qualidade || ''}
          onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione...</option>
          <option value="0">0 - RUIM - MAIS DE 3 RETORNOS; ITENS INCOMPLETOS, SEM RETORNO</option>
          <option value="1">1 - MEDIANO - NO MÁX 2 RETORNOS</option>
          <option value="2">2 - BOM - NO MÁX 1 RETORNO; TODOS OS ITENS COMPLETOS</option>
          <option value="3">3 - EXCELENTE - SEM NENHUMA CONSIDERAÇÃO</option>
        </select>
      </div>

      {/* Décima linha - Novos campos numéricos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">QTD Clientes Vinculados - EDGE</label>
          <input
            type="number"
            value={draft.qtdClientesVinculados || ''}
            onChange={(e) => setDraft({ ...draft, qtdClientesVinculados: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Digite um número"
            min="0"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Quantidade de clientes vinculados ao EDGE</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usuários Empresa - MOVE</label>
          <input
            type="number"
            value={draft.usuariosEmpresa || ''}
            onChange={(e) => setDraft({ ...draft, usuariosEmpresa: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Digite um número"
            min="0"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Quantidade de usuários da empresa no MOVE</p>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
        <textarea
          value={draft.descricao ?? ''}
          onChange={(e) => setDraft({ ...draft, descricao: e.target.value || undefined })}
          rows={6}
          placeholder="Descreva detalhadamente a demanda..."
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
        <div className="flex gap-2">
          <button
            disabled={changedKeys.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            Salvar alterações
          </button>
          
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



