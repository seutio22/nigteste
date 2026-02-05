/**
 * Status padrão do sistema, alinhado à página Cadastro (Demandas).
 * Usado em Analytics/Report para exibição e salvamento.
 */

/** Status disponíveis para Report (Analytics), no mesmo padrão do Cadastro */
export const STATUS_REPORT_PADRAO = [
  'Pendente',
  'Em andamento',
  'Transf. Analista',
  'Concluída',
  'Entregue',
  'Cancelada'
] as const

export type StatusReportPadrao = (typeof STATUS_REPORT_PADRAO)[number]

/** Mapeamento de variações (lowercase/sem acento) para o valor padrão */
const MAPA_NORMALIZACAO: Record<string, StatusReportPadrao> = {
  pendente: 'Pendente',
  aberta: 'Pendente',
  pendent: 'Pendente',
  'em andamento': 'Em andamento',
  em_andamento: 'Em andamento',
  emandamento: 'Em andamento',
  'transf. analista': 'Transf. Analista',
  transf_analista: 'Transf. Analista',
  transfanalista: 'Transf. Analista',
  concluída: 'Concluída',
  concluida: 'Concluída',
  concluido: 'Concluída',
  concluído: 'Concluída',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
  cancelado: 'Cancelada',
  cancelad: 'Cancelada'
}

/**
 * Normaliza qualquer valor de status para o padrão do sistema (Cadastro).
 * Retorna o primeiro valor da lista se não reconhecer.
 */
export function normalizeReportStatus(value: string | null | undefined): StatusReportPadrao {
  if (value == null || value === '') return 'Pendente'
  const s = String(value).trim()
  if (STATUS_REPORT_PADRAO.includes(s as StatusReportPadrao)) return s as StatusReportPadrao
  const key = s.toLowerCase().replace(/\s+/g, ' ')
  const padrao = MAPA_NORMALIZACAO[key]
  if (padrao) return padrao
  // Fallback por substring para grafias com acento
  if (/concluíd?a?o?/i.test(s)) return 'Concluída'
  if (/em\s*andamento|andamento/i.test(s)) return 'Em andamento'
  if (/transf|analista/i.test(s)) return 'Transf. Analista'
  if (/entregue/i.test(s)) return 'Entregue'
  if (/cancelad/i.test(s)) return 'Cancelada'
  if (/pendente|aberta/i.test(s)) return 'Pendente'
  return 'Pendente'
}
