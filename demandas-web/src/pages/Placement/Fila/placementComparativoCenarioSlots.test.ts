import { describe, expect, it } from 'vitest'
import type { ContratoPlanoColuna } from './placementContratoAtual'
import {
  alignPageToOperadoraSlots,
  buildOperadoraSlotsFromColunas,
  colunaSlotKey,
  pagesComparativoContratoAlinhadas,
} from './placementComparativoEstudo'

function col(
  partial: Pick<ContratoPlanoColuna, 'id' | 'operadora' | 'operadoraId' | 'planoLabel'> &
    Partial<ContratoPlanoColuna>
): ContratoPlanoColuna {
  return {
    produto: 'Proposta',
    acomodacao: '',
    elegibilidade: '',
    elegibilidadeLinhas: [],
    contribuicao: '—',
    coparticipacao: '—',
    temCoparticipacao: false,
    vidas: 1,
    tipoCusto: 'per_capita',
    premioPerCapita: '100',
    faixas: [],
    faturaEstimada: 'R$ 100,00',
    tabColor: '#000',
    grupo: 'mercado',
    ...partial,
  }
}

describe('colunaSlotKey / alignPageToOperadoraSlots', () => {
  it('cria um slot por cenário da mesma operadora', () => {
    const cols = [
      col({
        id: 'cv1-p1',
        operadora: 'AMIL',
        operadoraId: 'op-amil',
        planoLabel: 'Sem COPAY',
        cenarioId: 'cv1',
        cenarioTitulo: 'Sem COPAY',
        cenarioOrdem: 0,
      }),
      col({
        id: 'cv2-p2',
        operadora: 'AMIL',
        operadoraId: 'op-amil',
        planoLabel: 'Com COPay',
        cenarioId: 'cv2',
        cenarioTitulo: 'Com COPay',
        cenarioOrdem: 1,
      }),
    ]
    const slots = buildOperadoraSlotsFromColunas(cols)
    expect(slots).toHaveLength(2)
    expect(slots.map((s) => s.cenarioTitulo)).toEqual(['Sem COPAY', 'Com COPay'])
    expect(colunaSlotKey(cols[0])).not.toBe(colunaSlotKey(cols[1]))
  })

  it('mantém as duas colunas AMIL ao alinhar a página', () => {
    const amil1 = col({
      id: 'cv1-p1',
      operadora: 'AMIL',
      operadoraId: 'op-amil',
      planoLabel: 'Sem COPAY',
      cenarioId: 'cv1',
      cenarioTitulo: 'Sem COPAY',
      cenarioOrdem: 0,
      planoReferenciaId: 'ref-tnp4',
    })
    const amil2 = col({
      id: 'cv2-p2',
      operadora: 'AMIL',
      operadoraId: 'op-amil',
      planoLabel: 'Com COPay',
      cenarioId: 'cv2',
      cenarioTitulo: 'Com COPay',
      cenarioOrdem: 1,
      planoReferenciaId: 'ref-tnp4',
    })
    const bradesco = col({
      id: 'cv0-p0',
      operadora: 'BRADESCO',
      operadoraId: 'op-bra',
      planoLabel: 'TNP4 Apt',
      grupo: 'atual',
      cenarioId: 'cv0',
      cenarioTitulo: 'Cenário atual',
      cenarioOrdem: 0,
      planoReferenciaId: 'ref-tnp4',
    })
    const all = [bradesco, amil1, amil2]
    const slots = buildOperadoraSlotsFromColunas(all)
    const aligned = alignPageToOperadoraSlots(
      {
        pageIndex: 0,
        totalPages: 1,
        colunas: [bradesco, amil1, amil2],
        contribuicaoUnica: null,
        coparticipacaoUnica: null,
        totalVidas: 3,
        totalFatura: '—',
      },
      slots
    )
    expect(aligned.colunas).toHaveLength(3)
    expect(aligned.colunas.filter((c) => c.operadora === 'AMIL').map((c) => c.planoLabel)).toEqual([
      'Sem COPAY',
      'Com COPay',
    ])
  })

  it('na página só de mercado, mantém as propostas e reserva o slot do contrato atual', () => {
    const atual = col({
      id: 'atual-1',
      operadora: 'ATUAL SA',
      operadoraId: 'op-atual',
      planoLabel: 'Plano A',
      grupo: 'atual',
      planoReferenciaId: 'ref-1',
    })
    const mercado = col({
      id: 'm-b',
      operadora: 'AMIL',
      operadoraId: 'op-amil',
      planoLabel: 'Plano B',
      grupo: 'mercado',
      planoReferenciaId: 'ref-2',
    })
    const slots = buildOperadoraSlotsFromColunas([atual, mercado])
    const aligned = alignPageToOperadoraSlots(
      {
        pageIndex: 1,
        totalPages: 2,
        colunas: [mercado],
        contribuicaoUnica: null,
        coparticipacaoUnica: null,
        totalVidas: 1,
        totalFatura: '—',
      },
      slots
    )
    expect(aligned.colunas.some((c) => c.grupo === 'atual')).toBe(true)
    expect(aligned.colunas.some((c) => c.id === 'm-b')).toBe(true)
    expect(aligned.colunas.filter((c) => c.grupo === 'mercado')).toHaveLength(1)
  })

  it('modelo Contrato atual mantém o slot ATUAL em cada plano equivalente sem dropar mercado', () => {
    const atual = col({
      id: 'atual-1',
      operadora: 'ATUAL SA',
      operadoraId: 'op-atual',
      planoLabel: 'Plano A',
      grupo: 'atual',
      planoReferenciaId: 'ref-1',
    })
    const mA = col({
      id: 'm-a',
      operadora: 'AMIL',
      operadoraId: 'op-amil',
      planoLabel: 'Plano A',
      grupo: 'mercado',
      planoReferenciaId: 'ref-1',
    })
    const mB = col({
      id: 'm-b',
      operadora: 'SULAMERICA',
      operadoraId: 'op-sul',
      planoLabel: 'Plano B',
      grupo: 'mercado',
      planoReferenciaId: 'ref-2',
    })
    const pages = pagesComparativoContratoAlinhadas({
      allColunas: [atual, mA, mB],
      pages: [
        {
          pageIndex: 0,
          totalPages: 2,
          colunas: [atual, mA],
          contribuicaoUnica: null,
          coparticipacaoUnica: null,
          totalVidas: 2,
          totalFatura: '—',
          grupoLabel: 'Plano A',
        },
        {
          pageIndex: 1,
          totalPages: 2,
          colunas: [mB],
          contribuicaoUnica: null,
          coparticipacaoUnica: null,
          totalVidas: 1,
          totalFatura: '—',
          grupoLabel: 'Plano B',
        },
      ],
    })
    expect(pages).toHaveLength(2)
    expect(pages.every((p) => p.colunas.some((c) => c.grupo === 'atual'))).toBe(true)
    expect(pages[0].colunas.some((c) => c.id === 'm-a')).toBe(true)
    expect(pages[1].colunas.some((c) => c.id === 'm-b')).toBe(true)
  })
})
