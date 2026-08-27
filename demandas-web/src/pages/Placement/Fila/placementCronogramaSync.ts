import { PLACEMENT_WORKFLOW_MAIN_STAGES, getWorkflowStageKey } from './placementCotacaoWorkflow'

import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'

import type { PlacementCronogramaAtividade } from '../../../store/placementStore'

import {

  expandAtividadesHierarquia,

  normalizeIsoDate,

  upsertCronogramaLinha,

  type PlacementCronogramaInstancia,

  type PlacementCronogramaParticipante,

} from './placementCronograma'



function todayIso(): string {

  return new Date().toISOString().slice(0, 10)

}



export function newCronogramaParticipanteId(): string {

  return `part_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

}



export function ensureCronogramaParticipantes(

  instancia: PlacementCronogramaInstancia | null | undefined

): PlacementCronogramaInstancia {

  const base = instancia ?? { dataInicioProcesso: null, linhas: [] }

  return { ...base, participantes: base.participantes ?? [] }

}



/** Garante linha por atividade do template + tarefas complementares da cotação. */

export function ensureCronogramaLinhasFromTemplate(

  atividades: PlacementCronogramaAtividade[],

  instancia: PlacementCronogramaInstancia | null | undefined,

  dataInicioProcesso?: string | null

): PlacementCronogramaInstancia {

  let cronograma = ensureCronogramaParticipantes(instancia)

  const inicio =

    normalizeIsoDate(dataInicioProcesso) ??

    normalizeIsoDate(cronograma.dataInicioProcesso) ??

    todayIso()

  cronograma = { ...cronograma, dataInicioProcesso: inicio }

  const merged = mergeAtividadesComComplementares(atividades, cronograma)
  const allRows = expandAtividadesHierarquia(merged.filter((a) => a.ativo !== false))



  for (const row of allRows) {

    const existing = cronograma.linhas?.find((l) => l.atividadeId === row.id)

    if (!existing) {

      cronograma = upsertCronogramaLinha(cronograma, row.id, {

        responsavel: row.responsavelPadrao ?? null,

      })

    }

  }



  return cronograma

}



export function syncCronogramaOnProcessStart(

  atividades: PlacementCronogramaAtividade[],

  instancia: PlacementCronogramaInstancia | null | undefined,

  dataInicio?: string | null

): PlacementCronogramaInstancia {

  const merged = mergeAtividadesComComplementares(atividades, instancia)
  let cronograma = ensureCronogramaLinhasFromTemplate(merged, instancia, dataInicio)

  const inicio = cronograma.dataInicioProcesso ?? todayIso()

  const firstEtapaKey = PLACEMENT_WORKFLOW_MAIN_STAGES[0]?.key

  if (!firstEtapaKey) return cronograma

  const rows = expandAtividadesHierarquia(
    merged.filter((a) => a.ativo !== false && a.etapaKey === firstEtapaKey && !a.parentId)

  ).sort((a, b) => a.ordem - b.ordem)



  for (const row of rows) {

    cronograma = upsertCronogramaLinha(cronograma, row.id, {

      dataInicio: inicio,

      status: 'in_progress',

    })

  }



  return cronograma

}



export function syncCronogramaOnStageAdvance(

  atividades: PlacementCronogramaAtividade[],

  instancia: PlacementCronogramaInstancia | null | undefined,

  fromStatus: PlacementCotacaoWorkflowStatus,

  toStatus: PlacementCotacaoWorkflowStatus,

  advanceDate?: string | null

): PlacementCronogramaInstancia {

  const date = normalizeIsoDate(advanceDate) ?? todayIso()

  const merged = mergeAtividadesComComplementares(atividades, instancia)
  let cronograma = ensureCronogramaLinhasFromTemplate(merged, instancia)

  const fromKey = getWorkflowStageKey(fromStatus)

  const toKey = getWorkflowStageKey(toStatus)

  const expanded = expandAtividadesHierarquia(merged.filter((a) => a.ativo !== false))



  if (fromKey) {

    for (const row of expanded.filter((r) => r.etapaKey === fromKey)) {

      const linha = cronograma.linhas?.find((l) => l.atividadeId === row.id)

      if (linha?.status === 'cancelado') continue

      if (!linha?.dataConclusao) {

        cronograma = upsertCronogramaLinha(cronograma, row.id, {

          dataConclusao: date,

          status: 'completed',

          concluida: true,

        })

      }

    }

  }



  if (toKey) {

    const toRows = expanded

      .filter((r) => r.etapaKey === toKey)

      .sort((a, b) => a.ordem - b.ordem || a.tarefa.localeCompare(b.tarefa, 'pt-BR'))



    const firstTask = toRows.find((r) => !r.parentId)

    if (firstTask) {

      cronograma = upsertCronogramaLinha(cronograma, firstTask.id, {

        dataInicio: date,

        status: 'in_progress',

      })

    }

  }



  return cronograma

}



export function addCronogramaParticipante(

  instancia: PlacementCronogramaInstancia,

  nome: string,

  email?: string | null

): PlacementCronogramaInstancia {

  const participantes = [...(instancia.participantes ?? [])]

  participantes.push({

    id: newCronogramaParticipanteId(),

    nome: nome.trim(),

    email: email?.trim() || null,

  })

  return { ...instancia, participantes }

}



export function removeCronogramaParticipante(

  instancia: PlacementCronogramaInstancia,

  participanteId: string

): PlacementCronogramaInstancia {

  return {

    ...instancia,

    participantes: (instancia.participantes ?? []).filter((p) => p.id !== participanteId),

  }

}



export function addTarefaComplementar(

  instancia: PlacementCronogramaInstancia,

  input: {

    etapaKey: string

    tarefa: string

    parentId?: string | null

    slaDias?: number | null

    responsavelPadrao?: string | null

  }

): { instancia: PlacementCronogramaInstancia; atividadeId: string } {

  const id = `extra_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

  const complementar: PlacementCronogramaAtividade = {

    id,

    ordem: (instancia.tarefasComplementares?.length ?? 0) + 900,

    etapaKey: input.etapaKey,

    tarefa: input.tarefa.trim(),

    parentId: input.parentId ?? null,

    slaDias: input.slaDias ?? null,

    slaReferencia: 'apos_anterior',

    responsavelPadrao: input.responsavelPadrao ?? null,

    complementar: true,

    ativo: true,

  }



  const tarefasComplementares = [...(instancia.tarefasComplementares ?? []), complementar]

  let next = { ...instancia, tarefasComplementares }

  next = upsertCronogramaLinha(next, id, {

    responsavel: input.responsavelPadrao ?? null,

  })

  return { instancia: next, atividadeId: id }

}



