import { describe, expect, it } from 'vitest'
import { normHeaderKey, pickCell } from './dadosSpreadsheet'

describe('dadosSpreadsheet', () => {
  it('normaliza cabeçalhos sem acento', () => {
    expect(normHeaderKey('Grupo econômico')).toBe('grupoeconomico')
    expect(normHeaderKey('CNPJ')).toBe('cnpj')
  })

  it('pickCell encontra coluna por rótulo alternativo', () => {
    const row = { 'Razão social': 'Acme', CNPJ: '12345678000199' }
    expect(pickCell(row, ['Razao social', 'Razão social'])).toBe('Acme')
    expect(pickCell(row, ['cnpj'])).toBe('12345678000199')
  })
})
