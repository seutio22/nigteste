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

export type DiferencialItemDef = {
  key: DiferencialItemKey
  label: string
  pagina: 1 | 2
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
]

export const DIFERENCIAL_ITEM_KEYS = DIFERENCIAL_ITENS.map((i) => i.key)

export function labelDiferencialItem(key: string): string {
  return DIFERENCIAL_ITENS.find((i) => i.key === key)?.label ?? key
}

export function itensDiferencialPagina(pagina: 1 | 2): DiferencialItemDef[] {
  return DIFERENCIAL_ITENS.filter((i) => i.pagina === pagina)
}

/** Resolve item da planilha (rótulo, chave ou variação) para itemKey canônico. */
export function resolveDiferencialItemKey(raw: string): DiferencialItemKey | '' {
  const t = String(raw ?? '').trim()
  if (!t) return ''

  const slug = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_')

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
  return byLabel?.key ?? ''
}
