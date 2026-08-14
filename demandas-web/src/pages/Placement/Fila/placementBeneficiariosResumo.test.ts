import { describe, expect, it } from 'vitest'
import {
  computeBeneficiariosResumo,
  filterBeneficiariosForResumo,
  formatTitularidadeResumo,
  insightBeneficiariosResumo,
  toggleBeneficiariosFiltroValor,
} from './placementBeneficiariosResumo'
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
    expect(r.agregados).toBe(0)
    expect(r.titularidadeNaoClassificada).toBe(0)
  })

  it('conta agregados (tipo A) separado de titulares e dependentes', () => {
    const rows = [
      row({ grauParentesco: 'TITULAR' }),
      row({ grauParentesco: 'Filho (C)' }),
      row({ grauParentesco: 'AGREGADO' }),
      row({ grauParentesco: 'REMIDO (A)' }),
    ]
    const r = computeBeneficiariosResumo(rows)
    expect(r.titulares).toBe(1)
    expect(r.dependentes).toBe(1)
    expect(r.agregados).toBe(2)
  })

  it('cruza STATUS com titularidade em afastados', () => {
    const rows = [
      row({ statusBeneficiario: 'Afastado', grauParentesco: 'Titular' }),
      row({ statusBeneficiario: 'Afastado', grauParentesco: 'Filho (a)' }),
      row({ statusBeneficiario: 'Afastado', grauParentesco: 'Esposa' }),
    ]
    const r = computeBeneficiariosResumo(rows)
    expect(r.categorias.afastados).toBe(3)
    expect(r.categoriasPorTitularidade.afastados).toEqual({
      titulares: 1,
      dependentes: 2,
      agregados: 0,
      naoClassificada: 0,
    })
    expect(formatTitularidadeResumo(r.categoriasPorTitularidade.afastados)).toBe('T1 · D2')
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

describe('filterBeneficiariosForResumo', () => {
  it('ao filtrar titulares, recalcula faixas e planos só desse recorte', () => {
    const rows = [
      row({
        grauParentesco: 'Titular',
        planoAtual: 'Plano A',
        sexo: 'M',
        dataNascimento: '1980-01-01',
      }),
      row({
        grauParentesco: 'Titular',
        planoAtual: 'Plano B',
        sexo: 'F',
        dataNascimento: '1995-01-01',
      }),
      row({
        grauParentesco: 'Filho(a)',
        planoAtual: 'Plano A',
        sexo: 'M',
        dataNascimento: '2015-01-01',
      }),
    ]
    const filtered = filterBeneficiariosForResumo(rows, { titularidade: 'T' })
    const r = computeBeneficiariosResumo(filtered)
    expect(r.total).toBe(2)
    expect(r.titulares).toBe(2)
    expect(r.dependentes).toBe(0)
    expect(r.planos).toEqual([
      { plano: 'Plano A', quantidade: 1 },
      { plano: 'Plano B', quantidade: 1 },
    ])
    expect(insightBeneficiariosResumo(r, rows.length)).toContain('2 de 3 vidas')
  })

  it('toggle limpa a mesma dimensão ao clicar de novo', () => {
    const next = toggleBeneficiariosFiltroValor({ titularidade: 'T' }, 'titularidade', 'T')
    expect(next.titularidade).toBeUndefined()
  })
})
