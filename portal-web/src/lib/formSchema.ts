/** Formulário dinâmico por tipo — construído no admin (sem JSON manual). */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'checkbox'
  | 'file'
  | 'section'
  | 'subtitle'

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
  /** Texto auxiliar em blocos de layout (ex.: seção). */
  description?: string
  required?: boolean
  options?: string[]
  placeholder?: string
  /** Chave do catálogo manual (mapeamento conceitual) */
  nexusFieldKey?: string | null
  /** Lista do select alimentada pelos dados sincronizados do Nexus */
  nexusOptions?: NexusOptionsSource | null
  /** Lista do select vinda de uma tabela gerida no admin (Listas do portal) */
  portalListId?: string | null
  /** Origem da lista no construtor do admin (manual / portal / sincronizado) */
  selectListSource?: 'manual' | 'portal' | 'nexus'
  /** Várias escolhas (Nexus ou lista manual); guardado como array de strings nas respostas */
  multiple?: boolean
  /**
   * Opção «Outro» + texto livre (cadastro que ainda não existe no Nexus).
   * Pode ser usado juntamente com `multiple`; o valor guardado usa `{ ids, other }`.
   */
  allowOther?: boolean
  /** Rótulo da opção extra (ex.: Cliente novo) */
  otherLabel?: string
  /** Placeholder do texto quando escolhe «Outro» */
  otherPlaceholder?: string
  /** Quando true, o solicitante pode adicionar várias entradas para este mesmo campo. */
  repeatable?: boolean
  /** Máximo de entradas quando `repeatable=true` (default 25). */
  repeatMax?: number
  /** Identificador de grupo repetível (ex.: pessoas). Campos com o mesmo grupo repetem juntos em linhas. */
  repeatGroupKey?: string
  /** Máximo de linhas do grupo quando `repeatGroupKey` está definido (default 25). */
  repeatGroupMax?: number
  /** Configuração do grupo (replicação automática de linhas). */
  repeatGroupSource?: {
    /** Chave de um campo numérico (fora do grupo) que indica quantas linhas criar. */
    countFromKey?: string
    /** Linhas mínimas quando `countFromKey` está vazio/inválido. Default 1. */
    minRows?: number
  }
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

export type RepeatGroupRow = Record<string, string>

export function parseRepeatGroupRows(raw: string): RepeatGroupRow[] {
  const t = (raw ?? '').trim()
  if (!t) return [{}]
  try {
    const a = JSON.parse(t) as unknown
    if (Array.isArray(a)) {
      const out = a
        .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
        .map((x) => x as Record<string, unknown>)
        .map((o) => {
          const row: RepeatGroupRow = {}
          for (const [k, v] of Object.entries(o)) {
            if (!k) continue
            row[String(k)] = v === null || v === undefined ? '' : String(v)
          }
          return row
        })
      return out.length ? out : [{}]
    }
  } catch {
    /* ignore */
  }
  return [{}]
}

export function serializeRepeatGroupRows(rows: RepeatGroupRow[]): string {
  return JSON.stringify(rows)
}

export function parseRepeatValues(raw: string): string[] {
  const t = (raw ?? '').trim()
  if (!t) return ['']
  try {
    const a = JSON.parse(t) as unknown
    if (Array.isArray(a)) {
      const out = a.map((x) => String(x))
      return out.length ? out : ['']
    }
  } catch {
    /* legacy single value */
  }
  return [String(raw ?? '')]
}

export function serializeRepeatValues(values: string[]): string {
  return JSON.stringify(values)
}

/** Várias escolhas + texto «Outro» (serializado como JSON `{ ids, other }`). */
export type MultiWithOtherPayload = {
  ids: string[]
  other: string | null
}

export function parseMultiWithOther(raw: string): MultiWithOtherPayload {
  const t = (raw ?? '').trim()
  if (!t) return { ids: [], other: null }
  try {
    const o = JSON.parse(t) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const obj = o as Record<string, unknown>
      if ('ids' in obj && Array.isArray(obj.ids)) {
        const ids = obj.ids.map((x) => String(x)).filter((x) => x && x !== PORTAL_SELECT_OTHER_VALUE)
        let other: string | null = null
        if ('other' in obj && obj.other !== null && obj.other !== undefined) {
          other = String(obj.other)
        }
        return { ids, other }
      }
    }
    if (Array.isArray(o)) {
      return { ids: o.map(String).filter(Boolean), other: null }
    }
  } catch {
    /* legacy */
  }
  return { ids: parseMultiIds(raw), other: null }
}

