import { describe, expect, it } from 'vitest'
import { filterContratoResumoPorVisibilidade } from './placementComparativoVisibilidade'
import type { ContratoAtualResumo, ContratoPlanoColuna } from './placementContratoAtual'

function col(partial: Partial<ContratoPlanoColuna> & { id: string }): ContratoPlanoColuna {
  return {
    id: partial.id,
    operadora: partial.operadora ?? 'Op',
    operadoraId: partial.operadoraId,
    planoLabel: partial.planoLabel ?? 'Plano',
    produto: partial.produto ?? '',
    acomodacao: partial.acomodacao ?? '',
    elegibilidadeLinhas: partial.elegibilidadeLinhas ?? [],
    vidas: partial.vidas ?? 10,
    tipoCusto: partial.tipoCusto ?? 'per_capita',
    custoPerCapita: partial.custoPerCapita ?? '100',
    faturaEstimada: partial.faturaEstimada ?? '1000',
    faixas: partial.faixas ?? [],
    contribuicao: partial.contribuicao ?? 'MDS 50%',
    coparticipacao: partial.coparticipacao ?? 'Sem coparticipação',
    tabColor: partial.tabColor ?? '#002561',
    grupo: partial.grupo ?? 'mercado',
    planoReferenciaId: partial.planoReferenciaId ?? 'ref-1',
  }
}

describe('filterContratoResumoPorVisibilidade', () => {
  it('ao reexibir mercado, mantém ATUAL no mesmo grupo de equivalência', () => {
    const atual = col({
      id: 'atual-1',
      operadora: 'Atual SA',
      grupo: 'atual',
      planoReferenciaId: 'ref-1',
      planoLabel: 'Plano Base',
    })
    const m1 = col({
      id: 'm1',
      operadora: 'Mercado A',
      grupo: 'mercado',
      planoReferenciaId: 'ref-1',
      planoLabel: 'Plano Base',
    })
    const m2 = col({
      id: 'm2',
      operadora: 'Mercado B',
      grupo: 'mercado',
      planoReferenciaId: 'ref-1',
      planoLabel: 'Plano Base',
    })

    const resumo: ContratoAtualResumo = {
      allColunas: [atual, m1, m2],
      pages: [
        {
          pageIndex: 0,
          totalPages: 1,
          colunas: [atual, m1],
          contribuicaoUnica: null,
          coparticipacaoUnica: null,
          totalVidas: 20,
          totalFatura: '—',
          grupoLabel: 'Plano Base',
        },
        {
          pageIndex: 1,
          totalPages: 1,
          colunas: [m2],
          contribuicaoUnica: null,
          coparticipacaoUnica: null,
          totalVidas: 10,
          totalFatura: '—',
          grupoLabel: 'Plano Base',
        },
      ],
      totalVidas: 30,
      totalFatura: '—',
    }

    // Esconde m2; depois "ativa" de novo (sem ocultas) — ATUAL permanece.
    const filtrado = filterContratoResumoPorVisibilidade(resumo, ['m2'])
    expect(filtrado.allColunas.map((c) => c.id)).toEqual(['atual-1', 'm1'])
    expect(filtrado.pages[0].colunas.some((c) => c.id === 'atual-1')).toBe(true)

    const todos = filterContratoResumoPorVisibilidade(resumo, [])
    expect(todos.allColunas.map((c) => c.id)).toEqual(['atual-1', 'm1', 'm2'])
    expect(todos.pages[0].colunas.some((c) => c.id === 'atual-1')).toBe(true)
  })

  it('ignora tentativa de ocultar coluna do Contrato atual', () => {
    const atual = col({
      id: 'atual-1',
      operadora: 'Atual SA',
      grupo: 'atual',
      planoReferenciaId: 'ref-1',
    })
    const m1 = col({
      id: 'm1',
      operadora: 'Mercado A',
      grupo: 'mercado',
      planoReferenciaId: 'ref-1',
    })
    const resumo: ContratoAtualResumo = {
      allColunas: [atual, m1],
      pages: [
        {
          pageIndex: 0,
          totalPages: 1,
          colunas: [atual, m1],
          contribuicaoUnica: null,
          coparticipacaoUnica: null,
          totalVidas: 20,
          totalFatura: '—',
          grupoLabel: 'Plano Base',
        },
      ],
      totalVidas: 20,
      totalFatura: '—',
    }

    const filtrado = filterContratoResumoPorVisibilidade(resumo, ['atual-1', 'm1'])
    expect(filtrado.allColunas.map((c) => c.id)).toEqual(['atual-1'])
    expect(filtrado.pages[0].colunas.some((c) => c.id === 'atual-1')).toBe(true)
  })
})
