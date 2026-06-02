const DEFAULT_SYNC_COOLDOWN_MS = 2 * 60 * 1000

/** Evita sync quando há cache em memória recente; sempre sincroniza se a lista está vazia. */
export function shouldSkipStoreSync(
  lastSync: number,
  itemCount: number,
  force?: boolean,
  cooldownMs = DEFAULT_SYNC_COOLDOWN_MS
): boolean {
  if (force) return false
  if (itemCount === 0) return false
  return Date.now() - lastSync < cooldownMs
}
