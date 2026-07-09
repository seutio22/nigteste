import { checkPermission } from './defaultPermissions'
import type { SystemPermissions } from '../types/permissions'
import { waitUntilSyncIdle } from './syncCooldown'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useMaillingStore } from '../store/maillingStore'
import { useProjectStore } from '../store/projectStore'

/** Espera stores da Home terminarem sync iniciado pelo AppLayout ou pela própria Home. */
export async function waitForHomeStoresReady(perms: SystemPermissions): Promise<void> {
  const busyChecks: Array<() => boolean> = []

  if (checkPermission(perms, 'cadastro', 'view')) {
    busyChecks.push(() => useDemandStore.getState().isLoading)
  }
  if (checkPermission(perms, 'atendimento', 'view')) {
    busyChecks.push(() => useAtendimentoStore.getState().isLoading)
  }
  if (checkPermission(perms, 'validacao', 'view')) {
    busyChecks.push(() => useValidationStore.getState().loading)
  }
  if (checkPermission(perms, 'manutencao', 'view')) {
    busyChecks.push(() => useManutencaoStore.getState().isLoading)
  }
  if (checkPermission(perms, 'analytics', 'view')) {
    busyChecks.push(() => useReportStore.getState().isLoading)
  }
  if (checkPermission(perms, 'mailling', 'view')) {
    busyChecks.push(() => useMaillingStore.getState().isSyncing)
  }
  if (checkPermission(perms, 'projetos', 'view')) {
    busyChecks.push(() => useProjectStore.getState().loading)
  }

  await Promise.all(busyChecks.map((isBusy) => waitUntilSyncIdle(isBusy)))
}
