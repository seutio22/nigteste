import { describe, expect, it } from 'vitest'
import { formatDuracao, summarizeShareAccess, type ShareAccessLog } from './projectShareAnalytics'

const logs: ShareAccessLog[] = [
  {
    id: '1',
    ipAddress: '1.1.1.1',
    accessedAt: '2026-09-28T10:00:00Z',
    visitorId: 'aaa',
    durationSeconds: 120,
    clickCount: 10,
    sectionStats: { overview: { seconds: 80, clicks: 4 }, timeline: { seconds: 40, clicks: 6 } },
    deviceType: 'Computador',
    browser: 'Chrome',
    os: 'Windows',
  },
  {
    id: '2',
    ipAddress: '1.1.1.1',
    accessedAt: '2026-09-28T11:00:00Z',
    visitorId: 'aaa',
    durationSeconds: 60,
    clickCount: 2,
    sectionStats: { overview: { seconds: 60, clicks: 2 } },
    deviceType: 'Computador',
    browser: 'Chrome',
    os: 'Windows',
  },
  { id: '3', ipAddress: '2.2.2.2', accessedAt: '2026-09-27T09:00:00Z', deviceType: 'Celular', browser: 'Safari', os: 'iOS' },
]

describe('summarizeShareAccess', () => {
  it('conta visitantes únicos, recorrentes e médias só dos acessos medidos', () => {
    const r = summarizeShareAccess(logs)
    expect(r.acessos).toBe(3)
    expect(r.visitantesUnicos).toBe(2)
    expect(r.visitantesRecorrentes).toBe(1)
    expect(r.tempoTotal).toBe(180)
    expect(r.tempoMedio).toBe(90)
    expect(r.cliquesTotal).toBe(12)
    expect(r.cliquesMedio).toBe(6)
  })

  it('soma tempo e cliques por aba, ordenando pelo tempo', () => {
    const r = summarizeShareAccess(logs)
    expect(r.secoes.map((s) => [s.key, s.seconds, s.clicks, s.acessos])).toEqual([
      ['overview', 140, 6, 2],
      ['timeline', 40, 6, 1],
    ])
  })

  it('agrupa dispositivos', () => {
    expect(summarizeShareAccess(logs).dispositivos).toEqual([
      { label: 'Computador', count: 2 },
      { label: 'Celular', count: 1 },
    ])
  })
})

describe('formatDuracao', () => {
  it('formata segundos, minutos e horas', () => {
    expect(formatDuracao(0)).toBe('—')
    expect(formatDuracao(45)).toBe('45s')
    expect(formatDuracao(125)).toBe('2 min 5s')
    expect(formatDuracao(3720)).toBe('1h 2min')
  })
})
