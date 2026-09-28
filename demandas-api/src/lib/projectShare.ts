/** Detalhes que podem ser ocultados de um link público de projeto (CSV em ProjectShareToken.hiddenFields). */
export const SHARE_HIDDEN_FIELDS = ['orcamento', 'descricoes', 'responsaveis', 'equipe_externa'] as const
export type ShareHiddenField = (typeof SHARE_HIDDEN_FIELDS)[number]

/** Abas da página pública medidas pela telemetria. */
export const SHARE_SECTION_KEYS = ['overview', 'timeline', 'indicators', 'gantt', 'team', 'resources', 'charter'] as const

export function parseHiddenFields(raw: unknown): ShareHiddenField[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  const set = new Set(list.map((v) => String(v).trim()))
  return SHARE_HIDDEN_FIELDS.filter((f) => set.has(f))
}

const BUDGET_KEYS = new Set(['budget', 'custo', 'cost', 'orcamento'])
const DESCRIPTION_KEYS = new Set(['description', 'descricao', 'notes', 'observacoes'])
const RESPONSIBLE_KEYS = new Set([
  'assignee',
  'assigneeId',
  'responsible',
  'responsibleId',
  'responsavel',
  'responsavelId',
  'assignedTo',
])

function stripKeys(value: unknown, keys: Set<string>, depth = 0): unknown {
  if (depth > 12 || value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => stripKeys(v, keys, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (keys.has(k)) continue
    out[k] = stripKeys(v, keys, depth + 1)
  }
  return out
}

/** Remove do projeto (já sem dados sensíveis de usuários) os detalhes ocultados no link. */
export function applyHiddenFields<T extends Record<string, any>>(project: T, hidden: ShareHiddenField[]): T {
  const p: Record<string, any> = { ...project }
  const keys = new Set<string>()
  if (hidden.includes('orcamento')) {
    p.budget = null
    BUDGET_KEYS.forEach((k) => keys.add(k))
  }
  if (hidden.includes('descricoes')) {
    p.description = ''
    DESCRIPTION_KEYS.forEach((k) => keys.add(k))
  }
  if (hidden.includes('responsaveis')) RESPONSIBLE_KEYS.forEach((k) => keys.add(k))
  if (hidden.includes('equipe_externa')) p.externalMembers = []
  if (keys.size > 0) {
    for (const field of ['timeline', 'tasks', 'timelines']) {
      if (p[field] == null) continue
      if (typeof p[field] === 'string') {
        try {
          p[field] = JSON.stringify(stripKeys(JSON.parse(p[field]), keys))
        } catch {
          /* mantém como está */
        }
      } else {
        p[field] = stripKeys(p[field], keys)
      }
    }
    if (Array.isArray(p.timelines)) {
      p.timelines = p.timelines.map((t: any) => {
        if (typeof t?.phases !== 'string') return t
        try {
          return { ...t, phases: JSON.stringify(stripKeys(JSON.parse(t.phases), keys)) }
        } catch {
          return t
        }
      })
    }
  }
  return p as T
}

export type SectionStats = Record<string, { seconds: number; clicks: number }>

export type TrackPayload = {
  accessLogId: string
  durationSeconds: number
  clicks: number
  sections: SectionStats
}

const MAX_SECONDS = 24 * 3600
const MAX_CLICKS = 100_000

function clampInt(v: unknown, max: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(Math.floor(n), max)
}

export function parseTrackPayload(body: unknown): TrackPayload | null {
  const b = (body ?? {}) as Record<string, any>
  const accessLogId = typeof b.accessLogId === 'string' ? b.accessLogId.trim().slice(0, 80) : ''
  if (!accessLogId) return null
  const sections: SectionStats = {}
  const rawSections = b.sections && typeof b.sections === 'object' ? b.sections : {}
  for (const key of SHARE_SECTION_KEYS) {
    const s = rawSections[key]
    if (!s || typeof s !== 'object') continue
    sections[key] = { seconds: clampInt(s.seconds, MAX_SECONDS), clicks: clampInt(s.clicks, MAX_CLICKS) }
  }
  return {
    accessLogId,
    durationSeconds: clampInt(b.durationSeconds, MAX_SECONDS),
    clicks: clampInt(b.clicks, MAX_CLICKS),
    sections,
  }
}

export function parseSectionStats(raw: unknown): SectionStats {
  if (typeof raw !== 'string' || !raw) return {}
  try {
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? (obj as SectionStats) : {}
  } catch {
    return {}
  }
}

/** Os envios são acumulados no navegador; guardamos sempre o maior valor recebido. */
export function mergeSectionStats(prev: SectionStats, next: SectionStats): SectionStats {
  const out: SectionStats = { ...prev }
  for (const [key, s] of Object.entries(next)) {
    const p = out[key] ?? { seconds: 0, clicks: 0 }
    out[key] = { seconds: Math.max(p.seconds, s.seconds), clicks: Math.max(p.clicks, s.clicks) }
  }
  return out
}

export function parseUserAgent(ua: string | null | undefined): { deviceType: string; browser: string; os: string } {
  const s = String(ua ?? '')
  const deviceType = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s)
    ? 'Tablet'
    : /Mobi|iPhone|iPod|Android|Windows Phone/i.test(s)
      ? 'Celular'
      : 'Computador'
  const browser = /Edg\//.test(s)
    ? 'Edge'
    : /OPR\/|Opera/.test(s)
      ? 'Opera'
      : /SamsungBrowser/.test(s)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(s)
          ? 'Firefox'
          : /Chrome\/|CriOS/.test(s)
            ? 'Chrome'
            : /Safari\//.test(s)
              ? 'Safari'
              : 'Outro'
  const os = /Windows/.test(s)
    ? 'Windows'
    : /iPhone|iPad|iPod/.test(s)
      ? 'iOS'
      : /Android/.test(s)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(s)
          ? 'macOS'
          : /Linux/.test(s)
            ? 'Linux'
            : 'Outro'
  return { deviceType, browser, os }
}
