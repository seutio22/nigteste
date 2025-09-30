import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasPermission, canAccessModule } from '../types/permissions'
import type { SystemPermissions } from '../types/permissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  module: keyof SystemPermissions
  action?: keyof import('../types/permissions').ModulePermission
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  module, 
  action = 'view' 
}) => {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Verificar se o usuário tem acesso ao módulo
  const hasAccess = user.permissions && canAccessModule(user.permissions, module as keyof SystemPermissions)

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar este módulo.
          </p>
        </div>
      </div>
    )
  }

  // Se uma ação específica foi solicitada, verificar permissão para ela
  if (action && action !== 'view') {
    const canPerformAction = hasPermission(user.permissions, module as keyof SystemPermissions, action)
    
    if (!canPerformAction) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">
              Você não tem permissão para realizar esta ação.
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
