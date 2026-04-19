import { parseLookupImportText } from './lookupImport'

/** Catálogo de campos Nexus (API /admin/nexus-fields) */
export type NexusFieldRow = {
  id: string
  key: string
  label: string
  description: string | null
  valueType: string
  enumOptions: unknown
  sortOrder: number
  active: boolean
}

export function parseEnumOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

/** Opções de lista: aceita vírgula, ponto e vírgula ou uma opção por linha (ordem preservada, sem duplicados). */
export function parseSelectableOptionsInput(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const k = p.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(p)
  }
  return out
}

function dedupeOptionsPreserveOrder(parts: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const k = p.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(p)
  }
  return out
}

/**
 * Importação de opções no construtor de formulários (colar / ficheiro).
 * Combina parsing por linhas (CSV/tab) com o modo «vírgulas na mesma linha».
 */
export function parseManualFormOptionsImport(raw: string): string[] {
  const t = raw.replace(/^\uFEFF/, '').trim()
  if (!t) return []
  const structLabels = parseLookupImportText(t)
    .map((p) => p.label.trim())
    .filter(Boolean)
  const loose = parseSelectableOptionsInput(t)
  if (t.includes('\t')) {
    return dedupeOptionsPreserveOrder(structLabels.length ? structLabels : loose)
  }
  if (loose.length > structLabels.length) {
    return dedupeOptionsPreserveOrder(loose)
  }
  return dedupeOptionsPreserveOrder(structLabels.length ? structLabels : loose)
}
