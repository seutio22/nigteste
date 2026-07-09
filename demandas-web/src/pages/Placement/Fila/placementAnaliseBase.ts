export type AnaliseBaseSectionKey = 'grupo_elegivel' | 'contrato_atual' | 'localidade'

export type AnaliseBaseViewMode = 'unified' | 'split'

/** `slide` = 16:9 exportável; `page` = blocos empilhados; `workspace` = painel amplo sem limite de slide. */
export type PlacementPresentationMode = 'slide' | 'page' | 'workspace'

export type AnaliseBaseSectionMeta = {
  key: AnaliseBaseSectionKey
  label: string
  description: string
}

export const ANALISE_BASE_SECTIONS: AnaliseBaseSectionMeta[] = [
  {
    key: 'grupo_elegivel',
    label: 'Grupo elegível',
    description: 'Totais, sexo, faixas etárias, planos e categorias',
  },
  {
    key: 'contrato_atual',
    label: 'Contrato atual',
    description: 'Cenário vigente por operadora e plano',
  },
  {
    key: 'localidade',
    label: 'Distribuição por localidade',
    description: 'Ranking de municípios e mapa por UF',
  },
]

/** Mapeia subetapas legadas (etapa2/3/4) para a seção correspondente. */
export function analiseSectionFromLegacySubetapa(value: string | null | undefined): AnaliseBaseSectionKey {
  const v = String(value ?? '').trim().toLowerCase()
  if (v === 'etapa3') return 'contrato_atual'
  if (v === 'etapa4' || v === 'localidade') return 'localidade'
  return 'grupo_elegivel'
}

export function isLegacyAnaliseSubetapa(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim().toLowerCase()
  return v === 'etapa2' || v === 'etapa3' || v === 'etapa4' || v === 'localidade'
}
