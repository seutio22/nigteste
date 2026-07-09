import { describe, expect, it } from 'vitest'
import { kickOffStableKey } from './usePlacementFieldDraft'

describe('usePlacementFieldDraft helpers', () => {
  it('kickOffStableKey serializa objetos de forma estável', () => {
    expect(kickOffStableKey({ a: 1 })).toBe('{"a":1}')
    expect(kickOffStableKey({ a: 1 })).toBe(kickOffStableKey({ a: 1 }))
  })

  it('kickOffStableKey detecta mudança', () => {
    expect(kickOffStableKey({ a: 1 })).not.toBe(kickOffStableKey({ a: 2 }))
  })
})
