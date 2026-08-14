import { PROPOSTA_DECK_ORDER } from './placementPropostaDeck'
import type { PlacementSlideId } from './placementSlidesCatalog'

export type PropostaViewerPane =
  | 'grupo_elegivel'
  | 'localidades'
  | 'mercado'
  | 'contrato_atual'
  | 'comparativo'
  | 'coparticipacao'
  | 'reembolso'
  | 'diferenciais'
  | 'condicoes'
  | 'indicadores'

/** Abas disponíveis no viewer da proposta (ordem comercial). */
export const PROPOSTA_APRESENTACAO_PANES: { id: PropostaViewerPane; label: string }[] = [
  { id: 'grupo_elegivel', label: 'Grupo elegível' },
  { id: 'localidades', label: 'Localidades' },
  { id: 'mercado', label: 'Mercado consultado' },
  { id: 'contrato_atual', label: 'Contrato atual' },
  { id: 'comparativo', label: 'Comparativo financeiro' },
  { id: 'coparticipacao', label: 'Coparticipação' },
  { id: 'reembolso', label: 'Reembolso' },
  { id: 'diferenciais', label: 'Diferenciais' },
  { id: 'condicoes', label: 'Condições contratuais' },
  { id: 'indicadores', label: 'Indicadores' },
]

const PANE_IDS = new Set(PROPOSTA_APRESENTACAO_PANES.map((p) => p.id))

export function parseApresentacaoPanesOcultas(raw: unknown): PropostaViewerPane[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is PropostaViewerPane => typeof id === 'string' && PANE_IDS.has(id as PropostaViewerPane))
}

export function filterPanesVisiveis(
  panesOcultas: PropostaViewerPane[] | undefined
): typeof PROPOSTA_APRESENTACAO_PANES {
  const ocultas = new Set(panesOcultas ?? [])
  const visiveis = PROPOSTA_APRESENTACAO_PANES.filter((p) => !ocultas.has(p.id))
  return visiveis.length ? visiveis : [...PROPOSTA_APRESENTACAO_PANES]
}

/** Mapeia abas do viewer → IDs do deck usado no share público. */
const PANE_TO_DECK: Partial<Record<PropostaViewerPane, PlacementSlideId>> = {
  grupo_elegivel: 'grupo_elegivel',
  localidades: 'localidades',
  mercado: 'mercado_quadro',
  contrato_atual: 'contrato_atual',
  comparativo: 'comparativo_propostas',
  diferenciais: 'comparativo_diferenciais',
  condicoes: 'comparativo_diferenciais',
  indicadores: 'comparativo_diferenciais',
}

/** CSV de allowedViews a partir das abas visíveis da apresentação. */
export function apresentacaoAllowedViewsCsv(panesOcultas: PropostaViewerPane[] | undefined): string {
  const ocultas = new Set(panesOcultas ?? [])
  const deck = new Set<PlacementSlideId>()
  for (const p of PROPOSTA_APRESENTACAO_PANES) {
    if (ocultas.has(p.id)) continue
    const slide = PANE_TO_DECK[p.id]
    if (slide) deck.add(slide)
  }
  const ordered = PROPOSTA_DECK_ORDER.filter((id) => deck.has(id))
  return (ordered.length ? ordered : PROPOSTA_DECK_ORDER).join(',')
}
