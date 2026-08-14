/** Persistência local do arquivo original de beneficiários (para devolver com coluna CRITICA). */

const DB_NAME = 'nigteste-placement-beneficiarios'
const STORE = 'original-spreadsheet'
const DB_VERSION = 1

export type BeneficiariosOriginalFile = {
  cotacaoId: string
  fileName: string
  mimeType: string
  /** Conteúdo binário do arquivo enviado. */
  buffer: ArrayBuffer
  savedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'cotacaoId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export async function saveBeneficiariosOriginalFile(
  cotacaoId: string,
  file: { fileName: string; mimeType?: string; buffer: ArrayBuffer }
): Promise<void> {
  if (!cotacaoId || !file.buffer) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Falha ao gravar arquivo original'))
    tx.objectStore(STORE).put({
      cotacaoId,
      fileName: file.fileName || 'planilha-beneficiarios.xlsx',
      mimeType: file.mimeType || 'application/octet-stream',
      buffer: file.buffer,
      savedAt: new Date().toISOString(),
    } satisfies BeneficiariosOriginalFile)
  })
  db.close()
}

export async function loadBeneficiariosOriginalFile(
  cotacaoId: string
): Promise<BeneficiariosOriginalFile | null> {
  if (!cotacaoId) return null
  try {
    const db = await openDb()
    const row = await new Promise<BeneficiariosOriginalFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(cotacaoId)
      req.onsuccess = () => resolve((req.result as BeneficiariosOriginalFile) ?? null)
      req.onerror = () => reject(req.error ?? new Error('Falha ao ler arquivo original'))
    })
    db.close()
    return row
  } catch {
    return null
  }
}

export async function clearBeneficiariosOriginalFile(cotacaoId: string): Promise<void> {
  if (!cotacaoId) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Falha ao limpar arquivo original'))
      tx.objectStore(STORE).delete(cotacaoId)
    })
    db.close()
  } catch {
    /* ignore */
  }
}
