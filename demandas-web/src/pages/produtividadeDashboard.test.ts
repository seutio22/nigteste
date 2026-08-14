import { describe, expect, it } from 'vitest'
import { JORNADA_UTIL_SEGUNDOS } from './produtividadeJornada'
import { buildProdutividadeDashboard, countBusinessDaysInclusive } from './produtividadeDashboard'
import type { ChamadoProdutividadeResult } from './produtividadeMatching'

function chamado(
  partial: Partial<ChamadoProdutividadeResult> &
    Pick<ChamadoProdutividadeResult, 'analistaId' | 'tempoPrevistoSeconds' | 'dataConclusao'>
): ChamadoProdutividadeResult {
  return {
    id: partial.id || Math.random().toString(36).slice(2),
    ticket: null,
    pageKey: partial.pageKey || 'demandas',
    pageLabel: 'Cadastro',
    analistaId: partial.analistaId,
    dataInicio: null,
    dataFinal: null,
    dataConclusao: partial.dataConclusao,
    tempoPrevistoSeconds: partial.tempoPrevistoSeconds,
    tempoExecutadoSeconds: null,
    regraId: null,
    matched: partial.matched ?? true,
    matchScore: 1,
  }
}

describe('buildProdutividadeDashboard capacidade', () => {
  it('escala capacidade prevista pelo número de analistas do time', () => {
    const fromDate = '2026-07-01'
    const toDate = '2026-07-03'
    const days = countBusinessDaysInclusive(fromDate, toDate)
    expect(days).toBe(3)

    const summary = buildProdutividadeDashboard({
      fromDate,
      toDate,
      analistaNomeById: { a1: 'Ana', a2: 'Bruno' },
      chamados: [
        chamado({
          analistaId: 'a1',
          dataConclusao: '2026-07-01T15:00:00.000Z',
          tempoPrevistoSeconds: 3600,
        }),
        chamado({
          analistaId: 'a2',
          dataConclusao: '2026-07-02T15:00:00.000Z',
          tempoPrevistoSeconds: 7200,
        }),
      ],
    })

    expect(summary.pessoasCapacidade).toBe(2)
    expect(summary.capacidadePeriodoSeconds).toBe(days * JORNADA_UTIL_SEGUNDOS * 2)
    expect(summary.capacidadeRealSeconds).toBeNull()
    expect(summary.pctMesCapacidade).toBe(
      Math.round(((3600 + 7200) / (days * JORNADA_UTIL_SEGUNDOS * 2)) * 1000) / 10
    )
  })

  it('com filtro de um analista mantém capacidade prevista de 1 pessoa', () => {
    const fromDate = '2026-07-01'
    const toDate = '2026-07-03'
    const days = countBusinessDaysInclusive(fromDate, toDate)

    const summary = buildProdutividadeDashboard({
      fromDate,
      toDate,
      analistaIdFilter: 'a1',
      analistaNomeById: { a1: 'Ana', a2: 'Bruno' },
      chamados: [
        chamado({
          analistaId: 'a1',
          dataConclusao: '2026-07-01T15:00:00.000Z',
          tempoPrevistoSeconds: 28800,
        }),
        chamado({
          analistaId: 'a2',
          dataConclusao: '2026-07-02T15:00:00.000Z',
          tempoPrevistoSeconds: 28800,
        }),
      ],
    })

    expect(summary.pessoasCapacidade).toBe(1)
    expect(summary.capacidadePeriodoSeconds).toBe(days * JORNADA_UTIL_SEGUNDOS)
    expect(summary.totalChamados).toBe(1)
  })

  it('capacidade prevista usa roster NIG (ex.: 6), não só quem produziu', () => {
    const fromDate = '2026-07-01'
    const toDate = '2026-07-03'
    const days = countBusinessDaysInclusive(fromDate, toDate)

    const summary = buildProdutividadeDashboard({
      fromDate,
      toDate,
      analistaNomeById: { a1: 'Ana' },
      presenca: {
        equipePrevista: 6,
        pessoasPresentes: 5,
        pessoaDiasPresentes: 14,
        diasPresentesByAnalistaId: { a1: 3 },
      },
      chamados: [
        chamado({
          analistaId: 'a1',
          dataConclusao: '2026-07-01T15:00:00.000Z',
          tempoPrevistoSeconds: 3600,
        }),
      ],
    })

    expect(summary.pessoasCapacidade).toBe(6)
    expect(summary.capacidadePeriodoSeconds).toBe(days * JORNADA_UTIL_SEGUNDOS * 6)
    expect(summary.pessoasPresentes).toBe(5)
    expect(summary.capacidadeRealSeconds).toBe(14 * JORNADA_UTIL_SEGUNDOS)
  })
})
