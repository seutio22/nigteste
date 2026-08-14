export type IndicadorOperadoraItemKey =
  | 'idss'
  | 'endiv'
  | 'lg'
  | 'impacto_endiv_lg'
  | 'porte_operadora'
  | 'tempo_registro_ans'
  | 'segmento'
  | 'vidas_administradas'

export type IndicadorOperadoraLayout = 'detalhado' | 'resumo'

export type IndicadorOperadoraItemDef = {
  key: IndicadorOperadoraItemKey
  /** Rótulo curto na matriz de lançamento / legenda. */
  label: string
  layout: IndicadorOperadoraLayout
  /** Sigla (IDSS, ENDIV, LG) — só layout detalhado. */
  indice?: string
  nomenclatura?: string
  descricao?: string
}

/** Itens da matriz «Comparativo de Indicadores das Operadoras». */
export const INDICADOR_OPERADORA_ITENS: IndicadorOperadoraItemDef[] = [
  {
    key: 'idss',
    label: 'IDSS¹',
    layout: 'detalhado',
    indice: 'IDSS¹',
    nomenclatura: 'Índice de Desempenho da Saúde Suplementar',
    descricao:
      'O cálculo do IDSS de cada operadora é realizado pela média ponderada das notas de: (1) Qualidade na Atenção à Saúde (IDQS) / (2) Garantia de Acesso (IDGA) / (3) Sustentabilidade no Mercado (IDSM) / (4) Gestão e Regulação (IDGR). O resultado deve ser igual a 1,0000, sendo: (A) Até 0,19 = ruim / (B) De 0,20 a 0,39 = razoável / (C) De 0,40 a 0,59 = bom / (D) De 0,60 a 0,79 = muito bom / (E) De 0,80 a 1,00 = excelente',
  },
  {
    key: 'endiv',
    label: 'ENDIV²',
    layout: 'detalhado',
    indice: 'ENDIV²',
    nomenclatura: 'Índice de Endividamento',
    descricao:
      'Relação entre o Exigível Total e o Ativo Total. Calculado pela fórmula: ENDIV = (Passivo Circulante + Exigível a Longo Prazo) / Ativo Total',
  },
  {
    key: 'lg',
    label: 'LG²',
    layout: 'detalhado',
    indice: 'LG²',
    nomenclatura: 'Índice de Liquidez Geral',
    descricao:
      'Capacidade de pagamento no longo prazo. Calculado pela fórmula: LG = (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Exigível a Longo Prazo)',
  },
  {
    key: 'impacto_endiv_lg',
    label: 'IMPACTO DO ÍNDICE DE ENDIVIDAMENTO SOBRE O ÍNDICE DE LIQUIDEZ GERAL (%)',
    layout: 'resumo',
  },
  {
    key: 'porte_operadora',
    label: 'PORTE DA OPERADORA¹',
    layout: 'resumo',
  },
  {
    key: 'tempo_registro_ans',
    label: 'TEMPO DE REGISTRO NA ANS (EM ANOS)¹',
    layout: 'resumo',
  },
  {
    key: 'segmento',
    label: 'SEGMENTO¹',
    layout: 'resumo',
  },
  {
    key: 'vidas_administradas',
    label: 'QUANTIDADE DE VIDAS ADMINISTRADAS¹',
    layout: 'resumo',
  },
]

export const INDICADOR_OPERADORA_ITEM_KEYS = INDICADOR_OPERADORA_ITENS.map((i) => i.key)

export const INDICADORES_NOTAS_RODAPE_DEFAULT =
  'Fonte: ANS — Ano-base 2023 (divulgação 2024) e demonstrações financeiras publicadas pelas operadoras. IDSS¹: escala de 0 a 1. Demais indicadores financeiros² conforme balanços das operadoras.'

export function labelIndicadorOperadoraItem(key: string): string {
  return INDICADOR_OPERADORA_ITENS.find((i) => i.key === key)?.label ?? key
}

export function getIndicadorOperadoraItem(key: string): IndicadorOperadoraItemDef | undefined {
  return INDICADOR_OPERADORA_ITENS.find((i) => i.key === key)
}

export function resolveIndicadorOperadoraItemKey(raw: string): IndicadorOperadoraItemKey | '' {
  const t = String(raw ?? '').trim()
  if (!t) return ''

  const slug = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_')

  const byKey = INDICADOR_OPERADORA_ITENS.find((i) => i.key === slug)
  if (byKey) return byKey.key

  const norm = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  const byLabel = INDICADOR_OPERADORA_ITENS.find((i) => {
    const candidates = [i.label, i.indice, i.nomenclatura].filter(Boolean) as string[]
    return candidates.some((c) => {
      const label = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
      return label === norm || label.includes(norm) || norm.includes(label)
    })
  })
  return byLabel?.key ?? ''
}
