import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  buildComunicarMercadoHtml,
  buildComunicarMercadoSubject,
  buildComunicarMercadoTopicos,
  replicarConteudoEmailParaDemais,
  comunicarMercadoIsComplete,
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
} from './placementComunicarMercado'
import { EMAIL_GRUPO_ORDER } from './placementComunicarMercadoEmailHtml'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [
  { id: 'op1', nome: 'KOVR SEGURADORA' },
  { id: 'op2', nome: 'Bradesco' },
]

function baseForm(): CotacaoFormState {
  return {
    ticket: 'TK-1',
    status: 'Em cotação',
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
      atual: {
        comissaoVitalicioContrato: '',
        participacao: { mds: '', corretorParceiro: '' },
      },
      estudo: {
        comissaoAgenciamento: '',
        comissaoVitalicio: '',
        participacao: { mds: '50', corretorParceiro: '50' },
      },
    },
    dataInicio: '',
    dataLimite: '2026-04-15',
    descricao: '',
    observacoes: '',
    vigenciaApolice: '2024-08-01',
    tipoContratacaoId: '',
    modalidadeContratoId: '',
    prazoVigenciaContratoId: '',
    breakEven: '70%',
    formularioTipo: 'saude',
    multaRescisaoContratual: '',
    multaRescisaoValor: '',
    multaRescisaoRegra: '',
    multaRescisaoAvisoPrevio: '60 dias',
    possuiConvencaoColetiva: '',
    subfaturasDraft: [],
    kickOffEstrategia: {
      ...emptyKickOffEstrategia(),
      mercadoAnalisado: ['KOVR SEGURADORA'],
    },
  }
}

describe('placementComunicarMercado', () => {
  it('lista fornecedores do mercado analisado do Kick off', () => {
    const form = baseForm()
    expect(mercadoFornecedoresFromForm(form, operadoras)).toEqual(['KOVR SEGURADORA'])
  })

  it('monta assunto no padrão ENC', () => {
    const form = baseForm()
    const state = ensureComunicarMercadoState(null, form, operadoras)
    const assunto = buildComunicarMercadoSubject({
      form,
      fornecedorNome: 'KOVR SEGURADORA',
      operadoras,
      labels: { pedido: 'RENOVAÇÃO MDS', formularioTipo: 'Saúde' },
      comunicarMercado: state,
    })
    expect(assunto).toContain('ENC:')
    expect(assunto).toContain('KOVR SEGURADORA')
    expect(assunto).toContain('PRAZO DE RETORNO')
  })

  it('gera tópicos com dados gerais e premissas', () => {
    const form = baseForm()
    form.kickOffEstrategia = {
      ...emptyKickOffEstrategia(),
      mercadoAnalisado: ['KOVR SEGURADORA'],
      secoes: [
        {
          id: 's1',
          titulo: 'Premissas para cotação',
          itens: [{ id: 'i1', rotulo: 'Carregamento Comercial desejado', valor: '100/5' }],
        },
      ],
    }
    const state = ensureComunicarMercadoState(null, form, operadoras)
    const topicos = buildComunicarMercadoTopicos({
      form,
      fornecedorNome: 'KOVR SEGURADORA',
      operadoras,
      labels: {
        fornecedoresAtuais: 'Bradesco',
        breakEven: '70%',
        tipoContratacao: 'Compulsório',
      },
      comunicarMercado: state,
    })
    expect(topicos.some((t) => t.rotulo === 'Operadora atual' && t.valor.includes('Bradesco'))).toBe(true)
    expect(topicos.some((t) => t.rotulo === 'Carregamento Comercial desejado')).toBe(true)
  })

  it('exige todos os fornecedores marcados como comunicados', () => {
    const form = baseForm()
    form.kickOffEstrategia = {
      ...emptyKickOffEstrategia(),
      mercadoAnalisado: ['KOVR SEGURADORA', 'Outra Operadora'],
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
            grupoProducao: '',
            enviado: true,
            destinatariosEmails: [],
            topicosOverrides: {},
            dataEnvio: '',
            dataPrevisaoRetorno: '',
            dataRetornoEfetiva: '',
          },
        },
      },
    }
    expect(comunicarMercadoIsComplete(form, operadoras)).toBe(false)
  })

  it('ordena seções do e-mail conforme padrão MDS', () => {
    const form = baseForm()
    form.kickOffEstrategia = {
      ...emptyKickOffEstrategia(),
      mercadoAnalisado: ['KOVR SEGURADORA'],
      secoes: [
        {
          id: 's1',
          titulo: 'Premissas para cotação',
          itens: [{ id: 'i1', rotulo: 'Carregamento Comercial desejado', valor: '100/5' }],
        },
      ],
    }
    const state = ensureComunicarMercadoState(null, form, operadoras)
    const html = buildComunicarMercadoHtml({
      form,
      fornecedorNome: 'KOVR SEGURADORA',
      operadoras,
      labels: { fornecedoresAtuais: 'Bradesco', breakEven: '70%', tipoContratacao: 'Compulsório' },
      comunicarMercado: state,
    })
    expect(html).toContain('background-color:#002561')
    expect(html).toContain('border-bottom:2px solid #009fdf')
    expect(html).not.toContain('/email/MDS_NIG_Header_Email_02.png')

    const gruposPresentes = EMAIL_GRUPO_ORDER.filter((g) => html.includes(`>${g}<`))
    for (let i = 1; i < gruposPresentes.length; i += 1) {
      const prev = html.indexOf(`>${gruposPresentes[i - 1]}<`)
      const curr = html.indexOf(`>${gruposPresentes[i]}<`)
      expect(prev).toBeGreaterThan(-1)
      expect(curr).toBeGreaterThan(prev)
    }
  })

  it('replica conteúdo compartilhado excluindo cabeçalho do fornecedor', () => {
    const form = baseForm()
    const state = ensureComunicarMercadoState(null, form, operadoras)
    state.fornecedores['kovr seguradora'].topicosOverrides = {
      'forn-razao': 'KOVR SA',
      'valor-projetado': 'R$ 100',
    }
    const next = replicarConteudoEmailParaDemais(state, 'KOVR SEGURADORA')
    expect(next.conteudoCompartilhado.topicosOverrides['valor-projetado']).toBe('R$ 100')
    expect(next.conteudoCompartilhado.topicosOverrides['forn-razao']).toBeUndefined()
  })
})
