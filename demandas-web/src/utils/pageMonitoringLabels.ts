/**
 * Rotas do app → rótulos de módulo para monitoramento (permanência por página).
 * Ordem: prefixos mais específicos primeiro.
 */

export function pathnameFromStoredPage(stored: string): string {
  const s = (stored || '').trim()
  if (!s) return '/'
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return new URL(s).pathname || '/'
    }
  } catch {
    /* ignore */
  }
  const q = s.indexOf('?')
  return (q >= 0 ? s.slice(0, q) : s) || '/'
}

/** Nome amigável do módulo / área (ex.: Cadastro, Manutenção). */
export function getPageAreaLabel(storedPath: string): string {
  const p = pathnameFromStoredPage(storedPath).toLowerCase()

  if (p === '/' || p === '') return 'Início'
  if (p.startsWith('/login')) return 'Login'
  if (p.startsWith('/dashboard')) return 'Dashboard'
  if (p.startsWith('/notificacoes')) return 'Notificações'
  if (p.startsWith('/cadastro')) return 'Cadastro (demandas)'
  if (p.startsWith('/manutencao')) return 'Manutenção'
  if (p.startsWith('/atendimento')) return 'Atendimento'
  if (p.startsWith('/comunicados')) return 'Comunicados'
  if (p.startsWith('/kanban')) return 'Kanban'
  if (p.startsWith('/validacao')) return 'Validação'
  if (p.startsWith('/reajuste')) return 'Reajuste'
  if (p.startsWith('/mailling')) return 'Mailing'
  if (p.startsWith('/analytics')) return 'Analytics'
  if (p.startsWith('/dados')) return 'Dados'
  if (p.startsWith('/admin/usuarios')) return 'Admin · Usuários'
  if (p.startsWith('/admin')) return 'Administração'
  if (p.startsWith('/projetos')) return 'Projetos'
  if (p.startsWith('/share/')) return 'Compartilhamento (projeto)'
  return 'Outras rotas'
}

export type DwellRow = { path: string; seconds: number }

export type AreaDwellRow = {
  area: string
  seconds: number
  /** Rotas que compõem o total (ordenadas por tempo desc.) */
  routes: DwellRow[]
}

/** Agrega tempo por módulo e mantém o detalhe das rotas em cada módulo. */
export function aggregateDwellByArea(breakdown: DwellRow[]): AreaDwellRow[] {
  const map = new Map<string, { seconds: number; routes: Map<string, number> }>()

  for (const row of breakdown) {
    const area = getPageAreaLabel(row.path)
    const pathKey = row.path || '/'
    let g = map.get(area)
    if (!g) {
      g = { seconds: 0, routes: new Map() }
      map.set(area, g)
    }
    g.seconds += row.seconds
    g.routes.set(pathKey, (g.routes.get(pathKey) ?? 0) + row.seconds)
  }

  const out: AreaDwellRow[] = []
  for (const [area, g] of map) {
    const routes: DwellRow[] = [...g.routes.entries()]
      .map(([path, seconds]) => ({ path, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
    out.push({ area, seconds: g.seconds, routes })
  }
  out.sort((a, b) => b.seconds - a.seconds)
  return out
}

export function shortenPathDisplay(storedPath: string, maxLen = 48): string {
  const full = (storedPath || '/').split('?')[0] || '/'
  if (full.length <= maxLen) return full
  return `${full.slice(0, maxLen - 1)}…`
}
