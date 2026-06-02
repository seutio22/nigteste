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
