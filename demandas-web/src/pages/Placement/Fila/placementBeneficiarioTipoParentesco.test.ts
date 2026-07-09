import { describe, expect, it } from 'vitest'
import { isGrauParentescoConhecido, resolveTipoParentesco } from './placementBeneficiarioTipoParentesco'

describe('resolveTipoParentesco', () => {
  it('mapeia graus simples da tabela', () => {
    expect(resolveTipoParentesco('TITULAR')).toBe('T')
    expect(resolveTipoParentesco('CONJUGE')).toBe('D')
    expect(resolveTipoParentesco('AGREGADO')).toBe('A')
    expect(resolveTipoParentesco('Filho (a)')).toBe('D')
    expect(resolveTipoParentesco('Filho(a)')).toBe('D')
  })

  it('usa sufixo (T)/(C)/(F)/(A)/(E)/(TUT)', () => {
    expect(resolveTipoParentesco('CRONICO (T)')).toBe('T')
    expect(resolveTipoParentesco('CRONICO (C)')).toBe('D')
    expect(resolveTipoParentesco('CRONICO (A)')).toBe('A')
    expect(resolveTipoParentesco('TEA (TUT)')).toBe('D')
    expect(resolveTipoParentesco('OUTROS (A)')).toBe('A')
    expect(resolveTipoParentesco('REMIDO (A)')).toBe('A')
  })

  it('retorna null para vazio ou desconhecido', () => {
    expect(resolveTipoParentesco('')).toBeNull()
    expect(resolveTipoParentesco('XYZ INVALIDO')).toBeNull()
    expect(isGrauParentescoConhecido('XYZ INVALIDO')).toBe(false)
  })
})