export function serializeMultiWithOther(p: MultiWithOtherPayload): string {
  return JSON.stringify({
    ids: p.ids.filter((x) => x && x !== PORTAL_SELECT_OTHER_VALUE),
    other: p.other === null || p.other === undefined ? null : p.other,
  })
}

function hasSelectableList(f: FormFieldDef): boolean {
  return !!(f.nexusOptions || f.portalListId || (f.options && f.options.length > 0))
}

/** Resposta pronta para gravar em `answers` (objeto JSON na API) */
export function toAnswerPayload(f: FormFieldDef, raw: string): unknown {
  if (f.type === 'section' || f.type === 'subtitle') return undefined
  if (f.type !== 'select') return raw
  if (f.multiple && f.allowOther && hasSelectableList(f)) {
    return parseMultiWithOther(raw)
  }
  if (f.multiple) return parseMultiIds(raw)
  if (f.allowOther && hasSelectableList(f)) {
    return parseSelectWithOther(raw)
  }
  return raw
}

export function isFieldAnswerEmpty(f: FormFieldDef, raw: string): boolean {
  if (f.type === 'section' || f.type === 'subtitle') return true
  if (f.type === 'file') return !(raw || '').trim()
  if (f.type === 'checkbox') return raw !== 'true'
  if (f.type === 'select' && f.multiple && f.allowOther && hasSelectableList(f)) {
    const p = parseMultiWithOther(raw)
    const hasIds = p.ids.length > 0
    const hasOtherText = (p.other ?? '').trim().length > 0
    return !hasIds && !hasOtherText
  }
  if (f.type === 'select' && f.multiple) return parseMultiIds(raw).length === 0
  if (f.type === 'select' && f.allowOther && hasSelectableList(f)) {
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
    const p = parseMultiWithOther(raw)
    return p.ids[0] ?? ''
  }
  if (
    parentField.type === 'select' &&
    parentField.allowOther &&
    (parentField.nexusOptions || parentField.portalListId || parentField.options?.length)
  ) {
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
  /** Regras condicionais (mostrar/ocultar e required dinâmico). */
  rules?: ConditionRule[]
  /** Se true, limpa valores quando um campo vira oculto por regra. Default: true. */
  clearOnHide?: boolean
  /** Se true, aplica injeções via desenvolvimento para este tipo. */
  enableInjectedBlocks?: boolean
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

export type ConditionOp = 'eq' | 'neq' | 'containsText' | 'in'

export type Condition = {
  whenKey: string
  op: ConditionOp
  value: string
}

export type RuleAction = {
  targetKey: string
  setVisible?: boolean
  setRequired?: boolean
}

export type ConditionRule = {
  id: string
  when: Condition
  actions: RuleAction[]
}

export function parseFormRules(raw: unknown): ConditionRule[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as FormSchemaDoc
  const rules = Array.isArray(o.rules) ? o.rules : []
  const out: ConditionRule[] = []
  for (const r of rules) {
    if (!r || typeof r !== 'object') continue
    const rr = r as ConditionRule
    if (typeof rr.id !== 'string' || !rr.id) continue
    const w = rr.when as Condition
    if (!w || typeof w !== 'object') continue
    if (typeof w.whenKey !== 'string' || !w.whenKey) continue
    const op = w.op
    if (op !== 'eq' && op !== 'neq' && op !== 'containsText' && op !== 'in') continue
    if (!Array.isArray(rr.actions) || rr.actions.length === 0) continue
    const actions: RuleAction[] = rr.actions
      .filter((a) => a && typeof a === 'object')
      .map((a) => a as RuleAction)
      .filter((a) => typeof a.targetKey === 'string' && !!a.targetKey)
      .map((a) => ({
        targetKey: a.targetKey,
        setVisible: a.setVisible === undefined ? undefined : !!a.setVisible,
        setRequired: a.setRequired === undefined ? undefined : !!a.setRequired,
      }))
      .filter((a) => a.setVisible !== undefined || a.setRequired !== undefined)
    if (actions.length === 0) continue
    out.push({
      id: rr.id,
      when: { whenKey: w.whenKey, op, value: String(w.value ?? '') },
      actions,
    })
  }
  return out
}

export function parseFormSettings(raw: unknown): { clearOnHide: boolean; enableInjectedBlocks: boolean } {
  if (!raw || typeof raw !== 'object') return { clearOnHide: true, enableInjectedBlocks: false }
  const o = raw as FormSchemaDoc
  return {
    clearOnHide: o.clearOnHide !== false,
    enableInjectedBlocks: o.enableInjectedBlocks === true,
  }
}

function evalCondition(cond: Condition, values: Record<string, string>, fields: FormFieldDef[]): boolean {
  const f = fields.find((x) => x.key === cond.whenKey)
  const raw = values[cond.whenKey] ?? ''
  const val = (cond.value ?? '').trim()
  if (cond.op === 'containsText') {
    return raw.toLowerCase().includes(val.toLowerCase())
  }
  if (cond.op === 'in') {
    // Para multi-select/arrays: tenta parse do modelo atual (ids / multi+other / array simples)
    const ids = parseMultiWithOther(raw).ids
    return ids.includes(val)
  }
  // eq/neq: checkbox e text
  const left = f?.type === 'checkbox' ? (raw === 'true' ? 'true' : 'false') : raw.trim()
  const ok = left === val
  return cond.op === 'eq' ? ok : !ok
}

export function applyConditionalRules(
  fields: FormFieldDef[],
  rules: ConditionRule[],
  values: Record<string, string>
): { visibleByKey: Record<string, boolean>; requiredByKey: Record<string, boolean> } {
  const visibleByKey: Record<string, boolean> = {}
  const requiredByKey: Record<string, boolean> = {}
  for (const f of fields) {
    visibleByKey[f.key] = true
    requiredByKey[f.key] = !!f.required
  }
  for (const r of rules) {
    const ok = evalCondition(r.when, values, fields)
    if (!ok) continue
    for (const a of r.actions) {
      if (a.setVisible !== undefined) visibleByKey[a.targetKey] = a.setVisible
      if (a.setRequired !== undefined) requiredByKey[a.targetKey] = a.setRequired
    }
  }
  return { visibleByKey, requiredByKey }
}

const FORM_TYPES: FormFieldType[] = [
  'text',
  'textarea',
  'number',
  'select',
  'date',
  'checkbox',
  'file',
  'section',
  'subtitle',
]

export function parseFormSchema(raw: unknown): FormFieldDef[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as FormSchemaDoc
  if (!Array.isArray(o.fields)) return []
  return o.fields
    .filter(
      (f) =>
        f &&
        typeof f.key === 'string' &&
        typeof f.label === 'string' &&
        FORM_TYPES.includes(f.type as FormFieldType)
    )
    .map((f) => {
      const ff = f as FormFieldDef
      if (ff.repeatGroupKey && typeof ff.repeatGroupKey === 'string') {
        const g = ff.repeatGroupKey.trim()
        const max = typeof ff.repeatGroupMax === 'number' ? Math.trunc(ff.repeatGroupMax) : 25
        const src = ff.repeatGroupSource
        const minRows =
          src && typeof src === 'object' && typeof src.minRows === 'number' ? Math.trunc(src.minRows) : 1
        const countFromKey =
          src && typeof src === 'object' && typeof src.countFromKey === 'string'
            ? src.countFromKey.trim() || undefined
            : undefined
        return {
          ...ff,
          repeatGroupKey: g || undefined,
          repeatGroupMax: g ? Math.min(25, Math.max(1, max)) : undefined,
          repeatGroupSource: g
            ? {
                countFromKey,
                minRows: Math.min(25, Math.max(1, minRows || 1)),
              }
            : undefined,
          repeatable: undefined,
          repeatMax: undefined,
        }
      }
      if (ff.repeatable) {
        const max = typeof ff.repeatMax === 'number' ? Math.trunc(ff.repeatMax) : 25
        return { ...ff, repeatMax: Math.min(25, Math.max(1, max)) }
      }
      return ff
    })
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
