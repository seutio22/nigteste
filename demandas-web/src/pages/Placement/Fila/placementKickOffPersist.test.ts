import { describe, expect, it } from 'vitest'
import {
  buildKickOffEstrategiaPatch,
  kickOffWorkflowScore,
  mergeSavedKickOffIntoApiCotacao,
  preferRicherKickOffWhenApplyingApi,
  propostasContentScore,
  cotacaoPayloadTemCorpoFormulario,
  mergeApiCotacaoIntoForm,
} from './placementKickOffPersist'
import { EMPTY_COTACAO_FORM, type CotacaoFormState } from './CotacaoFormFields'

describe('placementKickOffPersist', () => {
  it('preserva seções ao salvar apenas comunicarMercado', () => {
    const current = {
      secoes: [{ id: 's1', titulo: 'Premissas', itens: [{ id: 'i1', rotulo: 'A', valor: '1' }] }],
      mercadoAnalisado: ['AMIL'],
      notas: '',
      comunicarMercado: {
        prazoRetorno: '2026-06-09',
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
        fornecedores: {},
      },
    }
    const next = buildKickOffEstrategiaPatch(current, {
      comunicarMercado: {
        ...current.comunicarMercado!,
        fornecedores: {
          amil: {
            razaoSocial: 'AMIL',
            cnpj: '',
            atividadeEconomica: '',
            municipioUf: '',
            grupoProducao: 'SP',
            enviado: true,
            destinatariosEmails: [],
            topicosOverrides: {},
            dataEnvio: '2026-06-02',
            dataPrevisaoRetorno: '2026-06-09',
            dataRetornoEfetiva: '',
          },
        },
      },
    })
    expect(next.secoes).toHaveLength(1)
    expect(next.comunicarMercado?.fornecedores.amil?.dataEnvio).toBe('2026-06-02')
    expect(next.comunicarMercado?.fornecedores.amil?.enviado).toBe(true)
  })

  it('mantém comunicarMercado local quando a API devolve kickOff incompleto', () => {
    const local = buildKickOffEstrategiaPatch(
      { secoes: [], mercadoAnalisado: ['AMIL'], notas: '' },
      {
        comunicarMercado: {
          prazoRetorno: '',
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
            amil: {
              razaoSocial: 'AMIL',
              cnpj: '',
              atividadeEconomica: '',
              municipioUf: '',
              grupoProducao: '',
              enviado: true,
              destinatariosEmails: [],
              topicosOverrides: {},
              dataEnvio: '2026-06-02',
              dataPrevisaoRetorno: '',
              dataRetornoEfetiva: '',
            },
          },
        },
      }
    )
    const apiKickOff = { secoes: [], mercadoAnalisado: ['AMIL'], notas: '' }
    expect(kickOffWorkflowScore(local)).toBeGreaterThan(kickOffWorkflowScore(apiKickOff))
    const merged = preferRicherKickOffWhenApplyingApi(apiKickOff, local)
    expect(merged.comunicarMercado?.fornecedores.amil?.dataEnvio).toBe('2026-06-02')
  })

  it('preserva consolidandoDados local quando a API omite o bloco', () => {
    const local = buildKickOffEstrategiaPatch(
      { secoes: [], mercadoAnalisado: ['BRADESCO'], notas: '' },
      {
        consolidandoDados: {
          diferenciais: {
            telemedicina: {
              bradesco: [
                {
                  id: 'dc1',
                  placementPlanoId: '',
                  planoLabel: 'Nacional',
                  texto: 'App 24h',
                },
              ],
            },
          },
          condicoes: {},
          indicadores: {},
          resumoCoberturas: 'Resumo',
          condicoesContratuais: '',
        },
      }
    )
    const apiKickOff = { secoes: [], mercadoAnalisado: ['BRADESCO'], notas: '' }
    const merged = preferRicherKickOffWhenApplyingApi(apiKickOff, local)
    expect(merged.consolidandoDados?.diferenciais?.telemedicina?.bradesco?.[0]?.texto).toBe('App 24h')
    expect(merged.consolidandoDados?.resumoCoberturas).toBe('Resumo')
  })

  it('não troca texto local por mapa da API só com células vazias', () => {
    const local = buildKickOffEstrategiaPatch(
      { secoes: [], mercadoAnalisado: ['BRADESCO'], notas: '' },
      {
        consolidandoDados: {
          diferenciais: {
            telemedicina: {
              bradesco: [
                { id: 'dc1', placementPlanoId: '', planoLabel: '', texto: 'Preenchido' },
              ],
            },
          },
          condicoes: {},
          indicadores: {},
          resumoCoberturas: '',
          condicoesContratuais: '',
        },
      }
    )
    const apiKickOff = {
      secoes: [],
      mercadoAnalisado: ['BRADESCO'],
      notas: '',
      consolidandoDados: {
        diferenciais: {
          telemedicina: {
            bradesco: [{ id: 'x', placementPlanoId: '', planoLabel: '', texto: '' }],
          },
          telepsicologia: {
            bradesco: [{ id: 'y', placementPlanoId: '', planoLabel: '', texto: '' }],
          },
        },
        condicoes: {},
        indicadores: {},
        resumoCoberturas: '',
        condicoesContratuais: '',
      },
    }
    const merged = preferRicherKickOffWhenApplyingApi(apiKickOff as typeof local, local)
    expect(merged.consolidandoDados?.diferenciais?.telemedicina?.bradesco?.[0]?.texto).toBe(
      'Preenchido'
    )
  })

  it('preserva propostas locais quando a API devolve versão mais pobre', () => {
    const local = buildKickOffEstrategiaPatch(
      { secoes: [], mercadoAnalisado: ['AMIL'], notas: '' },
      {
        aguardandoOperadora: {
          fornecedores: {},
          quadroMercado: {
            showFornecedorAtual: true,
            showMercadoConsultado: true,
            showForaPerfilDeclinado: true,
            showNaoApresentada: true,
          },
          propostas: {
            amil: {
              incluirNoComparativo: true,
              planos: [
                {
                  id: 'p1',
                  nomePlano: 'S2500',
                  tipoCusto: 'per_capita',
                  numeroVidas: '100',
                  custoPerCapitaBRL: '450,00',
                  vidasFaixa: {},
                  custosFaixa: {},
                  reembolsoConsulta: '',
                  reembolso: 'Sim',
                  acomodacao: 'Apartamento',
                  eventosReembolsaveis: '',
                  abrangencia: '',
                  contribuicao: '',
                  coparticipacao: 'Sim',
                  coparticipacaoDetalhe: {
                    possui: true,
                    formaCobranca: 'percentual',
                    linhas: {
                      consultas_eletivas: { valor: '30', limitador: '' },
                      consultas_ps: { valor: '', limitador: '' },
                      terapias: { valor: '', limitador: '' },
                      exames_simples: { valor: '', limitador: '' },
                      exames_especiais: { valor: '', limitador: '' },
                      procedimentos_simples: { valor: '', limitador: '' },
                      proced_especiais: { valor: '', limitador: '' },
                    },
                    internacao: { tipoCobranca: '', valor: '', limitador: '' },
                  },
                },
              ],
            },
          },
        },
      }
    )
    const apiKickOff = {
      secoes: [],
      mercadoAnalisado: ['AMIL'],
      notas: '',
      aguardandoOperadora: {
        fornecedores: {},
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        propostas: {
          amil: {
            incluirNoComparativo: true,
            planos: [
              {
                id: 'p1',
                nomePlano: '',
                tipoCusto: 'per_capita',
                numeroVidas: '',
                custoPerCapitaBRL: '',
                vidasFaixa: {},
                custosFaixa: {},
                reembolsoConsulta: '',
                reembolso: '',
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
    expect(propostasContentScore(local.aguardandoOperadora)).toBeGreaterThan(
      propostasContentScore(apiKickOff.aguardandoOperadora as typeof local.aguardandoOperadora)
    )
    const merged = preferRicherKickOffWhenApplyingApi(apiKickOff as typeof local, local)
    expect(merged.aguardandoOperadora?.propostas?.amil?.planos?.[0]?.custoPerCapitaBRL).toBe('450,00')
    expect(merged.aguardandoOperadora?.propostas?.amil?.planos?.[0]?.nomePlano).toBe('S2500')
  })
})

describe('mergeApiCotacaoIntoForm (PUT kick-off slim)', () => {
  it('não trata { id, updatedAt } como cotação completa', () => {
    expect(cotacaoPayloadTemCorpoFormulario({ id: 'c1', updatedAt: '2026-08-18' })).toBe(false)
    expect(
      cotacaoPayloadTemCorpoFormulario({
        id: 'c1',
        updatedAt: '2026-08-18',
        kickOffEstrategia: { secoes: [], mercadoAnalisado: [], notas: '' },
      })
    ).toBe(false)
    expect(cotacaoPayloadTemCorpoFormulario({ planosCobertura: { planos: [] } })).toBe(true)
    expect(cotacaoPayloadTemCorpoFormulario({ itensMapeamento: [] })).toBe(true)
  })

  it('preserva planos/itens da abertura depois do autosave do kick-off', () => {
    const prev = {
      ...EMPTY_COTACAO_FORM,
      ticket: 'TK-1',
      itens: [
        {
          ...EMPTY_COTACAO_FORM.itens[0],
          id: 'item-1',
          fornecedorId: 'op-bra',
          fornecedorNome: 'BRADESCO',
        },
      ],
      planos: [
        {
          id: 'plano-tnp4',
          itemRowId: 'item-1',
          nomePlano: 'TNP4 Apt',
        } as CotacaoFormState['planos'][number],
      ],
    }
    const slim = {
      id: 'cot-1',
      updatedAt: '2026-08-18T12:00:00.000Z',
      kickOffEstrategia: { secoes: [], mercadoAnalisado: ['AMIL'], notas: '' },
    }
    const next = {
      ...EMPTY_COTACAO_FORM,
      ticket: '',
      planos: [],
      kickOffEstrategia: slim.kickOffEstrategia,
    }
    const merged = mergeApiCotacaoIntoForm(prev, next, slim)
    expect(merged.ticket).toBe('TK-1')
    expect(merged.planos).toHaveLength(1)
    expect(merged.planos[0].nomePlano).toBe('TNP4 Apt')
    expect(merged.itens[0].fornecedorId).toBe('op-bra')
    expect(merged.kickOffEstrategia?.mercadoAnalisado).toEqual(['AMIL'])
  })
})

