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

  // Simplificado - permitir acesso para todos os usuários logados
  // TODO: Implementar sistema de permissões mais robusto no futuro

  return <>{children}</>
}
