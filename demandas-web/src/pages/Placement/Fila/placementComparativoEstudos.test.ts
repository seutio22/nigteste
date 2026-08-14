import { describe, expect, it } from 'vitest'
import {
  createComparativoEstudo,
  duplicateComparativoEstudo,
  emptyComparativoEstudoConfig,
  emptyPropostaFornecedor,
  emptyPropostaPlanoLinha,
  ensureComparativosEstudos,
  patchComparativoAtivoConfig,
  removeComparativoEstudo,
  renameComparativoEstudo,
  setComparativoAtivoId,
  stripPropostasToMatriz,
  type AguardandoOperadoraState,
  type PropostaFornecedorState,
} from './placementAguardandoOperadora'

function propostaComCusto(custo: string): PropostaFornecedorState {
  const plano = emptyPropostaPlanoLinha()
  return {
    ...emptyPropostaFornecedor(),
    planos: [{ ...plano, nomePlano: 'Empresa', custoPerCapitaBRL: custo, numeroVidas: '10' }],
  }
}

function baseState(partial?: Partial<AguardandoOperadoraState>): AguardandoOperadoraState {
  return {
    fornecedores: {},
    propostas: {},
    quadroMercado: {
      showFornecedorAtual: true,
      showMercadoConsultado: true,
      showForaPerfilDeclinado: true,
      showNaoApresentada: true,
    },
    comparativoConfig: emptyComparativoEstudoConfig(),
    ...partial,
  }
}

describe('comparativos com propostas por lançamento', () => {
  it('migra comparativoConfig + propostas legado para Comparativo 1', () => {
    const legado = {
      ...emptyComparativoEstudoConfig(),
      colunasOcultas: ['cv1-p1'],
      modoSlide: 'planos_empilhados' as const,
    }
    const propostas = { amil: propostaComCusto('100') }
    const ensured = ensureComparativosEstudos(
      baseState({ comparativoConfig: legado, propostas })
    )
    expect(ensured.comparativosEstudos).toHaveLength(1)
    expect(ensured.comparativosEstudos[0].nome).toBe('Comparativo 1')
    expect(ensured.comparativoConfig.colunasOcultas).toEqual(['cv1-p1'])
    expect(ensured.comparativosEstudos[0].propostas.amil.planos[0].custoPerCapitaBRL).toBe('100')
    expect(ensured.propostas.amil.planos[0].custoPerCapitaBRL).toBe('100')
  })

  it('duplica todos os dados com propostas independentes', () => {
    let state = {
      ...baseState({ propostas: { amil: propostaComCusto('200') } }),
      ...ensureComparativosEstudos(baseState({ propostas: { amil: propostaComCusto('200') } })),
    }
    state = patchComparativoAtivoConfig(state, {
      ...state.comparativoConfig,
      colunasOcultas: ['amil-sem'],
    })
    state = duplicateComparativoEstudo(state, 'completo')
    expect(state.comparativosEstudos).toHaveLength(2)
    expect(state.comparativosEstudos![1].nome).toContain('cópia')
    expect(state.comparativosEstudos![1].propostas.amil.planos[0].custoPerCapitaBRL).toBe('200')
    expect(state.comparativosEstudos![1].colunasOcultas).toEqual(['amil-sem'])

    state = {
      ...state,
      propostas: {
        amil: propostaComCusto('999'),
      },
    }
    state = { ...state, ...ensureComparativosEstudos(state) }
    expect(state.comparativosEstudos![1].propostas.amil.planos[0].custoPerCapitaBRL).toBe('999')
    expect(state.comparativosEstudos![0].propostas.amil.planos[0].custoPerCapitaBRL).toBe('200')
  })

  it('duplica só a matriz (sem custos)', () => {
    let state = {
      ...baseState({ propostas: { amil: propostaComCusto('350') } }),
      ...ensureComparativosEstudos(baseState({ propostas: { amil: propostaComCusto('350') } })),
    }
    state = duplicateComparativoEstudo(state, 'matriz')
    const matriz = state.comparativosEstudos![1].propostas.amil
    expect(matriz.planos[0].nomePlano).toBe('Empresa')
    expect(matriz.planos[0].custoPerCapitaBRL).toBe('')
    expect(matriz.planos[0].numeroVidas).toBe('')
    expect(state.propostas.amil.planos[0].custoPerCapitaBRL).toBe('')
  })

  it('troca de comparativo carrega propostas do ativo', () => {
    let state = {
      ...baseState({ propostas: { amil: propostaComCusto('10') } }),
      ...ensureComparativosEstudos(baseState({ propostas: { amil: propostaComCusto('10') } })),
    }
    state = createComparativoEstudo(state, { nome: 'Comparativo 2', modo: 'matriz' })
    const id2 = state.comparativoAtivoId!
    expect(state.propostas.amil.planos[0].custoPerCapitaBRL).toBe('')

    const id1 = state.comparativosEstudos![0].id
    state = setComparativoAtivoId(state, id1)
    expect(state.comparativoAtivoId).toBe(id1)
    expect(state.propostas.amil.planos[0].custoPerCapitaBRL).toBe('10')

    state = setComparativoAtivoId(state, id2)
    expect(state.propostas.amil.planos[0].custoPerCapitaBRL).toBe('')
  })

  it('cria, renomeia e remove comparativos', () => {
    let state = { ...baseState(), ...ensureComparativosEstudos(baseState()) }
    state = createComparativoEstudo(state, { nome: 'Custos modestos', modo: 'matriz' })
    expect(state.comparativosEstudos).toHaveLength(2)
    expect(state.comparativoAtivoId).toBe(state.comparativosEstudos![1].id)

    state = renameComparativoEstudo(state, state.comparativoAtivoId!, 'Modestos')
    expect(state.comparativosEstudos![1].nome).toBe('Modestos')

    const primeiro = state.comparativosEstudos![0].id
    state = setComparativoAtivoId(state, primeiro)
    expect(state.comparativoAtivoId).toBe(primeiro)

    const segundo = state.comparativosEstudos![1].id
    state = removeComparativoEstudo(state, segundo)
    expect(state.comparativosEstudos).toHaveLength(1)
    expect(state.comparativoAtivoId).toBe(primeiro)
  })

  it('stripPropostasToMatriz limpa custos e preserva nomes', () => {
    const stripped = stripPropostasToMatriz({ x: propostaComCusto('88') })
    expect(stripped.x.planos[0].nomePlano).toBe('Empresa')
    expect(stripped.x.planos[0].custoPerCapitaBRL).toBe('')
  })
})
