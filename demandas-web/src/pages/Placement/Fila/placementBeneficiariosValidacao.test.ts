import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  countBeneficiariosValidados,
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

/** Linha mínima sem apontamentos com o contexto padrão. */
function rowOk(partial: Partial<PlacementBeneficiario> = {}): PlacementBeneficiario {
  return row({
    cnpj: '11222333000181',
    operadora: 'Unimed',
    grauParentesco: 'Titular',
    sexo: 'M',
    dataNascimento: '1990-05-01',
    cidade: 'São Paulo',
    uf: 'SP',
    ...partial,
  })
}

describe('faixaEtariaKeyFromIdade', () => {
  it('mapeia faixas corretamente', () => {
    expect(faixaEtariaKeyFromIdade(10)).toBe('00-18')
    expect(faixaEtariaKeyFromIdade(22)).toBe('19-23')
    expect(faixaEtariaKeyFromIdade(60)).toBe('59-mais')
  })
})

describe('validarBeneficiariosImportados', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-22'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aceita CNPJ de subfatura ou estipulante', () => {
    const r = validarBeneficiariosImportados(
      [rowOk({ cnpj: '11.222.333/0001-81' })],
      ctxBase()
    )
    expect(r.linhasComApontamento).toBe(0)
  })

  it('alerta CNPJ vazio', () => {
    const r = validarBeneficiariosImportados([rowOk({ cnpj: '' })], ctxBase())
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'cnpj' && a.severidade === 'aviso')).toBe(
      true
    )
    expect(r.linhas[0].apontamentos.find((a) => a.campo === 'cnpj')?.mensagem).toContain('Sem CNPJ')
  })

  it('alerta operadora vazia', () => {
    const r = validarBeneficiariosImportados([rowOk({ operadora: '' })], ctxBase())
    expect(
      r.linhas[0].apontamentos.some((a) => a.campo === 'operadora' && a.severidade === 'aviso')
    ).toBe(true)
  })

  it('valida grau de parentesco conhecido e desconhecido', () => {
    const ok = validarBeneficiariosImportados([rowOk({ grauParentesco: 'AGREGADO' })], ctxBase())
    expect(ok.linhasComApontamento).toBe(0)

    const vazio = validarBeneficiariosImportados([rowOk({ grauParentesco: '' })], ctxBase())
    expect(
      vazio.linhas[0].apontamentos.some((a) => a.campo === 'grauParentesco' && a.severidade === 'aviso')
    ).toBe(true)

    const bad = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'PARENTESCO INVALIDO' })],
      ctxBase()
    )
    expect(
      bad.linhas[0].apontamentos.some((a) => a.campo === 'grauParentesco' && a.severidade === 'erro')
    ).toBe(true)
  })

  it('aponta CNPJ divergente', () => {
    const r = validarBeneficiariosImportados(
      [rowOk({ cnpj: '00.000.000/0001-00', nome: 'João' })],
      ctxBase()
    )
    expect(r.linhasComApontamento).toBe(1)
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'cnpj' && a.severidade === 'erro')).toBe(
      true
    )
  })

  it('aponta operadora divergente', () => {
    const r = validarBeneficiariosImportados(
      [rowOk({ operadora: 'Bradesco Saúde' })],
      ctxBase()
    )
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'operadora' && a.severidade === 'erro')).toBe(
      true
    )
  })

  it('valida custo per capita', () => {
    const ok = validarBeneficiariosImportados(
      [
        rowOk({
          planoAtual: 'Plano Ouro',
          custoPerCapita: '350,00',
        }),
      ],
      ctxBase()
    )
    expect(ok.linhasComApontamento).toBe(0)

    const bad = validarBeneficiariosImportados(
      [
        rowOk({
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
        rowOk({
          planoAtual: 'Plano Ouro',
          dataNascimento: '2003-05-10',
          custoPerCapita: '280,00',
        }),
      ],
      ctx
    )
    expect(ok.linhasComApontamento).toBe(0)
  })

  it('conta vidas validadas sem crítica', () => {
    const r = validarBeneficiariosImportados(
      [rowOk(), rowOk({ cnpj: '00.000.000/0001-00', id: 'b2' })],
      ctxBase()
    )
    expect(countBeneficiariosValidados(r)).toBe(1)
    expect(r.linhasComApontamento).toBe(1)
  })

  it('valida sexo permitido e rejeita valores inválidos', () => {
    for (const sexo of ['F', 'f', 'Feminino', 'M', 'm', 'Masculino']) {
      const r = validarBeneficiariosImportados([rowOk({ sexo })], ctxBase())
      expect(r.linhasComApontamento).toBe(0)
    }

    const invalido = validarBeneficiariosImportados([rowOk({ sexo: 'Outro' })], ctxBase())
    expect(
      invalido.linhas[0].apontamentos.some((a) => a.campo === 'sexo' && a.severidade === 'erro')
    ).toBe(true)
  })

  it('valida idade por grau de parentesco', () => {
    const titularMenor = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'Titular', dataNascimento: '2010-05-22' })],
      ctxBase()
    )
    expect(
      titularMenor.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.severidade === 'aviso' && a.mensagem.includes('18')
      )
    ).toBe(true)

    const conjugeMenor = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'CONJUGE', dataNascimento: '2010-05-22' })],
      ctxBase()
    )
    expect(
      conjugeMenor.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.severidade === 'erro'
      )
    ).toBe(true)

    const filho25 = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'Filho (C)', dataNascimento: '2000-05-22' })],
      ctxBase()
    )
    expect(
      filho25.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.mensagem.includes('25')
      )
    ).toBe(true)

    const titular70 = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'Titular', dataNascimento: '1955-05-22' })],
      ctxBase()
    )
    expect(
      titular70.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.mensagem.includes('70')
      )
    ).toBe(true)

    const titularExatamente70 = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'Titular', dataNascimento: '1956-01-01' })],
      ctxBase()
    )
    expect(
      titularExatamente70.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.mensagem.includes('70 anos ou mais')
      )
    ).toBe(true)

    const titularLetraT = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'T', dataNascimento: '1950-01-01' })],
      ctxBase()
    )
    expect(
      titularLetraT.linhas[0].apontamentos.some(
        (a) => a.campo === 'dataNascimento' && a.mensagem.includes('70 anos ou mais')
      )
    ).toBe(true)
  })

  it('valida condições especiais de grau de parentesco', () => {
    const cronicoSemCid = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'CRONICO (T)' })],
      ctxBase()
    )
    expect(
      cronicoSemCid.linhas[0].apontamentos.some(
        (a) => a.campo === 'grauParentesco' && a.mensagem.includes('crônicos')
      )
    ).toBe(true)

    const homeCare = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'HOME CARE (A)' })],
      ctxBase()
    )
    expect(
      homeCare.linhas[0].apontamentos.some((a) => a.mensagem.includes('Home Care'))
    ).toBe(true)

    const remidoSemDatas = validarBeneficiariosImportados(
      [rowOk({ grauParentesco: 'REMIDO (A)' })],
      ctxBase()
    )
    expect(
      remidoSemDatas.linhas[0].apontamentos.some((a) => a.campo === 'dataFinalBeneficio')
    ).toBe(true)
    expect(
      remidoSemDatas.linhas[0].apontamentos.some((a) => a.campo === 'dataInicioBeneficio')
    ).toBe(true)

    const demitidoComDatas = validarBeneficiariosImportados(
      [
        rowOk({
          grauParentesco: 'DEMITIDO (A)',
          dataInicioBeneficio: '2024-01-01',
          dataFinalBeneficio: '2025-12-31',
        }),
      ],
      ctxBase()
    )
    expect(demitidoComDatas.linhasComApontamento).toBe(0)
  })

  it('alerta cidade e UF vazias', () => {
    const r = validarBeneficiariosImportados([rowOk({ cidade: '', uf: '' })], ctxBase())
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'cidade')).toBe(true)
    expect(r.linhas[0].apontamentos.some((a) => a.campo === 'uf')).toBe(true)
  })

  it('detecta nome duplicado exato e somente por nome', () => {
    const exato = validarBeneficiariosImportados(
      [
        rowOk({
          id: 'b1',
          ordem: 1,
          nome: 'Maria Silva',
          matricula: '100',
          dataNascimento: '1990-01-01',
        }),
        rowOk({
          id: 'b2',
          ordem: 2,
          nome: 'MARIA SILVA',
          matricula: '100',
          dataNascimento: '1990-01-01',
        }),
      ],
      ctxBase()
    )
    expect(exato.linhas).toHaveLength(2)
    expect(
      exato.linhas[0].apontamentos.some(
        (a) => a.campo === 'nome' && a.mensagem.includes('mesma data de nascimento e matrícula')
      )
    ).toBe(true)

    const soNome = validarBeneficiariosImportados(
      [
        rowOk({
          id: 'b1',
          ordem: 1,
          nome: 'João Souza',
          matricula: '100',
          dataNascimento: '1990-01-01',
        }),
        rowOk({
          id: 'b2',
          ordem: 2,
          nome: 'João Souza',
          matricula: '200',
          dataNascimento: '1995-05-10',
        }),
      ],
      ctxBase()
    )
    expect(
      soNome.linhas[0].apontamentos.some(
        (a) => a.campo === 'nome' && a.mensagem.includes('verifique data de nascimento e matrícula')
      )
    ).toBe(true)
    expect(
      soNome.linhas[0].apontamentos.some((a) => a.mensagem.includes('mesma data de nascimento e matrícula'))
    ).toBe(false)
  })
})
