import { describe, expect, it } from 'vitest'
import {
  applyPlacementPlanoToCobertura,
  planosPorFornecedorCategoria,
  parseAcomodacaoFromCatalog,
} from './placementPlanos'
import type { PlacementPlano } from '../../../store/placementStore'

const catalog: PlacementPlano[] = [
  {
    id: 'p1',
    operadoraId: 'op1',
    categoria: 'Empresarial',
    plano: 'Ouro',
    acomodacao: 'Apartamento',
    abrangencia: 'Nacional',
  },
  {
    id: 'p2',
    operadoraId: 'op1',
    categoria: 'Empresarial',
    plano: 'Prata',
    acomodacao: 'Enfermaria',
    abrangencia: 'Estadual',
  },
  {
    id: 'p3',
    operadoraId: 'op2',
    categoria: 'Empresarial',
    plano: 'Outro',
    acomodacao: 'Apartamento',
    abrangencia: 'Nacional',
  },
]

describe('placementPlanos catalog', () => {
  it('filtra planos por fornecedor e categoria', () => {
    const list = planosPorFornecedorCategoria(catalog, 'op1', 'Empresarial')
    expect(list.map((p) => p.plano)).toEqual(['Ouro', 'Prata'])
  })

  it('aplica acomodação e abrangência do catálogo', () => {
    const applied = applyPlacementPlanoToCobertura(catalog[0])
    expect(applied).toMatchObject({
      nomePlano: 'Ouro',
      placementPlanoCatalogId: 'p1',
      acomodacao: 'Apartamento',
      abrangencia: 'Nacional',
    })
  })

  it('interpreta acomodação textual', () => {
    expect(parseAcomodacaoFromCatalog('apt')).toBe('Apartamento')
    expect(parseAcomodacaoFromCatalog('enfermaria')).toBe('Enfermaria')
  })
})
