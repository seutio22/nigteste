import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import { emptyCoparticipacao } from './placementCoparticipacao'
import {
  buildComparativoCoparticipacaoColunas,
  buildComparativoCoparticipacaoPages,
  buildComparativoCoparticipacaoPagesAlinhadas,
  valorCopartLinha,
  COMPARATIVO_COPART_LINHAS,
} from './placementComparativoCoparticipacao'
import { planosReferenciaAbertura } from './placementPropostaEquivalencia'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [{ id: 'op1', nome: 'KOVR SEGURADORA' }]

function formComCopartDetalhe(): CotacaoFormState {
  const copartMercado = emptyCoparticipacao()
  copartMercado.possui = true
  copartMercado.linhas.consultas_eletivas = { valor: '15', limitador: '' }

  return {
    ticket: 'TK-COP',
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
                vidasFaixa: { ...emptyVidasFaixa(), '00-18': '10' },
                custosFaixa: { ...emptyCustosFaixa(), '00-18': '280,00' },
                reembolsoConsulta: '',
                reembolso: '',
                acomodacao: 'Enfermaria',
                eventosReembolsaveis: '',
                abrangencia: '',
                contribuicao: '',
                coparticipacao: 'Sim',
                coparticipacaoDetalhe: copartMercado,
              },
            ],
          },
        },
        comparativoConfig: {
          modoSlide: 'consolidado',
          colunasPorSlide: 3,
          incluirColunaAtual: false,
          notasRodape: '',
          faixaCelula: 'unitario',
          faixaAgrupamento: 'horizontal',
        },
      },
    },
  }
}

describe('placementComparativoCoparticipacao', () => {
  it('monta colunas de coparticipação a partir das propostas', () => {
    const colunas = buildComparativoCoparticipacaoColunas(formComCopartDetalhe(), operadoras, undefined, false)
    expect(colunas.length).toBe(1)
    expect(colunas[0].operadora).toContain('KOVR')
    expect(colunas[0].copart.linhas.consultas_eletivas.valor).toBe('15')
  })

  it('formata células de procedimento e selo', () => {
    const colunas = buildComparativoCoparticipacaoColunas(formComCopartDetalhe(), operadoras, undefined, false)
    const col = colunas[0]
    const selo = COMPARATIVO_COPART_LINHAS.find((l) => l.tipo === 'selo')!
    const proc = COMPARATIVO_COPART_LINHAS.find((l) => l.procedimentoKey === 'consultas_eletivas')!
    expect(valorCopartLinha(col, selo)).toBe('Sim')
    expect(valorCopartLinha(col, proc)).toContain('15%')
  })

  it('pagina comparativo de coparticipação', () => {
    const colunas = buildComparativoCoparticipacaoColunas(formComCopartDetalhe(), operadoras, undefined, false)
    const pages = buildComparativoCoparticipacaoPages(colunas, 3)
    expect(pages.length).toBe(1)
    expect(pages[0].linhas.length).toBeGreaterThan(5)
  })

  it('pagina alinhada por plano equivalente ao ocultar coluna', () => {
    const form = formComCopartDetalhe()
    const colunas = buildComparativoCoparticipacaoColunas(form, operadoras, undefined, false)
    const refs = planosReferenciaAbertura(form, operadoras)
    const pages = buildComparativoCoparticipacaoPagesAlinhadas(colunas, [], refs)
    expect(pages.length).toBe(1)
    expect(pages[0].colunas.some((c) => !c.placeholder)).toBe(true)
  })
})
