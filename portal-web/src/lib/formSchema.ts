/** Formulário dinâmico por tipo — construído no admin (sem JSON manual). */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'checkbox'
  | 'file'

/** Opções do select vindas do snapshot Nexus (página Dados), não texto manual */
export type NexusOptionsSource = {
  entity: string
  valueField: string
  labelField: string
}

export type FormFieldDef = {
  key: string
  label: string
  type: FormFieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  /** Chave do catálogo manual (mapeamento conceitual) */
  nexusFieldKey?: string | null
  /** Lista do select alimentada pelos dados sincronizados do Nexus */
  nexusOptions?: NexusOptionsSource | null
}

export type FormSchemaDoc = {
  fields: FormFieldDef[]
  /** Se true, o formulário de solicitação mostra o campo «Título». */
  showTitle?: boolean
  /** Se true, mostra descrição / observações (texto livre). Assunto livre do pedido. */
  showDescription?: boolean
}

/** Metadados do formulário (fora da lista de campos dinâmicos). */
export function parseFormMeta(raw: unknown): { showTitle: boolean; showDescription: boolean } {
  if (!raw || typeof raw !== 'object') {
    return { showTitle: false, showDescription: true }
  }
  const o = raw as FormSchemaDoc
  return {
    showTitle: o.showTitle === true,
    showDescription: o.showDescription !== false,
  }
}

const FORM_TYPES: FormFieldType[] = ['text', 'textarea', 'number', 'select', 'date', 'checkbox', 'file']

export function parseFormSchema(raw: unknown): FormFieldDef[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as FormSchemaDoc
  if (!Array.isArray(o.fields)) return []
  return o.fields.filter(
    (f) =>
      f &&
      typeof f.key === 'string' &&
      typeof f.label === 'string' &&
      FORM_TYPES.includes(f.type as FormFieldType)
  )
}

/** Gera chave estável a partir do rótulo (minúsculas, underscore). */
export function slugifyFieldKey(label: string): string {
  const s = label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return s || 'campo'
}
