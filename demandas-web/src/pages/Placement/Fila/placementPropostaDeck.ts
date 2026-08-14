import {
  PLACEMENT_SLIDES_CATALOG,
  type PlacementSlideId,
  type PlacementSlideMeta,
} from './placementSlidesCatalog'

/**
 * Deck da proposta ao cliente (Proposta enviada + link público).
 * Ordem comercial: perfil → geografia → mercado → contrato+propostas → diferenciais.
 */
export const PROPOSTA_DECK_ORDER: PlacementSlideId[] = [
  'grupo_elegivel',
  'localidades',
  'mercado_quadro',
  'contrato_atual',
  'comparativo_propostas',
  'comparativo_diferenciais',
]

/** CSV padrão do share público (todas as seções do deck). */
export const PROPOSTA_DECK_ALLOWED_VIEWS_DEFAULT = PROPOSTA_DECK_ORDER.join(',')

export function propostaDeckCatalog(
  allowed?: PlacementSlideId[] | null
): PlacementSlideMeta[] {
  const allow = allowed?.length ? new Set(allowed) : null
  return PROPOSTA_DECK_ORDER.map((id) => {
    const meta = PLACEMENT_SLIDES_CATALOG.find((s) => s.id === id)
    return (
      meta ?? {
        id,
        label: id,
        description: '',
      }
    )
  }).filter((s) => !allow || allow.has(s.id))
}

export function parsePropostaAllowedSlides(csv: string | null | undefined): PlacementSlideId[] {
  const raw = String(csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const valid = new Set(PROPOSTA_DECK_ORDER)
  const parsed = raw.filter((id): id is PlacementSlideId => valid.has(id as PlacementSlideId))
  return parsed.length ? parsed : [...PROPOSTA_DECK_ORDER]
}

/** Labels amigáveis na UI da proposta (agrupa contrato + comparativo). */
export function propostaDeckNavLabel(id: PlacementSlideId): string {
  if (id === 'contrato_atual') return 'Contrato atual'
  if (id === 'comparativo_propostas') return 'Comparativo de propostas'
  return PLACEMENT_SLIDES_CATALOG.find((s) => s.id === id)?.label ?? id
}

export function propostaDeckNavSecondary(id: PlacementSlideId): string {
  if (id === 'contrato_atual') return 'Situação vigente — formato apresentação'
  if (id === 'comparativo_propostas') return 'ATUAL × mercado — mesmo formato do comparativo'
  if (id === 'comparativo_diferenciais') return 'Diferenciais, condições e indicadores'
  return PLACEMENT_SLIDES_CATALOG.find((s) => s.id === id)?.description ?? ''
}
