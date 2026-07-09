import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { patchKickOffInForm } from './placementPatchKickOff'

describe('patchKickOffInForm', () => {
  it('mescla aguardandoOperadora no kickOff', () => {
    const form = {
      kickOffEstrategia: { secoes: [], mercadoAnalisado: ['AMIL'] },
    } as CotacaoFormState
    const next = patchKickOffInForm(
      form,
      { aguardandoOperadora: { fornecedores: {}, propostas: {}, quadroMercado: {} } as any },
      ['AMIL']
    )
    expect(next.kickOffEstrategia?.aguardandoOperadora).toBeDefined()
    expect(next.kickOffEstrategia?.mercadoAnalisado).toEqual(['AMIL'])
  })
})
