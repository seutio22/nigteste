import { describe, expect, it } from 'vitest'
import {
  countChamadoQualificacaoPontos,
  parseChamadoQualificacao,
  chamadoQualificacaoIgual,
  EMPTY_CHAMADO_QUALIFICACAO,
} from '../types/chamadoQualificacao'

describe('chamadoQualificacao', () => {
  it('parseia payload da API', () => {
    const q = parseChamadoQualificacao({
      dadosIncorretos: true,
      dadosIncompletos: false,
      semGestorEmCopia: true,
      semRetorno: false,
      formularioIncorreto: false,
      observacao: 'Falta CNPJ',
      avaliadoEm: '2026-06-19T12:00:00.000Z',
      avaliadoPor: 'Ana',
    })
    expect(q?.dadosIncorretos).toBe(true)
    expect(q?.semGestorEmCopia).toBe(true)
    expect(countChamadoQualificacaoPontos(q!)).toBe(2)
  })

  it('detecta alteração no draft', () => {
    const a = { ...EMPTY_CHAMADO_QUALIFICACAO }
    const b = { ...EMPTY_CHAMADO_QUALIFICACAO, semRetorno: true }
    expect(chamadoQualificacaoIgual(a, b)).toBe(false)
  })
})
