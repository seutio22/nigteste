export type EmCotacaoSubetapaKey = 'beneficiarios' | 'analise_base' | 'comunicar_mercado'

/** Subetapas legadas — normalizadas para `analise_base` na UI. */
export type LegacyAnaliseSubetapaKey = 'etapa2' | 'etapa3' | 'etapa4'

export type EmCotacaoSubetapaKeyWithLegacy = EmCotacaoSubetapaKey | LegacyAnaliseSubetapaKey

export type EmCotacaoSubetapaMeta = {
  key: EmCotacaoSubetapaKey
  label: string
  description: string
  objective: string
}

/** Subetapas antecipadas na etapa Validação (sem comunicar mercado). */
export const VALIDACAO_SUBETAPAS: EmCotacaoSubetapaMeta[] = [
  {
    key: 'beneficiarios',
    label: 'Base de beneficiários',
    description: 'Planilha para cotação',
    objective:
      'Importe a base de vidas e valide CNPJ (subfaturas/estipulante), operadora, plano atual e custo per capita em relação ao formulário da abertura.',
  },
  {
    key: 'analise_base',
    label: 'Análise da base',
    description: 'Grupo elegível, contrato e localidades',
    objective:
      'Visualize em uma única página o grupo elegível, o contrato atual e a distribuição por localidade com base na planilha importada.',
  },
]

export const EM_COTACAO_SUBETAPAS: EmCotacaoSubetapaMeta[] = [
  {
    key: 'beneficiarios',
    label: 'Base de beneficiários',
    description: 'Planilha para cotação',
    objective:
      'Importe a base de vidas e valide CNPJ (subfaturas/estipulante), operadora, plano atual e custo per capita em relação ao formulário da abertura.',
  },
  {
    key: 'analise_base',
    label: 'Análise da base',
    description: 'Grupo elegível, contrato e localidades',
    objective:
      'Visualize em uma única página o grupo elegível, o contrato atual e a distribuição por localidade com base na planilha importada.',
  },
  {
    key: 'comunicar_mercado',
    label: 'Comunicar mercado',
    description: 'E-mail aos fornecedores',
    objective:
      'Monte o e-mail de cotação para cada operadora do mercado analisado (Kick off), com dados da abertura, beneficiários e premissas. Copie para o Outlook e dispare ao mercado.',
  },
]

const LEGACY_ANALISE_SUBETAPAS = new Set(['etapa2', 'etapa3', 'etapa4', 'localidade'])

export function isLegacyAnaliseSubetapaKey(value: string | null | undefined): boolean {
  return LEGACY_ANALISE_SUBETAPAS.has(String(value ?? '').trim().toLowerCase())
}

export function normalizeEmCotacaoSubetapa(value: string | null | undefined): EmCotacaoSubetapaKey {
  const v = String(value ?? '').trim().toLowerCase()
  if (LEGACY_ANALISE_SUBETAPAS.has(v)) return 'analise_base'
  const hit = EM_COTACAO_SUBETAPAS.find((s) => s.key === v)
  return hit?.key ?? 'beneficiarios'
}

export function emCotacaoSubetapaIndex(key: EmCotacaoSubetapaKey): number {
  return EM_COTACAO_SUBETAPAS.findIndex((s) => s.key === key)
}

export function nextEmCotacaoSubetapa(current: EmCotacaoSubetapaKey): EmCotacaoSubetapaKey | null {
  return nextSubetapaInList(current, EM_COTACAO_SUBETAPAS)
}

export function nextValidacaoSubetapa(current: EmCotacaoSubetapaKey): EmCotacaoSubetapaKey | null {
  return nextSubetapaInList(current, VALIDACAO_SUBETAPAS)
}

function nextSubetapaInList(
  current: EmCotacaoSubetapaKey,
  list: EmCotacaoSubetapaMeta[],
): EmCotacaoSubetapaKey | null {
  const idx = list.findIndex((s) => s.key === current)
  if (idx < 0 || idx >= list.length - 1) return null
  return list[idx + 1].key
}

export function subetapaIndexInList(key: EmCotacaoSubetapaKey, list: EmCotacaoSubetapaMeta[]): number {
  return list.findIndex((s) => s.key === key)
}

/** Limita subetapa ao escopo da Validação (máx. análise da base). */
export function clampSubetapaForValidacao(value: string | null | undefined): EmCotacaoSubetapaKey {
  const normalized = normalizeEmCotacaoSubetapa(value)
  if (normalized === 'comunicar_mercado') return 'analise_base'
  const idx = subetapaIndexInList(normalized, VALIDACAO_SUBETAPAS)
  if (idx >= 0) return normalized
  return 'beneficiarios'
}

/** Valor persistido na API ao entrar na etapa unificada de análise. */
export function persistSubetapaForAnaliseBase(): EmCotacaoSubetapaKey {
  return 'analise_base'
}
