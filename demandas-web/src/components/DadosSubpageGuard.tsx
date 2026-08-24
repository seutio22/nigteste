import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'
import { getUserPermissions } from '../utils/defaultPermissions'
import {
  canViewDadosSubpage,
  getDadosSubmodule,
  getFirstAllowedDadosSubpage,
  type DadosSubpage,
} from '../utils/dadosPermissions'

/** Renderiza filhos só com permissão da subpágina; senão redireciona (sem tela de acesso negado). */
export function DadosSubpageGuard({
  subpage,
  children,
}: {
  subpage: DadosSubpage
  children: ReactNode
}) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />

  const permissions = getUserPermissions(user.permissions, user.role)
  if (canViewDadosSubpage(permissions, subpage)) {
    return <>{children}</>
  }

  const first = getFirstAllowedDadosSubpage(permissions)
  if (first) {
    return <Navigate to={`/dados/${first}`} replace />
  }

  return <Navigate to="/" replace />
}
