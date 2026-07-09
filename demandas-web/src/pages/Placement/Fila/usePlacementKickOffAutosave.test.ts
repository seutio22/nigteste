import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { kickOffStableKey } from './usePlacementFieldDraft'

vi.mock('../../../lib/api.local', () => ({
  api: { put: vi.fn().mockResolvedValue({ kickOffEstrategia: {} }) },
}))

describe('usePlacementKickOffAutosave (contrato de skip)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('kickOffStableKey evita PUT quando payload não mudou', () => {
    const kickOff = { secoes: [], mercadoAnalisado: ['AMIL'] }
    const key1 = kickOffStableKey(kickOff)
    const key2 = kickOffStableKey({ ...kickOff })
    expect(key1).toBe(key2)
  })

  it('kickOffStableKey muda quando aguardandoOperadora é alterado', () => {
    const base = { secoes: [], mercadoAnalisado: ['AMIL'] }
    const changed = {
      ...base,
      aguardandoOperadora: { fornecedores: {}, propostas: {}, quadroMercado: {} },
    }
    expect(kickOffStableKey(base)).not.toBe(kickOffStableKey(changed))
  })
})
