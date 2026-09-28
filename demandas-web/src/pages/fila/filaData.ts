import {
  isItemAbertoParaPendenciasUsuario,
  isItemCancelado,
  isItemConcluidoProducao,
} from '../../types/dashboardIndicators'
import {
  getDataReferenciaConclusao,
  getExecutionEndDate,
  getExecutionStartDate,
} from '../../utils/dashboardFilters'
import {
  PRODUTIVIDADE_PAGE_LABEL,
  resolveItemAnalistaId,
  type TicketProdutividadeDims,
} from '../produtividadeMatching'
import { evaluateTicketSla, type SlaCumprimentoStatus, type SlaRegraRow } from '../slaMatching'
import type { SlaStatusEvent } from '../slaCalendar'
import type { SlaTicketPageKey } from '../slaData'

export type FilaKind = 'chamado' | 'projeto' | 'tarefa' | 'subtarefa'
export type FilaColuna = 'atrasado' | 'hoje' | 'semana' | 'proximas' | 'sem_prazo'

export const FILA_COLUNAS: { key: FilaColuna; label: string }[] = [
  { key: 'atrasado', label: 'Atrasado' },
  { key: 'hoje', label: 'Vence hoje' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'sem_prazo', label: 'Sem prazo' },
]

export type FilaItem = {
  key: string
  kind: FilaKind
  origemLabel: string
  titulo: string
  subtitulo: string | null
  status: string
  prazo: Date | null
  /** Prazo sem horário: vence no fim do dia. */
  prazoDiaInteiro: boolean
  prazoFonte: string
  slaStatus: SlaCumprimentoStatus | null
  href: string
  navState?: Record<string, unknown>
}

type AnalistaLike = { id: string; nome?: string; email?: string }

const TICKET_DETAIL_BASE: Record<SlaTicketPageKey, string> = {
  demandas: 'cadastro',
  manutencoes: 'manutencao',
  atendimentos: 'atendimento',
  validacoes: 'validacao',
  reajustes: 'reajuste',
  analytics: 'analytics',
}

function norm(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function text(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return text(o.nome ?? o.name ?? o.titulo)
  }
  return null
}

function firstText(...values: unknown[]): string | null {
  for (const v of values) {
    const t = text(v)
    if (t) return t
  }
  return null
}

function stripHtml(s: string | null): string | null {
  if (!s) return null
  const t = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t ? (t.length > 140 ? `${t.slice(0, 140)}…` : t) : null
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Datas de cronograma: "YYYY-MM-DD" ou meia-noite UTC são tratadas como dia inteiro. */
export function parsePrazo(raw: unknown): { prazo: Date; diaInteiro: boolean } | null {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.000)?)?(?:Z|[+-]00:?00)?)?$/)
  if (m) return { prazo: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12), diaInteiro: true }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return { prazo: d, diaInteiro: false }
}

export function classifyPrazo(item: Pick<FilaItem, 'prazo' | 'prazoDiaInteiro' | 'slaStatus'>, agora: Date): FilaColuna {
  if (item.slaStatus === 'atrasado') return 'atrasado'
  if (!item.prazo) return 'sem_prazo'
  const hoje = dayKey(agora)
  const dia = dayKey(item.prazo)
  if (dia < hoje) return 'atrasado'
  if (!item.prazoDiaInteiro && item.prazo.getTime() < agora.getTime()) return 'atrasado'
  if (dia === hoje) return 'hoje'
  const fimSemana = new Date(agora)
  fimSemana.setDate(agora.getDate() + ((7 - agora.getDay()) % 7))
  if (dia <= dayKey(fimSemana)) return 'semana'
  return 'proximas'
}

export function sortFila(a: FilaItem, b: FilaItem): number {
  if (a.prazo && b.prazo) return a.prazo.getTime() - b.prazo.getTime()
  if (a.prazo) return -1
  if (b.prazo) return 1
  return a.titulo.localeCompare(b.titulo, 'pt-BR')
}

/* ------------------------------ Chamados ------------------------------ */

export function isTicketAbertoNaFila(page: SlaTicketPageKey, item: any): boolean {
  return (
    isItemAbertoParaPendenciasUsuario(page, item) &&
    !isItemConcluidoProducao(page, item) &&
    !isItemCancelado(page, item)
  )
}

export function buildTicketFilaItems(input: {
  page: SlaTicketPageKey
  items: any[]
  extract: (item: any) => TicketProdutividadeDims
  /** null = todos os analistas. */
  analistaId: string | null
  analistas: AnalistaLike[]
  rules: SlaRegraRow[]
  statusMap?: Map<string, SlaStatusEvent[]> | null
  agora: Date
}): FilaItem[] {
  const out: FilaItem[] = []
  const origem = PRODUTIVIDADE_PAGE_LABEL[input.page]
  for (const item of input.items || []) {
    if (!item?.id || !isTicketAbertoNaFila(input.page, item)) continue
    if (input.analistaId && resolveItemAnalistaId(item, input.page, input.analistas) !== input.analistaId) continue

    const sla = evaluateTicketSla({
      item,
      dims: input.extract(item),
      rules: input.rules,
      dataConclusao: getDataReferenciaConclusao(input.page, item) || '',
      dataInicio: getExecutionStartDate(input.page, item) || null,
      dataFinal: getExecutionEndDate(input.page, item) || null,
      concluido: false,
      statusEvents: input.statusMap?.get(String(item.id)) ?? null,
      agora: input.agora,
      analistas: input.analistas,
    })
    const prazo = sla.prazoLimite ? new Date(sla.prazoLimite) : null
    const valido = prazo && !Number.isNaN(prazo.getTime()) ? prazo : null

    out.push({
      key: `${input.page}:${item.id}`,
      kind: 'chamado',
      origemLabel: origem,
      titulo: firstText(item.ticket) ? `${text(item.ticket)} · ${origem}` : origem,
      subtitulo: firstText(item.titulo, item.cliente, item.clienteNome, item.empresa, item.operadora) ??
        stripHtml(firstText(item.descricao)),
      status: text(item.status) || '—',
      prazo: valido,
      prazoDiaInteiro: false,
      prazoFonte: valido ? 'Data limite do SLA' : sla.status === 'sem_regra' ? 'Sem regra de SLA' : 'Sem data de início',
      slaStatus: sla.status,
      href: `/${TICKET_DETAIL_BASE[input.page]}/${encodeURIComponent(String(item.id))}`,
    })
  }
  return out
}

