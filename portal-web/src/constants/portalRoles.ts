/** Rótulos e cores MUI para papéis do portal (alinhado à API). */
export const PORTAL_ROLE_ORDER = [
  'PORTAL_ADMIN',
  'PORTAL_OPERATOR',
  'REQUESTER_MANAGER',
  'COLLABORATOR',
] as const

export const PORTAL_ROLE_LABEL: Record<string, string> = {
  PORTAL_ADMIN: 'Administrador do portal',
  PORTAL_OPERATOR: 'Operador',
  REQUESTER_MANAGER: 'Gestor solicitante',
  COLLABORATOR: 'Colaborador',
}

export function portalRoleLabel(role: string): string {
  return PORTAL_ROLE_LABEL[role] ?? role
}

export const PORTAL_ROLE_CHIP_COLOR: Record<
  string,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  PORTAL_ADMIN: 'error',
  PORTAL_OPERATOR: 'info',
  REQUESTER_MANAGER: 'warning',
  COLLABORATOR: 'success',
}
