import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import { emptyPropostaPlanoLinha } from './placementAguardandoOperadora'
import { alinharPropostaPorEquivalencia, planosReferenciaAbertura, propostaPatchFromReferencia, propostaPlanoLinhaIsPristine } from './placementPropostaEquivalencia'
import { ordenarEntradasPorEquivalencia, coletarEntradasComparativo } from './placementPropostaComparativo'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [{ id: 'op-amil', nome: 'AMIL' }]

function formBase(): CotacaoFormState {
  return {
    ticket: 'TK-1',
    status: 'Aguardando operadora',
    analistaId: '',
    analistaResponsavelId: '',
    clienteTipo: 'casa',
    grupoEconomico: '',
    clienteId: '',
    condicaoId: '',
    filialId: '',
    corretorParceiroId: '',
    projetoId: '',
    pedidoId: '',
    solicitante: '',
    temperaturaId: '',
    prospectId: '',
    operadorasSugestaoIds: ['op-amil'],
    itens: [
      {
        id: 'item-1',
        produtoId: 'p1',
        produtoNome: 'Saúde',
        fornecedorId: 'op-amil',
        fornecedorNome: 'AMIL',
      },
    ],
    planos: [
      {
        id: 'plano-ref',
        itemRowId: 'item-1',
        nomePlano: 'Premium',
        acomodacao: 'Apartamento',
        abrangencia: 'Nacional',
        elegibilidade: 'Todos',
        numeroVidas: '50',
        tipoCusto: 'per_capita',
        custoPerCapitaBRL: '400,00',
        custosFaixa: emptyCustosFaixa(),
        vidasFaixa: emptyVidasFaixa(),
        coparticipacao: { possui: false, formaCobranca: 'percentual', linhas: {}, internacao: { valor: '' } },
      },
    ],
    coparticipacaoDetalhePorPlanos: '',
    upgradeDowngradePorPlano: {
      permiteUpgrade: '',
      planosIdsUpgrade: [],
      regraUpgrade: '',
      permiteDowngrade: '',
      planosIdsDowngrade: [],
      regraDowngrade: '',
    },
    reembolsoPorPlano: {
      necessitaEquiparar: '',
      detalheEquiparacao: '',
      planosIds: [],
      valores: {},
      prazosPorPlano: {},
      procedimentosCustomizados: [],
    },
    coberturasEspeciais: { itens: [] },
    dadosFinanceiros: {
      atual: { comissaoVitalicioContrato: '', participacao: { mds: '', corretorParceiro: '' } },
      estudo: { comissaoAgenciamento: '', comissaoVitalicio: '', participacao: { mds: '', corretorParceiro: '' } },
    },
    dataInicio: '',
    dataLimite: '',
    descricao: '',
    observacoes: '',
    vigenciaApolice: '',
    tipoContratacaoId: '',
    modalidadeContratoId: '',
    prazoVigenciaContratoId: '',
    breakEven: '',
    formularioTipo: 'saude',
    multaRescisaoContratual: '',
    multaRescisaoValor: '',
    multaRescisaoRegra: '',
    multaRescisaoAvisoPrevio: '',
    possuiConvencaoColetiva: '',
    convencaoColetivaDetalhe: '',
    subfaturasDraft: [],
    kickOffEstrategia: {
      ...emptyKickOffEstrategia(),
      mercadoAnalisado: ['AMIL', 'KOVR SEGURADORA'],
      aguardandoOperadora: {
        fornecedores: {},
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {
          'kovr seguradora': {
            incluirNoComparativo: true,
            planos: [
              {
                ...emptyPropostaPlanoLinha(),
                id: 'oferta-1',
                planoReferenciaId: 'plano-ref',
                nomePlano: 'Direto Nacional',
                tipoCusto: 'per_capita',
                numeroVidas: '50',
                custoPerCapitaBRL: '350,00',
              },
            ],
          },
        },
      },
    },
  }
}

describe('placementPropostaEquivalencia', () => {
  it('lista planos de referência da abertura', () => {
    const refs = planosReferenciaAbertura(formBase(), operadoras)
    expect(refs.length).toBe(1)
    expect(refs[0].label).toContain('Premium')
  })

  it('alinha proposta mercado 1:1 com planos do contrato', () => {
    const refs = planosReferenciaAbertura(formBase(), operadoras)
    const aligned = alinharPropostaPorEquivalencia(
      { incluirNoComparativo: true, planos: [emptyPropostaPlanoLinha()] },
      refs
    )
    expect(aligned.planos.length).toBe(1)
    expect(aligned.planos[0].planoReferenciaId).toBe('plano-ref')
  })

  it('propostaPlanoLinhaIsPristine aceita nome com espaços sem realinhar', () => {
    const linha = { ...emptyPropostaPlanoLinha(), nomePlano: ' ' }
    expect(propostaPlanoLinhaIsPristine(linha)).toBe(false)
  })

  it('propostaPatchFromReferencia copia vidas e acomodação da abertura, sem valores de custo', () => {
    const form = formBase()
    const refs = planosReferenciaAbertura(form, operadoras)
    const patch = propostaPatchFromReferencia(refs[0], form.planos)
    expect(patch.numeroVidas).toBe('50')
    expect(patch.planoReferenciaId).toBe('plano-ref')
    expect(patch.acomodacao).toBe('Apartamento')
    expect(patch.custoPerCapitaBRL).toBe('')
    expect(patch.nomePlano).toBeUndefined()
  })

  it('alinhar proposta mercado copia vidas por faixa etária e acomodação da abertura', () => {
    const form = formBase()
    form.planos = [
      {
        ...form.planos[0],
        tipoCusto: 'faixa_etaria',
        numeroVidas: '',
        custoPerCapitaBRL: '',
        acomodacao: 'Enfermaria',
        vidasFaixa: { ...emptyVidasFaixa(), '19-23': '12', '24-28': '8' },
        custosFaixa: { ...emptyCustosFaixa(), '19-23': '280,00' },
      },
    ]
    const refs = planosReferenciaAbertura(form, operadoras)
    const aligned = alinharPropostaPorEquivalencia(
      { incluirNoComparativo: true, planos: [emptyPropostaPlanoLinha()] },
      refs
    )
    expect(aligned.planos[0].vidasFaixa['19-23']).toBe('12')
    expect(aligned.planos[0].vidasFaixa['24-28']).toBe('8')
    expect(aligned.planos[0].acomodacao).toBe('Enfermaria')
    expect(aligned.planos[0].custosFaixa['19-23']).toBe('')
  })

  it('ordena colunas: plano ref → cenário atual → mercado', () => {
    const form = formBase()
    const refs = planosReferenciaAbertura(form, operadoras)
    const entradas = coletarEntradasComparativo(form, operadoras)
    const sorted = ordenarEntradasPorEquivalencia(entradas, refs)
    const mercado = sorted.filter((e) => e.grupo === 'mercado')
    expect(mercado.length).toBeGreaterThan(0)
    expect(mercado[0].planoReferenciaId).toBe('plano-ref')
    const idxAtual = sorted.findIndex((e) => e.grupo === 'atual')
    const idxMercado = sorted.findIndex((e) => e.grupo === 'mercado')
    if (idxAtual >= 0 && idxMercado >= 0) {
      expect(idxAtual).toBeLessThan(idxMercado)
    }
  })
})
