import { describe, expect, it } from 'vitest'
import {
  emptyCoberturasEspeciaisItens,
  marcarTodasCoberturasEspeciaisNao,
} from './placementCoberturasEspeciais'

describe('marcarTodasCoberturasEspeciaisNao', () => {
  it('marca não em todos os itens e limpa planos e detalhes', () => {
    const itens = emptyCoberturasEspeciaisItens().map((item, idx) =>
      idx === 0
        ? { ...item, possui: 'sim' as const, planosIds: ['pl-1'], detalhe: 'Detalhe' }
        : item
    )
    const next = marcarTodasCoberturasEspeciaisNao({ itens })
    expect(next.itens.every((i) => i.possui === 'nao')).toBe(true)
    expect(next.itens.every((i) => i.planosIds.length === 0 && i.detalhe === '')).toBe(true)
  })
})
