import { COTACAO_STATUSES, type CotacaoStatus } from '../../../store/placementCotacaoStore'

export const STATUS_COLORS: Record<CotacaoStatus, { bg: string; text: string; chip: 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error' }> = {
  'Aberta':                  { bg: '#E0F2FE', text: '#075985', chip: 'info' },
  'Em cotação':              { bg: '#FEF3C7', text: '#92400E', chip: 'warning' },
  'Aguardando operadora':    { bg: '#FCE7F3', text: '#9D174D', chip: 'warning' },
  'Proposta enviada':        { bg: '#DBEAFE', text: '#1E40AF', chip: 'primary' },
  'Fechada':                 { bg: '#DCFCE7', text: '#166534', chip: 'success' },
  'Perdida':                 { bg: '#FEE2E2', text: '#991B1B', chip: 'error' },
  'Cancelada':               { bg: '#E5E7EB', text: '#374151', chip: 'default' },
}

export function getStatusColor(status: string) {
  return STATUS_COLORS[status as CotacaoStatus] ?? STATUS_COLORS['Aberta']
}

export function formatCentsToBRL(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—'
  const value = cents / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseBRLToCents(input: string): number | null {
  if (!input) return null
  const cleaned = String(input).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export { COTACAO_STATUSES }
