import type { PortalCase, PortalSlaProfile } from '@prisma/client'
import { PortalCaseStatus } from '@prisma/client'

export function addBusinessDays(start: Date, businessDays: number): Date {
  if (businessDays <= 0) return new Date(start)
  const d = new Date(start)
  let left = businessDays
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) left--
  }
  return d
}

export function addCalendarMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60 * 1000)
}

export function triagemDueFrom(now: Date, profile: PortalSlaProfile): Date {
  if (profile.prazoEmDiasUteis) {
    return addBusinessDays(now, Math.max(1, profile.triagemDiasUteis))
  }
  return addCalendarMinutes(now, Math.max(0, profile.slaTriagemMinutos))
}

export function atuacaoDueFrom(now: Date, profile: PortalSlaProfile): Date {
  if (profile.prazoEmDiasUteis) {
    return addBusinessDays(now, Math.max(1, profile.atuacaoDiasUteis))
  }
  return addCalendarMinutes(now, Math.max(0, profile.slaAtuacaoMinutos))
}

/** Após retorno do demandante (fim da pausa): novo prazo de atuação. */
export function resumeAtuacaoDue(now: Date, profile: PortalSlaProfile): Date {
  if (profile.prazoEmDiasUteis) {
    const extra = profile.adicionalDiasUteisAposRetorno
    if (extra > 0) return addBusinessDays(now, Math.max(1, extra))
    return addBusinessDays(now, Math.max(1, profile.atuacaoDiasUteis))
  }
  const extraM = profile.minutosAdicionalAposRetornoDemanda
  if (extraM > 0) return addCalendarMinutes(now, extraM)
  return addCalendarMinutes(now, Math.max(0, profile.slaAtuacaoMinutos))
}

export function slaTotalReference(profile: PortalSlaProfile): {
  unit: 'dias_uteis' | 'minutos'
  value: number
} {
  if (profile.prazoEmDiasUteis) {
    return {
      unit: 'dias_uteis',
      value:
        profile.triagemDiasUteis + profile.atuacaoDiasUteis + profile.adicionalDiasUteisAposRetorno,
    }
  }
  return {
    unit: 'minutos',
    value:
      profile.slaTriagemMinutos +
      profile.slaAtuacaoMinutos +
      profile.minutosAdicionalAposRetornoDemanda,
  }
}

export type SlaEtapaVm = {
  id: string
  titulo: string
  descricao: string
  estado: 'concluida' | 'em_andamento' | 'pendente' | 'atrasado' | 'pausada'
  prazoAte: string | null
  prazoLabel: string | null
  ordem: number
}

function fmtIso(d: Date | null): string | null {
  if (!d) return null
  return d.toISOString()
}

