const STORAGE_KEY = 'dismissed-user-alerts'
const MAX_IDS = 500

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function setDismissed(ids: string[]) {
  try {
    const trimmed = ids.slice(-MAX_IDS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function addDismissedAlert(alertaId: string) {
  const ids = getDismissed()
  if (ids.includes(alertaId)) return
  setDismissed([...ids, alertaId])
}

export function isAlertDismissed(alertaId: string | undefined): boolean {
  if (alertaId == null || String(alertaId).trim() === '') return false
  const id = String(alertaId).trim()
  return getDismissed().includes(id)
}

/** Lista de IDs já dispensados (para filtrar listas sem re-chamar localStorage por item) */
export function getDismissedAlertIds(): string[] {
  return getDismissed()
}

export function clearDismissedAlerts() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
