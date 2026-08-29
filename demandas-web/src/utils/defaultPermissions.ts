import { SystemPermissions, ModulePermission } from '../types/permissions'
import { migrateDadosSubmodulePermissions } from './dadosPermissions'

// Permissão completa (acesso total)
const fullPermission: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  export: true,
  import: true,
  approve: true,
  reject: true
}

// Permissão de leitura + criação + edição
const standardPermission: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  export: true,
  import: true,
  approve: false,
  reject: false
}

// Permissão apenas de leitura
const readOnlyPermission: ModulePermission = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  export: true,
  import: false,
  approve: false,
  reject: false
}

// Permissão de analista (sem deletar)
const analistaPermission: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  export: true,
  import: true,
  approve: false,
  reject: false
}

// Permissão negada
const noPermission: ModulePermission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  export: false,
  import: false,
  approve: false,
  reject: false
}

// Permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<string, SystemPermissions> = {
  admin: {
    home: fullPermission,
    dashboard: fullPermission,
    cadastro: fullPermission,
    manutencao: fullPermission,
    atendimento: fullPermission,
    comunicados: fullPermission,
    validacao: fullPermission,
    reajuste: fullPermission,
    mailling: fullPermission,
    analytics: fullPermission,
    kanban: fullPermission,
    projetos: fullPermission,
    dados: fullPermission,
    dadosNig: fullPermission,
    dadosProdutividade: fullPermission,
    dadosSla: fullPermission,
    dadosPlacement: fullPermission,
    usuarios: fullPermission,
    configuracoes: fullPermission,
    relatorios: fullPermission,
    placementFila: fullPermission
  },
  
  gerente: {
    home: fullPermission,
    dashboard: fullPermission,
    cadastro: fullPermission,
    manutencao: fullPermission,
    atendimento: fullPermission,
    comunicados: fullPermission,
    validacao: fullPermission,
    reajuste: fullPermission,
    mailling: fullPermission,
    analytics: fullPermission,
    kanban: fullPermission,
    projetos: fullPermission,
    dados: fullPermission,
    dadosNig: fullPermission,
    dadosProdutividade: fullPermission,
    dadosSla: fullPermission,
    dadosPlacement: fullPermission,
    usuarios: noPermission, // ❌ CORRIGIDO: Gerentes não devem ter acesso a usuários
    configuracoes: readOnlyPermission,
    relatorios: fullPermission,
    placementFila: fullPermission
  },
  
  analista: {
    home: readOnlyPermission,
    dashboard: readOnlyPermission,
    cadastro: analistaPermission,
    manutencao: analistaPermission,
    atendimento: analistaPermission,
    comunicados: readOnlyPermission,
    validacao: analistaPermission,
    reajuste: analistaPermission,
    mailling: analistaPermission,
    analytics: analistaPermission,
    kanban: analistaPermission,
    projetos: analistaPermission,
    dados: analistaPermission,
    dadosNig: analistaPermission,
    dadosProdutividade: analistaPermission,
    dadosSla: analistaPermission,
    dadosPlacement: analistaPermission,
    usuarios: noPermission,
    configuracoes: readOnlyPermission,
    relatorios: analistaPermission,
    placementFila: analistaPermission
  },
  
  solicitante: {
    home: readOnlyPermission,
    dashboard: noPermission,
    cadastro: { view: true, create: true, edit: false, delete: false, export: false, import: false },
    manutencao: { view: true, create: true, edit: false, delete: false, export: false, import: false },
    atendimento: { view: true, create: true, edit: false, delete: false, export: false, import: false },
    comunicados: readOnlyPermission,
    validacao: noPermission,
    reajuste: noPermission,
    mailling: noPermission,
    analytics: noPermission,
    kanban: readOnlyPermission,
    projetos: readOnlyPermission,
    dados: noPermission,
    dadosNig: noPermission,
    dadosProdutividade: noPermission,
    dadosSla: noPermission,
    dadosPlacement: noPermission,
    usuarios: noPermission,
    configuracoes: noPermission,
    relatorios: noPermission,
    placementFila: noPermission
  }
}

/**
 * Obtém permissões para um usuário
 * PRIORIDADE: Sempre usa permissões configuradas em "Gerenciar Permissões"
 * Fallback: Se não tiver permissões configuradas, usa padrão do role (apenas uma vez na criação)
 */
export function getUserPermissions(
  userPermissionsString: string | null | undefined | any,
  userRole: string
): SystemPermissions {
  const roleDefaults =
    DEFAULT_PERMISSIONS[userRole?.toLowerCase()] ?? DEFAULT_PERMISSIONS.analista

  // 🎯 PRIORIDADE 1: Usar permissões CUSTOMIZADAS do usuário (Gerenciar Permissões)
  if (userPermissionsString) {
    try {
      let parsed: any = null
      if (typeof userPermissionsString === 'object' && userPermissionsString !== null) {
        parsed = userPermissionsString
      } else if (typeof userPermissionsString === 'string') {
        parsed = JSON.parse(userPermissionsString)
      }
      if (parsed && typeof parsed === 'object') {
        const merged = { ...roleDefaults, ...parsed } as SystemPermissions
        return migrateDadosSubmodulePermissions(merged, parsed as Record<string, unknown>)
      }
    } catch (error) {
      // Erro silencioso - usar fallback
    }
  }

  return roleDefaults
}

/**
 * Verifica se usuário tem permissão específica
 * SEGURANÇA: Sempre retorna boolean, nunca undefined
 */
export function checkPermission(
  permissions: SystemPermissions,
  module: keyof SystemPermissions,
  action: keyof ModulePermission
): boolean {
  try {
    const modulePermissions = permissions[module]
    if (!modulePermissions) {
      console.warn(`⚠️ Módulo não encontrado: ${module}`)
      return false
    }
    
    return modulePermissions[action] === true
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return false
  }
}

/**
 * Cria permissões iniciais quando usuário é criado
 */
export function getInitialPermissions(role: string): string {
  const permissions = DEFAULT_PERMISSIONS[role.toLowerCase()] || DEFAULT_PERMISSIONS.analista
  return JSON.stringify(permissions)
}
