export type CondicaoContratualItemKey =
  | 'vigencia_contratual'
  | 'tipo_contratacao'
  | 'modalidade_contrato'
  | 'regra_contribuicao'
  | 'aviso_previo'
  | 'clausula_cancelamento'
  | 'meritocracia_parto'
  | 'prazo_inclusao'
  | 'remissao'
  | 'taxa_inscricao'
  | 'iof'
  | 'break_even'
  | 'reajuste_financeiro'
  | 'reajuste_tecnico'
  | 'validade_proposta'

export type CondicaoContratualItemDef = {
  key: CondicaoContratualItemKey
  label: string
}

/** Itens da matriz «Condições contratuais» (referência do comparativo). */
export const CONDICAO_CONTRATUAL_ITENS: CondicaoContratualItemDef[] = [
  { key: 'vigencia_contratual', label: 'VIGÊNCIA CONTRATUAL' },
  { key: 'tipo_contratacao', label: 'TIPO DE CONTRATAÇÃO' },
  { key: 'modalidade_contrato', label: 'MODALIDADE DO CONTRATO' },
  { key: 'regra_contribuicao', label: 'REGRA DE CONTRIBUIÇÃO' },
  { key: 'aviso_previo', label: 'AVISO PRÉVIO' },
  { key: 'clausula_cancelamento', label: 'CLÁUSULA DE CANCELAMENTO' },
  { key: 'meritocracia_parto', label: 'MERITOCRACIA PARA PARTO' },
  {
    key: 'prazo_inclusao',
    label: 'PRAZO PARA INCLUSÃO (IMPLANTAÇÃO E NOVAS ADESÕES)',
  },
  { key: 'remissao', label: 'REMISSÃO' },
  { key: 'taxa_inscricao', label: 'TAXA INSCRIÇÃO (PER CAPITA)' },
  { key: 'iof', label: 'IOF (2,38%)' },
  { key: 'break_even', label: 'BREAK EVEN' },
  {
    key: 'reajuste_financeiro',
    label: 'PERIODICIDADE E ÍNDICE REAJUSTE FINANCEIRO',
  },
  {
    key: 'reajuste_tecnico',
    label: 'PERIODICIDADE E AVALIAÇÃO REAJUSTE TÉCNICO',
  },
  { key: 'validade_proposta', label: 'VALIDADE DA PROPOSTA' },
]

export const CONDICAO_CONTRATUAL_ITEM_KEYS = CONDICAO_CONTRATUAL_ITENS.map((i) => i.key)

export function labelCondicaoContratualItem(key: string): string {
  return CONDICAO_CONTRATUAL_ITENS.find((i) => i.key === key)?.label ?? key
}

/** Resolve item da planilha (rótulo, chave ou variação) para itemKey canônico. */
export function resolveCondicaoContratualItemKey(raw: string): CondicaoContratualItemKey | '' {
  const t = String(raw ?? '').trim()
  if (!t) return ''

  const slug = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_')

  const byKey = CONDICAO_CONTRATUAL_ITENS.find((i) => i.key === slug)
  if (byKey) return byKey.key

  const norm = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  const byLabel = CONDICAO_CONTRATUAL_ITENS.find((i) => {
    const label = i.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
    return label === norm || label.includes(norm) || norm.includes(label)
  })
  return byLabel?.key ?? ''
}
