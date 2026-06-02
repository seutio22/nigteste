import { describe, expect, it } from 'vitest'
import { computeLocalidadeResumo } from './placementBeneficiariosLocalidade'
import type { PlacementBeneficiario } from './placementBeneficiarios'

function row(partial: Partial<PlacementBeneficiario>): PlacementBeneficiario {
  return {
    id: '1',
    cotacaoId: 'c1',
    ...partial,
  }
}

describe('computeLocalidadeResumo', () => {
  it('ranqueia municípios e calcula demais localidades', () => {
    const rows = [
      row({ uf: 'RJ', cidade: 'Rio de Janeiro' }),
      row({ uf: 'RJ', cidade: 'Rio de Janeiro' }),
      row({ uf: 'SP', cidade: 'Sao Paulo' }),
      row({ uf: 'SP', cidade: 'Sao Paulo' }),
      row({ uf: 'SP', cidade: 'Sao Paulo' }),
      row({ uf: 'PE', cidade: 'Recife' }),
    ]
    const r = computeLocalidadeResumo(rows)
    expect(r.total).toBe(6)
    expect(r.topMunicipios[0].municipio).toBe('Sao Paulo')
    expect(r.topMunicipios[0].vidas).toBe(3)
    expect(r.demaisLocalidades.vidas).toBe(0)
    expect(r.porUf.find((u) => u.uf === 'SP')?.vidas).toBe(3)
  })

  it('normaliza UF por nome completo', () => {
    const r = computeLocalidadeResumo([row({ uf: 'Rio de Janeiro', cidade: 'Niterói' })])
    expect(r.porUf[0].uf).toBe('RJ')
  })
})
