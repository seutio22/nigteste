import { PLACEMENT_WORKFLOW_MAIN_STAGES } from './placementCotacaoWorkflow'
import {
  normalizeCronogramaStatus,
  resolveEffectiveCronogramaStatus,
  type PlacementCronogramaStatus,
} from './placementCronogramaStatus'
import type { PlacementCronogramaAtividade } from '../../../store/placementStore'

export type PlacementCronogramaSlaReferencia = 'inicio_processo' | 'apos_anterior'

export type PlacementCronogramaLinha = {
  atividadeId: string
  dataInicio?: string | null
  dataPrevista?: string | null
  dataEntrega?: string | null
  dataConclusao?: string | null
  status?: PlacementCronogramaStatus | string | null
  responsavel?: string | null
  concluida?: boolean
  observacao?: string | null
}

export type PlacementCronogramaParticipante = {
  id: string
  nome: string
  email?: string | null
}

export type PlacementCronogramaInstancia = {
  dataInicioProcesso?: string | null
  participantes?: PlacementCronogramaParticipante[]
  /** Tarefas extras só desta cotação (não alteram o template global). */
  tarefasComplementares?: PlacementCronogramaAtividade[]
  /** IDs do template global ocultos nesta cotação (ex.: tarefa que não ocorreu). */
  atividadesExcluidas?: string[]
  linhas?: PlacementCronogramaLinha[]
}

export type PlacementCronogramaItemView = {
  id: string
  ordem: number
  etapaKey: string
  nome: string
  isSubtarefa: boolean
  parentId: string | null
  slaDias: number | null
  slaReferencia: PlacementCronogramaSlaReferencia
  responsavelPadrao: string | null
  observacoes: string | null
  ativo: boolean
  dataInicioCalculada: string | null
  dataPrevistaCalculada: string | null
  dataInicioEfetiva: string | null
  dataPrevistaEfetiva: string | null
  dataConclusaoEfetiva: string | null
  status: PlacementCronogramaStatus
  responsavel: string | null
}

export type PlacementCronogramaTarefaView = PlacementCronogramaItemView & {
  subtasks: PlacementCronogramaItemView[]
}

export type PlacementCronogramaEtapaView = {
  etapaKey: string
  etapaLabel: string
  etapaIndex: number
  etapaDescription?: string
  tasks: PlacementCronogramaTarefaView[]
  dataInicioEtapa: string | null
  dataPrevistaEtapa: string | null
  dataConclusaoEtapa: string | null
  concluidas: number
  total: number
}

/** @deprecated use PlacementCronogramaItemView */
export type PlacementCronogramaLinhaView = PlacementCronogramaItemView & {
  atividadeId: string
  tarefa: string
  subtarefa: string | null
  etapaLabel: string
  dataEntregaCalculada: string | null
  dataEntregaEfetiva: string | null
  concluida: boolean
}

/** @deprecated use PlacementCronogramaEtapaView */
export type PlacementCronogramaEtapaGrupo = PlacementCronogramaEtapaView & {
  linhas: PlacementCronogramaLinhaView[]
  dataEntregaEtapa: string | null
}

const SLA_REFERENCIA_LABELS: Record<PlacementCronogramaSlaReferencia, string> = {
  inicio_processo: 'Início do processo',
  apos_anterior: 'Após anterior',
}

export function slaReferenciaLabel(ref: PlacementCronogramaSlaReferencia): string {
  return SLA_REFERENCIA_LABELS[ref] ?? ref
}

export function etapaKeyLabel(etapaKey: string | null | undefined): string {
  const key = String(etapaKey ?? '').trim()
  if (!key) return '—'
  const hit = PLACEMENT_WORKFLOW_MAIN_STAGES.find((s) => s.key === key)
  return hit?.label ?? key
}

export function etapaWorkflowIndex(etapaKey: string): number {
  const hit = PLACEMENT_WORKFLOW_MAIN_STAGES.find((s) => s.key === etapaKey)
  return hit?.mainFlowIndex ?? 999
}

