import { useActivityTracking } from '../hooks/useActivityTracking'
import { usePageDwellTracking } from '../hooks/usePageDwellTracking'

/**
 * Inicia sessão de monitoramento, heartbeat, tempo por página (rota) e encerra sessão ao sair.
 * Deve ser montado uma única vez dentro do app autenticado.
 */
export function AppActivityBridge() {
  useActivityTracking()
  usePageDwellTracking()
  return null
}
