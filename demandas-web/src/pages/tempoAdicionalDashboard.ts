import type { TempoAdicionalRow } from './tempoAdicional'

export type ConfrontoGrupo = {
  key: string
  label: string
  chamados: number
  lancamentos: number
  pendentes: number
  previstoSeconds: number
  adicionalSeconds: number
  previstoMedioSeconds: number
  realizadoMedioSeconds: number
  /** Adicional ÷ previsto, em %; null quando não há previsto. */
  desvioPct: number | null
}

export type ConfrontoSummary = {
  lancamentos: TempoAdicionalRow[]
  totalLancamentos: number
  chamadosComAdicional: number
  pendentes: number
  adicionalSeconds: number
  previstoSeconds: number
  desvioPct: number | null
  porRegra: ConfrontoGrupo[]
  porAnalista: ConfrontoGrupo[]
  porMotivo: { motivo: string; lancamentos: number; adicionalSeconds: number }[]
}

function dayOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((part / total) * 1000) / 10
}

type ChamadoAgg = {
  key: string
  regraKey: string
  analistaKey: string
  previstoSeconds: number
  adicionalSeconds: number
  lancamentos: number
  pendentes: number
}

function agrupar(
  chamados: ChamadoAgg[],
  keyOf: (c: ChamadoAgg) => string,
  labelOf: (key: string) => string
): ConfrontoGrupo[] {
  const map = new Map<string, ChamadoAgg[]>()
  for (const c of chamados) {
    const k = keyOf(c)
    const list = map.get(k) || []
    list.push(c)
    map.set(k, list)
  }
  const out: ConfrontoGrupo[] = []
  for (const [key, list] of map) {
    const previstoSeconds = list.reduce((s, c) => s + c.previstoSeconds, 0)
    const adicionalSeconds = list.reduce((s, c) => s + c.adicionalSeconds, 0)
    out.push({
      key,
      label: labelOf(key),
      chamados: list.length,
      lancamentos: list.reduce((s, c) => s + c.lancamentos, 0),
      pendentes: list.reduce((s, c) => s + c.pendentes, 0),
      previstoSeconds,
      adicionalSeconds,
      previstoMedioSeconds: Math.round(previstoSeconds / list.length),
      realizadoMedioSeconds: Math.round((previstoSeconds + adicionalSeconds) / list.length),
      desvioPct: pct(adicionalSeconds, previstoSeconds),
    })
  }
  return out.sort((a, b) => b.adicionalSeconds - a.adicionalSeconds)
}

/**
 * Previsto × realizado a partir dos lançamentos no período.
 * Realizado = previsto (fixado no lançamento) + adicionais não rejeitados.
 */
export function buildConfronto(input: {
  rows: TempoAdicionalRow[]
  fromDate: string
  toDate: string
  analistaIdFilter?: string | null
  regraLabel: (regraId: string | null) => string
  analistaLabel: (analistaId: string | null) => string
}): ConfrontoSummary {
  const lancamentos = input.rows
    .filter((r) => {
      const day = dayOf(r.createdAt)
      if (day < input.fromDate || day > input.toDate) return false
      if (input.analistaIdFilter && r.analistaId !== input.analistaIdFilter) return false
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const validos = lancamentos.filter((r) => r.status !== 'rejeitado')
  const porChamado = new Map<string, ChamadoAgg>()
  for (const r of validos) {
    const key = `${r.pageKey}:${r.entityId}`
    const agg = porChamado.get(key) || {
      key,
      regraKey: r.regraProdutividadeId || '',
      analistaKey: r.analistaId || '',
      previstoSeconds: 0,
      adicionalSeconds: 0,
      lancamentos: 0,
      pendentes: 0,
    }
    agg.previstoSeconds = Math.max(agg.previstoSeconds, r.tempoPrevistoSeconds || 0)
    agg.adicionalSeconds += r.adicionalSeconds
    agg.lancamentos += 1
    if (r.status === 'pendente') agg.pendentes += 1
    porChamado.set(key, agg)
  }
  const chamados = [...porChamado.values()]

  const motivos = new Map<string, { lancamentos: number; adicionalSeconds: number }>()
  for (const r of validos) {
    const m = motivos.get(r.motivo) || { lancamentos: 0, adicionalSeconds: 0 }
    m.lancamentos += 1
    m.adicionalSeconds += r.adicionalSeconds
    motivos.set(r.motivo, m)
  }

  const adicionalSeconds = chamados.reduce((s, c) => s + c.adicionalSeconds, 0)
  const previstoSeconds = chamados.reduce((s, c) => s + c.previstoSeconds, 0)

  return {
    lancamentos,
    totalLancamentos: lancamentos.length,
    chamadosComAdicional: chamados.length,
    pendentes: lancamentos.filter((r) => r.status === 'pendente').length,
    adicionalSeconds,
    previstoSeconds,
    desvioPct: pct(adicionalSeconds, previstoSeconds),
    porRegra: agrupar(chamados, (c) => c.regraKey, (k) => input.regraLabel(k || null)),
    porAnalista: agrupar(chamados, (c) => c.analistaKey, (k) => input.analistaLabel(k || null)),
    porMotivo: [...motivos.entries()]
      .map(([motivo, v]) => ({ motivo, ...v }))
      .sort((a, b) => b.adicionalSeconds - a.adicionalSeconds),
  }
}
