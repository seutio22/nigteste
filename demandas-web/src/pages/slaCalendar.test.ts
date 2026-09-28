import { describe, expect, it } from 'vitest'
import {
  addBusinessSeconds,
  buildPauseIntervals,
  businessSecondsBetween,
  isSlaWaitStatus,
  parseSlaInstant,
  pausedBusinessSeconds,
} from './slaCalendar'

const H = 3600

describe('parseSlaInstant', () => {
  it('ancora datas só-dia no expediente local', () => {
    const ini = parseSlaInstant('2026-09-24T00:00:00.000Z', 'inicio')!
    const fim = parseSlaInstant('2026-09-24', 'fim')!
    expect([ini.getDate(), ini.getHours()]).toEqual([24, 9])
    expect([fim.getDate(), fim.getHours()]).toEqual([24, 17])
  })
})

describe('businessSecondsBetween', () => {
  it('mesmo dia só-data = 1 dia útil (8h)', () => {
    const a = parseSlaInstant('2026-09-24', 'inicio')!
    const b = parseSlaInstant('2026-09-24', 'fim')!
    expect(businessSecondsBetween(a, b)).toBe(8 * H)
  })

  it('ignora fim de semana (sex 09h → seg 17h = 16h)', () => {
    const sex = new Date(2026, 8, 25, 9)
    const seg = new Date(2026, 8, 28, 17)
    expect(businessSecondsBetween(sex, seg)).toBe(16 * H)
  })

  it('ignora horas fora do expediente', () => {
    expect(businessSecondsBetween(new Date(2026, 8, 24, 16), new Date(2026, 8, 25, 10))).toBe(2 * H)
  })
})

describe('addBusinessSeconds', () => {
  it('2 dias úteis a partir de sexta 09h terminam segunda 17h', () => {
    const d = addBusinessSeconds(new Date(2026, 8, 25, 9), 16 * H)
    expect([d.getDate(), d.getHours()]).toEqual([28, 17])
  })

  it('4h a partir de quinta 15h terminam sexta 11h', () => {
    const d = addBusinessSeconds(new Date(2026, 8, 24, 15), 4 * H)
    expect([d.getDate(), d.getHours()]).toEqual([25, 11])
  })
})

describe('isSlaWaitStatus', () => {
  it('pausa em status que dependem de terceiros', () => {
    for (const s of ['Pendente', 'Com erros', 'Aguardando validação', 'Aguardando aprovação']) {
      expect(isSlaWaitStatus(s)).toBe(true)
    }
    for (const s of ['Em andamento', 'Concluída', 'Aberta']) {
      expect(isSlaWaitStatus(s)).toBe(false)
    }
  })
})

describe('pausas', () => {
  it('desconta períodos em Aguardando', () => {
    const events = [
      { toValue: 'Em andamento', createdAt: new Date(2026, 8, 24, 9).toISOString() },
      { toValue: 'Aguardando aprovação', createdAt: new Date(2026, 8, 24, 10).toISOString() },
      { toValue: 'Em andamento', createdAt: new Date(2026, 8, 24, 13).toISOString() },
    ]
    const until = new Date(2026, 8, 24, 17)
    const pauses = buildPauseIntervals(events, until)
    expect(pauses).toHaveLength(1)
    expect(pausedBusinessSeconds(pauses, new Date(2026, 8, 24, 9), until)).toBe(3 * H)
  })

  it('pausa aberta fecha no limite informado', () => {
    const events = [{ toValue: 'Aguardando validação', createdAt: new Date(2026, 8, 24, 15).toISOString() }]
    const until = new Date(2026, 8, 25, 10)
    const pauses = buildPauseIntervals(events, until)
    expect(pausedBusinessSeconds(pauses, new Date(2026, 8, 24, 9), until)).toBe(3 * H)
  })
})
