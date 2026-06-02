import type { PlacementPlano } from '../../store/placementStore'
import type { PlanoCoberturaForm } from './placementCotacaoDetalhes'

function normCompare(value: string): string {
  return value.trim().toLowerCase()
}

/** Categorias distintas cadastradas para um fornecedor (operadora). */
export function categoriasPorFornecedor(planos: PlacementPlano[], operadoraId: string): string[] {
  if (!operadoraId) return []
  const set = new Set<string>()
  for (const p of planos) {
    if (p.operadoraId === operadoraId) {
      const cat = p.categoria.trim()
      if (cat) set.add(cat)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Planos cadastrados em Dados → Placement para fornecedor + categoria. */
export function planosPorFornecedorCategoria(
  planos: PlacementPlano[],
  operadoraId: string,
  categoria: string
): PlacementPlano[] {
  if (!operadoraId || !categoria.trim()) return []
  const catNorm = normCompare(categoria)
  return planos
    .filter(
      (p) => p.operadoraId === operadoraId && normCompare(p.categoria) === catNorm && p.plano.trim()
    )
    .sort((a, b) => a.plano.localeCompare(b.plano, 'pt-BR'))
}

export function parseAcomodacaoFromCatalog(
  value?: string | null
): PlanoCoberturaForm['acomodacao'] {
  const n = normCompare(String(value ?? ''))
  if (n.includes('apart') || n === 'apt') return 'Apartamento'
  if (n.includes('enferm') || n === 'enf') return 'Enfermaria'
  return ''
}

/** Preenche campos do plano da cotação a partir do catálogo Placement. */
export function applyPlacementPlanoToCobertura(
  catalog: PlacementPlano
): Pick<PlanoCoberturaForm, 'nomePlano' | 'acomodacao' | 'abrangencia' | 'placementPlanoCatalogId'> {
  return {
    nomePlano: catalog.plano.trim(),
    placementPlanoCatalogId: catalog.id,
    acomodacao: parseAcomodacaoFromCatalog(catalog.acomodacao),
    abrangencia: catalog.abrangencia?.trim() ?? '',
  }
}

export function findCatalogPlanoByNome(
  planos: PlacementPlano[],
  operadoraId: string,
  categoria: string,
  nomePlano: string
): PlacementPlano | undefined {
  const nome = normCompare(nomePlano)
  if (!nome) return undefined
  return planosPorFornecedorCategoria(planos, operadoraId, categoria).find(
    (p) => normCompare(p.plano) === nome
  )
}
