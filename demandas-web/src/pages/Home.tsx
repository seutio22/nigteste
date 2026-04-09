import React from 'react'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { resolveHomeVariant } from '../utils/homeVariant'
import HomeNigPage from './home/HomeNig'
import HomePlacementPage from './home/HomePlacementPage'
import HomeNoDepartmentPage from './home/HomeNoDepartmentPage'

/**
 * Roteador da Home: três experiências conforme departamento (Dados → Áreas).
 * - NIG / demais áreas operacionais: painel completo (`HomeNig`).
 * - Placement: visão focada em projetos e apoio (`HomePlacementPage`).
 * - Sem departamento: onboarding leve (`HomeNoDepartmentPage`).
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const areasById = useMasterDataStore((s) => s.areasById)
  const variant = resolveHomeVariant(user, areasById)

  if (variant === 'placement') return <HomePlacementPage />
  if (variant === 'no_department') return <HomeNoDepartmentPage />
  return <HomeNigPage />
}
