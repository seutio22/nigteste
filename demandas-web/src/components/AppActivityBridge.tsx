import { useActivityTracking } from '../hooks/useActivityTracking'
import { usePageDwellTracking } from '../hooks/usePageDwellTracking'
import { useInteractionTracking } from '../hooks/useInteractionTracking'

/**
 * Sessão, heartbeat, tempo por página, cliques e ociosidade.
 * Montar uma única vez no app autenticado.
 */
export function AppActivityBridge() {
  useActivityTracking()
  usePageDwellTracking()
  useInteractionTracking()
  return null
}
