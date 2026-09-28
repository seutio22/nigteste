export type ShareSectionStats = Record<string, { seconds: number; clicks: number }>

export type ShareAccessLog = {
  id: string
  ipAddress: string
  accessedAt: string
  visitorId?: string | null
  durationSeconds?: number | null
  clickCount?: number | null
  sectionStats?: ShareSectionStats | null
  deviceType?: string | null
  browser?: string | null
  os?: string | null
}

export const SHARE_SECTION_LABELS: Record<string, string> = {
  overview: 'Visão Geral',
  timeline: 'Cronograma Detalhado',
  indicators: 'Indicadores',
  gantt: 'Gráfico de Gantt',
  team: 'Equipe',
  resources: 'Stakeholders',
  charter: 'Project Charter',
}

export const SHARE_HIDDEN_FIELD_OPTIONS: { value: string; label: string; help: string }[] = [
  { value: 'descricoes', label: 'Descrições', help: 'Descrição do projeto, das etapas, tarefas e subtarefas' },
  { value: 'responsaveis', label: 'Responsáveis', help: 'Nomes dos responsáveis pelas tarefas e subtarefas' },
  { value: 'equipe_externa', label: 'Membros externos', help: 'Lista de membros externos na aba Equipe' },
]

export type CountItem = { label: string; count: number }

export type ShareSectionSummary = { key: string; label: string; seconds: number; clicks: number; acessos: number }

export type ShareAnalyticsSummary = {
  acessos: number
  visitantesUnicos: number
  visitantesRecorrentes: number
  tempoTotal: number
  tempoMedio: number
  cliquesTotal: number
  cliquesMedio: number
  secoes: ShareSectionSummary[]
  dispositivos: CountItem[]
  navegadores: CountItem[]
  sistemas: CountItem[]
}

/** Acessos sem visitorId (anteriores à medição) são agrupados por IP. */
export function visitorKey(log: ShareAccessLog): string {
  return log.visitorId ? `v:${log.visitorId}` : `ip:${log.ipAddress || '?'}`
}

function contar(logs: ShareAccessLog[], pick: (l: ShareAccessLog) => string | null | undefined): CountItem[] {
  const map = new Map<string, number>()
  for (const l of logs) {
    const k = pick(l) || 'Não identificado'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export function summarizeShareAccess(logs: ShareAccessLog[]): ShareAnalyticsSummary {
  const porVisitante = new Map<string, number>()
  for (const l of logs) porVisitante.set(visitorKey(l), (porVisitante.get(visitorKey(l)) ?? 0) + 1)

  const medidos = logs.filter((l) => (l.durationSeconds ?? 0) > 0)
  const tempoTotal = medidos.reduce((s, l) => s + (l.durationSeconds ?? 0), 0)
  const cliquesTotal = logs.reduce((s, l) => s + (l.clickCount ?? 0), 0)

  const secoesMap = new Map<string, ShareSectionSummary>()
  for (const l of logs) {
    for (const [key, s] of Object.entries(l.sectionStats ?? {})) {
      const cur = secoesMap.get(key) ?? { key, label: SHARE_SECTION_LABELS[key] ?? key, seconds: 0, clicks: 0, acessos: 0 }
      cur.seconds += s?.seconds ?? 0
      cur.clicks += s?.clicks ?? 0
      if ((s?.seconds ?? 0) > 0 || (s?.clicks ?? 0) > 0) cur.acessos += 1
      secoesMap.set(key, cur)
    }
  }

  return {
    acessos: logs.length,
    visitantesUnicos: porVisitante.size,
    visitantesRecorrentes: [...porVisitante.values()].filter((n) => n > 1).length,
    tempoTotal,
    tempoMedio: medidos.length ? Math.round(tempoTotal / medidos.length) : 0,
    cliquesTotal,
    cliquesMedio: medidos.length ? Math.round((cliquesTotal / medidos.length) * 10) / 10 : 0,
    secoes: [...secoesMap.values()].sort((a, b) => b.seconds - a.seconds),
    dispositivos: contar(logs, (l) => l.deviceType),
    navegadores: contar(logs, (l) => l.browser),
    sistemas: contar(logs, (l) => l.os),
  }
}

export function formatDuracao(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  const s = seconds % 60
  if (min < 60) return s ? `${min} min ${s}s` : `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}
