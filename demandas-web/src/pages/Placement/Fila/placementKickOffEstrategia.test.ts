import { describe, expect, it } from 'vitest'
import { EMPTY_COTACAO_FORM } from './CotacaoFormFields'
import {
  buildDefaultKickOffEstrategia,
  kickOffEstrategiaIsComplete,
  parseKickOffEstrategiaFromApi,
} from './placementKickOffEstrategia'
import { nextMainFlowStatus, previousMainFlowStatus } from './placementCotacaoWorkflow'

describe('placementKickOffEstrategia', () => {
  it('gera modelo com rótulos de referência e campos da abertura', () => {
    const estrategia = buildDefaultKickOffEstrategia(
      { ...EMPTY_COTACAO_FORM, operadorasSugestaoIds: ['op-1'] },
      {
        tipoContratacao: 'Compulsório',
        modalidadeContrato: 'Adesão',
        breakEven: 'Sim',
        operadorasSugestaoNomes: ['Operadora A'],
      }
    )
    expect(estrategia.secoes.length).toBeGreaterThanOrEqual(2)
    expect(estrategia.mercadoAnalisado).toEqual(['Operadora A'])

    const premissas = estrategia.secoes.find((s) => s.titulo.includes('Premissas'))
    expect(premissas?.itens.find((i) => i.rotulo === 'Motivo da cotação')?.valor).toBe('')
    expect(
      premissas?.itens.find((i) => i.rotulo === 'Carregamento Comercial desejado')?.valor
    ).toBe('')

    const condicoes = estrategia.secoes.find((s) => s.titulo.includes('Condições'))
    expect(condicoes?.itens.find((i) => i.rotulo === 'Tipo de Contratação')?.valor).toBe(
      'Compulsório'
    )
    expect(condicoes?.itens.find((i) => i.rotulo === 'Modalidade de contrato')?.valor).toBe('Adesão')
    expect(condicoes?.itens.find((i) => i.rotulo === 'Break even')?.valor).toBe('Sim')

    expect(kickOffEstrategiaIsComplete(estrategia)).toBe(false)
  })

  it('considera estratégia completa com premissas e mercado', () => {
    const estrategia = buildDefaultKickOffEstrategia(EMPTY_COTACAO_FORM, {
      operadorasSugestaoNomes: ['Amil'],
    })
    const premissas = estrategia.secoes.find((s) => s.titulo.includes('Premissas'))
    premissas?.itens.forEach((i) => {
      i.valor = 'Preenchido'
    })
    expect(kickOffEstrategiaIsComplete(estrategia)).toBe(true)
  })

  it('parseia payload da API', () => {
    const parsed = parseKickOffEstrategiaFromApi({
      secoes: [
        {
          id: 's1',
          titulo: 'Premissas',
          itens: [
            { id: 'i1', rotulo: 'Motivo da cotação', valor: 'Teste' },
            { id: 'i2', rotulo: 'Carregamento Comercial desejado', valor: '10%' },
          ],
        },
      ],
      mercadoAnalisado: ['Amil'],
    })
    expect(parsed.secoes[0].titulo).toBe('Premissas')
    expect(kickOffEstrategiaIsComplete(parsed)).toBe(true)
  })
})

describe('workflow Kick off', () => {
  it('avança de Aberta para Kick off', () => {
    expect(nextMainFlowStatus('Aberta')).toBe('Kick off')
  })

  it('avança de Kick off para Em cotação', () => {
    expect(nextMainFlowStatus('Kick off')).toBe('Em cotação')
  })

  it('retrocede de Kick off para Aberta', () => {
    expect(previousMainFlowStatus('Kick off')).toBe('Aberta')
  })

  it('retrocede de Em cotação para Kick off', () => {
    expect(previousMainFlowStatus('Em cotação')).toBe('Kick off')
  })
})
