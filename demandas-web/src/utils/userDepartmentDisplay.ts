import { useMasterDataStore } from '../store/masterDataStore'
import type { Area } from '../types/masterData'

/**
 * Texto no painel: departamento (Área) ou ADM para admin — não usar perfil (gerente/analista) como título.
 */
export type UserDepartmentFields = {
  role?: string | null
  department?: { id: string; nome: string } | null
  departmentId?: string | null
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  analista: 'Analista',
  solicitante: 'Solicitante',
  viewer: 'Visualização'
}

function roleFallback(role?: string | null): string {
  const r = (role || '').toLowerCase()
  return roleLabels[r] || (role ? String(role) : 'Usuário')
}

function resolveAreaNome(
  user: UserDepartmentFields,
  areasById?: Record<string, Area | undefined>
): string | undefined {
  const direct = user.department?.nome?.trim()
  if (direct) return direct
  const id = user.departmentId?.trim()
  if (!id) return undefined
  const map = areasById ?? useMasterDataStore.getState().areasById
  const a = map[id]
  if (a?.nome) return String(a.nome).trim()
  const list = useMasterDataStore.getState().areas
  const found = list?.find((x) => x.id === id)
  if (found?.nome) return String(found.nome).trim()
  return undefined
}

/**
 * Rótulo principal: ADM (admin) ou nome da área; se houver `departmentId` mas ainda sem nome, resolve via Dados → Áreas.
 * Não exibe perfil (Gerente, etc.); sem área → "Sem departamento".
 */
export function getUserDepartmentDisplay(
  user: UserDepartmentFields | null | undefined,
  areasById?: Record<string, Area | undefined>
): string {
  if (!user) return 'Usuário'
  const r = (user.role || '').toLowerCase()
  if (r === 'admin') return 'ADM'
  const nome = resolveAreaNome(user, areasById)
  if (nome) return nome
  return 'Sem departamento'
}

/** Legenda opcional só com o perfil de permissão (ex.: admin de usuários). */
export function getUserRoleCaption(user: UserDepartmentFields | null | undefined): string {
  if (!user) return ''
  return roleFallback(user.role)
}
