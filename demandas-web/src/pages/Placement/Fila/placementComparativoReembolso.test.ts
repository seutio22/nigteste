import { describe, expect, it } from 'vitest'
import type { CotacaoFormState } from './CotacaoFormFields'
import { emptyCustosFaixa, emptyVidasFaixa } from './placementCotacaoDetalhes'
import { emptyCoparticipacao } from './placementCoparticipacao'
import { emptyReembolsoPlanoDetalhe } from './placementReembolso'
import {
  buildComparativoReembolsoColunas,
  buildComparativoReembolsoPages,
  valorReembolsoLinha,
  COMPARATIVO_REEMB_LINHAS_FIXAS,
} from './placementComparativoReembolso'
import { emptyKickOffEstrategia } from './placementKickOffEstrategia'

const operadoras = [{ id: 'op1', nome: 'KOVR SEGURADORA' }]

function formComReembolsoDetalhe(): CotacaoFormState {
  const reembDet = emptyReembolsoPlanoDetalhe()
  reembDet.valores.consultas = '350,00'
  reembDet.consultaDias = '30'
  reembDet.procedimentosDias = '60'

  return {
    ticket: 'TK-REEMB',
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
                reembolsoConsulta: '350,00',
                reembolso: 'Sim',
                reembolsoDetalhe: reembDet,
                acomodacao: 'Enfermaria',
                eventosReembolsaveis: '',
                abrangencia: '',
                contribuicao: '',
                coparticipacao: '',
                coparticipacaoDetalhe: emptyCoparticipacao(),
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

describe('placementComparativoReembolso', () => {
  it('monta colunas de reembolso a partir das propostas', () => {
    const colunas = buildComparativoReembolsoColunas(formComReembolsoDetalhe(), operadoras, undefined, false)
    expect(colunas.length).toBe(1)
    expect(colunas[0].operadora).toContain('KOVR')
    expect(colunas[0].temReembolso).toBe(true)
    expect(colunas[0].detalhe.valores.consultas).toBe('350,00')
  })

  it('formata células de procedimento, prazo e selo', () => {
    const colunas = buildComparativoReembolsoColunas(formComReembolsoDetalhe(), operadoras, undefined, false)
    const col = colunas[0]
    const selo = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.tipo === 'selo')!
    const consulta = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.procedimentoKey === 'consultas')!
    const prazo = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.tipo === 'prazo_consulta')!
    expect(valorReembolsoLinha(col, selo)).toBe('Sim')
    expect(valorReembolsoLinha(col, consulta)).toContain('350')
    expect(valorReembolsoLinha(col, prazo)).toBe('30 dias')
  })

  it('pagina comparativo de reembolso', () => {
    const colunas = buildComparativoReembolsoColunas(formComReembolsoDetalhe(), operadoras, undefined, false)
    const pages = buildComparativoReembolsoPages(colunas, 3)
    expect(pages.length).toBe(1)
    expect(pages[0].linhas.length).toBeGreaterThan(5)
  })
})
