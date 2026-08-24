/** Rotas do app → rótulos de módulo para monitoramento (permanência por página). */

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
  if (p.startsWith('/placement')) return 'Placement'
  return 'Outras rotas'
}
