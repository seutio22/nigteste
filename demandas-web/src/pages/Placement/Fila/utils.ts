import { COTACAO_FILA_STATUSES, PLACEMENT_STATUS_RASCUNHO, type CotacaoStatus } from './placementCotacaoStatus'
import { getWorkflowStageMeta } from './placementCotacaoWorkflow'

export const STATUS_COLORS: Record<CotacaoStatus, { bg: string; text: string; chip: 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error' }> = {
  [PLACEMENT_STATUS_RASCUNHO]: { bg: '#F3F4F6', text: '#4B5563', chip: 'default' },
  'Aberta':                  { bg: '#E0F2FE', text: '#075985', chip: 'info' },
  'Validação':               { bg: '#E0E7FF', text: '#3730A3', chip: 'primary' },
  'Kick off':                { bg: '#EDE9FE', text: '#5B21B6', chip: 'primary' },
  'Estratégia':              { bg: '#DDD6FE', text: '#6D28D9', chip: 'primary' },
  'Em cotação':              { bg: '#FEF3C7', text: '#92400E', chip: 'warning' },
  'Aguardando operadora':    { bg: '#FCE7F3', text: '#9D174D', chip: 'warning' },
  'Consolidando dados':      { bg: '#E0F2FE', text: '#0C4A6E', chip: 'info' },
  'Proposta enviada':        { bg: '#DBEAFE', text: '#1E40AF', chip: 'primary' },
  'Fechada':                 { bg: '#DCFCE7', text: '#166534', chip: 'success' },
  'Perdida':                 { bg: '#FEE2E2', text: '#991B1B', chip: 'error' },
  'Cancelada':               { bg: '#E5E7EB', text: '#374151', chip: 'default' },
}

export function getStatusColor(status: string) {
  return STATUS_COLORS[status as CotacaoStatus] ?? STATUS_COLORS['Aberta']
}

/** Nome exibido da etapa do workflow (ex.: Aberta → Premissa, Validação → Análise). */
export function getWorkflowStatusDisplayLabel(status: string | null | undefined): string {
  const raw = String(status ?? '').trim()
  if (!raw) return '—'
  return getWorkflowStageMeta(raw)?.label ?? raw
}

export function formatCentsToBRL(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—'
  const value = cents / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseBRLToCents(input: string): number | null {
  if (!input) return null
  const cleaned = String(input).replace(/[^\d,.-]/g, '').trim()
  if (!cleaned) return null

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  let normalized: string
  if (hasComma) {
    // BR: vírgula decimal; pontos são milhar (ex.: 1.134,16 ou 1134,16)
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    const parts = cleaned.split('.')
    const last = parts[parts.length - 1] ?? ''
    if (parts.length === 2 && last.length <= 2) {
      // Excel/US: 1134.16 — ponto único com até 2 casas decimais
      normalized = cleaned
    } else {
      // Milhar sem centavos: 1.134
      normalized = cleaned.replace(/\./g, '')
    }
  } else {
    normalized = cleaned
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** CNAE: apenas dígitos, até 8 (classe/subclasse). */
export function normalizeCnaeDigits(input: string): string {
  return (input || '').replace(/\D/g, '').slice(0, 8)
}

export function isValidCnaeLen(d: string): boolean {
  return d.length === 7 || d.length === 8
}

export function formatCnaeDisplay(digits: string | null | undefined): string {
  const d = (digits || '').replace(/\D/g, '')
  if (!d) return '—'
  if (d.length < 7) return d
  if (d.length === 7) return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 8)}`
}

export { COTACAO_FILA_STATUSES as COTACAO_STATUSES, PLACEMENT_STATUS_RASCUNHO }
