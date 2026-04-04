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
  /**
   * Coluna no JSON do snapshot da entidade (ex.: id_cliente) que deve coincidir com o valor
   * guardado no campo do formulário indicado em `filterByParentKey`.
   */
  filterByField?: string
  /**
   * Chave interna de outro campo deste formulário (ex.: cliente) — a lista só carrega depois
   * que o utilizador escolher o pai (escalável a várias áreas / tipos).
   */
  filterByParentKey?: string
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
  /** Várias escolhas (Nexus ou lista manual); guardado como array de strings nas respostas */
  multiple?: boolean
  /**
   * Opção «Outro» + texto livre (cadastro que ainda não existe no Nexus).
   * Incompatível com `multiple` na mesma configuração.
   */
  allowOther?: boolean
  /** Rótulo da opção extra (ex.: Cliente novo) */
  otherLabel?: string
  /** Placeholder do texto quando escolhe «Outro» */
  otherPlaceholder?: string
}

/** Valor sintético da opção «Outro» nos selects */
export const PORTAL_SELECT_OTHER_VALUE = '__portal_other__'

export type SelectWithOtherPayload = {
  id: string | null
  other: string | null
}

export function parseSelectWithOther(raw: string): SelectWithOtherPayload {
  const t = (raw ?? '').trim()
  if (!t) return { id: null, other: null }
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>
      const id = o.id != null && o.id !== '' ? String(o.id) : null
      let other: string | null = null
      if ('other' in o) {
        if (o.other === null || o.other === undefined) other = null
        else other = String(o.other)
      }
      return { id, other }
    } catch {
      return { id: t, other: null }
    }
  }
  return { id: t, other: null }
}

export function serializeSelectWithOther(p: SelectWithOtherPayload): string {
  return JSON.stringify({
    id: p.id && p.id !== PORTAL_SELECT_OTHER_VALUE ? p.id : null,
    other: p.other === null || p.other === undefined ? null : p.other,
  })
}

export function parseMultiIds(raw: string): string[] {
  const t = (raw ?? '').trim()
  if (!t) return []
  try {
    const a = JSON.parse(t) as unknown
    if (Array.isArray(a)) return a.map((x) => String(x)).filter(Boolean)
  } catch {
    /* legacy single id */
    if (t) return [t]
  }
  return []
}

export function serializeMultiIds(ids: string[]): string {
  return JSON.stringify(ids)
}

/** Resposta pronta para gravar em `answers` (objeto JSON na API) */
export function toAnswerPayload(f: FormFieldDef, raw: string): unknown {
  if (f.type !== 'select') return raw
  if (f.multiple) return parseMultiIds(raw)
  if (f.allowOther && (f.nexusOptions || (f.options && f.options.length > 0))) {
    return parseSelectWithOther(raw)
  }
  return raw
}

export function isFieldAnswerEmpty(f: FormFieldDef, raw: string): boolean {
  if (f.type === 'file') return !(raw || '').trim()
  if (f.type === 'checkbox') return raw !== 'true'
  if (f.type === 'select' && f.multiple) return parseMultiIds(raw).length === 0
  if (f.type === 'select' && f.allowOther && (f.nexusOptions || (f.options && f.options.length > 0))) {
    const o = parseSelectWithOther(raw)
    return !o.id && !(o.other || '').trim()
  }
  return !(raw || '').trim()
}

/** ID a usar em filtros de lista dependente (primeiro de multi, ou id em «Outro») */
export function primaryIdForDependentFilter(
  raw: string,
  parentField: FormFieldDef | undefined
): string {
  if (!raw || !parentField) return (raw ?? '').trim()
  if (parentField.type === 'select' && parentField.multiple) {
    const ids = parseMultiIds(raw)
    return ids[0] ?? ''
  }
  if (parentField.type === 'select' && parentField.allowOther && (parentField.nexusOptions || parentField.options?.length)) {
    return (parseSelectWithOther(raw).id ?? '').trim()
  }
  return raw.trim()
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
