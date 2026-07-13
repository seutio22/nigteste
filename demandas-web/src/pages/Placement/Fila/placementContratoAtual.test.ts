import { describe, expect, it } from 'vitest'
import {
  buildContratoAtualPages,
  buildFaixaMatrixForPage,
  computeContratoAtualResumo,
  custoMedioColuna,
  elegibilidadeDaBase,
  faixaLabelDisplay,
  formatContribuicaoResumo,
  pageUsesFaixaMatrix,
} from './placementContratoAtual'
import { EMPTY_DADOS_FINANCEIROS } from './placementCotacaoFinanceiro'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { emptyPlanoCobertura } from './placementCotacaoDetalhes'

describe('computeContratoAtualResumo', () => {
  it('carrega prêmio per capita e elegibilidade da base (cargo)', () => {
    const cotacao = {
      itensMapeamento: [
        { id: 'row1', produtoId: 'p1', produtoNome: 'Saúde', fornecedorId: 'op1' },
      ],
      planosCobertura: {
        planos: [
          {
            ...emptyPlanoCobertura('row1'),
            id: 'pl1',
            nomePlano: 'S6500 R1',
            acomodacao: 'Apartamento',
            tipoCusto: 'per_capita',
            custoPerCapitaBRL: '1.728,44',
            numeroVidas: '4',
          },
        ],
        coparticipacaoDetalhePorPlanos: '20% Consultas e exames simples',
        dadosFinanceiros: { atual: EMPTY_DADOS_FINANCEIROS.atual, estudo: EMPTY_DADOS_FINANCEIROS.estudo },
      },
    }
    const ben: PlacementBeneficiario[] = [
      {
        id: '1',
        cotacaoId: 'c1',
        planoAtual: 'S6500 R1',
        cargo: 'Diretores',
        statusBeneficiario: 'Ativo',
      },
    ]
    const r = computeContratoAtualResumo(cotacao, ben, new Map([['op1', 'Amil']]))
    const col = r.pages[0].colunas[0]
    expect(col.operadora).toBe('AMIL')
    expect(col.premioPerCapita).toContain('1.728')
    expect(col.elegibilidadeLinhas).toContain('Diretores')
    expect(col.tipoCusto).toBe('per_capita')
  })

  it('carrega faixas etárias com custos', () => {
    const cotacao = {
      itensMapeamento: [{ id: 'r1', produtoNome: 'Saúde', fornecedorId: 'op1' }],
      planosCobertura: {
        planos: [
          {
            ...emptyPlanoCobertura('r1'),
            id: 'pl2',
            nomePlano: 'Bronze',
            tipoCusto: 'faixa_etaria',
            vidasFaixa: { '00-18': '2', '19-23': '1' },
            custosFaixa: { '00-18': '200,00', '19-23': '300,00' },
          },
        ],
        dadosFinanceiros: { atual: EMPTY_DADOS_FINANCEIROS.atual, estudo: EMPTY_DADOS_FINANCEIROS.estudo },
      },
    }
    const r = computeContratoAtualResumo(cotacao, [], new Map([['op1', 'Amil']]))
    const col = r.pages[0].colunas[0]
    expect(col.tipoCusto).toBe('faixa_etaria')
    expect(col.faixas.length).toBeGreaterThan(0)
    expect(col.faixas[0].key).toBe('00-18')
    expect(col.faixas[0].vidas).toBe(2)
    expect(col.premioPerCapita).toBeNull()
    const page = r.pages[0]
    expect(pageUsesFaixaMatrix(page)).toBe(true)
    const matrix = buildFaixaMatrixForPage(page)
    expect(matrix?.rows.some((row) => row.key === '00-18')).toBe(true)
    expect(matrix?.getCell(col.id, '00-18')?.custo).toContain('200')
    expect(custoMedioColuna(col)).toContain('233')
  })

  it('formata rótulo de faixa para exibição', () => {
    expect(faixaLabelDisplay('00 - 18')).toBe('00 a 18 anos')
    expect(faixaLabelDisplay('59 OU MAIS')).toContain('59')
  })

  it('pagina planos quando há mais de 3', () => {
    const planos = [1, 2, 3, 4].map((n) => ({
      ...emptyPlanoCobertura('r1'),
      id: `p${n}`,
      nomePlano: `Plano ${n}`,
      numeroVidas: '1',
      custoPerCapitaBRL: '100',
    }))
    const cotacao = {
      itensMapeamento: [{ id: 'r1', produtoNome: 'Saúde', fornecedorId: 'op1' }],
      planosCobertura: { planos, dadosFinanceiros: { atual: EMPTY_DADOS_FINANCEIROS.atual, estudo: EMPTY_DADOS_FINANCEIROS.estudo } },
    }
    const r = computeContratoAtualResumo(cotacao, [], new Map([['op1', 'X']]))
    expect(r.pages.length).toBe(2)
    expect(r.pages[0].colunas).toHaveLength(3)
    expect(r.pages[1].colunas).toHaveLength(1)
    expect(r.allColunas).toHaveLength(4)
    const fivePerPage = buildContratoAtualPages(r.allColunas, 5)
    expect(fivePerPage).toHaveLength(1)
    expect(fivePerPage[0].colunas).toHaveLength(4)
    const sixPerPage = buildContratoAtualPages(r.allColunas, 6)
    expect(sixPerPage).toHaveLength(1)
    expect(sixPerPage[0].colunas).toHaveLength(4)
    const sevenPlanos = [...r.allColunas, ...r.allColunas.slice(0, 3)]
    expect(sevenPlanos).toHaveLength(7)
    const pag6 = buildContratoAtualPages(sevenPlanos, 6)
    expect(pag6).toHaveLength(2)
    expect(pag6[0].colunas).toHaveLength(6)
    expect(pag6[1].colunas).toHaveLength(1)
  })
})

describe('elegibilidadeDaBase', () => {
  it('prioriza cargo dos beneficiários do plano', () => {
    const p = { ...emptyPlanoCobertura('r'), nomePlano: 'Gold' }
    const r = elegibilidadeDaBase(
      [
        {
          id: '1',
          cotacaoId: 'c',
          planoAtual: 'Gold',
          cargo: 'Gerentes',
          statusBeneficiario: 'Ativo',
        },
      ],
      p
    )
    expect(r.linhas).toEqual(['Gerentes'])
  })
})

describe('formatContribuicaoResumo', () => {
  it('retorna empresa 100% quando participação zerada', () => {
    expect(formatContribuicaoResumo(EMPTY_DADOS_FINANCEIROS)).toContain('100%')
  })
})
