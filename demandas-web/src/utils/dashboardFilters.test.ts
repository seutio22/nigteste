import { describe, expect, it } from 'vitest'
import {
  buildAnalistaAggregationKey,
  resolveIdFromValue,
  resolveProjectAnalistaValue,
  UNASSIGNED_ANALISTA_KEY
} from './dashboardFilters'

const analistas = [
  { id: 'a1111111-1111-4111-8111-111111111111', nome: 'PAULA' },
  { id: 'b2222222-2222-4222-8222-222222222222', nome: 'KARINA' }
]

describe('buildAnalistaAggregationKey', () => {
  it('unifica id e nome do mesmo analista', () => {
    const byId = buildAnalistaAggregationKey('a1111111-1111-4111-8111-111111111111', 'PAULA', analistas)
    const byName = buildAnalistaAggregationKey('PAULA', 'PAULA', analistas)

    expect(byId.key).toBe('a1111111-1111-4111-8111-111111111111')
    expect(byName.key).toBe('a1111111-1111-4111-8111-111111111111')
  })

  it('resolve uuid solto para o cadastro', () => {
    expect(resolveIdFromValue('b2222222-2222-4222-8222-222222222222', analistas)).toBe('b2222222-2222-4222-8222-222222222222')
    expect(resolveIdFromValue('KARINA', analistas)).toBe('b2222222-2222-4222-8222-222222222222')
  })

  it('mescla analistas duplicados no master pelo nome', () => {
    const dupMaster = [
      { id: 'id-1', nome: 'PAULA' },
      { id: 'id-2', nome: 'PAULA' }
    ]
    const a = buildAnalistaAggregationKey('id-1', 'PAULA', dupMaster)
    const b = buildAnalistaAggregationKey('id-2', 'PAULA', dupMaster)

    expect(a.key).toBe('name:paula')
    expect(b.key).toBe('name:paula')
  })

  it('agrupa uuid desconhecido em um único card', () => {
    const master = [{ id: 'a1111111-1111-4111-8111-111111111111', nome: 'PAULA' }]
    const a = buildAnalistaAggregationKey('b2222222-2222-4222-8222-222222222222', 'Analista não encontrado', master)
    const b = buildAnalistaAggregationKey('c3333333-3333-4333-8333-333333333333', 'Analista não encontrado', master)

    expect(a.key).toBe(UNASSIGNED_ANALISTA_KEY)
    expect(b.key).toBe(UNASSIGNED_ANALISTA_KEY)
  })

  it('mapeia gerente de projeto (usuário) para analista por e-mail', () => {
    const analistas = [
      { id: 'analista-denison', nome: 'DENISON', email: 'denison@empresa.com' },
    ]
    const project = {
      managerId: 'user-uuid-qualquer',
      manager: { id: 'user-uuid-qualquer', name: 'Denison', email: 'denison@empresa.com' },
    }
    expect(resolveProjectAnalistaValue(project, analistas)).toBe('analista-denison')
  })
})
