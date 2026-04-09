import type { Area } from '../types/masterData'
import type { UserDepartmentFields } from './userDepartmentDisplay'
import { getUserDepartmentDisplay } from './userDepartmentDisplay'

/**
 * Três experiências de Home:
 * - `nig`: departamento operacional NIG (e demais áreas que seguem o painel completo).
 * - `placement`: usuário vinculado à área Placement.
 * - `no_department`: sem departamento (área não definida no cadastro).
 */
export type HomeVariant = 'nig' | 'placement' | 'no_department'

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Resolve qual Home renderizar. Admin mantém o painel completo (NIG).
 */
export function resolveHomeVariant(
  user: (UserDepartmentFields & { id?: string | null }) | null | undefined,
  areasById?: Record<string, Area | undefined>
): HomeVariant {
  if (!user?.id) return 'no_department'
  const role = (user.role || '').toLowerCase()
  if (role === 'admin') return 'nig'

  const label = getUserDepartmentDisplay(user, areasById)
  const t = normalizeForMatch(label)

  if (t === 'sem departamento' || label === 'Sem departamento') return 'no_department'
  if (t.includes('placement')) return 'placement'

  // NIG e demais áreas: painel operacional completo (`HomeNig`).
  return 'nig'
}
