import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import {
  buildComparativoConsolidadoPages,
  buildComparativoColunas,
  buildComparativoDetalhePages,
  buildComparativoFaixaPages,
  buildComparativoUnificadoPages,
  computeComparativoEstudo,
  gruposColunasFaixa,
  aggregateColunasPorOperadora,
  buildComparativoOperadoraConsolidadoPage,
  type ComparativoColunaEstudo,
} from './placementComparativoEstudo'
import { computeComparativoPlanosResumo } from './placementPropostaComparativo'
import { parseBRLToCents } from './utils'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [{ id: 'op1', nome: 'KOVR SEGURADORA' }]

function formComProposta(): CotacaoFormState {
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
      mercadoAnalisado: ['KOVR SEGURADORA'],
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
                nomePlano: 'Direto Nacional',
                tipoCusto: 'faixa_etaria',
                numeroVidas: '',
                custoPerCapitaBRL: '',
                vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10', '19-23': '5' },
                custosFaixa: { ...emptyCustosFaixa(), '00-18': '300,00', '19-23': '350,00' },
                reembolso: 'Sim',
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
        comparativoConfig: {
          modoSlide: 'consolidado',
          colunasPorSlide: 3,
          incluirColunaAtual: false,
          notasRodape: 'Nota teste',
          faixaCelula: 'unitario',
          faixaAgrupamento: 'horizontal',
        },
      },
    },
  }
}

describe('placementComparativoEstudo', () => {
  it('monta colunas de mercado a partir das propostas', () => {
    const form = formComProposta()
    const colunas = buildComparativoColunas(form, operadoras, [], undefined, false)
    expect(colunas.length).toBe(1)
    expect(colunas[0].operadora).toContain('KOVR')
    expect(colunas[0].totalMensalCents).toBe(475000)
  })

  it('pagina consolidado financeiro', () => {
    const form = formComProposta()
    const colunas = buildComparativoColunas(form, operadoras, [], undefined, false)
    const pages = buildComparativoConsolidadoPages(colunas, 3)
    expect(pages.length).toBe(1)
    expect(pages[0].linhas.some((l) => l.id === 'mensal')).toBe(true)
  })

  it('faixa etária horizontal com subtotal por linha', () => {
    const form = formComProposta()
    const colunas = buildComparativoColunas(form, operadoras, [], undefined, false)
    const pages = buildComparativoFaixaPages(colunas, 3, { faixaCelula: 'unitario_e_subtotal' })
    expect(pages.length).toBe(1)
    expect(pages[0].faixaCelula).toBe('unitario_e_subtotal')
    expect(pages[0].colunas[0].faixas.some((f) => f.subtotal !== '—')).toBe(true)
  })

  it('agrupa faixa por plano equivalente', () => {
    const form = formComProposta()
    const colunas = buildComparativoColunas(form, operadoras, [], undefined, false)
    const grupos = gruposColunasFaixa(colunas, 'horizontal')
    expect(grupos.length).toBe(1)
    const pages = buildComparativoFaixaPages(colunas, 3, { referencias: [] })
    expect(pages.length).toBe(1)
    expect(pages[0].colunas.length).toBe(colunas.length)
  })

  it('comparativo por plano: todos fornecedores na mesma pagina', () => {
    const form = formComProposta()
    const resumo = computeComparativoPlanosResumo(form, operadoras, [], undefined, 3, false)
    expect(resumo.pages.length).toBeGreaterThanOrEqual(1)
    expect(resumo.pages[0].colunas.length).toBe(resumo.allColunas.length)
  })

  it('IDs de colunas alinhados entre estudo e contrato_plano', () => {
    const form = formComProposta()
    const estudo = computeComparativoEstudo(form, operadoras, [], undefined)
    const resumoIds = estudo.contratoPlanoResumo.allColunas.map((c) => c.id).sort()
    const estudoIds = estudo.colunas.map((c) => c.id).sort()
    expect(estudoIds).toEqual(resumoIds)
  })

  it('modo unificado: mesmas colunas nos três blocos por página', () => {
    const form = formComProposta()
    const estudo = computeComparativoEstudo(form, operadoras, [], undefined)
    const consolidado = buildComparativoConsolidadoPages(estudo.colunas, 3)
    const detalhe = buildComparativoDetalhePages(estudo.colunas, 3)
    const unificado = buildComparativoUnificadoPages(
      estudo.contratoPlanoResumo.allColunas,
      consolidado,
      detalhe
    )
    expect(unificado.length).toBe(consolidado.length)
    for (const page of unificado) {
      const idsContrato = page.contrato.colunas.map((c) => c.id)
      const idsConsolidado = page.consolidado.colunas.map((c) => c.id)
      const idsDetalhe = page.detalhe.colunas.map((c) => c.id)
      expect(idsContrato).toEqual(idsConsolidado)
      expect(idsContrato).toEqual(idsDetalhe)
    }
  })

  it('consolidado e detalhe usam os mesmos totais do comparativo por plano', () => {
    const form = formComProposta()
    const estudo = computeComparativoEstudo(form, operadoras, [], undefined, {
      ...form.kickOffEstrategia.aguardandoOperadora.comparativoConfig,
      incluirColunaAtual: false,
    })
    expect(estudo.colunas.length).toBeGreaterThan(0)
    for (const col of estudo.colunas) {
      const contrato = estudo.contratoPlanoResumo.allColunas.find((c) => c.id === col.id)
      expect(contrato).toBeDefined()
      expect(col.totalMensalCents).toBeGreaterThan(0)
      expect(col.totalMensalCents).toBe(parseBRLToCents(contrato!.faturaEstimada))
    }
    const pages = buildComparativoConsolidadoPages(estudo.colunas, 3)
    const mensal = pages[0].linhas.find((l) => l.id === 'mensal')
    expect(parseBRLToCents(mensal?.valores[0] ?? '')).toBe(475000)
  })
})