/* ------------------------------ Projetos ------------------------------ */

const FECHADOS = new Set([
  'completed',
  'concluido',
  'concluida',
  'finalizado',
  'finalizada',
  'done',
  'cancelado',
  'cancelada',
  'cancelled',
  'canceled',
])

export function isProjectItemAberto(status: unknown): boolean {
  return !FECHADOS.has(norm(status).replace(/\s+/g, '_'))
}

export type ProjetoResponsavelMatcher = {
  /** Nomes/e-mails que identificam o analista no texto de responsável das tarefas. */
  nomes: string[]
  isProjetoDoAnalista: (project: any) => boolean
}

export function responsavelCorresponde(texto: unknown, nomes: string[]): boolean {
  const alvos = new Set(nomes.map(norm).filter(Boolean))
  if (!alvos.size) return false
  return String(texto ?? '')
    .split(',')
    .map(norm)
    .some((seg) => seg && alvos.has(seg))
}

function projectTimeline(project: any): any[] {
  let tl = project?.timeline
  if (typeof tl === 'string') {
    try {
      tl = JSON.parse(tl)
    } catch {
      return []
    }
  }
  return Array.isArray(tl?.phases) ? tl.phases : []
}

/** matcher null = todos (admin sem filtro). */
export function buildProjectFilaItems(projects: any[], matcher: ProjetoResponsavelMatcher | null): FilaItem[] {
  const out: FilaItem[] = []
  for (const project of projects || []) {
    if (!project?.id || !isProjectItemAberto(project.status)) continue
    const nomeProjeto = text(project.name) || 'Projeto'
    const href = `/projetos/${encodeURIComponent(String(project.id))}`

    if (!matcher || matcher.isProjetoDoAnalista(project)) {
      const p = parsePrazo(project.endDate)
      out.push({
        key: `projeto:${project.id}`,
        kind: 'projeto',
        origemLabel: 'Projeto',
        titulo: nomeProjeto,
        subtitulo: stripHtml(text(project.description)),
        status: text(project.status) || '—',
        prazo: p?.prazo ?? null,
        prazoDiaInteiro: p?.diaInteiro ?? true,
        prazoFonte: 'Data de término do projeto',
        slaStatus: null,
        href,
      })
    }

    for (const phase of projectTimeline(project)) {
      if (!isProjectItemAberto(phase?.status)) continue
      for (const task of Array.isArray(phase?.tasks) ? phase.tasks : []) {
        const tituloTarefa = firstText(task?.name, task?.title) || 'Tarefa'
        if (
          task?.id &&
          isProjectItemAberto(task.status) &&
          (!matcher || responsavelCorresponde(task.responsible ?? task.assignee, matcher.nomes))
        ) {
          const p = parsePrazo(task.plannedEndDate ?? task.dueDate ?? task.endDate)
          out.push({
            key: `tarefa:${project.id}:${task.id}`,
            kind: 'tarefa',
            origemLabel: `Projeto · ${nomeProjeto}`,
            titulo: tituloTarefa,
            subtitulo: firstText(phase?.name) ? `Etapa: ${text(phase.name)}` : null,
            status: text(task.status) || 'pending',
            prazo: p?.prazo ?? null,
            prazoDiaInteiro: p?.diaInteiro ?? true,
            prazoFonte: 'Prazo da tarefa',
            slaStatus: null,
            href,
            navState: { activeTab: 1, scrollToTaskId: task.id, scrollToSubtaskId: null },
          })
        }
        if (!isProjectItemAberto(task?.status)) continue
        for (const sub of Array.isArray(task?.subtasks) ? task.subtasks : []) {
          if (!sub?.id || !isProjectItemAberto(sub.status)) continue
          if (matcher && !responsavelCorresponde(sub.assignee ?? sub.responsible, matcher.nomes)) continue
          const p = parsePrazo(sub.dueDate ?? sub.plannedEndDate ?? sub.endDate)
          out.push({
            key: `subtarefa:${project.id}:${task.id}:${sub.id}`,
            kind: 'subtarefa',
            origemLabel: `Projeto · ${nomeProjeto}`,
            titulo: firstText(sub.title, sub.name) || 'Subtarefa',
            subtitulo: `Tarefa: ${tituloTarefa}`,
            status: text(sub.status) || 'pending',
            prazo: p?.prazo ?? null,
            prazoDiaInteiro: p?.diaInteiro ?? true,
            prazoFonte: 'Prazo da subtarefa',
            slaStatus: null,
            href,
            navState: { activeTab: 1, scrollToTaskId: task.id, scrollToSubtaskId: sub.id },
          })
        }
      }
    }
  }
  return out
}
