import { describe, expect, it } from 'vitest'
import {
  headersFromFieldHeaderMap,
  mergeFieldHeaderMaps,
} from './placementBeneficiariosMappingStore'

describe('mergeFieldHeaderMaps', () => {
  it('mantém auto-mapeamento quando não há histórico salvo', () => {
    const auto = { nome: 'Nome', matricula: 'Matricula' }
    expect(mergeFieldHeaderMaps(null, auto, ['Nome', 'Matricula', 'Extra'])).toEqual(auto)
  })

  it('sobrescreve com mapeamento salvo quando o cabeçalho existe na nova planilha', () => {
    const saved = { nome: 'NOME COMPLETO', matricula: 'MAT' }
    const auto = { nome: 'Nome', matricula: 'Matricula' }
    const merged = mergeFieldHeaderMaps(saved, auto, ['NOME COMPLETO', 'Matricula'])
    expect(merged.nome).toBe('NOME COMPLETO')
    expect(merged.matricula).toBe('Matricula')
  })

  it('ignora cabeçalho salvo ausente na nova planilha', () => {
    const saved = { nome: 'Coluna antiga' }
    const auto = { nome: 'Nome' }
    const merged = mergeFieldHeaderMaps(saved, auto, ['Nome'])
    expect(merged.nome).toBe('Nome')
  })
})

describe('headersFromFieldHeaderMap', () => {
  it('extrai cabeçalhos únicos do mapeamento', () => {
    expect(
      headersFromFieldHeaderMap({
        nome: 'NOME',
        matricula: 'MAT',
        empresa: 'NOME',
      })
    ).toEqual(['NOME', 'MAT'])
  })
})
