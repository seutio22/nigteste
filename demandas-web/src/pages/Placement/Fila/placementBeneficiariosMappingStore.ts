import type {
  BeneficiarioUploadRow,
  BeneficiariosFieldHeaderMap,
} from './placementBeneficiarios'

export type BeneficiariosMappingSnapshot = {
  fieldHeaderMap: BeneficiariosFieldHeaderMap
  savedAt: string
  lastFileName?: string | null
  lastImportedCount?: number | null
  sheetHeaders?: string[]
}

const STORAGE_PREFIX = 'placement-beneficiarios-mapping:'

function storageKey(cotacaoId: string) {
  return `${STORAGE_PREFIX}${cotacaoId}`
}

export function loadBeneficiariosMappingSnapshot(
  cotacaoId: string
): BeneficiariosMappingSnapshot | null {
  if (!cotacaoId || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(cotacaoId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as BeneficiariosMappingSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.fieldHeaderMap) return null
    return {
      fieldHeaderMap: parsed.fieldHeaderMap,
      savedAt: String(parsed.savedAt ?? ''),
      lastFileName: parsed.lastFileName ?? null,
      lastImportedCount:
        parsed.lastImportedCount == null ? null : Number(parsed.lastImportedCount),
      sheetHeaders: Array.isArray(parsed.sheetHeaders)
        ? parsed.sheetHeaders.map(String)
        : [],
    }
  } catch {
    return null
  }
}

export function saveBeneficiariosMappingSnapshot(
  cotacaoId: string,
  snapshot: BeneficiariosMappingSnapshot
): void {
  if (!cotacaoId || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(cotacaoId), JSON.stringify(snapshot))
  } catch {
    /* quota / private mode */
  }
}

export function clearBeneficiariosMappingSnapshot(cotacaoId: string): void {
  if (!cotacaoId || typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(cotacaoId))
  } catch {
    /* ignore */
  }
}

/** Cabeçalhos inferidos a partir do mapeamento salvo (fallback quando sheetHeaders não foi gravado). */
export function headersFromFieldHeaderMap(map: BeneficiariosFieldHeaderMap): string[] {
  const set = new Set<string>()
  for (const header of Object.values(map)) {
    if (header) set.add(header)
  }
  return [...set]
}

export function sheetRowsFromHeaders(headers: string[]): Record<string, unknown>[] {
  if (!headers.length) return []
  return [Object.fromEntries(headers.map((header) => [header, '']))]
}

/** Reaproveita mapeamento salvo quando o cabeçalho ainda existe na nova planilha. */
export function mergeFieldHeaderMaps(
  saved: BeneficiariosFieldHeaderMap | null | undefined,
  autoMap: BeneficiariosFieldHeaderMap,
  rawHeaders: string[]
): BeneficiariosFieldHeaderMap {
  const headerSet = new Set(rawHeaders)
  const merged: BeneficiariosFieldHeaderMap = { ...autoMap }

  if (!saved) return merged

  for (const [field, header] of Object.entries(saved) as [keyof BeneficiarioUploadRow, string | null][]) {
    if (!header || !headerSet.has(header)) continue
    merged[field] = header
  }

  return merged
}

export function formatBeneficiariosMappingSavedAt(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