function fmtPtBr(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(d: Date | null, now: Date): boolean {
  if (!d) return false
  return now.getTime() > d.getTime()
}

export function buildSlaEtapas(
  c: PortalCase,
  profile: PortalSlaProfile | null,
  now = new Date()
): { temPerfil: boolean; unidade: 'dias_uteis' | 'minutos'; etapas: SlaEtapaVm[] } {
  if (!profile) {
    return { temPerfil: false, unidade: 'dias_uteis', etapas: [] }
  }
  const unidade = profile.prazoEmDiasUteis ? 'dias_uteis' : 'minutos'
  const st = c.status
  const etapas: SlaEtapaVm[] = []

  const envioOk = st !== PortalCaseStatus.DRAFT
  etapas.push({
    id: 'envio',
    titulo: 'Envio da solicitação',
    descricao: 'Registro da sua demanda no portal.',
    estado: envioOk ? 'concluida' : 'em_andamento',
    prazoAte: null,
    prazoLabel: null,
    ordem: 1,
  })

  const triagemDone = (
    [
      PortalCaseStatus.IN_ANALYSIS,
      PortalCaseStatus.AWAITING_REQUESTER,
      PortalCaseStatus.AWAITING_THIRD_PARTY,
      PortalCaseStatus.COMPLETED,
      PortalCaseStatus.CANCELLED,
    ] as PortalCaseStatus[]
  ).includes(st)
  const triagemActive = st === PortalCaseStatus.SUBMITTED || st === PortalCaseStatus.IN_TRIAGE
  const triD = c.slaTriagemDueAt ? new Date(c.slaTriagemDueAt) : null
  let triEstado: SlaEtapaVm['estado'] = 'pendente'
  if (triagemDone) triEstado = 'concluida'
  else if (triagemActive) {
    triEstado = triD && isOverdue(triD, now) ? 'atrasado' : 'em_andamento'
  }

  etapas.push({
    id: 'triagem',
    titulo: 'Triagem',
    descricao: profile.prazoEmDiasUteis
      ? `Até ${profile.triagemDiasUteis} dia(s) útil(is) após o envio (segunda a sexta).`
      : `Até ${profile.slaTriagemMinutos} minutos após o envio (calendário).`,
    estado: triEstado,
    prazoAte: fmtIso(triD),
    prazoLabel: triD ? `Prazo: ${fmtPtBr(triD)}` : null,
    ordem: 2,
  })

  const atuacaoDone = ([PortalCaseStatus.COMPLETED, PortalCaseStatus.CANCELLED] as PortalCaseStatus[]).includes(st)
  const atuacaoActive = st === PortalCaseStatus.IN_ANALYSIS || st === PortalCaseStatus.AWAITING_THIRD_PARTY
  const atD = c.slaAtuacaoDueAt ? new Date(c.slaAtuacaoDueAt) : null
  let atEstado: SlaEtapaVm['estado'] = 'pendente'
  if (atuacaoDone) atEstado = 'concluida'
  else if (st === PortalCaseStatus.AWAITING_REQUESTER) atEstado = 'pausada'
  else if (atuacaoActive) {
    atEstado = atD && isOverdue(atD, now) ? 'atrasado' : 'em_andamento'
  }

  etapas.push({
    id: 'atuacao',
    titulo: 'Atuação',
    descricao: profile.prazoEmDiasUteis
      ? `Até ${profile.atuacaoDiasUteis} dia(s) útil(is) na análise (após a triagem).`
      : `Até ${profile.slaAtuacaoMinutos} minutos na análise (calendário).`,
    estado: atEstado,
    prazoAte: fmtIso(atD),
    prazoLabel: atD ? `Prazo: ${fmtPtBr(atD)}` : null,
    ordem: 3,
  })

  if (profile.pausarQuandoAguardandoDemanda) {
    let pauseEstado: SlaEtapaVm['estado'] = 'pendente'
    if (st === PortalCaseStatus.AWAITING_REQUESTER) pauseEstado = 'pausada'
    else if (st === PortalCaseStatus.COMPLETED || st === PortalCaseStatus.CANCELLED) pauseEstado = 'concluida'

    etapas.push({
      id: 'pausa_demanda',
      titulo: 'Aguardando sua resposta',
      descricao: profile.prazoEmDiasUteis
        ? `Com pausa do prazo. Após o retorno: +${profile.adicionalDiasUteisAposRetorno} dia(s) útil(is) adicionais (ou novo prazo de atuação se zero).`
        : `Com pausa do prazo. Após o retorno: +${profile.minutosAdicionalAposRetornoDemanda} min adicionais (ou novo prazo se zero).`,
      estado: pauseEstado,
      prazoAte: st === PortalCaseStatus.AWAITING_REQUESTER && c.slaPausedAt ? fmtIso(new Date(c.slaPausedAt)) : null,
      prazoLabel: st === PortalCaseStatus.AWAITING_REQUESTER ? 'SLA de atuação em pausa' : null,
      ordem: 4,
    })
  }

  const fimOk = st === PortalCaseStatus.COMPLETED || st === PortalCaseStatus.CANCELLED
  etapas.push({
    id: 'conclusao',
    titulo: st === PortalCaseStatus.CANCELLED ? 'Encerramento' : 'Conclusão',
    descricao: 'Demanda finalizada.',
    estado: fimOk ? 'concluida' : 'pendente',
    prazoAte: null,
    prazoLabel: null,
    ordem: 5,
  })

  return { temPerfil: true, unidade, etapas }
}
