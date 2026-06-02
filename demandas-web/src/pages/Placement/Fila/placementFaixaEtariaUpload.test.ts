import { describe, expect, it } from 'vitest'
import {
  parseFaixaEtariaSheetRows,
  resolveFaixaEtariaKey,
} from './placementFaixaEtariaUpload'

describe('resolveFaixaEtariaKey', () => {
  it('reconhece rótulo e chave', () => {
    expect(resolveFaixaEtariaKey('00 - 18')).toBe('00-18')
    expect(resolveFaixaEtariaKey('59 OU MAIS')).toBe('59-mais')
    expect(resolveFaixaEtariaKey('19-23')).toBe('19-23')
  })
})

describe('parseFaixaEtariaSheetRows', () => {
  it('importa vidas e custos por faixa', () => {
    const result = parseFaixaEtariaSheetRows([
      { Faixa: '00 - 18', Vidas: 5, 'Custo (R$/vida)': '200,00' },
      { Faixa: '19 - 23', Vidas: 2, 'Custo (R$/vida)': 300.5 },
      { Faixa: 'Faixa desconhecida', Vidas: 9, 'Custo (R$/vida)': '1' },
    ])
    expect(result.importedCount).toBe(2)
    expect(result.vidasFaixa['00-18']).toBe('5')
    expect(result.custosFaixa['00-18']).toBe('200,00')
    expect(result.vidasFaixa['19-23']).toBe('2')
    expect(result.custosFaixa['19-23']).toBe('300,50')
  })

  it('exige colunas do modelo', () => {
    expect(() => parseFaixaEtariaSheetRows([{ A: 1 }])).toThrow(/modelo/i)
  })
})
