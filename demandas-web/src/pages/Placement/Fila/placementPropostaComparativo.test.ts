import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'
import { emptyPropostaPlanoLinha } from './placementAguardandoOperadora'
import {
  computeComparativoPlanosResumo,
  propostaMercadoTemOfertaParaComparativo,
} from './placementPropostaComparativo'
import { emptyCoparticipacao } from './placementCoparticipacao'

const operadoras = [
  { id: 'op-amil', nome: 'AMIL' },
  { id: 'op-kovr', nome: 'KOVR SEGURADORA' },
]

function formComDoisFornecedores(): CotacaoFormState {
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
    operadorasSugestaoIds: ['op-amil', 'op-kovr'],
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
        nomePlano: 'Plano Ouro Atual',
        acomodacao: 'Apartamento',
        abrangencia: 'Nacional',
        elegibilidade: 'Todos',
        numeroVidas: '50',
        tipoCusto: 'faixa_etaria',
        custoPerCapitaBRL: '',
        custosFaixa: { ...emptyCustosFaixa(), '00-18': '400,00' },
        vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
        coparticipacao: emptyCoparticipacao(),
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
                id: 'oferta-kovr',
                planoReferenciaId: 'plano-ref',
                tipoCusto: 'faixa_etaria',
                vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
                custosFaixa: emptyCustosFaixa(),
                acomodacao: 'Apartamento',
              },
            ],
          },
          amil: {
            incluirNoComparativo: true,
            planos: [
              {
                ...emptyPropostaPlanoLinha(),
                id: 'oferta-amil',
                planoReferenciaId: 'plano-ref',
                nomePlano: 'Amil Premium',
                tipoCusto: 'faixa_etaria',
                vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
                custosFaixa: { ...emptyCustosFaixa(), '00-18': '380,00' },
                acomodacao: 'Apartamento',
              },
            ],
          },
        },
      },
    },
  }
}

describe('placementPropostaComparativo', () => {
  it('propostaMercadoTemOfertaParaComparativo ignora só vidas copiadas da abertura', () => {
    const linha = {
      ...emptyPropostaPlanoLinha(),
      vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
      acomodacao: 'Apartamento',
    }
    expect(propostaMercadoTemOfertaParaComparativo(linha)).toBe(false)
    expect(
      propostaMercadoTemOfertaParaComparativo({
        ...linha,
        custosFaixa: { ...emptyCustosFaixa(), '00-18': '350,00' },
      })
    ).toBe(true)
  })

  it('não exibe fornecedor de mercado sem oferta e não copia nome do plano atual', () => {
    const resumo = computeComparativoPlanosResumo(formComDoisFornecedores(), operadoras, [], undefined, 3, true)
    const mercado = resumo.allColunas.filter((c) => c.grupo === 'mercado')
    expect(mercado).toHaveLength(1)
    expect(mercado[0].operadora).toContain('AMIL')
    expect(mercado[0].planoLabel).toContain('Amil Premium')
    expect(mercado[0].planoLabel).not.toContain('Plano Ouro Atual')
    expect(resumo.allColunas.some((c) => c.operadora.includes('KOVR'))).toBe(false)
  })
})
