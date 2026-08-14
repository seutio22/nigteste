import { describe, expect, it } from 'vitest'
import { buildComparativoDiferencialPages } from './placementComparativoDiferenciais'
import { buildComparativoColunas } from './placementComparativoEstudo'
import {
  formatDiferencialCelulasTexto,
  importDiferenciaisFromMaster,
  buildDiferenciaisMasterUpsertItems,
  buildDiferencialPlanoOpcoes,
  resolvePlacementPlanoIdForCelula,
  parseConsolidandoDadosFromKickOff,
  ensureConsolidandoDadosState,
} from './placementConsolidandoDados'
import type { CotacaoFormState } from './CotacaoFormFields'

const operadoras = [
  { id: 'op-amil', nome: 'Amil' },
  { id: 'op-brad', nome: 'Bradesco' },
]

function baseForm(): CotacaoFormState {
  return {
    status: 'Consolidando dados',
    ticket: 'TK-1',
    itens: [],
    planos: [],
    kickOffEstrategia: {
      secoes: [],
      mercadoAnalisado: ['Amil', 'Bradesco'],
      aguardandoOperadora: {
        fornecedores: {
          amil: {
            dataRetornoEfetiva: '',
            retornoRecebido: true,
            grupoProducao: '',
            comissaoAgenciamento: '',
            comissaoVitalicio: '',
            classificacaoMercado: 'fornecedor_atual',
            observacoes: '',
          },
          bradesco: {
            dataRetornoEfetiva: '',
            retornoRecebido: true,
            grupoProducao: '',
            comissaoAgenciamento: '',
            comissaoVitalicio: '',
            classificacaoMercado: 'mercado_consultado',
            observacoes: '',
          },
        },
        propostas: {
          amil: {
            incluirNoComparativo: true,
            cenarios: [],
            planos: [{ id: 'p1', planoReferenciaId: '', nomePlano: 'S6500' } as any],
          },
          bradesco: {
            incluirNoComparativo: true,
            cenarios: [],
            planos: [{ id: 'p2', planoReferenciaId: '', nomePlano: 'TN3' } as any],
          },
        },
        quadroMercado: {
          showFornecedorAtual: true,
          showMercadoConsultado: true,
          showForaPerfilDeclinado: true,
          showNaoApresentada: true,
        },
        comparativoConfig: {
          modoSlide: 'consolidado',
          colunasPorSlide: 5,
          incluirColunaAtual: true,
          notasRodape: '',
          faixaCelula: 'unitario',
          faixaAgrupamento: 'horizontal',
          visualizacao: 'pagina_completa',
          colunasOcultas: [],
          linhasOcultas: [],
        },
      },
      consolidandoDados: {
        diferenciais: {
          telemedicina: {
            amil: [{ id: 'c1', placementPlanoId: '', planoLabel: '', texto: 'Possui atendimento' }],
            bradesco: [{ id: 'c2', placementPlanoId: '', planoLabel: '', texto: 'Possui atendimento' }],
          },
        },
        resumoCoberturas: 'Resumo teste',
        condicoesContratuais: 'Condições teste',
      },
    },
  } as CotacaoFormState
}