export function normalizeIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export function addCalendarDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T12:00:00`)
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

export function formatIsoDatePt(iso: string | null | undefined): string {
  const normalized = normalizeIsoDate(iso)
  if (!normalized) return '—'
  const [y, m, d] = normalized.split('-')
  return `${d}/${m}/${y}`
}

function readDataPrevistaFromRow(r: Record<string, unknown>): string | null {
  return normalizeIsoDate(r.dataPrevista ?? r.dataEntrega)
}

export function parseCronogramaFromKickOff(raw: unknown): PlacementCronogramaInstancia {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { dataInicioProcesso: null, participantes: [], linhas: [] }
  }
  const o = raw as Record<string, unknown>
  const linhasRaw = Array.isArray(o.linhas) ? o.linhas : []
  const linhas: PlacementCronogramaLinha[] = linhasRaw
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null
      const r = row as Record<string, unknown>
      const atividadeId = String(r.atividadeId ?? '').trim()
      if (!atividadeId) return null
      const dataPrevista = readDataPrevistaFromRow(r)
      const dataConclusao = normalizeIsoDate(r.dataConclusao)
      const concluida = Boolean(r.concluida)
      const storedStatus = concluida && !r.status ? 'completed' : normalizeCronogramaStatus(r.status)
      const status = resolveEffectiveCronogramaStatus({
        status: storedStatus,
        dataPrevista,
        dataConclusao,
        concluida,
      })
      return {
        atividadeId,
        dataInicio: normalizeIsoDate(r.dataInicio),
        dataPrevista,
        dataEntrega: dataPrevista,
        dataConclusao,
        status,
        responsavel: r.responsavel != null ? String(r.responsavel) : null,
        concluida: status === 'completed',
        observacao: r.observacao != null ? String(r.observacao) : null,
      }
    })
    .filter(Boolean) as PlacementCronogramaLinha[]

  const participantesRaw = Array.isArray(o.participantes) ? o.participantes : []
  const participantes: PlacementCronogramaParticipante[] = participantesRaw
    .map((p) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return null
      const row = p as Record<string, unknown>
      const id = String(row.id ?? '').trim()
      const nome = String(row.nome ?? '').trim()
      if (!id || !nome) return null
      return {
        id,
        nome,
        email: row.email != null ? String(row.email) : null,
      }
    })
    .filter(Boolean) as PlacementCronogramaParticipante[]

  const extrasRaw = Array.isArray(o.tarefasComplementares) ? o.tarefasComplementares : []
  const tarefasComplementares = extrasRaw
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null
      const r = row as Record<string, unknown>
      const id = String(r.id ?? '').trim()
      const tarefa = String(r.tarefa ?? '').trim()
      const etapaKey = String(r.etapaKey ?? '').trim()
      if (!id || !tarefa || !etapaKey) return null
      return {
        id,
        ordem: typeof r.ordem === 'number' ? r.ordem : 900,
        etapaKey,
        tarefa,
        parentId: r.parentId != null ? String(r.parentId) : null,
        slaDias: r.slaDias != null ? Math.round(Number(r.slaDias)) : null,
        slaReferencia:
          String(r.slaReferencia ?? 'apos_anterior').trim() === 'inicio_processo'
            ? 'inicio_processo'
            : 'apos_anterior',
        responsavelPadrao: r.responsavelPadrao != null ? String(r.responsavelPadrao) : null,
        complementar: true,
        ativo: r.ativo !== false,
        observacoes: r.observacoes != null ? String(r.observacoes) : null,
      } as PlacementCronogramaAtividade
    })
    .filter(Boolean) as PlacementCronogramaAtividade[]

  const excluidasRaw = Array.isArray(o.atividadesExcluidas) ? o.atividadesExcluidas : []
  const atividadesExcluidas = excluidasRaw
    .map((id) => String(id ?? '').trim())
    .filter(Boolean)

  return {
    dataInicioProcesso: normalizeIsoDate(o.dataInicioProcesso),
    participantes,
    tarefasComplementares,
    atividadesExcluidas,
    linhas,
  }
}

function linhaOverridesMap(linhas: PlacementCronogramaLinha[] | undefined): Map<string, PlacementCronogramaLinha> {
  return new Map((linhas ?? []).map((l) => [l.atividadeId, l]))
}

/** Normaliza linhas legadas (tarefa+subtarefa na mesma row) para hierarquia virtual. */
export function expandAtividadesHierarquia(atividades: PlacementCronogramaAtividade[]): PlacementCronogramaAtividade[] {
  const out: PlacementCronogramaAtividade[] = []
  for (const row of atividades) {
    if (row.parentId) {
      out.push(row)
      continue
    }
    if (row.subtarefa && String(row.subtarefa).trim()) {
      out.push({ ...row, subtarefa: null })
      out.push({
        ...row,
        id: `${row.id}::sub`,
        parentId: row.id,
        tarefa: String(row.subtarefa).trim(),
        subtarefa: null,
        ordem: row.ordem,
        slaDias: null,
        slaReferencia: 'apos_anterior',
      })
    } else {
      out.push(row)
    }
  }
  return out
}

function minDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.map(normalizeIsoDate).filter(Boolean) as string[]
  return valid.length ? valid.sort()[0] : null
}

function maxDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.map(normalizeIsoDate).filter(Boolean) as string[]
  return valid.length ? valid.sort().reverse()[0] : null
}

function buildItemView(
  row: PlacementCronogramaAtividade,
  override: PlacementCronogramaLinha | undefined,
  ctx: {
    dataInicioProcesso: string | null
    prevDataPrevista: string | null
    isSubtarefa: boolean
  }
): { item: PlacementCronogramaItemView; nextPrev: string | null } {
  const slaReferencia =
    row.slaReferencia === 'inicio_processo' ? 'inicio_processo' : 'apos_anterior'

  let dataInicioCalculada: string | null = null
  if (slaReferencia === 'inicio_processo') {
    dataInicioCalculada = ctx.dataInicioProcesso
  } else if (ctx.prevDataPrevista) {
    dataInicioCalculada = ctx.prevDataPrevista
  } else if (ctx.dataInicioProcesso) {
    dataInicioCalculada = ctx.dataInicioProcesso
  }

  let dataPrevistaCalculada: string | null = null
  if (dataInicioCalculada != null && row.slaDias != null && row.slaDias >= 0) {
    dataPrevistaCalculada = addCalendarDays(dataInicioCalculada, row.slaDias)
  }

  const overridePrevista =
    normalizeIsoDate(override?.dataPrevista) ?? normalizeIsoDate(override?.dataEntrega)
  const dataInicioEfetiva = normalizeIsoDate(override?.dataInicio) ?? dataInicioCalculada
  const dataPrevistaEfetiva = overridePrevista ?? dataPrevistaCalculada
  const dataConclusaoEfetiva = normalizeIsoDate(override?.dataConclusao)
  const status = resolveEffectiveCronogramaStatus({
    status: override?.status,
    dataPrevista: dataPrevistaEfetiva,
    dataConclusao: dataConclusaoEfetiva,
    concluida: override?.concluida,
  })

  const item: PlacementCronogramaItemView = {
    id: row.id,
    ordem: row.ordem,
    etapaKey: row.etapaKey,
    nome: row.tarefa,
    isSubtarefa: ctx.isSubtarefa,
    parentId: row.parentId ?? null,
    slaDias: row.slaDias,
    slaReferencia,
    responsavelPadrao: row.responsavelPadrao ?? null,
    observacoes: row.observacoes ?? null,
    ativo: row.ativo !== false,
    dataInicioCalculada,
    dataPrevistaCalculada,
    dataInicioEfetiva,
    dataPrevistaEfetiva,
    dataConclusaoEfetiva,
    status,
    responsavel: override?.responsavel ?? row.responsavelPadrao ?? null,
  }

  return { item, nextPrev: dataPrevistaEfetiva ?? ctx.prevDataPrevista }
}

/** Monta árvore Etapa → Tarefa → Subtarefa com datas, status e responsável. */
export function buildCronogramaTree(
  atividades: PlacementCronogramaAtividade[],
  instancia: PlacementCronogramaInstancia | null | undefined
): PlacementCronogramaEtapaView[] {
  const dataInicioProcesso = normalizeIsoDate(instancia?.dataInicioProcesso)
  const overrides = linhaOverridesMap(instancia?.linhas)
  const excluded = new Set(instancia?.atividadesExcluidas ?? [])
  const expanded = expandAtividadesHierarquia(atividades.filter((a) => a.ativo !== false)).filter(
    (a) => !excluded.has(a.id) && !(a.parentId && excluded.has(a.parentId))
  )

  const tasksByEtapa = new Map<string, PlacementCronogramaAtividade[]>()
  const subtasksByParent = new Map<string, PlacementCronogramaAtividade[]>()

  for (const row of expanded) {
    if (row.parentId) {
      const list = subtasksByParent.get(row.parentId) ?? []
      list.push(row)
      subtasksByParent.set(row.parentId, list)
    } else {
      const list = tasksByEtapa.get(row.etapaKey) ?? []
      list.push(row)
      tasksByEtapa.set(row.etapaKey, list)
    }
  }

  let prevDataPrevista: string | null = null
  const etapas: PlacementCronogramaEtapaView[] = []

  PLACEMENT_WORKFLOW_MAIN_STAGES.forEach((stage, etapaIndex) => {
    let taskRows = [...(tasksByEtapa.get(stage.key) ?? [])].sort(
      (a, b) => a.ordem - b.ordem || a.tarefa.localeCompare(b.tarefa, 'pt-BR')
    )

    const tasks: PlacementCronogramaTarefaView[] = []
    let concluidas = 0
    let total = 0
    const allItems: PlacementCronogramaItemView[] = []

    for (const taskRow of taskRows) {
      const { item: taskItem, nextPrev: afterTask } = buildItemView(taskRow, overrides.get(taskRow.id), {
        dataInicioProcesso,
        prevDataPrevista,
        isSubtarefa: false,
      })
      prevDataPrevista = afterTask
      total += 1
      if (taskItem.status === 'completed') concluidas += 1
      allItems.push(taskItem)

      const subRows = [...(subtasksByParent.get(taskRow.id) ?? [])].sort(
        (a, b) => a.ordem - b.ordem || a.tarefa.localeCompare(b.tarefa, 'pt-BR')
      )
      const subtasks: PlacementCronogramaItemView[] = []
      for (const subRow of subRows) {
        const { item: subItem, nextPrev: afterSub } = buildItemView(subRow, overrides.get(subRow.id), {
          dataInicioProcesso,
          prevDataPrevista,
          isSubtarefa: true,
        })
        prevDataPrevista = afterSub
        total += 1
        if (subItem.status === 'completed') concluidas += 1
        subtasks.push(subItem)
        allItems.push(subItem)
      }

      tasks.push({ ...taskItem, subtasks })
    }

    etapas.push({
      etapaKey: stage.key,
      etapaLabel: stage.label,
      etapaIndex,
      etapaDescription: stage.objective,
      tasks,
      dataInicioEtapa: minDate(allItems.map((i) => i.dataInicioEfetiva)),
      dataPrevistaEtapa: maxDate(allItems.map((i) => i.dataPrevistaEfetiva)),
      dataConclusaoEtapa: maxDate(allItems.map((i) => i.dataConclusaoEfetiva)),
      concluidas,
      total,
    })
  })

  return etapas
}

export function flattenCronogramaTree(etapas: PlacementCronogramaEtapaView[]): PlacementCronogramaItemView[] {
  const out: PlacementCronogramaItemView[] = []
  for (const etapa of etapas) {
    for (const task of etapa.tasks) {
      out.push(task)
      out.push(...task.subtasks)
    }
  }
  return out
}

function toLinhaView(item: PlacementCronogramaItemView): PlacementCronogramaLinhaView {
  return {
    ...item,
    atividadeId: item.id,
    tarefa: item.nome,
    subtarefa: item.isSubtarefa ? item.nome : null,
    etapaLabel: etapaKeyLabel(item.etapaKey),
    dataEntregaCalculada: item.dataPrevistaCalculada,
    dataEntregaEfetiva: item.dataPrevistaEfetiva,
    concluida: item.status === 'completed',
  }
}

export function cronogramaItemNumber(etapaIndex: number, taskIndex: number, subIndex?: number): string {
  const base = `${etapaIndex + 1}.${taskIndex + 1}`
  return subIndex != null ? `${base}.${subIndex + 1}` : base
}

export function upsertCronogramaLinha(
  instancia: PlacementCronogramaInstancia,
  atividadeId: string,
  patch: Partial<Omit<PlacementCronogramaLinha, 'atividadeId'>>
): PlacementCronogramaInstancia {
  const linhas = [...(instancia.linhas ?? [])]
  const idx = linhas.findIndex((l) => l.atividadeId === atividadeId)
  const entrega =
    patch.dataPrevista !== undefined
      ? patch.dataPrevista
      : patch.dataEntrega !== undefined
        ? patch.dataEntrega
        : undefined
  const normalizedPatch: Partial<PlacementCronogramaLinha> = {
    ...patch,
    ...(entrega !== undefined ? { dataPrevista: entrega, dataEntrega: entrega } : {}),
  }
  if (patch.status === 'completed' && patch.dataConclusao === undefined && !normalizedPatch.dataConclusao) {
    normalizedPatch.concluida = true
  }
  if (patch.dataConclusao && !patch.status) {
    normalizedPatch.status = 'completed'
    normalizedPatch.concluida = true
  }
  if (normalizedPatch.status) {
    normalizedPatch.status = resolveEffectiveCronogramaStatus({
      status: normalizedPatch.status,
      dataPrevista:
        normalizeIsoDate(normalizedPatch.dataPrevista) ??
        normalizeIsoDate(normalizedPatch.dataEntrega),
      dataConclusao: normalizeIsoDate(normalizedPatch.dataConclusao),
      concluida: normalizedPatch.concluida,
    })
  }
  if (idx >= 0) {
    linhas[idx] = { ...linhas[idx], ...normalizedPatch, atividadeId }
  } else {
    linhas.push({ atividadeId, ...normalizedPatch })
  }
  return { ...instancia, linhas }
}

export const ETAPA_KEY_OPTIONS = PLACEMENT_WORKFLOW_MAIN_STAGES.map((s) => ({
  value: s.key,
  label: s.label,
}))

/** Lista achatada com campos legados — compatibilidade. */
export function buildCronogramaLinhas(
  atividades: PlacementCronogramaAtividade[],
  instancia: PlacementCronogramaInstancia | null | undefined
): PlacementCronogramaLinhaView[] {
  return flattenCronogramaTree(buildCronogramaTree(atividades, instancia)).map(toLinhaView)
}

export function groupCronogramaPorEtapa(linhas: PlacementCronogramaLinhaView[]): PlacementCronogramaEtapaGrupo[] {
  const byEtapa = new Map<string, PlacementCronogramaLinhaView[]>()
  for (const linha of linhas) {
    const list = byEtapa.get(linha.etapaKey) ?? []
    list.push(linha)
    byEtapa.set(linha.etapaKey, list)
  }

  return PLACEMENT_WORKFLOW_MAIN_STAGES.filter((stage) => byEtapa.has(stage.key)).map((stage, idx) => {
    const stageLinhas = [...(byEtapa.get(stage.key) ?? [])].sort(
      (a, b) => a.ordem - b.ordem || a.tarefa.localeCompare(b.tarefa, 'pt-BR')
    )
    const concluidas = stageLinhas.filter((l) => l.status === 'completed' || l.concluida).length
    return {
      etapaKey: stage.key,
      etapaLabel: stage.label,
      etapaIndex: idx,
      linhas: stageLinhas,
      tasks: [],
      dataInicioEtapa: minDate(stageLinhas.map((l) => l.dataInicioEfetiva)),
      dataPrevistaEtapa: maxDate(stageLinhas.map((l) => l.dataPrevistaEfetiva)),
      dataConclusaoEtapa: maxDate(stageLinhas.map((l) => l.dataConclusaoEfetiva)),
      dataEntregaEtapa: maxDate(stageLinhas.map((l) => l.dataPrevistaEfetiva)),
      concluidas,
      total: stageLinhas.length,
    }
  })
}

export function groupAtividadesTemplatePorEtapa(atividades: PlacementCronogramaAtividade[]) {
  return buildCronogramaTree(atividades, null)
}
