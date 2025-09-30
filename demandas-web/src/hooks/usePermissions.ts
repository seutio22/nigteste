import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { 
  hasPermission, 
  canAccessModule, 
  canCreateInModule, 
  canEditInModule, 
  canDeleteInModule,
  SystemPermissions,
  ModulePermission
} from '../types/permissions'

export function usePermissions() {
  const { user } = useAuthStore()

  const permissions = useMemo(() => {
    if (!user?.permissions) return null
    
    try {
      return typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions
    } catch {
      return null
    }
  }, [user?.permissions])

  const checkPermission = useMemo(() => ({
    // Verificar permissão específica
    has: (module: keyof SystemPermissions, action: keyof ModulePermission) => hasPermission(permissions, module, action),
    
    // Verificar acesso ao módulo
    canAccess: (module: keyof SystemPermissions) => canAccessModule(permissions, module),
    
    // Verificar se pode criar
    canCreate: (module: keyof SystemPermissions) => canCreateInModule(permissions, module),
    
    // Verificar se pode editar
    canEdit: (module: keyof SystemPermissions) => canEditInModule(permissions, module),
    
    // Verificar se pode deletar
    canDelete: (module: keyof SystemPermissions) => canDeleteInModule(permissions, module),
    
    // Verificar se é admin
    isAdmin: () => user?.role === 'admin',
    
    // Verificar se é gerente
    isManager: () => user?.role === 'gerente' || user?.role === 'admin',
    
    // Verificar se é analista
    isAnalyst: () => user?.role === 'analista' || user?.role === 'gerente' || user?.role === 'admin',
    
    // Obter todas as permissões
    getAll: () => permissions,
    
    // Obter permissões de um módulo específico
    getModule: (module: string) => permissions?.[module] || null
  }), [permissions, user?.role])

  return checkPermission
}

// Hook específico para verificar permissão de um módulo
export function useModulePermission(module: keyof SystemPermissions) {
  const permissions = usePermissions()
  
  return useMemo(() => ({
    canView: permissions.canAccess(module),
    canCreate: permissions.canCreate(module),
    canEdit: permissions.canEdit(module),
    canDelete: permissions.canDelete(module),
    modulePermissions: permissions.getModule(module)
  }), [permissions, module])
}
