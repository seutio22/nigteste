import { describe, expect, it } from 'vitest'
import { buildConfronto } from './tempoAdicionalDashboard'
import type { TempoAdicionalRow } from './tempoAdicional'

const H = 3600

function row(p: Partial<TempoAdicionalRow>): TempoAdicionalRow {
  return {
    id: Math.random().toString(36).slice(2),
    pageKey: 'manutencoes',
    entityId: 'c1',
    ticket: null,
    analistaId: 'a1',
    regraProdutividadeId: 'r1',
    tempoPrevistoSeconds: 4 * H,
    adicionalSeconds: H,
    motivo: 'retrabalho',
    justificativa: 'Retrabalho por erro de cadastro',
    status: 'pendente',
    comentarioRevisao: null,
    revisorNome: null,
    revisadoEm: null,
    userId: 'u1',
    userNome: 'Ana',
    createdAt: new Date(2026, 8, 10, 12).toISOString(),
    ...p,
  }
}

describe('buildConfronto', () => {
  it('soma adicionais por chamado sem duplicar o previsto e ignora rejeitados', () => {
    const s = buildConfronto({
      rows: [
        row({ entityId: 'c1', adicionalSeconds: H }),
        row({ entityId: 'c1', adicionalSeconds: 2 * H, status: 'aprovado' }),
        row({ entityId: 'c2', adicionalSeconds: 3 * H, status: 'rejeitado' }),
        row({ entityId: 'c3', tempoPrevistoSeconds: 2 * H, adicionalSeconds: H, regraProdutividadeId: 'r2' }),
      ],
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      regraLabel: (id) => id || 'Sem regra',
      analistaLabel: (id) => id || 'Sem analista',
    })
    expect(s.totalLancamentos).toBe(4)
    expect(s.chamadosComAdicional).toBe(2)
    expect(s.adicionalSeconds).toBe(4 * H)
    expect(s.previstoSeconds).toBe(6 * H)
    expect(s.desvioPct).toBe(66.7)
    const r1 = s.porRegra.find((g) => g.key === 'r1')!
    expect(r1.realizadoMedioSeconds).toBe(7 * H)
    expect(r1.desvioPct).toBe(75)
  })

  it('filtra pelo período do lançamento', () => {
    const s = buildConfronto({
      rows: [row({ createdAt: new Date(2026, 7, 31, 12).toISOString() })],
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      regraLabel: () => '',
      analistaLabel: () => '',
    })
    expect(s.totalLancamentos).toBe(0)
  })
})
