// Tipos para o sistema de permissões
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
  cadastro: ModulePermission;
  manutencao: ModulePermission;
  atendimento: ModulePermission;
  comunicados: ModulePermission;
  validacao: ModulePermission;
  reajuste: ModulePermission;
  mailling: ModulePermission;
  analytics: ModulePermission;
  kanban: ModulePermission;
  projetos: ModulePermission;
  dados: ModulePermission;
  usuarios: ModulePermission;
  configuracoes: ModulePermission;
  relatorios: ModulePermission;
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

// Função para verificar se usuário pode exportar do módulo
export function canExportFromModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'export');
}

// Função para verificar se usuário pode importar para o módulo
export function canImportToModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'import');
}

// Função para verificar se usuário pode aprovar no módulo
export function canApproveInModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'approve');
}

// Função para verificar se usuário pode rejeitar no módulo
export function canRejectInModule(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): boolean {
  return hasPermission(userPermissions, module, 'reject');
}

// Função para obter permissões de um módulo específico
export function getModulePermissions(
  userPermissions: SystemPermissions | null,
  module: keyof SystemPermissions
): ModulePermission | null {
  if (!userPermissions) return null;
  return userPermissions[module] || null;
}

// Função para verificar se usuário tem permissões administrativas
export function isAdmin(userPermissions: SystemPermissions | null): boolean {
  if (!userPermissions) return false;
  
  // Verifica se tem acesso total a todos os módulos
  const modules = Object.keys(userPermissions) as Array<keyof SystemPermissions>;
  return modules.every(module => 
    userPermissions[module].view && 
    userPermissions[module].create && 
    userPermissions[module].edit && 
    userPermissions[module].delete
  );
}

// Função para verificar se usuário tem permissões de gerente
export function isManager(userPermissions: SystemPermissions | null): boolean {
  if (!userPermissions) return false;
  
  // Verifica se tem acesso de visualização a todos os módulos e criação/edição em módulos principais
  const canViewAll = Object.values(userPermissions).every(module => module.view);
  const canManageMain = userPermissions.demandas.create && 
                        userPermissions.atendimento.create && 
                        userPermissions.validacao.create;
  
  return canViewAll && canManageMain;
}
