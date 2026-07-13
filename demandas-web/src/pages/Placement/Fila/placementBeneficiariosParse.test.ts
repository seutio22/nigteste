import { describe, expect, it } from 'vitest'
import { parseBeneficiarioIdade, parseBeneficiarioIdadeFromValue, parseBeneficiarioSexo, parseBeneficiarioDataToIso } from './placementBeneficiariosParse'
import { computeBeneficiariosResumo } from './placementBeneficiariosResumo'
import { resolveTipoParentesco } from './placementBeneficiarioTipoParentesco'
import type { PlacementBeneficiario } from './placementBeneficiarios'

describe('parseBeneficiarioDataToIso', () => {
  it('trata ano numérico como ano de nascimento, não serial Excel', () => {
    expect(parseBeneficiarioDataToIso(2012)).toBe('2012-07-01')
    expect(parseBeneficiarioDataToIso('2015')).toBe('2015-07-01')
  })

  it('resolve datas ambíguas mm/dd vs dd/mm priorizando idade menor', () => {
    expect(parseBeneficiarioDataToIso('05/06/2012')).toBe('2012-06-05')
  })

  it('aceita DD/MM/AA (ano com 2 dígitos)', () => {
    expect(parseBeneficiarioDataToIso('15/05/90')).toBe('1990-05-15')
    expect(parseBeneficiarioDataToIso('10/08/12')).toBe('2012-08-10')
    expect(parseBeneficiarioDataToIso('01/01/30')).toBe('1930-01-01')
    expect(parseBeneficiarioDataToIso('15 / 05 / 90')).toBe('1990-05-15')
  })
})

describe('parseBeneficiarioIdade', () => {
  it('aceita ISO e formato brasileiro', () => {
    expect(parseBeneficiarioIdade('1990-05-15')).toBeTypeOf('number')
    expect(parseBeneficiarioIdade('15/05/1990')).toBeTypeOf('number')
    expect(parseBeneficiarioIdade('15-05-1990')).toBeTypeOf('number')
  })

  it('calcula faixa 00-18 para crianças', () => {
    const idade = parseBeneficiarioIdade('2012-07-01')
    expect(idade).not.toBeNull()
    expect(idade!).toBeLessThanOrEqual(18)
  })

  it('aceita idade numérica direta (planilhas com idade em vez de data)', () => {
    expect(parseBeneficiarioIdadeFromValue(12)).toBe(12)
    expect(parseBeneficiarioIdadeFromValue('8')).toBe(8)
  })

  it('aceita data/hora retornada pela API', () => {
    const idade = parseBeneficiarioIdadeFromValue('2010-05-15T00:00:00.000Z')
    expect(idade).not.toBeNull()
    expect(idade!).toBeLessThanOrEqual(18)
  })

  it('rejeita data inválida', () => {
    expect(parseBeneficiarioIdade('')).toBeNull()
    expect(parseBeneficiarioIdade('data inválida')).toBeNull()
  })
})

describe('parseBeneficiarioSexo', () => {
  it('normaliza códigos comuns', () => {
    expect(parseBeneficiarioSexo('Masculino')).toBe('M')
    expect(parseBeneficiarioSexo('F')).toBe('F')
    expect(parseBeneficiarioSexo('1')).toBe('M')
    expect(parseBeneficiarioSexo('2')).toBe('F')
  })
})

describe('resolveTipoParentesco — graus frequentes na base', () => {
  it('classifica dependente e filha', () => {
    expect(resolveTipoParentesco('Dependente')).toBe('D')
    expect(resolveTipoParentesco('FILHA')).toBe('D')
    expect(resolveTipoParentesco('Esposa')).toBe('D')
  })
})

function row(partial: Partial<PlacementBeneficiario>): PlacementBeneficiario {
  return {
    ordem: 1,
    empresa: null,
    sub: null,
    cnpj: null,
    matricula: null,
    sexo: null,
    nome: null,
    dataNascimento: null,
    grauParentesco: null,
    statusBeneficiario: null,
    planoAtual: null,
    custoPerCapita: null,
    cid10: null,
    motivoAfastamento: null,
    ...partial,
  }
}

describe('computeBeneficiariosResumo — datas BR e faixas', () => {
  it('distribui faixa etária com data dd/mm/aaaa', () => {
    const r = computeBeneficiariosResumo([
      row({ sexo: 'M', dataNascimento: '15/05/1990', grauParentesco: 'Titular' }),
      row({ sexo: 'F', dataNascimento: '10/01/2010', grauParentesco: 'Filho(a)' }),
    ])
    const comVidas = r.faixasEtarias.filter((f) => f.masculino + f.feminino + f.semSexo > 0)
    expect(comVidas.length).toBeGreaterThan(0)
    expect(r.titulares).toBe(1)
    expect(r.dependentes).toBe(1)
  })

  it('conta faixa 00-18 com ano ISO, idade numérica e vidas sem sexo', () => {
    const r = computeBeneficiariosResumo([
      row({ dataNascimento: '2012-07-01', grauParentesco: 'Filho (a)' }),
      row({ dataNascimento: '2015-03-10', grauParentesco: 'Filho (a)' }),
      row({ sexo: 'M', dataNascimento: '10/06/2008', grauParentesco: 'Filho (a)' }),
      row({ dataNascimento: '12', grauParentesco: 'Filho (a)' }),
    ])
    const faixaJovem = r.faixasEtarias.find((f) => f.key === '00-18')
    expect(faixaJovem).toBeDefined()
    expect(faixaJovem!.masculino + faixaJovem!.feminino + faixaJovem!.semSexo).toBe(4)
  })
})

describe('formatBeneficiarioCustoDisplay', () => {
  it('formata valores monetários da planilha em R$', async () => {
    const { formatBeneficiarioCustoDisplay } = await import('./placementBeneficiariosParse')
    expect(formatBeneficiarioCustoDisplay('400,00')).toMatch(/R\$\s*400,00/)
    expect(formatBeneficiarioCustoDisplay('100')).toMatch(/R\$\s*100,00/)
    expect(formatBeneficiarioCustoDisplay('')).toBe('—')
  })

  it('interpreta número Excel e string com ponto decimal (ex.: 1134,16)', async () => {
    const {
      formatBeneficiarioCustoDisplay,
      normalizeSpreadsheetCustoCell,
      parseBeneficiarioCustoToCents,
    } = await import('./placementBeneficiariosParse')
    expect(normalizeSpreadsheetCustoCell(1134.16)).toBe('1.134,16')
    expect(parseBeneficiarioCustoToCents(1134.16)).toBe(113416)
    expect(parseBeneficiarioCustoToCents('1134.16')).toBe(113416)
    expect(parseBeneficiarioCustoToCents('1134,16')).toBe(113416)
    expect(formatBeneficiarioCustoDisplay('1134.16')).toMatch(/R\$\s*1\.134,16/)
  })
})
