import { describe, expect, it } from 'vitest'
import {
  appendEstrategiaTextTool,
  duplicateEstrategiaItem,
  estrategiaTextRows,
  formatAberturaValorParaEstrategia,
  moveEstrategiaItem,
} from './placementEstrategiaEditor'
import { createKickOffItem } from './placementKickOffEstrategia'

describe('placementEstrategiaEditor', () => {
  it('calcula linhas conforme quebras e tamanho', () => {
    expect(estrategiaTextRows('')).toBe(2)
    expect(estrategiaTextRows('a\nb\nc')).toBeGreaterThanOrEqual(3)
  })

  it('move e duplica itens', () => {
    const a = createKickOffItem('A', '1')
    const b = createKickOffItem('B', '2')
    const moved = moveEstrategiaItem([a, b], b.id, -1)
    expect(moved[0].rotulo).toBe('B')
    const duped = duplicateEstrategiaItem([a], a.id)
    expect(duped).toHaveLength(2)
    expect(duped[1].rotulo).toBe('A')
    expect(duped[1].id).not.toBe(a.id)
  })

  it('adiciona marcadores em nova linha', () => {
    expect(appendEstrategiaTextTool('', 'bullet')).toBe('• ')
    expect(appendEstrategiaTextTool('Linha 1', 'bullet')).toBe('Linha 1\n• ')
  })

  it('formata valor da abertura com quebras', () => {
    expect(formatAberturaValorParaEstrategia('A · B')).toBe('A\nB')
    expect(formatAberturaValorParaEstrategia('—')).toBe('')
  })
})
