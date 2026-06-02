export type EmCotacaoSubetapaKey =
  | 'beneficiarios'
  | 'etapa2'
  | 'etapa3'
  | 'etapa4'
  | 'comunicar_mercado'

export type EmCotacaoSubetapaMeta = {
  key: EmCotacaoSubetapaKey
  label: string
  description: string
  objective: string
}

export const EM_COTACAO_SUBETAPAS: EmCotacaoSubetapaMeta[] = [
  {
    key: 'beneficiarios',
    label: 'Base de beneficiários',
    description: 'Planilha para cotação',
    objective:
      'Importe a base de vidas e valide CNPJ (subfaturas/estipulante), operadora, plano atual e custo per capita em relação ao formulário da abertura.',
  },
  {
    key: 'etapa2',
    label: 'Grupo elegível',
    description: 'Slide para o cliente',
    objective:
      'Gera o slide Grupo Elegível (totais, sexo, faixas etárias, planos e categorias) com base na planilha importada.',
  },
  {
    key: 'etapa3',
    label: 'Contrato atual',
    description: 'Cenário vigente',
    objective:
      'Gera o slide Contrato Atual com operadora, planos, elegibilidade, contribuição, coparticipação, vidas e fatura estimada (dados da cotação + beneficiários).',
  },
  {
    key: 'etapa4',
    label: 'Distribuição por localidade',
    description: 'Mapa e ranking',
    objective:
      'Gera o slide de distribuição geográfica (municípios e mapa do Brasil por UF) com base na cidade e UF da planilha importada.',
  },
  {
    key: 'comunicar_mercado',
    label: 'Comunicar mercado',
    description: 'E-mail aos fornecedores',
    objective:
      'Monte o e-mail de cotação para cada operadora do mercado analisado (Kick off), com dados da abertura, beneficiários e premissas. Copie para o Outlook e dispare ao mercado.',
  },
]

export function normalizeEmCotacaoSubetapa(value: string | null | undefined): EmCotacaoSubetapaKey {
  const v = String(value ?? '').trim().toLowerCase()
  if (v === 'localidade') return 'etapa4'
  const hit = EM_COTACAO_SUBETAPAS.find((s) => s.key === v)
  return hit?.key ?? 'beneficiarios'
}

export function emCotacaoSubetapaIndex(key: EmCotacaoSubetapaKey): number {
  return EM_COTACAO_SUBETAPAS.findIndex((s) => s.key === key)
}

export function nextEmCotacaoSubetapa(current: EmCotacaoSubetapaKey): EmCotacaoSubetapaKey | null {
  const idx = emCotacaoSubetapaIndex(current)
  if (idx < 0 || idx >= EM_COTACAO_SUBETAPAS.length - 1) return null
  return EM_COTACAO_SUBETAPAS[idx + 1].key
}
