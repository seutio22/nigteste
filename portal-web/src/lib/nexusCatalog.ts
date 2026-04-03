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
