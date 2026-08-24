import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getUserPermissions } from '../utils/defaultPermissions'
import { getFirstAllowedDadosSubpage } from '../utils/dadosPermissions'

export default function DadosIndexRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />

  const permissions = getUserPermissions(user.permissions, user.role)
  const first = getFirstAllowedDadosSubpage(permissions)

  if (!first) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={`/dados/${first}`} replace />
}
