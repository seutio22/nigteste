import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { EMPTY_DADOS_FINANCEIROS } from './placementCotacaoFinanceiro'
import { buildScopedSavePayload } from './placementCotacaoSavePayload'

const baseForm = {
  ticket: 'TK-1',
  status: 'Kick off',
  analistaId: 'a1',
  analistaResponsavelId: 'ar1',
  clienteTipo: 'casa',
  condicaoId: 'c1',
  filialId: 'f1',
  observacoes: 'obs',
  itens: [],
  planos: [],
  formularioTipo: 'saude',
  dadosFinanceiros: EMPTY_DADOS_FINANCEIROS,
  kickOffEstrategia: { secoes: [], mercadoAnalisado: ['AMIL'], notas: '' },
} as CotacaoFormState

describe('buildScopedSavePayload', () => {
  it('kick_off envia analista, temperatura e observações (sem estratégia)', () => {
    const payload = buildScopedSavePayload(
      { ...baseForm, temperaturaId: 'temp-1' },
      {
        scope: 'kick_off',
        isDraft: false,
      }
    )
    expect(payload).toEqual({
      analistaResponsavelId: 'ar1',
      temperaturaId: 'temp-1',
      observacoes: 'obs',
    })
    expect(payload).not.toHaveProperty('kickOffEstrategia')
    expect(payload).not.toHaveProperty('itensMapeamento')
    expect(payload).not.toHaveProperty('planosCobertura')
  })

  it('estrategia envia observações e kickOff', () => {
    const payload = buildScopedSavePayload(
      { ...baseForm, status: 'Estratégia' },
      { scope: 'estrategia', isDraft: false }
    )
    expect(payload).toEqual({
      observacoes: 'obs',
      kickOffEstrategia: baseForm.kickOffEstrategia,
    })
  })

  it('observacoes_only envia observações e kickOff', () => {
    const payload = buildScopedSavePayload(
      { ...baseForm, status: 'Aguardando operadora' },
      { scope: 'observacoes_only', isDraft: false }
    )
    expect(payload.observacoes).toBe('obs')
    expect(payload.kickOffEstrategia).toBeDefined()
    expect(payload).not.toHaveProperty('filialId')
  })

  it('editingAbertura força payload completo (sem planos no escopo kick_off)', () => {
    const payload = buildScopedSavePayload(baseForm, {
      scope: 'kick_off',
      isDraft: false,
      editingAbertura: true,
    })
    expect(payload).toHaveProperty('filialId', 'f1')
    expect(payload).toHaveProperty('kickOffEstrategia')
  })
})