describe('placementComparativoDiferenciais', () => {
  it('monta slides de diferenciais e condições contratuais por fornecedor', () => {
    const pages = buildComparativoDiferencialPages(baseForm(), operadoras)
    expect(pages).toHaveLength(3)
    expect(pages[0].colunas).toHaveLength(2)
    expect(pages[0].linhas).toHaveLength(9)
    expect(pages[0].titulo).toBe('Diferenciais')
    expect(pages[0].linhas.find((l) => l.itemKey === 'telemedicina')?.valores.amil).toBe(
      'Possui atendimento'
    )
    expect(pages[0].linhas.find((l) => l.itemKey === 'retaguarda')).toBeDefined()
    expect(pages[1].titulo).toBe('Condições contratuais')
    expect(pages[1].secao).toBe('condicoes')
    expect(pages[1].linhas.length).toBeGreaterThan(0)
    expect(pages[2].titulo).toBe('Comparativo de Indicadores das Operadoras')
    expect(pages[2].secao).toBe('indicadores')
    expect(pages[2].linhas.length).toBe(8)
  })

  it('omite itens marcados como ocultos na proposta', () => {
    const form = baseForm()
    form.kickOffEstrategia!.consolidandoDados = {
      ...form.kickOffEstrategia!.consolidandoDados!,
      itensOcultos: {
        diferenciais: ['telemedicina', 'retaguarda'],
        condicoes: ['iof', 'break_even'],
      },
    }
    const pages = buildComparativoDiferencialPages(form, operadoras)
    expect(pages[0].linhas).toHaveLength(7)
    expect(pages[0].linhas.find((l) => l.itemKey === 'telemedicina')).toBeUndefined()
    expect(pages[1].linhas.find((l) => l.itemKey === 'iof')).toBeUndefined()
    expect(pages[1].linhas.find((l) => l.itemKey === 'aviso_previo')).toBeDefined()
  })

  it('formata células com rótulo de plano', () => {
    const txt = formatDiferencialCelulasTexto([
      { id: '1', placementPlanoId: '', planoLabel: 'S6500', texto: 'Full back-up' },
    ])
    expect(txt).toBe('S6500: Full back-up')
  })

  it('importa do catálogo master por operadora e plano', () => {
    const imported = importDiferenciaisFromMaster({
      operadoraId: 'op-amil',
      colunaId: 'amil',
      masterDiferenciais: [
        {
          id: 'd1',
          operadoraId: 'op-amil',
          placementPlanoId: 'pl1',
          itemKey: 'retaguarda',
          texto: 'Retaguarda Einstein',
        },
      ],
      placementPlanos: [
        { id: 'pl1', operadoraId: 'op-amil', categoria: 'Premium', plano: 'S6500' },
      ],
      propostaPlanos: [{ id: 'p1', planoReferenciaId: '', nomePlano: 'S6500' } as any],
    })
    expect(imported.retaguarda?.[0].texto).toBe('Retaguarda Einstein')
    expect(imported.retaguarda?.[0].planoLabel).toBe('S6500')
  })

  it('preserva linhas vazias ao recarregar consolidandoDados', () => {
    const parsed = parseConsolidandoDadosFromKickOff({
      consolidandoDados: {
        diferenciais: {
          telemedicina: {
            amil: [
              { id: 'c1', placementPlanoId: '', planoLabel: 'TNP4', texto: 'Possui' },
              { id: 'c2', placementPlanoId: '', planoLabel: '', texto: '' },
            ],
          },
        },
      },
    } as any)
    const cd = ensureConsolidandoDadosState(parsed)
    expect(cd.diferenciais.telemedicina?.amil).toHaveLength(2)
  })

  it('lista planos da entrada sem duplicar rótulos do comparativo financeiro', () => {
    const form = baseForm()
    form.planos = [
      {
        id: 'pl-1',
        itemRowId: 'item-1',
        nomePlano: 'TNP4',
        tipoCusto: 'per_capita',
        numeroVidas: '10',
        custoPerCapitaBRL: 'R$ 100,00',
        acomodacao: 'Apartamento',
        abrangencia: 'Nacional',
        placementPlanoCatalogId: '',
        vidasFaixa: {} as any,
        custosFaixa: {} as any,
      } as any,
      {
        id: 'pl-2',
        itemRowId: 'item-1',
        nomePlano: 'TN2I',
        tipoCusto: 'per_capita',
        numeroVidas: '8',
        custoPerCapitaBRL: 'R$ 90,00',
        acomodacao: 'Apartamento',
        abrangencia: 'Nacional',
        placementPlanoCatalogId: '',
        vidasFaixa: {} as any,
        custosFaixa: {} as any,
      } as any,
    ]
    const ag = form.kickOffEstrategia!.aguardandoOperadora!
    const opcoes = buildDiferencialPlanoOpcoes({
      form,
      fornecedorAtivo: 'Amil',
      colunaId: 'amil',
      operadoraId: 'op-amil',
      fornecedoresVisiveis: ['Amil', 'Bradesco'],
      aguardandoOperadora: ag as any,
      placementPlanos: [],
      operadoras,
    })
    const entrada = opcoes.filter((o) => o.grupo === 'Entrada do processo')
    const colunasAtual = buildComparativoColunas(form, operadoras, [], undefined, true).filter(
      (c) => c.grupo === 'atual'
    )
    expect(entrada.length).toBe(colunasAtual.length)
    expect(new Set(entrada.map((o) => o.planoLabel)).size).toBe(entrada.length)
  })

  it('monta upsert para catálogo quando plano está vinculado', () => {
    const form = baseForm()
    const { items, skipped } = buildDiferenciaisMasterUpsertItems(
      form.kickOffEstrategia!.consolidandoDados!,
      {
        fornecedores: ['Amil', 'Bradesco'],
        resolveOperadoraId: (nome) => (nome === 'Amil' ? 'op-amil' : 'op-brad'),
        placementPlanos: [
          { id: 'pl-amil', operadoraId: 'op-amil', categoria: 'X', plano: 'S6500' },
        ],
        propostasByColuna: form.kickOffEstrategia!.aguardandoOperadora!.propostas,
      }
    )
    expect(items).toHaveLength(1)
    expect(items[0].operadoraId).toBe('op-amil')
    expect(skipped).toBe(1)

    const withPlano = {
      ...form.kickOffEstrategia!.consolidandoDados!,
      diferenciais: {
        telemedicina: {
          amil: [
            {
              id: 'c1',
              placementPlanoId: 'pl-amil',
              planoLabel: 'S6500',
              texto: 'Possui atendimento',
            },
          ],
        },
      },
    }
    const hit = buildDiferenciaisMasterUpsertItems(withPlano, {
      fornecedores: ['Amil'],
      resolveOperadoraId: () => 'op-amil',
      placementPlanos: [
        { id: 'pl-amil', operadoraId: 'op-amil', categoria: 'X', plano: 'S6500' },
      ],
      propostasByColuna: {},
    })
    expect(hit.items).toHaveLength(1)
    expect(hit.items[0].itemKey).toBe('telemedicina')
    expect(resolvePlacementPlanoIdForCelula(
      { id: '1', placementPlanoId: '', planoLabel: 'S6500', texto: 'x' },
      'op-amil',
      [{ id: 'pl-amil', operadoraId: 'op-amil', categoria: 'X', plano: 'S6500' }]
    )).toBe('pl-amil')
  })
})
