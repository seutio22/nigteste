import { describe, expect, it } from 'vitest'
import { generateUniqueValidationTicket } from './validationTicket'

describe('generateUniqueValidationTicket', () => {
  it('incrementa sufixo quando ticket base já existe localmente', () => {
    expect(
      generateUniqueValidationTicket('SR-1346706', ['SR-1346706', 'SR-1346706-1'])
    ).toBe('SR-1346706-2')
  })

  it('retorna undefined quando original vazio', () => {
    expect(generateUniqueValidationTicket('', [])).toBeUndefined()
  })
})
