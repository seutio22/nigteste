import { api } from '../../../lib/api.local'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import { mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'

/** Autosave: só o JSON de kick-off; API devolve id/updatedAt (sem cotação completa). */
export async function persistKickOffSlim(
  cotacaoId: string,
  kickOff: KickOffEstrategia
): Promise<unknown> {
  const updated = await api.put(`/placement/cotacoes/${cotacaoId}/kick-off`, {
    kickOffEstrategia: kickOff,
  })
  if (
    updated &&
    typeof updated === 'object' &&
    (updated as { __placementShareLocalNoop?: boolean }).__placementShareLocalNoop
  ) {
    return updated
  }
  return mergeSavedKickOffIntoApiCotacao(updated, kickOff)
}
