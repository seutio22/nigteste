import { describe, it, expect } from 'vitest'
import { htmlToPlainText, mapNotificationPriorityToKanban } from './notificationToKanban'

describe('htmlToPlainText', () => {
  it('remove tags HTML', () => {
    expect(htmlToPlainText('<p>Olá</p>')).toMatch(/Olá/)
  })

  it('retorna vazio para entrada inválida', () => {
    expect(htmlToPlainText(null as unknown as string)).toBe('')
  })
})

describe('mapNotificationPriorityToKanban', () => {
  it('mapeia urgente para high', () => {
    expect(mapNotificationPriorityToKanban('urgente')).toBe('high')
  })

  it('default medium', () => {
    expect(mapNotificationPriorityToKanban(undefined)).toBe('medium')
  })
})
