import type { SystemPermissions } from '../types/permissions'
import { checkPermission, getUserPermissions } from './defaultPermissions'
import { matchesByIdOrName } from './dashboardFilters'

const normalizeText = (value?: string) => (value || '').trim().toLowerCase()

/** Página do dashboard → módulo de permissão. */
export const DASHBOARD_PAGE_PERMISSION: Record<string, keyof SystemPermissions> = {
  demandas: 'cadastro',
  atendimentos: 'atendimento',
  validacoes: 'validacao',
  reajustes: 'reajuste',
  manutencoes: 'manutencao',
  analytics: 'analytics',
  mailling: 'mailling',
  comunicados: 'comunicados',
  projetos: 'projetos',
}

export function canViewDashboardPage(
  page: string,
  permissions: SystemPermissions | null | undefined,
  role: string
): boolean {
  const module = DASHBOARD_PAGE_PERMISSION[page]
  if (!module) return true
  const perms = permissions ?? getUserPermissions(null, role)
  return checkPermission(perms, module, 'view')
}

type AnalistaLike = { id?: string; nome?: string; name?: string; email?: string }

export function resolveLinkedAnalistaId(
  user: { email?: string | null; name?: string | null } | null | undefined,
  analistas: AnalistaLike[] | undefined
): string {
  if (!user || !analistas?.length) return ''
  const emailNorm = (user.email || '').trim().toLowerCase()
  const nameNorm = normalizeText(user.name || '')
  const found = analistas.find((a) => {
    const aEmail = (a.email || '').trim().toLowerCase()
    const aNome = (a.nome || a.name || '').trim()
    if (emailNorm && aEmail && aEmail === emailNorm) return true
    if (nameNorm && aNome && normalizeText(aNome) === nameNorm) return true
    if (nameNorm && aNome && normalizeText(aNome).includes(nameNorm)) return true
    if (nameNorm && aNome && nameNorm.includes(normalizeText(aNome))) return true
    return false
  })
  return found?.id ?? ''
}

export function shouldRestrictDashboardToOwnScope(
  role?: string | null,
  viewOwnDataOnly?: boolean
): boolean {
  const r = String(role || '').toLowerCase()
  return r === 'gerente' || r === 'analista' || r === 'viewer' || Boolean(viewOwnDataOnly)
}

function getAnalistaValueForPage(page: string, item: Record<string, unknown>): unknown {
  if (page === 'reajustes') return item.responsavelAnalista
  if (page === 'manutencoes') return item.analistaId || item.analista
  if (page === 'validacoes') {
    const analista = item.analista
    return (
      item.analistaId ||
      (item.analistaObj as { id?: string } | undefined)?.id ||
      (typeof analista === 'object' && analista ? (analista as { id?: string }).id : analista)
    )
  }
  return item.analistaId || item.analista
}

/** Quando não há analista master vinculado, filtra por nome/e-mail do usuário logado. */
export function isDashboardItemOwnedByUser(
  page: string,
  item: Record<string, unknown>,
  user: { id?: string; name?: string; email?: string } | null | undefined,
  analistas?: AnalistaLike[]
): boolean {
  if (!user?.id) return false

  const userId = user.id
  const userName = (user.name || '').trim()
  const userEmail = (user.email || '').trim().toLowerCase()

  if (page === 'analytics' && item.userId === userId) return true
  if (page === 'projetos') {
    if (item.ownerId === userId || item.managerId === userId) return true
    const team = item.team
    if (Array.isArray(team) && team.some((m) => String(m) === userId)) return true
    return false
  }

  const raw = getAnalistaValueForPage(page, item)
  if (raw && typeof raw === 'object') {
    const obj = raw as { id?: string; nome?: string; name?: string; email?: string }
    if (obj.id && String(obj.id) === userId) return true
    const nome = (obj.nome || obj.name || '').trim()
    if (nome && userName && normalizeText(nome) === normalizeText(userName)) return true
  }

  if (typeof raw === 'string' && raw.trim()) {
    if (raw === userId) return true
    if (userName && normalizeText(raw) === normalizeText(userName)) return true
    if (analistas?.length && matchesByIdOrName(raw, userId, analistas)) return true
  }

  if (page === 'reajustes' && typeof item.responsavelAnalista === 'string') {
    const ra = String(item.responsavelAnalista).trim()
    if (userName && normalizeText(ra) === normalizeText(userName)) return true
  }

  const linkedId = resolveLinkedAnalistaId(user, analistas)
  if (linkedId && raw && matchesByIdOrName(raw, linkedId, analistas)) return true

  if (userEmail && analistas?.length) {
    const byEmail = analistas.find((a) => (a.email || '').trim().toLowerCase() === userEmail)
    if (byEmail?.id && raw && matchesByIdOrName(raw, byEmail.id, analistas)) return true
  }

  return false
}
