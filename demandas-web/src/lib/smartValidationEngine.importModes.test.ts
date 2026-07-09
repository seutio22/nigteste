import { describe, expect, it } from 'vitest'
import { SmartValidationEngine } from './smartValidationEngine'
import { smartImporterConfigs } from '../config/smartImporterConfigs'

const solicitantesConfig = smartImporterConfigs.solicitantes

const masterData = {
  solicitantes: [
    { id: 's1', nome: 'Ana Silva', email: 'ana@empresa.com' },
    { id: 's2', nome: 'Bruno', email: 'bruno@empresa.com' },
  ],
}

describe('SmartValidationEngine import modes (solicitantes)', () => {
  const engine = new SmartValidationEngine(solicitantesConfig, masterData)

  it('insert: ignora e-mail já cadastrado', () => {
    const result = engine.processItems(
      [
        { nome: 'Ana Atualizada', email: 'ana@empresa.com' },
        { nome: 'Carlos', email: 'carlos@empresa.com' },
      ],
      'insert',
    )

    expect(result.validCount).toBe(1)
    expect(result.duplicateCount).toBe(1)
    expect(result.valid[0].importAction).toBe('insert')
    expect(result.valid[0].data.email).toBe('carlos@empresa.com')
  })

  it('update: atualiza existente e ignora e-mail novo', () => {
    const result = engine.processItems(
      [
        { nome: 'Ana Atualizada', email: 'ana@empresa.com' },
        { nome: 'Carlos', email: 'carlos@empresa.com' },
      ],
      'update',
    )

    expect(result.validCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(result.valid[0].importAction).toBe('update')
    expect(result.valid[0].existingId).toBe('s1')
  })

  it('upsert: inclui novo e marca existente para atualização', () => {
    const result = engine.processItems(
      [
        { nome: 'Ana Atualizada', email: 'ana@empresa.com' },
        { nome: 'Carlos', email: 'carlos@empresa.com' },
      ],
      'upsert',
    )

    expect(result.validCount).toBe(2)
    expect(result.insertCount).toBe(1)
    expect(result.updateCount).toBe(1)
    expect(result.valid.find((item) => item.importAction === 'update')?.existingId).toBe('s1')
  })
})

describe('SmartValidationEngine import modes (clientes)', () => {
  const engine = new SmartValidationEngine(smartImporterConfigs.clientes, {
    clientes: [
      { id: 'c1', nome: 'Empresa A', grupoEconomico: 'Grupo 1' },
    ],
  })

  it('update: atualiza cliente existente pelo nome', () => {
    const result = engine.processItems(
      [{ nome: 'Empresa A', grupoEconomico: 'Grupo Novo' }],
      'update',
    )

    expect(result.validCount).toBe(1)
    expect(result.valid[0].importAction).toBe('update')
    expect(result.valid[0].existingId).toBe('c1')
  })
})
