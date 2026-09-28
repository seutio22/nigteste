import { describe, expect, it } from 'vitest'
import { buildProjectFilaItems, classifyPrazo, parsePrazo, responsavelCorresponde } from './filaData'

// Quarta-feira, 30/09/2026 10:00
const agora = new Date(2026, 8, 30, 10)

function col(raw: string) {
  const p = parsePrazo(raw)!
  return classifyPrazo({ prazo: p.prazo, prazoDiaInteiro: p.diaInteiro, slaStatus: null }, agora)
}

describe('classifyPrazo', () => {
  it('classifica datas de dia inteiro sem cair no dia anterior por fuso', () => {
    expect(col('2026-09-30')).toBe('hoje')
    expect(col('2026-09-30T00:00:00.000Z')).toBe('hoje')
    expect(col('2026-09-29')).toBe('atrasado')
    expect(col('2026-10-04')).toBe('semana')
    expect(col('2026-10-05')).toBe('proximas')
  })

  it('prazo com horário já passado no mesmo dia é atrasado', () => {
    expect(col(new Date(2026, 8, 30, 9).toISOString())).toBe('atrasado')
    expect(col(new Date(2026, 8, 30, 17).toISOString())).toBe('hoje')
  })

  it('sem prazo e SLA atrasado', () => {
    expect(classifyPrazo({ prazo: null, prazoDiaInteiro: true, slaStatus: null }, agora)).toBe('sem_prazo')
    expect(classifyPrazo({ prazo: null, prazoDiaInteiro: false, slaStatus: 'atrasado' }, agora)).toBe('atrasado')
  })
})

describe('projetos', () => {
  const project = {
    id: 'p1',
    name: 'Implantação',
    status: 'active',
    managerId: 'u1',
    endDate: '2026-12-31',
    timeline: JSON.stringify({
      phases: [
        {
          id: 'f1',
          name: 'Etapa 1',
          status: 'em_andamento',
          tasks: [
            {
              id: 't1',
              name: 'Levantamento',
              responsible: 'Ana Souza, Bruno',
              plannedEndDate: '2026-10-01',
              status: 'in_progress',
              subtasks: [
                { id: 's1', title: 'Reunião', assignee: 'Carla', dueDate: '2026-10-02', status: 'pending' },
                { id: 's2', title: 'Ata', assignee: 'Ana Souza', status: 'completed' },
              ],
            },
            { id: 't2', name: 'Concluída', responsible: 'Ana Souza', status: 'completed', subtasks: [] },
          ],
        },
      ],
    }),
  }

  it('compara responsável por nome normalizado', () => {
    expect(responsavelCorresponde('Ana Souza, Bruno', ['ana souza'])).toBe(true)
    expect(responsavelCorresponde('Ana Souza', ['Ana'])).toBe(false)
  })

  it('traz só tarefas e subtarefas abertas do analista', () => {
    const itens = buildProjectFilaItems([project], {
      nomes: ['Ana Souza'],
      isProjetoDoAnalista: () => false,
    })
    expect(itens.map((i) => i.key)).toEqual(['tarefa:p1:t1'])

    const carla = buildProjectFilaItems([project], { nomes: ['Carla'], isProjetoDoAnalista: (p) => p.managerId === 'u1' })
    expect(carla.map((i) => i.kind)).toEqual(['projeto', 'subtarefa'])
    expect(carla[1].navState).toEqual({ activeTab: 1, scrollToTaskId: 't1', scrollToSubtaskId: 's1' })
  })

  it('ignora projetos concluídos', () => {
    expect(buildProjectFilaItems([{ ...project, status: 'completed' }], null)).toEqual([])
  })
})
