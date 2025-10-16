import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { getUserPermissions, checkPermission } from '../utils/defaultPermissions'
import type { SystemPermissions, ModulePermission } from '../types/permissions'

/**
 * Hook para verificar permissões do usuário atual
 * Uso: const { canView, canCreate, canEdit, canDelete } = usePermissions('cadastro')
 */
export function usePermissions(module: keyof SystemPermissions) {
  const { user } = useAuthStore()
  
  const permissions = useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canImport: false,
        canApprove: false,
        canReject: false,
        hasAnyPermission: false
      }
    }
    
    const userPermissions = getUserPermissions(user.permissions, user.role)
    
    const canView = checkPermission(userPermissions, module, 'view')
    const canCreate = checkPermission(userPermissions, module, 'create')
    const canEdit = checkPermission(userPermissions, module, 'edit')
    const canDelete = checkPermission(userPermissions, module, 'delete')
    const canExport = checkPermission(userPermissions, module, 'export')
    const canImport = checkPermission(userPermissions, module, 'import')
    const canApprove = checkPermission(userPermissions, module, 'approve')
    const canReject = checkPermission(userPermissions, module, 'reject')
    
    return {
      canView,
      canCreate,
      canEdit,
      canDelete,
      canExport,
      canImport,
      canApprove,
      canReject,
      hasAnyPermission: canView || canCreate || canEdit || canDelete
    }
  }, [user, module])
  
  return permissions
}

/**
 * Hook para verificar se usuário tem permissão específica
 * Uso: const hasPermission = useHasPermission('cadastro', 'create')
 */
export function useHasPermission(
  module: keyof SystemPermissions,
  action: keyof ModulePermission
): boolean {
  const { user } = useAuthStore()
  
  return useMemo(() => {
    if (!user) return false
    
    const userPermissions = getUserPermissions(user.permissions, user.role)
    return checkPermission(userPermissions, module, action)
  }, [user, module, action])
}

/**
 * Hook para obter todas as permissões do usuário
 * Uso: const permissions = useUserPermissions()
 */
export function useUserPermissions(): SystemPermissions | null {
  const { user } = useAuthStore()
  
  return useMemo(() => {
    if (!user) return null
    return getUserPermissions(user.permissions, user.role)
  }, [user])
}