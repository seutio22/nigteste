import { getApi } from '../lib/apiConfig'
import type { ProdutividadeRegraRow } from './produtividadeMatching'
import type { SlaStatusEvent } from './slaCalendar'
import type { SlaDashboardPageKey, SlaRegraRow } from './slaMatching'

export type SlaTicketPageKey = Exclude<SlaDashboardPageKey, 'projetos'>

/** entityType gravado na Timeline para cada página. */
export const SLA_TIMELINE_ENTITY: Record<SlaTicketPageKey, string> = {
  demandas: 'demanda',
  manutencoes: 'manutencao',
  atendimentos: 'atendimento',
  validacoes: 'validacao',
  reajustes: 'reajuste',
  analytics: 'analytics',
}

type TimelineRow = {
  entityId: string
  field?: string | null
  toValue?: string | null
  createdAt: string
}

const RULES_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; promise: Promise<any> }>()

function cached<T>(key: string, load: () => Promise<T>, force?: boolean): Promise<T> {
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < RULES_TTL_MS) return hit.promise
  const promise = load().catch((e) => {
    cache.delete(key)
    throw e
  })
  cache.set(key, { at: Date.now(), promise })
  return promise
}

export function loadSlaRegras(force?: boolean): Promise<SlaRegraRow[]> {
  return cached(
    'sla-regras',
    async () => {
      const data = await getApi().get<SlaRegraRow[]>('/sla-regras')
      return Array.isArray(data) ? data.filter((r) => r.ativo !== false) : []
    },
    force
  )
}

export function loadProdutividadeRegras(force?: boolean): Promise<ProdutividadeRegraRow[]> {
  return cached(
    'produtividade-regras',
    async () => {
      const data = await getApi().get<ProdutividadeRegraRow[]>('/produtividade-regras')
      return Array.isArray(data) ? data.filter((r) => r.ativo !== false) : []
    },
    force
  )
}

function toStatusEvents(rows: unknown): TimelineRow[] {
  if (!Array.isArray(rows)) return []
  return (rows as TimelineRow[]).filter((r) => r && r.field === 'status' && r.createdAt)
}

/** Mudanças de status de um chamado. */
export async function loadStatusEventsForTicket(
  pageKey: SlaTicketPageKey,
  entityId: string
): Promise<SlaStatusEvent[]> {
  const entityType = SLA_TIMELINE_ENTITY[pageKey]
  const rows = await getApi().get<TimelineRow[]>(
    `/timelineEvents?entityId=${encodeURIComponent(entityId)}&entityType=${entityType}&field=status`
  )
  return toStatusEvents(rows)
}

/** Mudanças de status de todos os chamados de uma página, agrupadas por chamado. */
export async function loadStatusEventsByPage(
  pageKey: SlaDashboardPageKey
): Promise<Map<string, SlaStatusEvent[]>> {
  const entityType = SLA_TIMELINE_ENTITY[pageKey as SlaTicketPageKey]
  if (!entityType) return new Map()
  const rows = await getApi().get<TimelineRow[]>(
    `/timelineEvents?entityType=${entityType}&field=status`
  )
  const byId = new Map<string, SlaStatusEvent[]>()
  for (const r of toStatusEvents(rows)) {
    const list = byId.get(r.entityId) || []
    list.push({ toValue: r.toValue, createdAt: r.createdAt })
    byId.set(r.entityId, list)
  }
  return byId
}
