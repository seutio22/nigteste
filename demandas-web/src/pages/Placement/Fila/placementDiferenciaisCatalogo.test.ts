import { describe, expect, it } from 'vitest'
import {
  DIFERENCIAL_ITENS,
  listDiferencialItens,
  resolveDiferencialItemKey,
  slugifyDiferencialLabel,
} from './placementDiferenciaisCatalogo'

describe('placementDiferenciaisCatalogo', () => {
  it('inclui os novos itens de diferencial', () => {
    const keys = DIFERENCIAL_ITENS.map((i) => i.key)
    expect(keys).toContain('sala_vip')
    expect(keys).toContain('servicos_especiais_concierge')
    expect(keys).toContain('medicos_exclusivos')
    expect(keys).toContain('cobertura_ocupacional')
    expect(keys).toContain('programa_acoes_saude')
    expect(listDiferencialItens()).toHaveLength(14)
  })

  it('resolve rótulos dos novos itens', () => {
    expect(resolveDiferencialItemKey('SALA VIP')).toBe('sala_vip')
    expect(resolveDiferencialItemKey('SERVIÇOS ESPECIAIS (CONCIERGE)')).toBe(
      'servicos_especiais_concierge'
    )
    expect(resolveDiferencialItemKey('MÉDICOS EXCLUSIVOS')).toBe('medicos_exclusivos')
    expect(resolveDiferencialItemKey('COBERTURA OCUPACIONAL')).toBe('cobertura_ocupacional')
    expect(resolveDiferencialItemKey('PROGRAMA E AÇÕES DE SAÚDE')).toBe('programa_acoes_saude')
  })

  it('slugifica rótulo para item custom', () => {
    expect(slugifyDiferencialLabel('Reembolso Internacional')).toBe('reembolso_internacional')
  })
})
