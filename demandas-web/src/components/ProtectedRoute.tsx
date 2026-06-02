import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Box, Typography, Button, Paper } from '@mui/material'
import { Lock as LockIcon } from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'
import { getUserPermissions, checkPermission } from '../utils/defaultPermissions'
import type { SystemPermissions } from '../types/permissions'
import { logDev } from '../utils/logger'

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

  // ✅ SISTEMA DE PERMISSÕES ATIVO
  // Obtém permissões do usuário (customizadas ou padrão do role)
  const userPermissions = getUserPermissions(user.permissions, user.role)
  
  // Verifica se tem permissão para acessar
  const hasAccess = checkPermission(userPermissions, module, action)
  
  logDev(`🔐 ProtectedRoute: ${module}.${action} = ${hasAccess ? '✅' : '❌'}`)
  
  // Se não tem permissão, mostra tela de acesso negado
  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 500
          }}
        >
          <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom color="error">
            Acesso Negado
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Você não tem permissão para acessar este módulo.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <strong>Módulo:</strong> {module}<br />
            <strong>Ação:</strong> {action}<br />
            <strong>Seu perfil:</strong> {user.role}
          </Typography>
          
          <Typography variant="body2" color="info.main" sx={{ mb: 3 }}>
            💡 Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema.
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.history.back()}
          >
            Voltar
          </Button>
        </Paper>
      </Box>
    )
  }

  // ✅ Permissão concedida
  return <>{children}</>
}
