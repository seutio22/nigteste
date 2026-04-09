import { describe, it, expect } from 'vitest'
import { tagsFromFormCsv } from './tagHelpers'

describe('tagsFromFormCsv', () => {
  it('divide por vírgula e remove espaços', () => {
    expect(tagsFromFormCsv('a, b, c')).toEqual(['a', 'b', 'c'])
  })

  it('ignora entradas vazias', () => {
    expect(tagsFromFormCsv('x,, y,')).toEqual(['x', 'y'])
  })

  it('aceita string vazia', () => {
    expect(tagsFromFormCsv('')).toEqual([])
  })

  it('aceita undefined/null via coerção', () => {
    expect(tagsFromFormCsv(null as unknown as string)).toEqual([])
  })
})