export function mergeAtividadesComComplementares(

  template: PlacementCronogramaAtividade[],

  instancia: PlacementCronogramaInstancia | null | undefined

): PlacementCronogramaAtividade[] {

  const excluded = new Set(instancia?.atividadesExcluidas ?? [])

  const fromTemplate = template

    .filter((a) => a.ativo !== false)

    .filter((a) => !excluded.has(a.id))

    .filter((a) => !(a.parentId && excluded.has(a.parentId)))

  const extras = (instancia?.tarefasComplementares ?? []).filter((a) => a.ativo !== false)

  return [...fromTemplate, ...extras]

}



export function excludeAtividadeFromInstancia(

  instancia: PlacementCronogramaInstancia,

  atividadeId: string

): PlacementCronogramaInstancia {

  const isComplementar =

    atividadeId.startsWith('extra_') ||

    (instancia.tarefasComplementares ?? []).some((t) => t.id === atividadeId)

  if (isComplementar) {

    return removeTarefaComplementar(instancia, atividadeId)

  }

  const excluded = [...new Set([...(instancia.atividadesExcluidas ?? []), atividadeId])]

  const linhas = (instancia.linhas ?? []).filter(

    (l) => l.atividadeId !== atividadeId && l.atividadeId !== `${atividadeId}::sub`

  )

  return { ...instancia, atividadesExcluidas: excluded, linhas }

}



export function removeTarefaComplementar(

  instancia: PlacementCronogramaInstancia,

  atividadeId: string

): PlacementCronogramaInstancia {

  const tarefasComplementares = (instancia.tarefasComplementares ?? []).filter(

    (t) => t.id !== atividadeId && t.parentId !== atividadeId

  )

  const linhas = (instancia.linhas ?? []).filter((l) => l.atividadeId !== atividadeId)

  return { ...instancia, tarefasComplementares, linhas }

}



export type { PlacementCronogramaParticipante }


