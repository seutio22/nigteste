import type { PersistStorage, StorageValue } from 'zustand/middleware'

const MAX_BYTES_DEFAULT = 4 * 1024 * 1024

function byteSize(value: string): number {
  try {
    return new Blob([value]).size
  } catch {
    return value.length * 2
  }
}

/**
 * Storage do Zustand persist que não derruba a app quando a cota do localStorage estoura.
 */
export function createSafePersistStorage<S>(
  storeKey: string,
  options?: { maxBytes?: number; onQuotaExceeded?: () => void }
): PersistStorage<S> {
  const maxBytes = options?.maxBytes ?? MAX_BYTES_DEFAULT

  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name)
        if (!raw) return null
        return JSON.parse(raw) as StorageValue<S>
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      const str = JSON.stringify(value)
      try {
        if (byteSize(str) > maxBytes) {
          console.warn(`⚠️ ${storeKey}: payload grande (${Math.round(byteSize(str) / 1024)}KB), não persistindo.`)
          try {
            localStorage.removeItem(name)
          } catch {
            /* ignore */
          }
          options?.onQuotaExceeded?.()
          return
        }
        localStorage.setItem(name, str)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn(`⚠️ ${storeKey}: cota do localStorage excedida; limpando cache deste store.`)
          options?.onQuotaExceeded?.()
          try {
            localStorage.removeItem(name)
            localStorage.setItem(name, str)
          } catch {
            /* estado em memória segue válido */
          }
        } else {
          console.warn(`⚠️ ${storeKey}: erro ao persistir:`, error)
        }
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name)
      } catch {
        /* ignore */
      }
    },
  }
}

export function removeLocalStorageByPrefix(prefix: string): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

/** Chaves que antes persistiam listas grandes; remove entradas antigas > limite. */
const LEGACY_HEAVY_STORE_KEYS = [
  'comunicado-storage',
  'master-data-store',
  'placement-cotacao-v1',
  'reports-v1',
  'validation-storage',
  'atendimentoStore',
  'mailling-v1',
  'comunicados-v1',
  'demands-v1',
  'validations-v1',
  'manutencoes-v1',
  'projects-v1',
] as const

const LEGACY_HEAVY_MAX_BYTES = 200 * 1024

/**
 * Remove caches locais obsoletos que ainda ocupam megabytes (formato antigo).
 * Chamado uma vez ao abrir o app — stores leves passam a persistir só metadados.
 */
export function purgeOversizedPersistEntries(): void {
  for (const key of LEGACY_HEAVY_STORE_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      if (byteSize(raw) > LEGACY_HEAVY_MAX_BYTES) {
        localStorage.removeItem(key)
        if (import.meta.env.DEV) {
          console.info(`🧹 Removido cache local grande: ${key} (${Math.round(byteSize(raw) / 1024)}KB)`)
        }
      }
    } catch {
      /* ignore */
    }
  }
}
