import { describe, expect, it } from 'vitest'
import {
  safeSum,
  sumDemandMetric,
  sumItensConcluidosContratos,
  sumItensConcluidosItem,
  sumItensConcluidosSubs,
  countManutencaoSistemasDistintos,
  countReajusteContratosVinculados,
  aggregateManutencaoTotaisPorSistema,
} from './useQuantitativeAnalysis'

const sistemas = [
  { id: 'sys-edge', nome: 'EDGE' },
  { id: 'sys-move', nome: 'MOVE' },
  { id: 'sys-outro', nome: 'Outro' },
]

describe('useQuantitativeAnalysis helpers', () => {
  it('safeSum aceita número, string e vírgula decimal', () => {
    expect(safeSum(10)).toBe(10)
    expect(safeSum('12,5')).toBe(12.5)
    expect(safeSum(null)).toBe(0)
    expect(safeSum('')).toBe(0)
  })

  it('soma qtdUsuarios a partir de sistemasMetrics (fluxo novo)', () => {
    const items = [
      {
        sistemasMetrics: {
          'sys-edge': { qtdUsuarios: 10, qtdClientesVinculados: 3 },
          'sys-move': { qtdUsuarios: 7 },
        },
        qtdUsuarios: null,
      },
      {
        sistemasMetrics: {
          'sys-outro': { qtdUsuarios: '5' },
        },
      },
    ]
    expect(sumDemandMetric(items, 'qtdUsuarios', { sistemas })).toBe(22)
  })

  it('soma clientes vinculados só do EDGE', () => {
    const items = [
      {
        sistemasMetrics: {
          'sys-edge': { qtdClientesVinculados: 40 },
          'sys-move': { qtdClientesVinculados: 99 },
        },
        qtdClientesVinculados: 1,
      },
    ]
    expect(
      sumDemandMetric(items, 'qtdClientesVinculados', {
        sistemas,
        sistemaNomeMatch: /edge/i,
        legacyField: 'qtdClientesVinculados',
      })
    ).toBe(40)
  })

  it('MOVE usa qtdUsuarios do sistema; legado usa usuariosEmpresa', () => {
    const novo = [
      {
        sistemasMetrics: {
          'sys-move': { qtdUsuarios: 15 },
          'sys-edge': { qtdUsuarios: 100 },
        },
      },
    ]
    expect(
      sumDemandMetric(novo, 'qtdUsuarios', {
        sistemas,
        sistemaNomeMatch: /move/i,
        legacyField: 'usuariosEmpresa',
      })
    ).toBe(15)

    const legado = [{ usuariosEmpresa: 8 }]
    expect(
      sumDemandMetric(legado, 'qtdUsuarios', {
        sistemas,
        sistemaNomeMatch: /move/i,
        legacyField: 'usuariosEmpresa',
      })
    ).toBe(8)
  })

  it('cai no campo legado quando não há sistemasMetrics', () => {
    const items = [
      { qtdUsuarios: 11, periodicidade: 99 },
      { qtdClientesVinculados: 4 },
    ]
    expect(sumDemandMetric(items, 'qtdUsuarios', { sistemas })).toBe(11)
    expect(
      sumDemandMetric(items, 'qtdClientesVinculados', {
        sistemas,
        legacyField: 'qtdClientesVinculados',
      })
    ).toBe(4)
  })

  it('itens concluídos preferem detalhe Contrato/SUB', () => {
    expect(
      sumItensConcluidosItem({
        itensConcluidos: 1,
        itensConcluidosDetalhe: { contrato: 10, subs: 5 },
      })
    ).toBe(15)
    expect(sumItensConcluidosItem({ itensConcluidos: 7 })).toBe(7)
    expect(
      sumItensConcluidosItem({
        itensConcluidosDetalhe: JSON.stringify({ contrato: 2, subs: 3 }),
      })
    ).toBe(5)
  })

  it('separa totais de Contratos e SUB\'s', () => {
    const items = [
      { itensConcluidosDetalhe: { contrato: 10, subs: 4 } },
      { itensConcluidosDetalhe: { contrato: 2, subs: 1 } },
      { itensConcluidos: 5, tipo: 'Total' },
      { itensConcluidos: 3, tipo: 'SUB' },
    ]
    expect(sumItensConcluidosContratos(items)).toBe(17)
    expect(sumItensConcluidosSubs(items)).toBe(8)
  })

  it('conta sistemas distintos (mesmo sistema em vários processos = 1) e agrega totais', () => {
    expect(
      countManutencaoSistemasDistintos([
        { sistemasIds: ['sys-edge', 'sys-move'] },
        { sistemasIds: ['sys-edge'] },
        { sistemaId: 'sys-outro' },
        {},
      ])
    ).toBe(3)

    expect(countManutencaoSistemasDistintos([{ sistemasIds: ['a', 'b', 'a'] }])).toBe(2)
    expect(countManutencaoSistemasDistintos([])).toBe(0)

    const rows = aggregateManutencaoTotaisPorSistema(
      [
        { sistemasTotais: { 'sys-edge': 10, 'sys-move': 4 } },
        { sistemasTotais: { 'sys-edge': 5 } },
        { sistemaId: 'sys-outro', total: 7 },
      ],
      sistemas
    )
    expect(rows).toEqual([
      { sistemaId: 'sys-edge', nome: 'EDGE', total: 15 },
      { sistemaId: 'sys-move', nome: 'MOVE', total: 4 },
      { sistemaId: 'sys-outro', nome: 'Outro', total: 7 },
    ])
  })

  it('reajuste conta contratos vinculados (não o campo itensConcluidos)', () => {
    expect(
      countReajusteContratosVinculados({
        itensConcluidos: 99,
        contratosVinculos: [
          { contratoId: 'c1' },
          { contratoId: 'c2' },
          { contratoId: 'c1' },
        ],
      })
    ).toBe(2)
    expect(countReajusteContratosVinculados({ contrato: 'CTR-001', itensConcluidos: 5 })).toBe(1)
    expect(countReajusteContratosVinculados({ itensConcluidos: 5 })).toBe(0)
  })
})
