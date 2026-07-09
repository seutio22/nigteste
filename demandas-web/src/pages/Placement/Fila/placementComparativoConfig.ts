/** Tipos de config do comparativo — arquivo sem dependências para evitar ciclo de import. */

export type ComparativoVisualizacao = 'slide' | 'pagina_completa'

export type ComparativoLinhaChave =
  | 'contribuicao'
  | 'coparticipacao'
  | 'faixas_etarias'
  | 'variacao_financeira'

export const COMPARATIVO_LINHA_LABELS: Record<ComparativoLinhaChave, string> = {
  contribuicao: 'Contribuição',
  coparticipacao: 'Coparticipação',
  faixas_etarias: 'Faixas etárias',
  variacao_financeira: 'Variação / impacto financeiro',
}

export const COMPARATIVO_LINHA_CHAVES = Object.keys(COMPARATIVO_LINHA_LABELS) as ComparativoLinhaChave[]
