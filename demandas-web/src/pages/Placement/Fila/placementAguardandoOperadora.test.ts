import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  aguardandoOperadoraIsComplete,
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
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
            comissaoAgenciamento: '10',
            comissaoVitalicio: '5',
            observacoes: '',
          },
        },
      },
    }
    expect(aguardandoOperadoraIsComplete(form, operadoras)).toBe(true)
    expect(parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia)?.fornecedores['kovr seguradora'].retornoRecebido).toBe(true)
  })
})
