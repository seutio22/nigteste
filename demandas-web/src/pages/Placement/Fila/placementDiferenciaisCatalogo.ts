export type DiferencialItemKey =
  | 'telemedicina'
  | 'telepsicologia'
  | 'assistencia_viagem'
  | 'coleta_domiciliar'
  | 'vacinas_calendario'
  | 'retaguarda'
  | 'check_up'
  | 'resgate_domiciliar'
  | 'resgate_saude'
  | 'sala_vip'
  | 'servicos_especiais_concierge'
  | 'medicos_exclusivos'
  | 'cobertura_ocupacional'
  | 'programa_acoes_saude'

export type DiferencialItemDef = {
  key: DiferencialItemKey
  label: string
  pagina: number
}

export type DiferencialItemExtra = {
  key: string
  label: string
}

export const DIFERENCIAL_ITENS: DiferencialItemDef[] = [
  { key: 'telemedicina', label: 'TELEMEDICINA', pagina: 1 },
  { key: 'telepsicologia', label: 'TELEPSICOLOGIA', pagina: 1 },
  {
    key: 'assistencia_viagem',
    label: 'ASSISTÊNCIA VIAGEM NACIONAL E INTERNACIONAL',
    pagina: 1,
  },
  { key: 'coleta_domiciliar', label: 'COLETA DOMICILIAR', pagina: 1 },
  { key: 'vacinas_calendario', label: 'VACINAS CALENDÁRIO', pagina: 1 },
  { key: 'retaguarda', label: 'RETAGUARDA', pagina: 2 },
  { key: 'check_up', label: 'CHECK UP', pagina: 2 },
  { key: 'resgate_domiciliar', label: 'RESGATE DOMICILIAR', pagina: 2 },
  { key: 'resgate_saude', label: 'RESGATE SAÚDE', pagina: 2 },
  { key: 'sala_vip', label: 'SALA VIP', pagina: 3 },
  { key: 'servicos_especiais_concierge', label: 'SERVIÇOS ESPECIAIS (CONCIERGE)', pagina: 3 },
  { key: 'medicos_exclusivos', label: 'MÉDICOS EXCLUSIVOS', pagina: 3 },
  { key: 'cobertura_ocupacional', label: 'COBERTURA OCUPACIONAL', pagina: 3 },
  { key: 'programa_acoes_saude', label: 'PROGRAMA E AÇÕES DE SAÚDE', pagina: 3 },
]

export const DIFERENCIAL_ITEM_KEYS = DIFERENCIAL_ITENS.map((i) => i.key)

const CATALOG_KEY_SET = new Set<string>(DIFERENCIAL_ITEM_KEYS)

export function isCatalogDiferencialKey(key: string): boolean {
  return CATALOG_KEY_SET.has(key)
}

export function slugifyDiferencialLabel(label: string): string {
  return String(label ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

export function labelFromDiferencialKey(key: string): string {
  if (isCatalogDiferencialKey(key)) {
    return DIFERENCIAL_ITENS.find((i) => i.key === key)?.label ?? key
  }
  const raw = key.startsWith('custom_') ? key.slice('custom_'.length) : key
  return raw.replace(/_/g, ' ').trim().toUpperCase() || key
}

export function labelDiferencialItem(key: string, extras?: DiferencialItemExtra[]): string {
  const catalog = DIFERENCIAL_ITENS.find((i) => i.key === key)
  if (catalog) return catalog.label
  const extra = extras?.find((i) => i.key === key)
  if (extra?.label) return extra.label
  return labelFromDiferencialKey(key)
}

export function listDiferencialItens(extras?: DiferencialItemExtra[]): {
  key: string
  label: string
  custom: boolean
}[] {
  const catalog = DIFERENCIAL_ITENS.map((i) => ({
    key: i.key,
    label: i.label,
    custom: false,
  }))
  const seen = new Set(catalog.map((i) => i.key))
  const extraItems: { key: string; label: string; custom: boolean }[] = []
  for (const extra of extras ?? []) {
    const key = String(extra.key ?? '').trim()
    const label = String(extra.label ?? '').trim()
    if (!key || !label || seen.has(key) || isCatalogDiferencialKey(key)) continue
    seen.add(key)
    extraItems.push({ key, label, custom: true })
  }
  return [...catalog, ...extraItems]
}

export function itensDiferencialPagina(pagina: number): DiferencialItemDef[] {
  return DIFERENCIAL_ITENS.filter((i) => i.pagina === pagina)
}

/** Resolve item da planilha (rótulo, chave ou variação) para itemKey canônico. */
export function resolveDiferencialItemKey(raw: string): string {
  const t = String(raw ?? '').trim()
  if (!t) return ''

  const slug = slugifyDiferencialLabel(t)

  const byKey = DIFERENCIAL_ITENS.find((i) => i.key === slug)
  if (byKey) return byKey.key

  const norm = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  const byLabel = DIFERENCIAL_ITENS.find((i) => {
    const label = i.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
    return label === norm || label.includes(norm) || norm.includes(label)
  })
  if (byLabel) return byLabel.key

  if (slug.startsWith('custom_')) return slug
  return ''
}
