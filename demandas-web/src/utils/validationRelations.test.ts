import { describe, expect, it } from 'vitest'
import { resolveValidationRelationId } from './validationRelations'

describe('resolveValidationRelationId', () => {
  it('prioriza campo legado quando diverge do *Id stale (bug do contrato na validação)', () => {
    const entry = {
      contratoId: 'uuid-antigo',
      contrato: 'uuid-novo',
    }
    expect(resolveValidationRelationId(entry, 'contratoId', 'contrato')).toBe('uuid-novo')
  })

  it('usa contratoId quando legado não está definido', () => {
    const entry = { contratoId: 'uuid-antigo' }
    expect(resolveValidationRelationId(entry, 'contratoId', 'contrato')).toBe('uuid-antigo')
  })

  it('extrai id de objeto aninhado no legado', () => {
    const entry = {
      contratoId: 'uuid-antigo',
      contrato: { id: 'uuid-novo', codigo: 'C-1' },
    }
    expect(resolveValidationRelationId(entry, 'contratoId', 'contrato')).toBe('uuid-novo')
  })

  it('retorna undefined quando contrato foi limpo e não há fallback útil', () => {
    const entry = { contratoId: 'uuid-antigo', contrato: undefined }
    expect(resolveValidationRelationId(entry, 'contratoId', 'contrato')).toBe('uuid-antigo')
  })
})
