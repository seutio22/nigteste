import { describe, expect, it } from 'vitest'
import { cloneCoparticipacao, emptyCoparticipacao } from './placementCoparticipacao'

describe('cloneCoparticipacao', () => {
  it('copia estrutura completa sem compartilhar referência', () => {
    const origem = emptyCoparticipacao()
    origem.possui = true
    origem.formaCobranca = 'valor'
    origem.linhas.consultas_eletivas = { valor: '50', limitador: '100' }
    origem.internacao = { tipoCobranca: 'percentual', valor: '10', limitador: '500' }

    const copia = cloneCoparticipacao(origem)

    expect(copia).toEqual(origem)
    expect(copia).not.toBe(origem)
    expect(copia.linhas).not.toBe(origem.linhas)
    expect(copia.linhas.consultas_eletivas).not.toBe(origem.linhas.consultas_eletivas)

    copia.linhas.consultas_eletivas.valor = '99'
    expect(origem.linhas.consultas_eletivas.valor).toBe('50')
  })
})
