import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import {
  applyReajusteToPlano,
  buildCenarioFromAbertura,
  emptyCenarioVariante,
  ensurePropostaCenariosMercado,
  expandPropostaParaComparativo,
  planosAberturaForFornecedor,
} from './placementPropostaCenarioAtual'
import { emptyPropostaPlanoLinha } from './placementAguardandoOperadora'
import { sanitizeSignedPercentInput } from './placementCotacaoFinanceiro'
import { parseBRLToCents } from './utils'

const operadoras = [
  { id: 'op-amil', nome: 'AMIL' },
  { id: 'op-kovr', nome: 'KOVR SEGURADORA' },
]

function formComAbertura(): CotacaoFormState {
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
        id: 'plano-1',
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
      atual: {
        comissaoVitalicioContrato: '5',
        participacao: { mds: '100', corretorParceiro: '0' },
      },
      estudo: {
        comissaoAgenciamento: '10',
        comissaoVitalicio: '5',
        participacao: { mds: '100', corretorParceiro: '0' },
      },
    },
    dataInicio: '',
    dataLimite: '',
    descricao: '',
    observacoes: '',
    vigenciaApolice: '12 meses',
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
    kickOffEstrategia: { secoes: [], mercadoAnalisado: ['AMIL'] },
  }
}

describe('placementPropostaCenarioAtual', () => {
  it('permite percentual negativo no campo de reajuste', () => {
    expect(sanitizeSignedPercentInput('-10')).toBe('-10')
    expect(sanitizeSignedPercentInput('-10,5')).toBe('-10,5')
    expect(sanitizeSignedPercentInput('15')).toBe('15')
  })

  it('carrega planos da abertura para o fornecedor', () => {
    const form = formComAbertura()
    const planos = planosAberturaForFornecedor(form, 'AMIL', operadoras)
    expect(planos.length).toBe(1)
    expect(planos[0].nomePlano).toContain('Premium')
    expect(planos[0].numeroVidas).toBe('50')
  })

  it('monta cenário com resumo da abertura', () => {
    const cenario = buildCenarioFromAbertura(formComAbertura(), 'AMIL', operadoras)
    expect(cenario.planos.length).toBe(1)
    expect(cenario.resumoLinhas.some((r) => r.rotulo.includes('Comissão'))).toBe(true)
    expect(cenario.resumoLinhas.some((r) => r.valor === '12 meses')).toBe(true)
  })

  it('aplica reajuste negativo como desconto', () => {
    const plano = {
      ...emptyPropostaPlanoLinha(),
      tipoCusto: 'per_capita' as const,
      custoPerCapitaBRL: '100,00',
    }
    const ajustado = applyReajusteToPlano(plano, '-10')
    expect(parseBRLToCents(ajustado.custoPerCapitaBRL)).toBe(9000)
  })

  it('expande cenários para comparativo com reajuste no metadado', () => {
    const cenario = buildCenarioFromAbertura(formComAbertura(), 'AMIL', operadoras)
    cenario.reajustePercent = '-10'
    const blocks = expandPropostaParaComparativo({
      incluirNoComparativo: true,
      cenarios: [cenario],
      planos: [],
    })
    expect(blocks.length).toBe(1)
    expect(blocks[0].reajustePercent).toBe('-10')
    const ajustado = applyReajusteToPlano(blocks[0].plano, blocks[0].reajustePercent)
    expect(parseBRLToCents(ajustado.custoPerCapitaBRL)).toBe(36000)
  })

  it('ensurePropostaCenariosMercado migra planos legados e expande N cenários', () => {
    const p1 = emptyPropostaPlanoLinha()
    p1.nomePlano = 'Oferta A'
    p1.custoPerCapitaBRL = '100,00'
    p1.numeroVidas = '10'
    const p2 = emptyPropostaPlanoLinha()
    p2.nomePlano = 'Oferta B'
    p2.custoPerCapitaBRL = '120,00'
    p2.numeroVidas = '10'
    const migrated = ensurePropostaCenariosMercado({
      incluirNoComparativo: true,
      cenarios: [],
      planos: [p1, p2],
    })
    expect(migrated).toHaveLength(1)
    expect(migrated[0].planos).toHaveLength(2)

    const doisCenarios = [
      { ...migrated[0], titulo: 'Cenário 1', planos: [p1] },
      {
        ...emptyCenarioVariante('Cenário 2'),
        planos: [p2],
      },
    ]
    const blocks = expandPropostaParaComparativo({
      incluirNoComparativo: true,
      cenarios: doisCenarios,
      planos: [p1],
    })
    expect(blocks).toHaveLength(2)
    expect(blocks.map((b) => b.cenarioTitulo)).toEqual(['Cenário 1', 'Cenário 2'])
  })
})
