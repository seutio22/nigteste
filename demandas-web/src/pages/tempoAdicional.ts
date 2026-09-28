import { getApi } from '../lib/apiConfig'

export type TempoAdicionalStatus = 'pendente' | 'aprovado' | 'rejeitado'

export type TempoAdicionalRow = {
  id: string
  pageKey: string
  entityId: string
  ticket: string | null
  analistaId: string | null
  regraProdutividadeId: string | null
  tempoPrevistoSeconds: number
  adicionalSeconds: number
  motivo: string
  justificativa: string
  status: TempoAdicionalStatus
  comentarioRevisao: string | null
  revisorNome: string | null
  revisadoEm: string | null
  userId: string | null
  userNome: string | null
  createdAt: string
}

export const TEMPO_ADICIONAL_MOTIVOS = [
  { value: 'complexidade', label: 'Complexidade acima do padrão' },
  { value: 'retrabalho', label: 'Retrabalho' },
  { value: 'dados_incompletos', label: 'Dados incompletos do cliente' },
  { value: 'volume_maior', label: 'Volume maior que o informado' },
  { value: 'lentidao_sistema', label: 'Lentidão / indisponibilidade de sistema' },
  { value: 'outros', label: 'Outros' },
] as const

export function getMotivoLabel(value: string | null | undefined): string {
  return TEMPO_ADICIONAL_MOTIVOS.find((m) => m.value === value)?.label ?? (value || '—')
}

export const TEMPO_ADICIONAL_STATUS_LABEL: Record<TempoAdicionalStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const ENDPOINT = '/tempos-adicionais'

export async function listTemposAdicionais(filtro?: {
  pageKey?: string
  entityId?: string
}): Promise<TempoAdicionalRow[]> {
  const params = new URLSearchParams()
  if (filtro?.pageKey) params.set('pageKey', filtro.pageKey)
  if (filtro?.entityId) params.set('entityId', filtro.entityId)
  const qs = params.toString()
  const data = await getApi().get<TempoAdicionalRow[]>(qs ? `${ENDPOINT}?${qs}` : ENDPOINT)
  return Array.isArray(data) ? data : []
}

export function createTempoAdicional(input: {
  pageKey: string
  entityId: string
  ticket?: string | null
  analistaId?: string | null
  regraProdutividadeId?: string | null
  tempoPrevistoSeconds: number
  adicionalSeconds: number
  motivo: string
  justificativa: string
}): Promise<TempoAdicionalRow> {
  return getApi().post<TempoAdicionalRow>(ENDPOINT, input)
}

export function revisarTempoAdicional(
  id: string,
  status: Exclude<TempoAdicionalStatus, 'pendente'>,
  comentario?: string
): Promise<TempoAdicionalRow> {
  return getApi().request<TempoAdicionalRow>(`${ENDPOINT}/${encodeURIComponent(id)}/revisao`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comentario }),
  })
}

export function deleteTempoAdicional(id: string): Promise<void> {
  return getApi().delete(`${ENDPOINT}/${encodeURIComponent(id)}`)
}

/** Soma dos adicionais por status (rejeitados ficam fora de "lançado"). */
export function somarAdicionais(rows: TempoAdicionalRow[]): {
  aprovadoSeconds: number
  pendenteSeconds: number
  lancadoSeconds: number
} {
  let aprovadoSeconds = 0
  let pendenteSeconds = 0
  for (const r of rows) {
    if (r.status === 'aprovado') aprovadoSeconds += r.adicionalSeconds
    else if (r.status === 'pendente') pendenteSeconds += r.adicionalSeconds
  }
  return { aprovadoSeconds, pendenteSeconds, lancadoSeconds: aprovadoSeconds + pendenteSeconds }
}
