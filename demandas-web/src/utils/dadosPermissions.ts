import type { SystemPermissions } from '../types/permissions'
import { checkPermission } from './defaultPermissions'

export type DadosSubpage = 'nig' | 'produtividade' | 'sla' | 'placement'

export const DADOS_SUBPAGE_MODULE: Record<DadosSubpage, keyof SystemPermissions> = {
  nig: 'dadosNig',
  produtividade: 'dadosProdutividade',
  sla: 'dadosSla',
  placement: 'dadosPlacement',
}

export const DADOS_SUBMODULE_KEYS = Object.values(DADOS_SUBPAGE_MODULE)

export const DADOS_SUBPAGES: DadosSubpage[] = ['nig', 'produtividade', 'sla', 'placement']

export function getDadosSubmodule(subpage: DadosSubpage): keyof SystemPermissions {
  return DADOS_SUBPAGE_MODULE[subpage]
}

export function canViewDadosSubpage(
  permissions: SystemPermissions,
  subpage: DadosSubpage
): boolean {
  const subModule = getDadosSubmodule(subpage)
  return checkPermission(permissions, subModule, 'view')
}

export function canViewAnyDadosSection(permissions: SystemPermissions): boolean {
  return DADOS_SUBPAGES.some((subpage) => canViewDadosSubpage(permissions, subpage))
}

export function getFirstAllowedDadosSubpage(
  permissions: SystemPermissions
): DadosSubpage | null {
  for (const subpage of DADOS_SUBPAGES) {
    if (canViewDadosSubpage(permissions, subpage)) return subpage
  }
  return null
}

/** Usuários antigos com só `dados` customizado herdam nas subpáginas não configuradas. */
export function migrateDadosSubmodulePermissions(
  permissions: SystemPermissions,
  parsed?: Record<string, unknown> | null
): SystemPermissions {
  if (!parsed || !('dados' in parsed)) return permissions

  const missing = DADOS_SUBMODULE_KEYS.filter((key) => !(key in parsed))
  if (missing.length === 0) return permissions

  const legacy = permissions.dados
  const next = { ...permissions }
  for (const key of missing) {
    next[key] = { ...legacy, ...next[key] }
  }
  return next
}
