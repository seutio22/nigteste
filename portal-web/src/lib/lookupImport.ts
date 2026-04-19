/**
 * Importação de itens de listas (CSV/TSV/uma coluna por linha).
 * Colunas: uma = só rótulo; duas = rótulo + valor técnico (opcional).
 */
export type ParsedLookupRow = { label: string; value?: string }

/** Remove BOM e normaliza quebras de linha. */
export function parseLookupImportText(raw: string): ParsedLookupRow[] {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n')
  const out: ParsedLookupRow[] = []
  for (const line of lines) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    if (s.includes('\t')) {
      const idx = s.indexOf('\t')
      const label = s.slice(0, idx).trim()
      const rest = s.slice(idx + 1).trim()
      if (!label) continue
      out.push(rest ? { label, value: rest } : { label })
      continue
    }
    if (s.includes(';')) {
      const idx = s.indexOf(';')
      const label = s.slice(0, idx).trim()
      const rest = s.slice(idx + 1).trim()
      if (!label) continue
      out.push(rest ? { label, value: rest } : { label })
      continue
    }
    const commaIdx = s.indexOf(',')
    if (commaIdx >= 0) {
      const label = s.slice(0, commaIdx).trim().replace(/^"|"$/g, '')
      const rest = s.slice(commaIdx + 1).trim().replace(/^"|"$/g, '')
      if (!label) continue
      out.push(rest ? { label, value: rest } : { label })
      continue
    }
    out.push({ label: s })
  }
  return out
}
