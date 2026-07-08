import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent } from '@mui/material'
import { Save as SaveIcon } from '@mui/icons-material'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useAuthStore } from '../../store/authStore'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { ManutencaoContratosVinculosSection } from '../../components/ManutencaoContratosVinculosSection'
import { AsyncClienteAutocomplete } from '../../components/AsyncClienteAutocomplete'
import {
  emptyContratoVinculoRow,
  filterContratosDoCliente,
  rowsToVinculos,
  type ContratoVinculoRow,
} from '../../utils/manutencaoContratos'
import {
  buildReajusteLegacyFieldsFromVinculos,
  reajusteToContratoVinculoRows,
  reajusteVinculosChanged,
} from '../../utils/reajusteContratos'
import { cardSx, SectionTitle } from './reajusteFormLayout'

export function ReajusteEditInline({ reajuste }: { reajuste: any }) {
  const md = useMasterDataStore()
  const store = useReajusteStore()
  const { user } = useAuthStore()
  const [draft, setDraft] = useState(reajuste)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [contratosVinculosRows, setContratosVinculosRows] = useState<ContratoVinculoRow[]>([
    emptyContratoVinculoRow(),
  ])
  const draftInitializedRef = useRef<string | null>(null)

  useEffect(() => {
    const entities = ['clientes', 'contratos', 'operadoras', 'produtos', 'analistas', 'solicitantes'] as const
    const missing = entities.filter((key) => {
      const list = (md as Record<string, unknown>)[key]
      return !Array.isArray(list) || list.length === 0
    })
    if (missing.length) {
      md.syncFromApi?.({ entities: [...missing] })
    }
  }, [md])

  // Função para normalizar strings (remove acentos, espaços extras, converte para lowercase)
  const normalizeString = (str: any) => {
    return String(str ?? '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ') // Normaliza espaços
  }

  // Função para converter nome (string) em ID
  const findIdByName = (name: string | undefined, arr: { id: string, nome: string }[]) => {
    if (!name) return undefined
    const normalizedName = normalizeString(name)
    const found = arr.find(a => normalizeString(a.nome) === normalizedName)
    return found?.id || undefined
  }

  // Função para converter código/número de contrato em ID
  const findContratoIdByCodigo = (codigo: string | undefined, arr: any[]) => {
    if (!codigo) return undefined
    const normalizedCodigo = normalizeString(codigo)
    const found = arr.find((c: any) => 
      normalizeString(c.codigo) === normalizedCodigo || 
      normalizeString(c.numero) === normalizedCodigo
    )
    return found?.id || undefined
  }

  useEffect(() => {
    // Só inicializar o draft uma vez por reajuste (quando o ID mudar)
    // Isso evita resetar o draft quando o reajuste é atualizado após salvamento
    if (draftInitializedRef.current === reajuste.id) {
      return // Já inicializamos este reajuste
    }
    
    // Converter nomes (strings) para IDs ao inicializar draft
    // ReajusteLancamento armazena operadora, cliente, contrato, produto como strings (nomes)
    const convertedDraft = { ...reajuste }
    
    // Converter operadora (nome) para ID
    if (reajuste.operadora && typeof reajuste.operadora === 'string' && !reajuste.operadora.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const operadoraId = findIdByName(reajuste.operadora, md.operadoras)
      if (operadoraId) {
        convertedDraft.operadora = operadoraId
      }
    }
    
    // Converter cliente (nome) para ID
    if (reajuste.cliente && typeof reajuste.cliente === 'string' && !reajuste.cliente.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const clienteId = findIdByName(reajuste.cliente, md.clientes)
      if (clienteId) {
        convertedDraft.cliente = clienteId
      }
    }
    
    // Converter contrato (código/número) para ID
    if (reajuste.contrato && typeof reajuste.contrato === 'string' && !reajuste.contrato.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const contratoId = findContratoIdByCodigo(reajuste.contrato, md.contratos)
      if (contratoId) {
        convertedDraft.contrato = contratoId
      }
    }
    
    // Converter produto (nome) para ID
    if (reajuste.produto && typeof reajuste.produto === 'string' && !reajuste.produto.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const produtoId = findIdByName(reajuste.produto, md.produtos)
      if (produtoId) {
        convertedDraft.produto = produtoId
      }
    }
    
    // Converter responsavelAnalista (nome) para ID
    if (reajuste.responsavelAnalista && typeof reajuste.responsavelAnalista === 'string' && !reajuste.responsavelAnalista.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const analistaId = findIdByName(reajuste.responsavelAnalista, md.analistas)
      if (analistaId) {
        convertedDraft.responsavelAnalista = analistaId
      }
    }
    
    setDraft(convertedDraft)
    setContratosVinculosRows(reajusteToContratoVinculoRows(reajuste, md))
    draftInitializedRef.current = reajuste.id
  }, [reajuste.id, md.operadoras, md.clientes, md.contratos, md.produtos, md.analistas, reajuste.contratosVinculos, reajuste.contrato, reajuste.operadora, reajuste.produto])

  const changedKeys = useMemo(() => {
    const keys = ['mes', 'ano', 'dataInicio', 'dataFim', 'status', 'qualidade', 'qualidadeInformacao', 'planos', 'responsavelConta', 'filial', 'ticket', 'solicitante', 'responsavelAnalista', 'cliente', 'contrato', 'produto', 'dataAtualizacao', 'itensPendentes', 'itensConcluidos', 'observacoes'] as const
    const fieldsWithNameIdConversion = ['cliente', 'contrato', 'produto', 'responsavelAnalista']

    const scalarChanges = keys.filter((k) => {
      let reajusteValue = reajuste[k as keyof typeof reajuste]
      let draftValue = draft[k as keyof typeof draft]

      if (fieldsWithNameIdConversion.includes(k)) {
        if (reajusteValue && typeof reajusteValue === 'string' && !reajusteValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          if (draftValue && typeof draftValue === 'string' && draftValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            let draftName = ''
            if (k === 'cliente') {
              draftName = md.clientes.find((c) => c.id === draftValue)?.nome || ''
            } else if (k === 'contrato') {
              const contrato = md.contratos.find((c: any) => c.id === draftValue)
              draftName = contrato?.codigo || contrato?.numero || ''
            } else if (k === 'produto') {
              draftName = md.produtos.find((p) => p.id === draftValue)?.nome || ''
            } else if (k === 'responsavelAnalista') {
              draftName = md.analistas.find((a) => a.id === draftValue)?.nome || ''
            }
            return normalizeString(reajusteValue) !== normalizeString(draftName)
          }
        }
      }

      return String(reajusteValue ?? '') !== String(draftValue ?? '')
    })

    const operadoraChanged = (() => {
      const prevOp = reajuste.operadora || ''
      const first = rowsToVinculos(contratosVinculosRows)[0]
      const nextOp = first?.operadoraId
        ? md.operadoras.find((o) => o.id === first.operadoraId)?.nome || ''
        : ''
      return normalizeString(prevOp) !== normalizeString(nextOp)
    })()

    const vinculosChanged = reajusteVinculosChanged(reajuste, contratosVinculosRows, md)
    const all = new Set<string>([...scalarChanges])
    if (operadoraChanged) all.add('operadora')
    if (vinculosChanged) {
      all.add('contrato')
      all.add('produto')
    }
    return [...all]
  }, [reajuste, draft, md.operadoras, md.clientes, md.contratos, md.produtos, md.analistas, contratosVinculosRows])

  async function applySave() {
    try {
      const { user: currentUser } = useAuthStore.getState()

      const vinculos = rowsToVinculos(contratosVinculosRows)
      if (!vinculos.length || !vinculos.every((v) => v.operadoraId)) {
        alert('Informe ao menos um contrato com operadora em cada linha.')
        return
      }

      const legacy = buildReajusteLegacyFieldsFromVinculos(contratosVinculosRows, draft.cliente, md)
      const saveDraft = { ...draft }

      saveDraft.operadora = legacy.operadora
      saveDraft.cliente = legacy.cliente
      saveDraft.contrato = legacy.contrato
      saveDraft.produto = legacy.produto
      saveDraft.contratosVinculos = legacy.contratosVinculos

      if (saveDraft.responsavelAnalista) {
        const analista = md.analistas.find((a) => a.id === saveDraft.responsavelAnalista)
        if (analista) saveDraft.responsavelAnalista = analista.nome
      }

      await store.upsert(saveDraft)

      const updatedDraft = { ...saveDraft }
      if (updatedDraft.operadora && typeof updatedDraft.operadora === 'string' && !updatedDraft.operadora.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const operadoraId = findIdByName(updatedDraft.operadora, md.operadoras)
        if (operadoraId) updatedDraft.operadora = operadoraId
      }
      if (updatedDraft.cliente && typeof updatedDraft.cliente === 'string' && !updatedDraft.cliente.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const clienteId = findIdByName(updatedDraft.cliente, md.clientes)
        if (clienteId) updatedDraft.cliente = clienteId
      }
      if (updatedDraft.responsavelAnalista && typeof updatedDraft.responsavelAnalista === 'string' && !updatedDraft.responsavelAnalista.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const analistaId = findIdByName(updatedDraft.responsavelAnalista, md.analistas)
        if (analistaId) updatedDraft.responsavelAnalista = analistaId
      }

      setDraft(updatedDraft)
      setContratosVinculosRows(reajusteToContratoVinculoRows(saveDraft, md))
      
      // Log manual apenas dos campos que realmente mudaram (EXATA RÉPLICA de Demandas/Manutenção)
      changedKeys.forEach((k) => {
        // Função para converter ID em nome para logs
        const convertIdToName = (id: string | undefined, fieldType: string) => {
          if (!id) return 'N/A'
          
          switch (fieldType) {
            case 'operadora':
              return md.operadoras.find(o => o.id === id)?.nome || id
            case 'cliente':
              return md.clientes.find(c => c.id === id)?.nome || id
            case 'contrato':
              return md.contratos.find(c => c.id === id)?.codigo || md.contratos.find(c => c.id === id)?.numero || id
            case 'produto':
              return md.produtos.find(p => p.id === id)?.nome || id
            case 'responsavelAnalista':
              return md.analistas.find(a => a.id === id)?.nome || id
            case 'solicitante':
              return md.solicitantes.find(s => s.id === id)?.nome || id
            default:
              return id
          }
        }
        
        // Converter valores para string legível
        // ReajusteLancamento armazena operadora, cliente, contrato, produto como nomes (strings)
        // Mas o draft tem IDs, então precisamos converter
        const fieldsWithIdConversion = ['operadora', 'cliente', 'contrato', 'produto', 'responsavelAnalista', 'solicitante']

        let from = String((reajuste as any)[k] ?? '')
        if (fieldsWithIdConversion.includes(k) && from.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          from = convertIdToName(from, k)
        }

        let to = String((saveDraft as any)[k] ?? '')
        if (k === 'operadora') to = saveDraft.operadora || ''
        if (k === 'cliente') to = saveDraft.cliente || ''
        if (k === 'contrato') to = saveDraft.contrato || ''
        if (k === 'produto') to = saveDraft.produto || ''
        
        // Mapear campos para nomes legíveis
        const fieldMapping: { [key: string]: string } = {
          'mes': 'Mês',
          'ano': 'Ano',
          'dataInicio': 'Data de Início',
          'dataFim': 'Data de Finalização',
          'status': 'Status',
          'operadora': 'Operadora',
          'qualidade': 'Qualidade (prazo)',
          'qualidadeInformacao': 'Qualidade da Informação',
          'planos': 'Planos',
          'responsavelConta': 'Responsável da Conta',
          'filial': 'Filial',
          'ticket': 'Ticket',
          'solicitante': 'Solicitante',
          'responsavelAnalista': 'Analista Responsável',
          'cliente': 'Cliente',
          'contrato': 'Contrato',
          'produto': 'Produto',
          'dataAtualizacao': 'Data de Atualização',
          'itensPendentes': 'Itens Pendentes',
          'itensConcluidos': 'Itens Concluídos',
          'observacoes': 'Observações'
        }
        
        const fieldLabel = fieldMapping[k] || k
        
        store.log({ 
          reajusteId: reajuste.id, 
          type: 'field_change', 
          field: fieldLabel, 
          from, 
          to,
          user: currentUser?.name || 'Usuário desconhecido'
        })
      })
      
      setConfirmOpen(false)
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert('Erro ao salvar alterações. Tente novamente.')
    }
  }


  const selectedClienteId = draft.cliente
  const grupoDoCliente = md.clientes.find((c) => c.id === selectedClienteId)?.grupoEconomico
  const contratosDoCliente = useMemo(
    () => filterContratosDoCliente(md.contratos, selectedClienteId, grupoDoCliente),
    [md.contratos, selectedClienteId, grupoDoCliente]
  )

  return (
    <div className="space-y-6" style={{ background: '#f4f7fb', margin: '-1.5rem', padding: '1.5rem', borderRadius: '0.75rem' }}>
      {/* Informações Básicas */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mês */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mês *</label>
            <select
              value={draft.mes || ''}
              onChange={(e) => setDraft({ ...draft, mes: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione o mês</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          {/* Ano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
            <input
              type="number"
              min="2000"
              value={draft.ano || ''}
              onChange={(e) => setDraft({ ...draft, ano: e.target.value || undefined })}
              placeholder="Ex: 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              value={draft.status || ''}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione...</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Transf. Analista">Transf. Analista</option>
              <option value="Concluído Parcialmente">Concluído Parcialmente</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Ticket */}
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

          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
            <input
              type="date"
              value={draft.dataInicio ? draft.dataInicio.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataInicio: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Data de Finalização */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Finalização</label>
            <input
              type="date"
              value={draft.dataFim ? draft.dataFim.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataFim: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Cliente e contrato */}
      <Card elevation={0} sx={cardSx}>
        <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
          <SectionTitle>Cliente e contrato</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                <AsyncClienteAutocomplete
                  valueId={draft.cliente}
                  onChangeId={(nextId) => {
                    setDraft({ ...draft, cliente: nextId || undefined, contrato: undefined, produto: undefined })
                    setContratosVinculosRows([emptyContratoVinculoRow()])
                  }}
                  label="Cliente"
                  helperText="Digite para buscar um cliente"
                />
              </div>
            </div>
            <ManutencaoContratosVinculosSection
              rows={contratosVinculosRows}
              onChange={setContratosVinculosRows}
              contratos={contratosDoCliente}
              operadoras={md.operadoras}
              produtos={md.produtos}
              clienteSelected={!!selectedClienteId}
              textFieldProps={{ size: 'small', margin: 'none', fullWidth: true, variant: 'outlined' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações de Responsabilidade */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Responsabilidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Analista Responsável */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Analista Responsável *</label>
            <select
              value={draft.responsavelAnalista || ''}
              onChange={(e) => setDraft({ ...draft, responsavelAnalista: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              required
              disabled
            >
              <option value="">Selecione...</option>
              {md.analistas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <p className="text-xs text-apoio-400 mt-1">
              Analista vinculado ao usuário: {user?.name || 'Carregando...'}
            </p>
          </div>

          {/* Responsável da Conta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável da Conta</label>
            <input
              type="text"
              value={draft.responsavelConta || ''}
              onChange={(e) => setDraft({ ...draft, responsavelConta: e.target.value || undefined })}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Solicitante */}
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

          {/* Filial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filial</label>
            <input
              type="text"
              value={draft.filial || ''}
              onChange={(e) => setDraft({ ...draft, filial: e.target.value || undefined })}
              placeholder="Nome da filial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Informações de Qualidade e Planos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Qualidade e Planos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Qualidade (prazo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade (prazo)</label>
            <select
              value={draft.qualidade || ''}
              onChange={(e) => setDraft({ ...draft, qualidade: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="ANTIGO">ANTIGO</option>
              <option value="FORA DO PRAZO">FORA DO PRAZO</option>
              <option value="NO PRAZO">NO PRAZO</option>
            </select>
          </div>

          {/* Qualidade da Informação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Qualidade da Informação</label>
            <select
              value={draft.qualidadeInformacao || ''}
              onChange={(e) => setDraft({ ...draft, qualidadeInformacao: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="ERRO NOS DADOS">ERRO NOS DADOS</option>
              <option value="FALTA DE DADOS">FALTA DE DADOS</option>
              <option value="OK">OK</option>
            </select>
          </div>

          {/* Planos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Planos</label>
            <select
              value={draft.planos || ''}
              onChange={(e) => setDraft({ ...draft, planos: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="PENDENTE ATUALIZAÇÃO">PENDENTE ATUALIZAÇÃO</option>
              <option value="OK">OK</option>
            </select>
          </div>

          {/* Data de Atualização */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Atualização</label>
            <input
              type="date"
              value={draft.dataAtualizacao ? draft.dataAtualizacao.split('T')[0] : ''}
              onChange={(e) => setDraft({ ...draft, dataAtualizacao: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Itens Pendentes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itens Pendentes</label>
            <input
              type="number"
              min="0"
              value={draft.itensPendentes || ''}
              onChange={(e) => setDraft({ ...draft, itensPendentes: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Itens Concluídos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itens Concluídos</label>
            <input
              type="number"
              min="0"
              value={draft.itensConcluidos || ''}
              onChange={(e) => setDraft({ ...draft, itensConcluidos: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Campo de Observações */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
          <textarea
            value={draft.observacoes || ''}
            onChange={(e) => setDraft({ ...draft, observacoes: e.target.value || undefined })}
            placeholder="Digite observações sobre este reajuste..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
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
              Aplicar {changedKeys.length} alteração(ões) neste reajuste?
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
