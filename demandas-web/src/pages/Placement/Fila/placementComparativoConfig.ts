/** Tipos de config do comparativo — arquivo sem dependências para evitar ciclo de import. */

export type ComparativoVisualizacao = 'slide' | 'pagina_completa'

export type ComparativoLinhaChave =
  | 'contribuicao'
  | 'coparticipacao'
  | 'faixas_etarias'
  | 'variacao_financeira'

export const COMPARATIVO_LINHA_LABELS: Record<ComparativoLinhaChave, string> = {
  contribuicao: 'Faixa resumo MDS · Corretor',
  coparticipacao: 'Coparticipação (faixa / quadro)',
  faixas_etarias: 'Faixas etárias',
  variacao_financeira: 'Variação / impacto financeiro',
}

/** Texto de ajuda na UI de preferências da apresentação. */
export const COMPARATIVO_LINHA_HINTS: Record<ComparativoLinhaChave, string> = {
  contribuicao: 'Controla o chip «MDS X% · Corretor Y%» no topo do contrato/comparativo.',
  coparticipacao: 'Controla «Sem coparticipação» / detalhe na faixa do topo ou na linha do quadro.',
  faixas_etarias: 'Mostra ou oculta a grade de custos por faixa etária.',
  variacao_financeira: 'Mostra ou oculta as linhas de variação e impacto financeiro.',
}

export const COMPARATIVO_LINHA_CHAVES = Object.keys(COMPARATIVO_LINHA_LABELS) as ComparativoLinhaChave[]
