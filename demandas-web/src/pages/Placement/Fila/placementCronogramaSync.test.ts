import { describe, expect, it } from 'vitest'

import {

  resolveEffectiveCronogramaStatus,

  validateCronogramaStatusPatch,

  todayIsoDate,

} from './placementCronogramaStatus'

import {

  syncCronogramaOnProcessStart,

  syncCronogramaOnStageAdvance,

  mergeAtividadesComComplementares,

  excludeAtividadeFromInstancia,

} from './placementCronogramaSync'

import type { PlacementCronogramaAtividade } from '../../../store/placementStore'



const template: PlacementCronogramaAtividade[] = [

  {

    id: 'a1',

    ordem: 1,

    etapaKey: 'base_atual',

    tarefa: 'Abertura',

    slaDias: 2,

    slaReferencia: 'inicio_processo',

    ativo: true,

  },

  {

    id: 'a2',

    ordem: 2,

    etapaKey: 'validacao',

    tarefa: 'Análise',

    slaDias: 3,

    slaReferencia: 'apos_anterior',

    ativo: true,

  },

]



describe('placementCronogramaStatus', () => {

  it('marca em atraso quando previsão passou', () => {

    const today = todayIsoDate()

    const yesterday = new Date(`${today}T12:00:00`)

    yesterday.setDate(yesterday.getDate() - 1)

    const prevista = yesterday.toISOString().slice(0, 10)

    expect(

      resolveEffectiveCronogramaStatus({

        status: 'in_progress',

        dataPrevista: prevista,

        today,

      })

    ).toBe('overdue')

  })



  it('exige data de conclusão para status concluído', () => {

    const result = validateCronogramaStatusPatch({ status: 'completed', dataConclusao: null })

    expect(result.ok).toBe(false)

  })

})



describe('placementCronogramaSync', () => {

  it('inicia cronograma na etapa Premissa', () => {

    const cronograma = syncCronogramaOnProcessStart(template, null, '2026-01-10')

    expect(cronograma.dataInicioProcesso).toBe('2026-01-10')

    const linha = cronograma.linhas?.find((l) => l.atividadeId === 'a1')

    expect(linha?.status).toBe('in_progress')

    expect(linha?.dataInicio).toBe('2026-01-10')

  })



  it('conclui etapa anterior ao avançar', () => {

    const cronograma = syncCronogramaOnStageAdvance(

      template,

      { dataInicioProcesso: '2026-01-10', linhas: [] },

      'Aberta',

      'Validação',

      '2026-01-12'

    )

    const linhaPremissa = cronograma.linhas?.find((l) => l.atividadeId === 'a1')

    expect(linhaPremissa?.status).toBe('completed')

    expect(linhaPremissa?.dataConclusao).toBe('2026-01-12')

    const linhaValidacao = cronograma.linhas?.find((l) => l.atividadeId === 'a2')

    expect(linhaValidacao?.status).toBe('in_progress')

  })

  it('usa template de Dados sem injetar tarefas sintéticas', () => {

    const merged = mergeAtividadesComComplementares(template, null)

    expect(merged).toHaveLength(2)

    expect(merged.some((a) => a.id.startsWith('workflow-stage-'))).toBe(false)

  })

  it('oculta tarefa excluída nesta cotação', () => {

    const merged = mergeAtividadesComComplementares(template, {

      dataInicioProcesso: null,

      linhas: [],

      atividadesExcluidas: ['a2'],

    })

    expect(merged).toHaveLength(1)

    expect(merged[0].id).toBe('a1')

  })

  it('remove tarefa complementar da instância', () => {

    const instancia = excludeAtividadeFromInstancia(

      {

        dataInicioProcesso: null,

        linhas: [{ atividadeId: 'extra_1', status: 'pending' }],

        tarefasComplementares: [

          {

            id: 'extra_1',

            ordem: 900,

            etapaKey: 'kick_off',

            tarefa: 'Extra',

            ativo: true,

          },

        ],

      },

      'extra_1'

    )

    expect(instancia.tarefasComplementares).toHaveLength(0)

    expect(instancia.linhas).toHaveLength(0)

  })

})


