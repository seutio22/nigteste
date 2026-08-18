import { describe, expect, it } from 'vitest'
import {
  ALERT_REPEAT_INTERVAL_OPTIONS,
  ALERT_WINDOW_DURATION_OPTIONS,
  DEFAULT_ALERT_REPEAT_INTERVAL_MS,
  DEFAULT_ALERT_WINDOW_DURATION_MS,
  parseStoredMs,
  pickUnreadAlertForReminder,
} from './alertDeliveryPrefs'

describe('alertDeliveryPrefs', () => {
  it('usa 10s e 5 min como padrão de Som e janela', () => {
    expect(DEFAULT_ALERT_WINDOW_DURATION_MS).toBe(10_000)
    expect(DEFAULT_ALERT_REPEAT_INTERVAL_MS).toBe(5 * 60_000)
    expect(ALERT_WINDOW_DURATION_OPTIONS.some((o) => o.ms === 10_000)).toBe(true)
    expect(ALERT_REPEAT_INTERVAL_OPTIONS.some((o) => o.ms === 5 * 60_000)).toBe(true)
  })

  it('parseStoredMs ignora valor inválido e aceita 0 (até fechar / não repetir)', () => {
    const allowed = [0, 5_000, 10_000]
    expect(parseStoredMs(null, allowed, 10_000)).toBe(10_000)
    expect(parseStoredMs('abc', allowed, 10_000)).toBe(10_000)
    expect(parseStoredMs('7000', allowed, 10_000)).toBe(10_000)
    expect(parseStoredMs('0', allowed, 10_000)).toBe(0)
    expect(parseStoredMs('5000', allowed, 10_000)).toBe(5_000)
  })

  it('escolhe a primeira não lida e ignora lida ou adiada', () => {
    const now = new Date('2026-08-18T12:00:00.000Z')
    expect(
      pickUnreadAlertForReminder(
        [
          { id: 'a', titulo: 'Lida', lida: true },
          {
            id: 'b',
            titulo: 'Adiada',
            lida: false,
            snoozedUntil: '2026-08-18T13:00:00.000Z',
          },
          { id: 'c', titulo: 'Vigente', mensagem: 'Olá', prioridade: 'alta', lida: false },
        ],
        now
      )
    ).toEqual({
      id: 'c',
      titulo: 'Vigente',
      mensagem: 'Olá',
      prioridade: 'alta',
    })
  })

  it('não dispara lembrete se não houver não lida', () => {
    expect(pickUnreadAlertForReminder([{ id: 'a', titulo: 'X', lida: true }])).toBeNull()
  })
})
