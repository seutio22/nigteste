// Configuração de permissões padrão para cada módulo
export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  import?: boolean;
  approve?: boolean;
  reject?: boolean;
}

export interface SystemPermissions {
  home: ModulePermission;
  dashboard: ModulePermission;
  demandas: ModulePermission;
  atendimento: ModulePermission;
  comunicados: ModulePermission;
  validacao: ModulePermission;
  reajuste: ModulePermission;
  mailling: ModulePermission;
  analytics: ModulePermission;
  kanban: ModulePermission;
  dados: ModulePermission;
  usuarios: ModulePermission;
  configuracoes: ModulePermission;
  relatorios: ModulePermission;
}

// Permissões padrão para cada perfil
export const DEFAULT_PERMISSIONS: Record<string, SystemPermissions> = {
  admin: {
    home: { view: true, create: true, edit: true, delete: true },
    dashboard: { view: true, create: true, edit: true, delete: true },
    demandas: { view: true, create: true, edit: true, delete: true },
    atendimento: { view: true, create: true, edit: true, delete: true },
    comunicados: { view: true, create: true, edit: true, delete: true },
    validacao: { view: true, create: true, edit: true, delete: true },
    reajuste: { view: true, create: true, edit: true, delete: true },
    mailling: { view: true, create: true, edit: true, delete: true },
    analytics: { view: true, create: true, edit: true, delete: true },
    kanban: { view: true, create: true, edit: true, delete: true },
    dados: { view: true, create: true, edit: true, delete: true },
    usuarios: { view: true, create: true, edit: true, delete: true },
    configuracoes: { view: true, create: true, edit: true, delete: true },
    relatorios: { view: true, create: true, edit: true, delete: true }
  },
  
  gerente: {
    home: { view: true, create: false, edit: false, delete: false },
    dashboard: { view: true, create: false, edit: false, delete: false },
    demandas: { view: true, create: true, edit: true, delete: false },
    atendimento: { view: true, create: true, edit: true, delete: false },
    comunicados: { view: true, create: true, edit: false, delete: false },
    validacao: { view: true, create: true, edit: true, delete: false },
    reajuste: { view: true, create: true, edit: true, delete: false },
    mailling: { view: true, create: true, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: true, edit: true, delete: false },
    dados: { view: true, create: false, edit: false, delete: false },
    usuarios: { view: true, create: false, edit: false, delete: false },
    configuracoes: { view: true, create: false, edit: false, delete: false },
    relatorios: { view: true, create: false, edit: false, delete: false }
  },
  
  analista: {
    home: { view: true, create: false, edit: false, delete: false },
    dashboard: { view: true, create: false, edit: false, delete: false },
    demandas: { view: true, create: true, edit: true, delete: false },
    atendimento: { view: true, create: true, edit: true, delete: false },
    comunicados: { view: true, create: false, edit: false, delete: false },
    validacao: { view: true, create: true, edit: true, delete: false },
    reajuste: { view: true, create: true, edit: true, delete: false },
    mailling: { view: true, create: false, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: true, edit: true, delete: false },
    dados: { view: false, create: false, edit: false, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    configuracoes: { view: false, create: false, edit: false, delete: false },
    relatorios: { view: false, create: false, edit: false, delete: false }
  },
  
  solicitante: {
    home: { view: true, create: false, edit: false, delete: false },
    dashboard: { view: true, create: false, edit: false, delete: false },
    demandas: { view: true, create: true, edit: false, delete: false },
    atendimento: { view: true, create: true, edit: false, delete: false },
    comunicados: { view: true, create: false, edit: false, delete: false },
    validacao: { view: false, create: false, edit: false, delete: false },
    reajuste: { view: false, create: false, edit: false, delete: false },
    mailling: { view: true, create: false, edit: false, delete: false },
    analytics: { view: false, create: false, edit: false, delete: false },
    kanban: { view: true, create: false, edit: false, delete: false },
    dados: { view: false, create: false, edit: false, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    configuracoes: { view: false, create: false, edit: false, delete: false },
    relatorios: { view: false, create: false, edit: false, delete: false }
  },
  
  viewer: {
    home: { view: true, create: false, edit: false, delete: false },
    dashboard: { view: true, create: false, edit: false, delete: false },
    demandas: { view: true, create: false, edit: false, delete: false },
    atendimento: { view: true, create: false, edit: false, delete: false },
    comunicados: { view: true, create: false, edit: false, delete: false },
    validacao: { view: true, create: false, edit: false, delete: false },
    reajuste: { view: true, create: false, edit: false, delete: false },
    mailling: { view: true, create: false, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    kanban: { view: true, create: false, edit: false, delete: false },
    dados: { view: false, create: false, edit: false, delete: false },
    usuarios: { view: false, create: false, edit: false, delete: false },
    configuracoes: { view: false, create: false, edit: false, delete: false },
    relatorios: { view: false, create: false, edit: false, delete: false }
  }
};

// Função para gerar permissões JSON string
export function generatePermissionsJson(role: string): string {
  const permissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer;
  return JSON.stringify(permissions);
}

// Função para verificar permissão específica
export function hasPermission(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions,
  action: keyof ModulePermission
): boolean {
  if (!userPermissions) return false;
  
  const modulePermissions = userPermissions[module];
  if (!modulePermissions) return false;
  
  return modulePermissions[action] === true;
}

// Função para verificar se usuário pode acessar módulo
export function canAccessModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'view');
}

// Função para verificar se usuário pode criar no módulo
export function canCreateInModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'create');
}

// Função para verificar se usuário pode editar no módulo
export function canEditInModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'edit');
}

// Função para verificar se usuário pode deletar no módulo
export function canDeleteInModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'delete');
}
