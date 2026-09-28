import { describe, expect, it } from 'vitest'
import { evaluateTicketSla, extractManutencaoDims, type SlaRegraRow } from './slaMatching'

const H = 3600

const regra: SlaRegraRow = {
  id: 'r1',
  pageKey: 'manutencoes',
  impacto: 'media',
  ativo: true,
  tempoPrevistoSeconds: 16 * H,
}

function avaliar(item: any, extra: Partial<Parameters<typeof evaluateTicketSla>[0]> = {}) {
  return evaluateTicketSla({
    item,
    dims: extractManutencaoDims(item),
    rules: [regra],
    dataConclusao: item.dataFinal ?? '',
    dataInicio: item.dataInicio ?? null,
    dataFinal: item.dataFinal ?? null,
    ...extra,
  })
}

describe('evaluateTicketSla', () => {
  it('concluído no 2º dia útil fica dentro de 2 dias úteis', () => {
    const r = avaliar({
      id: 'a',
      status: 'Concluída',
      prioridade: 'Média',
      dataInicio: '2026-09-24T00:00:00.000Z',
      dataFinal: '2026-09-25T00:00:00.000Z',
    })
    expect(r.prazoSlaSeconds).toBe(16 * H)
    expect(r.status).toBe('dentro')
    expect(r.tempoExecutadoSeconds).toBe(16 * H)
    const limite = new Date(r.prazoLimite!)
    expect([limite.getDate(), limite.getHours()]).toEqual([25, 17])
  })

  it('concluído após o fim de semana fica fora', () => {
    const r = avaliar({
      id: 'b',
      status: 'Concluída',
      prioridade: 'Média',
      dataInicio: '2026-09-24T00:00:00.000Z',
      dataFinal: '2026-09-28T00:00:00.000Z',
    })
    expect(r.status).toBe('fora')
    expect(r.saldoSeconds).toBe(-8 * H)
  })

  it('pausa em Aguardando estende a data limite', () => {
    const r = avaliar(
      {
        id: 'c',
        status: 'Concluída',
        prioridade: 'Média',
        dataInicio: '2026-09-24T00:00:00.000Z',
        dataFinal: '2026-09-28T00:00:00.000Z',
      },
      {
        statusEvents: [
          { toValue: 'Aguardando validação', createdAt: new Date(2026, 8, 24, 9).toISOString() },
          { toValue: 'Em andamento', createdAt: new Date(2026, 8, 25, 9).toISOString() },
        ],
      }
    )
    expect(r.tempoPausadoSeconds).toBe(8 * H)
    expect(r.status).toBe('dentro')
  })

  it('chamado aberto: no prazo e depois atrasado', () => {
    const item = { id: 'd', status: 'Em andamento', prioridade: 'Média', dataInicio: '2026-09-24T00:00:00.000Z' }
    const noPrazo = avaliar(item, { concluido: false, agora: new Date(2026, 8, 25, 10) })
    expect(noPrazo.status).toBe('no_prazo')
    expect(noPrazo.saldoSeconds).toBe(7 * H)
    const atrasado = avaliar(item, { concluido: false, agora: new Date(2026, 8, 28, 10) })
    expect(atrasado.status).toBe('atrasado')
  })

  it('aberto antes do expediente do dia de início não perde a data', () => {
    const item = { id: 'e', status: 'Em andamento', prioridade: 'Média', dataInicio: '2026-09-24' }
    const r = avaliar(item, { concluido: false, agora: new Date(2026, 8, 24, 6) })
    expect(r.status).toBe('no_prazo')
    expect(r.tempoExecutadoSeconds).toBe(0)
  })

  it('Aguardando aprovação pausa o SLA usando o histórico', () => {
    const item = { id: 'g', status: 'Aguardando aprovação', prioridade: 'Média', dataInicio: '2026-09-24' }
    const r = avaliar(item, {
      concluido: false,
      agora: new Date(2026, 8, 28, 10),
      statusEvents: [{ toValue: 'Aguardando aprovação', createdAt: new Date(2026, 8, 24, 13).toISOString() }],
    })
    expect(r.status).toBe('pausado')
    expect(r.tempoExecutadoSeconds).toBe(4 * H)
    expect(r.saldoSeconds).toBe(12 * H)
  })

  it('Aguardando aprovação sem registro no histórico pausa desde a última gravação', () => {
    const item = {
      id: 'h',
      status: 'Aguardando aprovação',
      prioridade: 'Média',
      dataInicio: '2026-09-24',
      updatedAt: new Date(2026, 8, 24, 15).toISOString(),
    }
    const r = avaliar(item, { concluido: false, agora: new Date(2026, 8, 28, 10), statusEvents: [] })
    expect(r.status).toBe('pausado')
    expect(r.tempoExecutadoSeconds).toBe(6 * H)
    expect(r.temHistoricoStatus).toBe(false)
  })

  it('sem regra correspondente', () => {
    const r = evaluateTicketSla({
      item: { id: 'f', status: 'Concluída' },
      dims: extractManutencaoDims({ id: 'f' }),
      rules: [],
      dataConclusao: '2026-09-25',
      dataInicio: '2026-09-24',
      dataFinal: '2026-09-25',
    })
    expect(r.status).toBe('sem_regra')
  })
})
