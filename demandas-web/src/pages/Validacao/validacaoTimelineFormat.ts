import type { ValidationEntry } from '../../types/validation'
import { relationId } from '../../utils/validationRelations'
import {
  ESTRUTURA_EDGE_OPTIONS,
  ESTRUTURA_MOVE_OPTIONS,
  formatEstruturaEntriesForDisplay,
} from './validacaoEstruturaOptions'
import {
  formatItensConcluidosDisplay,
  inferItensConcluidosDetalhe,
  parseItensConcluidosDetalhe,
  sumItensConcluidosDetalhe,
} from './validacaoItensConcluidos'

export const VALIDACAO_TIMELINE_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  ticket: 'Ticket',
  solicitante: 'Solicitante',
  demanda: 'Demanda',
  tipo: 'Tipo de demanda',
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
  itensConcluidosDetalhe: "Itens concluídos (Contrato/SUB's)",
  total: 'Total',
  estruturaEdge: 'Estrutura EDGE',
  estruturaMove: 'Estrutura MOVE',
}

const QUALIDADE_LABELS: Record<string, string> = {
  '0': '0 - RUIM',
  '1': '1 - MEDIANO',
  '2': '2 - BOM',
  '3': '3 - EXCELENTE',
}

const FORMALIZACAO_LABELS: Record<string, string> = {
  '0': '0 - FORMALIZAÇÃO COMPLETA',
  '1': '1 - FORMALIZAÇÃO PARCIAL',
  '2': '2 - SEM FORMALIZAÇÃO',
}

type TimelineSource = ValidationEntry | Record<string, unknown>

function idFrom(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: string }).id)
  }
  return String(value)
}

type MdLookup = {
  clientes: Array<{ id: string; nome: string }>
  contratos: Array<{ id: string; codigo?: string; numero?: string }>
  operadoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  analistas: Array<{ id: string; nome: string }>
  solicitantes: Array<{ id: string; nome: string }>
}

function convertIdToName(
  id: string | undefined,
  fieldType: string,
  md: MdLookup
): string {
  if (!id) return 'N/A'
  switch (fieldType) {
    case 'cliente':
      return md.clientes.find((c) => c.id === id)?.nome || id
    case 'contrato':
      return (
        md.contratos.find((c) => c.id === id)?.codigo ||
        md.contratos.find((c) => c.id === id)?.numero ||
        id
      )
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

function formatDateValue(value: unknown): string {
  if (value == null || value === '') return 'N/A'
  const raw = typeof value === 'string' ? value.split('T')[0] : String(value)
  return raw || 'N/A'
}

export function formatValidacaoTimelineValue(
  field: string,
  source: TimelineSource,
  md: MdLookup
): string {
  const s = source as ValidationEntry

  switch (field) {
    case 'status':
    case 'ticket':
    case 'tipo':
    case 'descricao':
    case 'observacoes':
      return String((s as Record<string, unknown>)[field] ?? '') || 'N/A'
    case 'demanda':
      return String(s.demanda ?? '') || 'N/A'
    case 'cliente':
      return convertIdToName(relationId(s.cliente, s.clienteId), 'cliente', md)
    case 'contrato':
      return convertIdToName(relationId(s.contrato, s.contratoId), 'contrato', md)
    case 'operadora':
      return convertIdToName(relationId(s.operadora, s.operadoraId), 'operadora', md)
    case 'produto':
      return convertIdToName(relationId(s.produto, s.produtoId), 'produto', md)
    case 'analista':
      return convertIdToName(relationId(s.analista, s.analistaId), 'analista', md)
    case 'solicitante':
      return convertIdToName(idFrom(s.solicitante), 'solicitante', md)
    case 'dataInicio':
    case 'dataFinal':
    case 'vigencia':
      return formatDateValue((s as Record<string, unknown>)[field])
    case 'qtdRetornos':
    case 'itensPendentes':
    case 'itensConcluidos':
    case 'total':
      return String((s as Record<string, unknown>)[field] ?? '') || '0'
    case 'qualidade': {
      const v = String(s.qualidade ?? '')
      return QUALIDADE_LABELS[v] || v || 'N/A'
    }
    case 'formalizacao': {
      const v = String(s.formalizacao ?? '')
      return FORMALIZACAO_LABELS[v] || v || 'N/A'
    }
    case 'estruturaEdge':
      return formatEstruturaEntriesForDisplay(
        Array.isArray(s.estruturaEdge) ? s.estruturaEdge : undefined,
        ESTRUTURA_EDGE_OPTIONS
      )
    case 'estruturaMove':
      return formatEstruturaEntriesForDisplay(
        Array.isArray(s.estruturaMove) ? s.estruturaMove : undefined,
        ESTRUTURA_MOVE_OPTIONS
      )
    case 'itensConcluidosDetalhe': {
      const detalhe =
        s.itensConcluidosDetalhe ??
        inferItensConcluidosDetalhe(s.itensConcluidos, s.itensConcluidosDetalhe, s.tipo)
      return formatItensConcluidosDisplay(
        sumItensConcluidosDetalhe(parseItensConcluidosDetalhe(detalhe)) || s.itensConcluidos,
        detalhe,
        s.tipo
      )
    }
    default:
      return String((s as Record<string, unknown>)[field] ?? '') || 'N/A'
  }
}

export function getValidacaoTimelineFieldLabel(field: string): string {
  return VALIDACAO_TIMELINE_FIELD_LABELS[field] || field
}

export const VALIDACAO_TRACKED_FIELDS = [
  'analista',
  'dataInicio',
  'dataFinal',
  'status',
  'ticket',
  'solicitante',
  'demanda',
  'tipo',
  'descricao',
  'observacoes',
  'cliente',
  'contrato',
  'operadora',
  'produto',
  'vigencia',
  'qtdRetornos',
  'qualidade',
  'estruturaEdge',
  'estruturaMove',
  'formalizacao',
  'itensPendentes',
  'total',
] as const

export function getValidacaoTrackedFields(formMode: 'legacy' | 'novo'): string[] {
  const itensField = formMode === 'novo' ? 'itensConcluidosDetalhe' : 'itensConcluidos'
  return [...VALIDACAO_TRACKED_FIELDS, itensField]
}
