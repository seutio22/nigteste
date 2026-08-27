import { describe, expect, it } from 'vitest'
import { ensureAtividadesPorEtapaWorkflow } from './placementCronogramaDefaults'
import { buildCronogramaTree } from './placementCronograma'

describe('placementCronogramaDefaults', () => {
  it('preenche todas as etapas do workflow quando template vazio', () => {
    const atividades = ensureAtividadesPorEtapaWorkflow([])
    expect(atividades.length).toBeGreaterThanOrEqual(10)
    const etapas = buildCronogramaTree(atividades, { dataInicioProcesso: '2026-01-10', linhas: [] })
    expect(etapas).toHaveLength(10)
    expect(etapas[0].etapaLabel).toBe('Premissa')
    expect(etapas[9].etapaLabel).toBe('Fechada')
  })
})
