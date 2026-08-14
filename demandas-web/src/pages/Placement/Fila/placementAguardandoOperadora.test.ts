import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  aguardandoOperadoraIsComplete,
  classificacaoPermitePropostaValores,
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import { buildMercadoQuadroBuckets } from './placementMercadoQuadro'
import { computePropostaComparativoResumo } from './placementPropostaComparativo'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [{ id: 'op1', nome: 'KOVR SEGURADORA' }]

function baseForm(): CotacaoFormState {
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
    operadorasSugestaoIds: ['op1'],
    itens: [],
    planos: [],
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
      estudo: {
        comissaoAgenciamento: '10',
        comissaoVitalicio: '5',
        participacao: { mds: '100', corretorParceiro: '0' },
      },
    },
    dataInicio: '',
    dataLimite: '2026-04-15',
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
      mercadoAnalisado: ['KOVR SEGURADORA'],
      comunicarMercado: {
        prazoRetorno: '2026-04-15',
        conteudoCompartilhado: {
          topicosOverrides: {},
          sinistralidade: {
            sinistralidadePeriodo: '',
            estimativaReajuste: '',
            indiceReajusteFinanceiro: '',
            justificativaPicos: '',
            maioresUsuarios: '',
            maioresUsuariosMesAMes: '',
            imagemDataUri: '',
          },
          localidades: { incluirNoEmail: false, imagemDataUri: '' },
        },
        fornecedores: {
          'kovr seguradora': {
            razaoSocial: 'KOVR',
            cnpj: '',
            atividadeEconomica: '',
            municipioUf: '',
            grupoProducao: 'Produção SP',
            enviado: true,
            destinatariosEmails: [],
            topicosOverrides: {},
            dataEnvio: '2026-03-01',
            dataPrevisaoRetorno: '2026-04-15',
            dataRetornoEfetiva: '',
          },
        },
      },
    },
  }
}

