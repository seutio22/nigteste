/** Formulário dinâmico por tipo (admin edita JSON em /admin). */
export type FormFieldType = 'text' | 'textarea' | 'number' | 'select'

export type FormFieldDef = {
  key: string
  label: string
  type: FormFieldType
  required?: boolean
  options?: string[]
  placeholder?: string
}

export type FormSchemaDoc = {
  fields: FormFieldDef[]
}

export function parseFormSchema(raw: unknown): FormFieldDef[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as FormSchemaDoc
  if (!Array.isArray(o.fields)) return []
  return o.fields.filter(
    (f) =>
      f &&
      typeof f.key === 'string' &&
      typeof f.label === 'string' &&
      ['text', 'textarea', 'number', 'select'].includes(f.type)
  )
}
