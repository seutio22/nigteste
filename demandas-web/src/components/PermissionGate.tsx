import React from 'react'
import { useHasPermission } from '../hooks/usePermissions'
import type { SystemPermissions, ModulePermission } from '../types/permissions'

interface PermissionGateProps {
  children: React.ReactNode
  module: keyof SystemPermissions
  action: keyof ModulePermission
  fallback?: React.ReactNode
}

/**
 * Componente para controlar visibilidade baseado em permissões
 * 
 * Uso:
 * <PermissionGate module="cadastro" action="create">
 *   <Button>Criar Novo</Button>
 * </PermissionGate>
 */
export function PermissionGate({ 
  children, 
  module, 
  action,
  fallback = null 
}: PermissionGateProps) {
  const hasPermission = useHasPermission(module, action)
  
  if (!hasPermission) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * HOC para adicionar verificação de permissão a um componente
 * 
 * Uso:
 * const ProtectedButton = withPermission(Button, 'cadastro', 'create')
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  module: keyof SystemPermissions,
  action: keyof ModulePermission
) {
  return (props: P) => {
    const hasPermission = useHasPermission(module, action)
    
    if (!hasPermission) {
      return null
    }
    
    return <Component {...props} />
  }
}
