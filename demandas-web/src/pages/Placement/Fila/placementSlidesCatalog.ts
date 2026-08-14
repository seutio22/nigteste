import type { PlacementPresentationMode } from './placementAnaliseBase'

export type PlacementSlideId =
  | 'grupo_elegivel'
  | 'contrato_atual'
  | 'localidades'
  | 'mercado_quadro'
  | 'comparativo_propostas'
  | 'comparativo_diferenciais'

export type PlacementSlideViewMode = 'compacto' | 'detalhado'

export type PlacementSlideMeta = {
  id: PlacementSlideId
  label: string
  description: string
}

export const PLACEMENT_SLIDES_CATALOG: PlacementSlideMeta[] = [
  {
    id: 'grupo_elegivel',
    label: 'Grupo elegível',
    description: 'Slide com totais, sexo, faixas etárias e planos (base de beneficiários).',
  },
  {
    id: 'contrato_atual',
    label: 'Contrato atual',
    description: 'Comparativo do contrato vigente por operadora e plano.',
  },
  {
    id: 'localidades',
    label: 'Distribuição por localidade',
    description: 'Mapa e ranking de municípios/UF da base importada.',
  },
  {
    id: 'mercado_quadro',
    label: 'Mercado consultado',
    description: 'Quadro em 4 blocos: atual, consultado, declinado e não apresentada.',
  },
  {
    id: 'comparativo_propostas',
    label: 'Comparativo de propostas',
    description:
      'Tabelas comparativas ATUAL × mercado: consolidado financeiro, detalhe por plano ou faixa etária (multi-slide).',
  },
  {
    id: 'comparativo_diferenciais',
    label: 'Comparativo (diferenciais, condições e indicadores)',
    description:
      'Infográfico com diferenciais, condições contratuais e indicadores das operadoras por fornecedor.',
  },
]

/** Mapeia densidade do hub de slides para o modo de apresentação de cada dashboard. */
export function presentationModeForSlide(
  slideId: PlacementSlideId,
  view: PlacementSlideViewMode
): PlacementPresentationMode {
  if (view === 'compacto') return 'slide'
  if (slideId === 'contrato_atual') return 'workspace'
  return 'page'
}

export function defaultPlacementSlideId(workflowStageKey: string): PlacementSlideId {
  if (workflowStageKey === 'consolidando_dados') return 'comparativo_diferenciais'
  if (workflowStageKey === 'aguardando_operadora') return 'comparativo_propostas'
  if (workflowStageKey === 'em_cotacao') return 'contrato_atual'
  return 'contrato_atual'
}