describe('placementAguardandoOperadora', () => {
  it('inicializa comissões a partir do cenário de estudo', () => {
    const form = baseForm()
    const state = ensureAguardandoOperadoraState(null, form, operadoras)
    expect(state.fornecedores['kovr seguradora'].comissaoAgenciamento).toBe('10')
    expect(state.fornecedores['kovr seguradora'].comissaoVitalicio).toBe('5')
    expect(state.fornecedores['kovr seguradora'].grupoProducao).toBe('Produção SP')
    expect(state.fornecedores['kovr seguradora'].classificacaoMercado).toBe('mercado_consultado')
    expect(state.propostas['kovr seguradora'].planos.length).toBeGreaterThan(0)
  })

  it('migra retorno efetivo legado do comunicar mercado', () => {
    const form = baseForm()
    form.kickOffEstrategia!.comunicarMercado!.fornecedores['kovr seguradora'].dataRetornoEfetiva =
      '2026-04-20'
    const state = ensureAguardandoOperadoraState(null, form, operadoras)
    expect(state.fornecedores['kovr seguradora'].dataRetornoEfetiva).toBe('2026-04-20')
  })

  it('exige retorno recebido em todos os fornecedores', () => {
    const form = baseForm()
    expect(aguardandoOperadoraIsComplete(form, operadoras)).toBe(false)
    form.kickOffEstrategia = {
      ...form.kickOffEstrategia!,
      aguardandoOperadora: {
        fornecedores: {
          'kovr seguradora': {
            dataRetornoEfetiva: '2026-04-20',
            retornoRecebido: true,
            grupoProducao: 'Produção SP',
            comissaoAgenciamento: '10',
            comissaoVitalicio: '5',
            classificacaoMercado: 'mercado_consultado',
            observacoes: '',
          },
        },
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {},
        comparativoConfig: {
          modoSlide: 'faixa_etaria',
          colunasPorSlide: 5,
          incluirColunaAtual: true,
          notasRodape: '',
        },
      },
    }
    expect(aguardandoOperadoraIsComplete(form, operadoras)).toBe(true)
    expect(parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia)?.fornecedores['kovr seguradora'].retornoRecebido).toBe(true)
  })

  it('classifica fornecedores nos quadros do slide mercado', () => {
    const form = baseForm()
    const state = ensureAguardandoOperadoraState(null, form, operadoras)
    state.fornecedores['kovr seguradora'].classificacaoMercado = 'fora_perfil_declinado'
    const buckets = buildMercadoQuadroBuckets(form, state, operadoras)
    expect(buckets.foraPerfilDeclinado).toContain('KOVR SEGURADORA')
    expect(buckets.mercadoConsultado).not.toContain('KOVR SEGURADORA')
  })

  it('parseia contratoOrientacao sem alterar o modo de exibição', () => {
    const horizontal = parseAguardandoOperadoraFromKickOff({
      aguardandoOperadora: {
        fornecedores: {},
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {},
        comparativoConfig: {
          modoSlide: 'contrato_plano',
          contratoOrientacao: 'horizontal',
        },
      },
    } as any)
    expect(horizontal?.comparativoConfig.contratoOrientacao).toBe('horizontal')

    const legadoEmpilhado = parseAguardandoOperadoraFromKickOff({
      aguardandoOperadora: {
        fornecedores: {},
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {},
        comparativoConfig: {
          modoSlide: 'planos_empilhados',
        },
      },
    } as any)
    expect(legadoEmpilhado?.comparativoConfig.modoSlide).toBe('planos_empilhados')
    expect(legadoEmpilhado?.comparativoConfig.contratoOrientacao).toBe('horizontal')
  })

  it('monta comparativo de propostas a partir dos planos cadastrados', () => {
    const form = baseForm()
    form.kickOffEstrategia = {
      ...form.kickOffEstrategia!,
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
                id: 'p1',
                nomePlano: 'Essencial',
                tipoCusto: 'per_capita',
                numeroVidas: '120',
                custoPerCapitaBRL: '450,00',
                vidasFaixa: {},
                custosFaixa: {},
                reembolsoConsulta: 'R$ 90,00',
                acomodacao: 'Enfermaria',
                eventosReembolsaveis: 'PS',
                abrangencia: 'Nacional',
                contribuicao: '30%',
                coparticipacao: 'Sim',
              },
            ],
          },
        },
      },
    }
    const resumo = computePropostaComparativoResumo(form, operadoras)
    expect(resumo.allColunas.length).toBe(1)
    expect(resumo.allColunas[0].operadora).toBe('KOVR SEGURADORA')
    expect(resumo.allColunas[0].planoLabel).toBe('Essencial')
    expect(resumo.totalVidas).toBe(120)
  })

  it('declinado e nao apresentada nao entram no comparativo', () => {
    expect(classificacaoPermitePropostaValores('mercado_consultado')).toBe(true)
    expect(classificacaoPermitePropostaValores('fora_perfil_declinado')).toBe(false)
    expect(classificacaoPermitePropostaValores('nao_apresentada')).toBe(false)

    const form = baseForm()
    form.kickOffEstrategia = {
      ...form.kickOffEstrategia!,
      aguardandoOperadora: {
        fornecedores: {
          'kovr seguradora': {
            dataRetornoEfetiva: '',
            retornoRecebido: false,
            grupoProducao: '',
            comissaoAgenciamento: '',
            comissaoVitalicio: '',
            classificacaoMercado: 'nao_apresentada',
            observacoes: '',
          },
        },
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {
          'kovr seguradora': {
            incluirNoComparativo: true,
            cenarios: [],
            planos: [
              {
                id: 'p1',
                planoReferenciaId: '',
                nomePlano: 'Essencial',
                tipoCusto: 'per_capita',
                numeroVidas: '120',
                custoPerCapitaBRL: '500,00',
                vidasFaixa: {},
                custosFaixa: {},
                reembolsoConsulta: '',
                acomodacao: '',
                eventosReembolsaveis: '',
                abrangencia: '',
                contribuicao: '',
                coparticipacao: '',
              },
            ],
          },
        },
      },
    }
    const resumo = computePropostaComparativoResumo(form, operadoras)
    expect(resumo.allColunas.length).toBe(0)
  })
})
