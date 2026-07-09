import { describe, expect, it } from 'vitest'
import type { ContratoPlanoColuna } from './placementContratoAtual'
import { enrichColunasComVariacao, estudoTemFaixaEtariaReal } from './placementComparativoVariacao'

function col(partial: Partial<ContratoPlanoColuna> & Pick<ContratoPlanoColuna, 'id'>): ContratoPlanoColuna {
  return {
    operadoraId: '',
    operadora: 'AMIL',
    produto: 'Saúde',
    planoLabel: 'Bronze',
    acomodacao: 'Apt',
    elegibilidade: '—',
    elegibilidadeLinhas: [],
    contribuicao: '—',
    coparticipacao: '—',
    temCoparticipacao: false,
    vidas: 10,
    tipoCusto: 'per_capita',
    premioPerCapita: 'R$ 100,00',
    faixas: [],
    faturaEstimada: 'R$ 1.000,00',
    tabColor: '#5B4FCF',
    ...partial,
  }
}

describe('placementComparativoVariacao', () => {
  it('marca referência e calcula aumento vs base do mesmo plano', () => {
    const enriched = enrichColunasComVariacao([
      col({
        id: 'a1',
        grupo: 'atual',
        planoReferenciaId: 'ref-1',
        faturaEstimada: 'R$ 1.000,00',
      }),
      col({
        id: 'm1',
        grupo: 'mercado',
        planoReferenciaId: 'ref-1',
        operadora: 'ANA',
        faturaEstimada: 'R$ 1.546,80',
      }),
    ])

    expect(enriched[0].variacao?.isReferencia).toBe(true)
    expect(enriched[1].variacao?.isReferencia).toBe(false)
    expect(enriched[1].variacao?.economia).toBe(false)
    expect(enriched[1].variacao?.variacaoPct).toContain('54,68')
    expect(enriched[1].variacao?.impactoMensal).toContain('546,80')
    expect(enriched[1].variacao?.comparacaoResumo).toContain('AMIL')
    expect(enriched[1].variacao?.referenciaFatura).toBe('R$ 1.000,00')
  })

  it('não considera faixa etária quando planos são per capita', () => {
    const cols = [
      col({ id: '1', tipoCusto: 'per_capita', faixas: [] }),
      col({ id: '2', tipoCusto: 'per_capita', faixas: [] }),
    ]
    expect(estudoTemFaixaEtariaReal(cols)).toBe(false)
  })
})
