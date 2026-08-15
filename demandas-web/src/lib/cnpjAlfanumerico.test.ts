import { describe, expect, it } from 'vitest'
import {
  formatCnpj14,
  formatCnpjMask,
  isValidCnpj,
  normalizeCnpj,
} from './cnpjAlfanumerico'

describe('cnpjAlfanumerico', () => {
  it('normaliza letras minúsculas e pontuação', () => {
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35')
  })

  it('máscara AA.AAA.AAA/AAAA-DV', () => {
    expect(formatCnpjMask('12ABC34501DE35')).toBe('12.ABC.345/01DE-35')
    expect(formatCnpj14('12ABC34501DE35')).toBe('12.ABC.345/01DE-35')
  })

  it('valida exemplo oficial 12ABC34501DE-35', () => {
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true)
  })

  it('rejeita DV errado', () => {
    expect(isValidCnpj('12ABC34501DE00')).toBe(false)
  })

  it('rejeita letra no dígito verificador', () => {
    expect(isValidCnpj('12ABC34501DEA5')).toBe(false)
  })
})
