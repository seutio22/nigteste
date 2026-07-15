import { describe, expect, it } from 'vitest'
import {
  parseReembolsoPropostaFields,
  reembolsoSimNaoLabel,
  resolveReembolsoConsultaComparativo,
  temReembolsoFromValor,
} from './placementReembolsoConsulta'

describe('placementReembolsoConsulta', () => {
  it('normaliza Sim e Não', () => {
    expect(reembolsoSimNaoLabel('Sim')).toBe('Sim')
    expect(reembolsoSimNaoLabel('Não')).toBe('Não')
    expect(temReembolsoFromValor('Sim')).toBe(true)
    expect(temReembolsoFromValor('Não')).toBe(false)
  })

  it('migra legado com valor em reembolsoConsulta', () => {
    expect(parseReembolsoPropostaFields('', 'R$ 90,00')).toEqual({
      reembolso: 'Sim',
      reembolsoConsulta: 'R$ 90,00',
    })
    expect(parseReembolsoPropostaFields('Não', 'R$ 90,00')).toEqual({
      reembolso: 'Não',
      reembolsoConsulta: 'R$ 90,00',
    })
  })

  it('monta exibição do comparativo', () => {
    const comValor = resolveReembolsoConsultaComparativo('Sim', '90,00')
    expect(comValor.temReembolso).toBe(true)
    expect(comValor.valorDisplay).toContain('90')

    const sem = resolveReembolsoConsultaComparativo('Não', '')
    expect(sem.temReembolso).toBe(false)
    expect(sem.valorDisplay).toBe('—')
  })
})
