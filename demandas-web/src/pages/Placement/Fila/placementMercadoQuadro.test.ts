import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { EMPTY_DADOS_FINANCEIROS } from './placementCotacaoFinanceiro'
import {
  buildMercadoQuadroBuckets,
  mercadoNomesComFornecedoresAtuais,
} from './placementMercadoQuadro'
import { ensureAguardandoOperadoraState } from './placementAguardandoOperadora'
const operadoras = [
  { id: 'op-atual', nome: 'AMIL' },
  { id: 'op-merc', nome: 'SULAMÉRICA' },
]

describe('mercadoNomesComFornecedoresAtuais', () => {
  it('inclui fornecedor da entrada mesmo fora do mercado analisado', () => {
    const form = {
      itens: [{ id: 'r1', fornecedorId: 'op-atual', categoria: 'Saúde', produtoNome: '' }],
      operadorasSugestaoIds: [],
      kickOffEstrategia: { secoes: [], mercadoAnalisado: ['SULAMÉRICA'], notas: '' },
      planos: [],
      dadosFinanceiros: EMPTY_DADOS_FINANCEIROS,
    } as CotacaoFormState

    expect(mercadoNomesComFornecedoresAtuais(form, operadoras)).toEqual(['AMIL', 'SULAMÉRICA'])
  })

  it('coloca fornecedor atual no bucket correto do quadro', () => {
    const form = {
      itens: [{ id: 'r1', fornecedorId: 'op-atual', categoria: 'Saúde', produtoNome: '' }],
      operadorasSugestaoIds: [],
      kickOffEstrategia: { secoes: [], mercadoAnalisado: ['SULAMÉRICA'], notas: '' },
      planos: [],
      dadosFinanceiros: EMPTY_DADOS_FINANCEIROS,
    } as CotacaoFormState

    const state = ensureAguardandoOperadoraState(null, form, operadoras)
    const buckets = buildMercadoQuadroBuckets(form, state, operadoras)
    expect(buckets.fornecedorAtual).toContain('AMIL')
    expect(buckets.mercadoConsultado).toContain('SULAMÉRICA')
  })
})
