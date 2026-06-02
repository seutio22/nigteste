import { describe, expect, it } from 'vitest'
import { computeBeneficiariosResumo } from './placementBeneficiariosResumo'
import type { PlacementBeneficiario } from './placementBeneficiarios'

function row(partial: Partial<PlacementBeneficiario>): PlacementBeneficiario {
  return {
    ordem: 1,
    empresa: null,
    sub: null,
    cnpj: null,
    matricula: null,
    sexo: null,
    nome: null,
    dataNascimento: null,
    grauParentesco: null,
    statusBeneficiario: null,
    planoAtual: null,
    custoPerCapita: null,
    cid10: null,
    motivoAfastamento: null,
    ...partial,
  }
}

describe('computeBeneficiariosResumo', () => {
  it('calcula totais, sexo e potencial gestacional', () => {
    const rows = [
      row({ sexo: 'M', dataNascimento: '1990-05-01', grauParentesco: 'Titular' }),
      row({ sexo: 'F', dataNascimento: '2000-01-15', grauParentesco: 'Titular' }),
      row({ sexo: 'F', dataNascimento: '2010-06-01', grauParentesco: 'Filho(a)' }),
    ]
    const r = computeBeneficiariosResumo(rows)
    expect(r.total).toBe(3)
    expect(r.sexoM).toBe(1)
    expect(r.sexoF).toBe(2)
    expect(r.potencialGestacional).toBe(1)
    expect(r.titulares).toBe(2)
    expect(r.dependentes).toBe(1)
  })

  it('classifica afastados e agrupa planos', () => {
    const rows = [
      row({
        sexo: 'M',
        statusBeneficiario: 'Afastado',
        planoAtual: 'Plano A',
        grauParentesco: 'Titular',
        dataNascimento: '1985-01-01',
      }),
      row({
        sexo: 'F',
        statusBeneficiario: 'Ativo',
        planoAtual: 'Plano A',
        grauParentesco: 'Titular',
        dataNascimento: '1990-01-01',
      }),
    ]
    const r = computeBeneficiariosResumo(rows)
    expect(r.categorias.afastados).toBe(1)
    expect(r.categorias.demais).toBe(1)
    expect(r.planos).toHaveLength(1)
    expect(r.planos[0].quantidade).toBe(2)
  })
})
