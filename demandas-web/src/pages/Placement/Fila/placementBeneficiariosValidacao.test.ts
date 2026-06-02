import { describe, expect, it } from 'vitest'
import {
  faixaEtariaKeyFromIdade,
  validarBeneficiariosImportados,
  type BeneficiariosValidacaoContext,
} from './placementBeneficiariosValidacao'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { emptyCoparticipacao } from './placementCoparticipacao'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'

const ctxBase = (): BeneficiariosValidacaoContext => ({
  subfaturaCnpjs: ['11222333000181'],
  estipulanteCnpj: '99888777000166',
  fornecedorNomes: ['Unimed'],
  planos: [
    {
      id: 'p1',
      itemRowId: 'i1',
      nomePlano: 'Plano Ouro',
      acomodacao: '',
      abrangencia: '',
      elegibilidade: '',
      numeroVidas: '10',
      tipoCusto: 'per_capita',
      custoPerCapitaBRL: '350,00',
      custosFaixa: emptyCustosFaixa(),
      vidasFaixa: emptyVidasFaixa(),
      coparticipacao: emptyCoparticipacao(),
    },
  ],
})

function row(partial: Partial<PlacementBeneficiario>): PlacementBeneficiario {
  return {
    id: partial.id ?? 'b1',
    cotacaoId: 'c1',
    ...partial,
  }
}

describe('faixaEtariaKeyFromIdade', () => {
  it('mapeia faixas corretamente', () => {
    expect(faixaEtariaKeyFromIdade(10)).toBe('00-18')
    expect(faixaEtariaKeyFromIdade(22)).toBe('19-23')
    expect(faixaEtariaKeyFromIdade(60)).toBe('59-mais')
  })
})

describe('validarBeneficiariosImportados', () => {
  it('aceita CNPJ de subfatura ou estipulante', () => {
    const r = validarBeneficiariosImportados(
      [row({ cnpj: '11.222.333/0001-81' })],
      ctxBase()
    )
    expect(r.linhasComApontamento).toBe(0)
  })

  it('aponta CNPJ divergente', () => {
    const r = validarBeneficiariosImportados(
      [row({ cnpj: '00.000.000/0001-00', nome: 'João' })],
      ctxBase()
    )
    expect(r.linhasComApontamento).toBe(1)
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'cnpj')).toBe(true)
  })

  it('aponta operadora divergente', () => {
    const r = validarBeneficiariosImportados(
      [row({ cnpj: '11222333000181', operadora: 'Bradesco Saúde' })],
      ctxBase()
    )
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'operadora')).toBe(true)
  })

  it('valida custo per capita', () => {
    const ok = validarBeneficiariosImportados(
      [
        row({
          cnpj: '11222333000181',
          operadora: 'Unimed',
          planoAtual: 'Plano Ouro',
          custoPerCapita: '350,00',
        }),
      ],
      ctxBase()
    )
    expect(ok.linhasComApontamento).toBe(0)

    const bad = validarBeneficiariosImportados(
      [
        row({
          cnpj: '11222333000181',
          operadora: 'Unimed',
          planoAtual: 'Plano Ouro',
          custoPerCapita: '400,00',
        }),
      ],
      ctxBase()
    )
    expect(bad.linhas[0].apontamentos.some((a) => a.campo === 'custoPerCapita')).toBe(true)
  })

  it('valida custo por faixa etária', () => {
    const ctx = ctxBase()
    ctx.planos = [
      {
        ...ctx.planos[0],
        tipoCusto: 'faixa_etaria',
        custoPerCapitaBRL: '',
        custosFaixa: { ...emptyCustosFaixa(), '19-23': '280,00' },
      },
    ]

    const ok = validarBeneficiariosImportados(
      [
        row({
          cnpj: '11222333000181',
          planoAtual: 'Plano Ouro',
          dataNascimento: '2003-05-10',
          custoPerCapita: '280,00',
        }),
      ],
      ctx
    )
    expect(ok.linhasComApontamento).toBe(0)
  })
})