describe('aggregateColunasPorOperadora', () => {
  const baseCol = (overrides: Partial<ComparativoColunaEstudo>): ComparativoColunaEstudo => ({
    id: 'c1',
    grupo: 'mercado',
    operadora: 'SULAMERICA',
    planoLabel: 'Plano A',
    subtitulo: '',
    reembolsoConsulta: '—',
    reembolso: '—',
    temReembolsoConsulta: false,
    acomodacao: '—',
    eventosReembolsaveis: '—',
    abrangencia: '—',
    coparticipacao: '—',
    tipoCusto: 'per_capita',
    vidas: 10,
    totalMensalCents: 100000,
    totalAnualCents: 1200000,
    faixas: [],
    tabColor: '#000',
    planoReferenciaId: 'ref-1',
    planoReferenciaLabel: 'Ref 1',
    ...overrides,
  })

  it('soma vidas e custos de colunas da mesma operadora', () => {
    const agg = aggregateColunasPorOperadora([
      baseCol({ id: 'c1', planoReferenciaId: 'ref-1', totalMensalCents: 100000, vidas: 10 }),
      baseCol({ id: 'c2', planoReferenciaId: 'ref-2', totalMensalCents: 250000, vidas: 5 }),
    ])
    expect(agg).toHaveLength(1)
    expect(agg[0].vidas).toBe(15)
    expect(agg[0].totalMensalCents).toBe(350000)
  })

  it('mantém colunas separadas para atual e mercado', () => {
    const agg = aggregateColunasPorOperadora([
      baseCol({ id: 'atual', grupo: 'atual', operadora: 'ATUAL OP', totalMensalCents: 500000 }),
      baseCol({ id: 'm1', grupo: 'mercado', operadora: 'SULAMERICA', totalMensalCents: 400000 }),
    ])
    expect(agg).toHaveLength(2)
    const page = buildComparativoOperadoraConsolidadoPage(agg)
    expect(page?.colunas).toHaveLength(2)
    const mensal = page?.linhas.find((l) => l.id === 'mensal')
    expect(mensal?.valores).toHaveLength(2)
  })
})
