import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'
import { emptyPropostaPlanoLinha } from './placementAguardandoOperadora'
import {
  coletarEntradasComparativo,
  computeComparativoPlanosResumo,
  propostaMercadoTemOfertaParaComparativo,
} from './placementPropostaComparativo'
import { emptyCoparticipacao } from './placementCoparticipacao'
import { emptyCenarioVariante } from './placementPropostaCenarioAtual'
import type { PlacementBeneficiario } from './placementBeneficiarios'

const operadoras = [
  { id: 'op-amil', nome: 'AMIL' },
  { id: 'op-kovr', nome: 'KOVR SEGURADORA' },
  { id: 'op-sulamerica', nome: 'SULAMERICA' },
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
        fornecedorId: 'op-sulamerica',
        fornecedorNome: 'SULAMERICA',
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
    expect(mercado[0].planoLabel.startsWith('Plano Ouro Atual')).toBe(false)
    expect(resumo.allColunas.some((c) => c.operadora.includes('KOVR'))).toBe(false)
    expect(resumo.allColunas.some((c) => c.grupo === 'atual')).toBe(true)
    expect(resumo.allColunas.filter((c) => c.grupo === 'mercado')).toHaveLength(1)
  })

  it('inclui o contrato vigente da abertura mesmo sem proposta lançada do fornecedor atual', () => {
    const form = formComDoisFornecedores()
    const entradas = coletarEntradasComparativo(form, operadoras, undefined, true)
    expect(entradas.some((e) => e.grupo === 'atual')).toBe(true)
    expect(entradas.filter((e) => e.grupo === 'mercado').some((e) => e.fornecedorNome.toUpperCase().includes('AMIL'))).toBe(
      true
    )
    const resumo = computeComparativoPlanosResumo(form, operadoras, [], undefined, 3, true)
    expect(resumo.allColunas.some((c) => c.grupo === 'atual')).toBe(true)
    expect(resumo.allColunas.filter((c) => c.grupo === 'mercado').length).toBeGreaterThan(0)
  })

  it('não mistura Base importada nem cria bloco órfão (S2500 sem equivalência)', () => {
    const form = formComDoisFornecedores()
    form.planos.push({
      id: 'plano-ref-2',
      itemRowId: 'item-1',
      nomePlano: 'TN2I Apt',
      acomodacao: 'Apartamento',
      abrangencia: 'Nacional',
      elegibilidade: 'Todos',
      numeroVidas: '50',
      tipoCusto: 'faixa_etaria',
      custoPerCapitaBRL: '',
      custosFaixa: { ...emptyCustosFaixa(), '00-18': '420,00' },
      vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
      coparticipacao: emptyCoparticipacao(),
    })
    form.kickOffEstrategia.aguardandoOperadora.propostas.amil.planos.push({
      ...emptyPropostaPlanoLinha(),
      id: 'oferta-s2500',
      planoReferenciaId: 's2500-orphan',
      nomePlano: 'S2500 R2 - Sem COPAY',
      tipoCusto: 'faixa_etaria',
      vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
      custosFaixa: { ...emptyCustosFaixa(), '00-18': '200,00' },
      acomodacao: 'Apartamento',
    })
    const bens: PlacementBeneficiario[] = [
      {
        id: 'b1',
        cotacaoId: 'c1',
        operadora: 'BRADESCO',
        planoAtual: 'FQCX Apt',
        statusBeneficiario: 'Ativo',
        custoPerCapita: '100,00',
      },
    ]
    const resumo = computeComparativoPlanosResumo(form, operadoras, bens, undefined, 3, true)
    expect(resumo.allColunas.some((c) => String(c.produto).toUpperCase().includes('BASE IMPORTADA'))).toBe(
      false
    )
    expect(resumo.pages).toHaveLength(2)
    expect(resumo.pages.every((p) => p.colunas.some((c) => c.grupo === 'atual'))).toBe(true)
    expect(resumo.pages.some((p) => (p.grupoLabel || '').includes('S2500'))).toBe(false)
    expect(resumo.allColunas.some((c) => c.grupo === 'atual')).toBe(true)
  })

  it('não injeta Contrato vigente quando o fornecedor atual já lançou cenário', () => {
    const form = formComDoisFornecedores()
    const cenario = {
      ...emptyCenarioVariante('Cenário atual'),
      id: 'cv-atual',
      planos: [
        {
          ...emptyPropostaPlanoLinha(),
          id: 'oferta-sul',
          planoReferenciaId: 'plano-ref',
          nomePlano: 'TNP4 Apt',
          tipoCusto: 'faixa_etaria' as const,
          vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
          custosFaixa: { ...emptyCustosFaixa(), '00-18': '400,00' },
        },
      ],
    }
    form.kickOffEstrategia.aguardandoOperadora.propostas.sulamerica = {
      incluirNoComparativo: true,
      planos: cenario.planos,
      cenarios: [cenario],
    }
    const entradas = coletarEntradasComparativo(form, operadoras, undefined, true)
    const atuais = entradas.filter((e) => e.grupo === 'atual')
    expect(atuais.length).toBeGreaterThan(0)
    expect(atuais.every((e) => e.cenarioTitulo !== 'Contrato vigente')).toBe(true)
    expect(atuais.some((e) => e.cenarioTitulo === 'Cenário atual')).toBe(true)
    const resumo = computeComparativoPlanosResumo(form, operadoras, [], undefined, 3, true)
    expect(resumo.allColunas.some((c) => String(c.produto).toUpperCase().includes('BASE IMPORTADA'))).toBe(
      false
    )
    expect(resumo.pages).toHaveLength(1)
    expect(resumo.pages[0].colunas.some((c) => c.grupo === 'atual')).toBe(true)
  })

  it('vigente com planoReferenciaId solto ainda entra no bloco da abertura', () => {
    const form = formComDoisFornecedores()
    const cenario = {
      ...emptyCenarioVariante('Cenário atual'),
      id: 'cv-atual',
      planos: [
        {
          ...emptyPropostaPlanoLinha(),
          id: 'oferta-solta',
          planoReferenciaId: 'id-que-nao-existe',
          nomePlano: 'Plano Ouro Atual',
          tipoCusto: 'faixa_etaria' as const,
          vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
          custosFaixa: { ...emptyCustosFaixa(), '00-18': '400,00' },
        },
      ],
    }
    form.kickOffEstrategia.aguardandoOperadora.propostas.sulamerica = {
      incluirNoComparativo: true,
      planos: cenario.planos,
      cenarios: [cenario],
    }
    const resumo = computeComparativoPlanosResumo(form, operadoras, [], undefined, 3, true)
    expect(resumo.pages).toHaveLength(1)
    expect(resumo.pages[0].grupoLabel).toContain('Plano Ouro')
    expect(resumo.pages[0].colunas.some((c) => c.grupo === 'atual')).toBe(true)
    expect(resumo.allColunas.some((c) => c.grupo === 'atual')).toBe(true)
  })
})
