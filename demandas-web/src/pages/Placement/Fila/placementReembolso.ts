import { parseBRLToCents } from './utils'
import type { PlanoCoberturaForm } from './placementCotacaoDetalhes'
import type { SimNaoChoice } from './UpgradeDowngradeFields'

/** Procedimentos fixos na tabela (sem “Outros” nem prazos). */
export const REEMBOLSO_PROCEDIMENTOS_FIXOS = [
  { key: 'consultas', label: 'CONSULTAS' },
  { key: 'psicoterapia_sessao', label: 'PSICOTERAPIA SESSÃO' },
  { key: 'fonoaudiologia_sessao', label: 'FONOAUDIOLOGIA SESSÃO' },
  { key: 'fisioterapia_sessao', label: 'FISIOTERAPIA SESSÃO' },
  { key: 'parto_cesarea', label: 'PARTO CESÁREA' },
  { key: 'parto_normal', label: 'PARTO NORMAL' },
  { key: 'revascularizacao_miocardio', label: 'REVASCULARIZAÇÃO DO MIOCÁRDIO' },
] as const

export type ReembolsoProcedimentoFixoKey = (typeof REEMBOLSO_PROCEDIMENTOS_FIXOS)[number]['key']

const LEGACY_OUTROS_KEYS = ['outros_1', 'outros_2', 'outros_3', 'outros_4', 'outros_5', 'outros_6'] as const
const LEGACY_PRAZO_CONSULTA = 'prazo_reemb_consulta_dias'
const LEGACY_PRAZO_PROC = 'prazo_reemb_procedimentos_dias'

export type ReembolsoProcedimentoCustom = {
  id: string
  nome: string
}

export type ReembolsoPrazosPlano = {
  consultaDias: string
  procedimentosDias: string
}

export type ReembolsoValores = Record<string, Record<string, string>>

export type ReembolsoPorPlano = {
  planosIds: string[]
  necessitaEquiparar: SimNaoChoice
  detalheEquiparacao: string
  procedimentosCustomizados: ReembolsoProcedimentoCustom[]
  prazosPorPlano: Record<string, ReembolsoPrazosPlano>
  valores: ReembolsoValores
}

export const EMPTY_REEMBOLSO_POR_PLANO: ReembolsoPorPlano = {
  planosIds: [],
  necessitaEquiparar: '',
  detalheEquiparacao: '',
  procedimentosCustomizados: [],
  prazosPorPlano: {},
  valores: emptyReembolsoValores(),
}

export function newReembolsoProcedimentoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `reemb-${crypto.randomUUID()}`
  }
  return `reemb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyReembolsoPrazosPlano(): ReembolsoPrazosPlano {
  return { consultaDias: '', procedimentosDias: '' }
}

export function allReembolsoValorKeys(custom: ReembolsoProcedimentoCustom[]): string[] {
  return [
    ...REEMBOLSO_PROCEDIMENTOS_FIXOS.map((p) => p.key),
    ...custom.map((p) => p.id),
  ]
}

export function emptyReembolsoValores(custom: ReembolsoProcedimentoCustom[] = []): ReembolsoValores {
  const out: ReembolsoValores = {}
  for (const key of allReembolsoValorKeys(custom)) {
    out[key] = {}
  }
  return out
}

export function getReembolsoCell(
  valores: ReembolsoValores,
  procKey: string,
  planoId: string
): string {
  return valores[procKey]?.[planoId] ?? ''
}

export function setReembolsoCell(
  valores: ReembolsoValores,
  procKey: string,
  planoId: string,
  value: string
): ReembolsoValores {
  const next = { ...valores }
  next[procKey] = { ...(next[procKey] ?? {}), [planoId]: value }
  return next
}

export function pruneReembolsoValores(
  valores: ReembolsoValores,
  validPlanoIds: Set<string>,
  custom: ReembolsoProcedimentoCustom[]
): ReembolsoValores {
  const next = emptyReembolsoValores(custom)
  for (const key of allReembolsoValorKeys(custom)) {
    const row = valores[key]
    if (!row) continue
    for (const [planoId, v] of Object.entries(row)) {
      if (validPlanoIds.has(planoId) && v) {
        next[key][planoId] = v
      }
    }
  }
  return next
}

export function pruneReembolsoPrazos(
  prazos: Record<string, ReembolsoPrazosPlano>,
  validPlanoIds: Set<string>
): Record<string, ReembolsoPrazosPlano> {
  const next: Record<string, ReembolsoPrazosPlano> = {}
  for (const id of validPlanoIds) {
    const p = prazos[id]
    if (p && (p.consultaDias.trim() || p.procedimentosDias.trim())) {
      next[id] = {
        consultaDias: sanitizeReembolsoDias(p.consultaDias),
        procedimentosDias: sanitizeReembolsoDias(p.procedimentosDias),
      }
    } else {
      next[id] = emptyReembolsoPrazosPlano()
    }
  }
  return next
}

/** Permite dígitos, vírgula e ponto durante a digitação (moeda BR). */
export function sanitizeReembolsoMoedaInput(input: string): string {
  let v = String(input).replace(/[^\d,.]/g, '')
  const commaIdx = v.indexOf(',')
  if (commaIdx >= 0) {
    const before = v.slice(0, commaIdx + 1)
    const after = v.slice(commaIdx + 1).replace(/[,.]/g, '')
    v = before + after
  }
  return v
}

/** Formata valor monetário para exibição pt-BR (ex.: 1.234,56). */
export function formatReembolsoMoedaDisplay(input: string): string {
  const t = String(input).trim()
  if (!t) return ''
  const cents = parseBRLToCents(t)
  if (cents == null) return t
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Apenas dias (número inteiro). */
export function sanitizeReembolsoDias(input: string): string {
  return String(input).replace(/\D/g, '').slice(0, 4)
}

function mergeValoresFromApi(
  base: ReembolsoValores,
  src: Record<string, unknown>,
  valid: Set<string>
) {
  for (const [procKey, row] of Object.entries(src)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    if (procKey === LEGACY_PRAZO_CONSULTA || procKey === LEGACY_PRAZO_PROC) continue
    if (!base[procKey]) base[procKey] = {}
    for (const [planoId, v] of Object.entries(row as Record<string, unknown>)) {
      if (valid.has(planoId) && v != null && String(v).trim()) {
        base[procKey][planoId] = String(v)
      }
    }
  }
}

function migrateLegacyOutros(
  custom: ReembolsoProcedimentoCustom[],
  valores: ReembolsoValores,
  nomesLegado?: Record<string, string>
): ReembolsoProcedimentoCustom[] {
  const list = [...custom]
  for (let i = 0; i < LEGACY_OUTROS_KEYS.length; i++) {
    const key = LEGACY_OUTROS_KEYS[i]
    const row = valores[key]
    const hasValues = row && Object.values(row).some((v) => String(v).trim())
    const nomeLegado = nomesLegado?.[key]?.trim()
    if (!hasValues && !nomeLegado) continue
    const idx = list.findIndex((p) => p.id === key)
    if (idx >= 0) {
      if (!list[idx].nome.trim() && nomeLegado) {
        list[idx] = { ...list[idx], nome: nomeLegado }
      }
      continue
    }
    list.push({
      id: key,
      nome: nomeLegado || '',
    })
  }
  return list
}

function migrateLegacyPrazos(
  prazos: Record<string, ReembolsoPrazosPlano>,
  valores: ReembolsoValores,
  valid: Set<string>
): Record<string, ReembolsoPrazosPlano> {
  const next = { ...prazos }
  const rowConsulta = valores[LEGACY_PRAZO_CONSULTA]
  const rowProc = valores[LEGACY_PRAZO_PROC]
  if (!rowConsulta && !rowProc) return next

  for (const planoId of valid) {
    const cur = next[planoId] ?? emptyReembolsoPrazosPlano()
    if (!cur.consultaDias.trim() && rowConsulta?.[planoId]) {
      cur.consultaDias = sanitizeReembolsoDias(String(rowConsulta[planoId]))
    }
    if (!cur.procedimentosDias.trim() && rowProc?.[planoId]) {
      cur.procedimentosDias = sanitizeReembolsoDias(String(rowProc[planoId]))
    }
    if (cur.consultaDias || cur.procedimentosDias) {
      next[planoId] = cur
    }
  }
  return next
}

export function reembolsoPorPlanoFromApi(
  raw: unknown,
  planos: PlanoCoberturaForm[]
): ReembolsoPorPlano {
  const valid = new Set(planos.map((p) => p.id))
  let custom: ReembolsoProcedimentoCustom[] = []
  let prazos: Record<string, ReembolsoPrazosPlano> = {}
  const valores = emptyReembolsoValores()

  const base: ReembolsoPorPlano = {
    ...EMPTY_REEMBOLSO_POR_PLANO,
    valores,
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>

  if (Array.isArray(o.planosIds)) {
    base.planosIds = o.planosIds.map(String).filter((id) => valid.has(id))
  }

  const eq = o.necessitaEquiparar
  base.necessitaEquiparar =
    eq === true || eq === 'sim' ? 'sim' : eq === false || eq === 'nao' ? 'nao' : ''
  base.detalheEquiparacao =
    o.detalheEquiparacao != null ? String(o.detalheEquiparacao) : ''

  if (Array.isArray(o.procedimentosCustomizados)) {
    custom = o.procedimentosCustomizados
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const item = x as Record<string, unknown>
        return {
          id: String(item.id ?? newReembolsoProcedimentoId()),
          nome: item.nome != null ? String(item.nome) : '',
        }
      })
      .filter((p) => p.nome.trim() || p.id)
  }

  if (o.prazosPorPlano && typeof o.prazosPorPlano === 'object' && !Array.isArray(o.prazosPorPlano)) {
    for (const [planoId, pr] of Object.entries(o.prazosPorPlano as Record<string, unknown>)) {
      if (!valid.has(planoId) || !pr || typeof pr !== 'object') continue
      const prObj = pr as Record<string, unknown>
      prazos[planoId] = {
        consultaDias: sanitizeReembolsoDias(String(prObj.consultaDias ?? '')),
        procedimentosDias: sanitizeReembolsoDias(String(prObj.procedimentosDias ?? '')),
      }
    }
  }

  if (o.valores && typeof o.valores === 'object' && !Array.isArray(o.valores)) {
    mergeValoresFromApi(valores, o.valores as Record<string, unknown>, valid)
  }

  const nomesLegado =
    o.procedimentosNomes && typeof o.procedimentosNomes === 'object'
      ? (o.procedimentosNomes as Record<string, string>)
      : undefined

  custom = migrateLegacyOutros(custom, valores, nomesLegado)
  prazos = migrateLegacyPrazos(prazos, valores, valid)

  base.procedimentosCustomizados = custom
  base.prazosPorPlano = pruneReembolsoPrazos(prazos, valid)
  base.valores = pruneReembolsoValores(valores, valid, custom)

  return base
}

export function reembolsoPorPlanoToApi(r: ReembolsoPorPlano) {
  const customComNome = r.procedimentosCustomizados.filter((p) => p.nome.trim())
  const keys = allReembolsoValorKeys(customComNome)
  const hasValores = keys.some((key) =>
    Object.values(r.valores[key] ?? {}).some((v) => String(v).trim())
  )
  const hasPrazos = Object.values(r.prazosPorPlano).some(
    (p) => p.consultaDias.trim() || p.procedimentosDias.trim()
  )
  const has =
    r.planosIds.length > 0 ||
    r.necessitaEquiparar !== '' ||
    r.detalheEquiparacao.trim() ||
    customComNome.length > 0 ||
    hasValores ||
    hasPrazos

  if (!has) return undefined

  const valoresOut: ReembolsoValores = {}
  for (const key of keys) {
    const row = r.valores[key]
    if (!row) continue
    const filtered: Record<string, string> = {}
    for (const [planoId, v] of Object.entries(row)) {
      if (r.planosIds.includes(planoId) && String(v).trim()) {
        filtered[planoId] = String(v).trim()
      }
    }
    if (Object.keys(filtered).length) valoresOut[key] = filtered
  }

  const prazosOut: Record<string, ReembolsoPrazosPlano> = {}
  for (const planoId of r.planosIds) {
    const p = r.prazosPorPlano[planoId]
    if (p && (p.consultaDias.trim() || p.procedimentosDias.trim())) {
      prazosOut[planoId] = {
        consultaDias: sanitizeReembolsoDias(p.consultaDias),
        procedimentosDias: sanitizeReembolsoDias(p.procedimentosDias),
      }
    }
  }

  return {
    planosIds: r.planosIds,
    necessitaEquiparar: r.necessitaEquiparar === 'sim',
    detalheEquiparacao:
      r.necessitaEquiparar === 'sim' ? r.detalheEquiparacao.trim() : '',
    procedimentosCustomizados: customComNome.map((p) => ({
      id: p.id,
      nome: p.nome.trim(),
    })),
    ...(Object.keys(prazosOut).length ? { prazosPorPlano: prazosOut } : {}),
    valores: valoresOut,
  }
}

/** Detalhamento de reembolso por plano na proposta (comparativo de reembolso). */
export type ReembolsoPlanoDetalhe = {
  valores: Record<string, string>
  consultaDias: string
  procedimentosDias: string
  procedimentosCustomizados: ReembolsoProcedimentoCustom[]
}

export function emptyReembolsoPlanoDetalhe(): ReembolsoPlanoDetalhe {
  return {
    valores: {},
    consultaDias: '',
    procedimentosDias: '',
    procedimentosCustomizados: [],
  }
}

export function cloneReembolsoPlanoDetalhe(d: ReembolsoPlanoDetalhe): ReembolsoPlanoDetalhe {
  return {
    valores: { ...d.valores },
    consultaDias: d.consultaDias,
    procedimentosDias: d.procedimentosDias,
    procedimentosCustomizados: d.procedimentosCustomizados.map((p) => ({ ...p })),
  }
}

export function parseReembolsoPlanoDetalheFromApi(raw: unknown): ReembolsoPlanoDetalhe {
  const base = emptyReembolsoPlanoDetalhe()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>

  if (o.valores && typeof o.valores === 'object' && !Array.isArray(o.valores)) {
    for (const [k, v] of Object.entries(o.valores as Record<string, unknown>)) {
      if (v != null && String(v).trim()) base.valores[k] = String(v)
    }
  }

  base.consultaDias = sanitizeReembolsoDias(String(o.consultaDias ?? ''))
  base.procedimentosDias = sanitizeReembolsoDias(String(o.procedimentosDias ?? ''))

  if (Array.isArray(o.procedimentosCustomizados)) {
    base.procedimentosCustomizados = o.procedimentosCustomizados
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const item = x as Record<string, unknown>
        return {
          id: String(item.id ?? newReembolsoProcedimentoId()),
          nome: item.nome != null ? String(item.nome) : '',
        }
      })
  }

  return base
}

export function reembolsoDetalheFromAbertura(
  planoId: string,
  reembolsoPorPlano: ReembolsoPorPlano
): ReembolsoPlanoDetalhe {
  const custom = reembolsoPorPlano.procedimentosCustomizados
  const valores: Record<string, string> = {}
  for (const key of allReembolsoValorKeys(custom)) {
    const v = getReembolsoCell(reembolsoPorPlano.valores, key, planoId)
    if (v.trim()) valores[key] = v
  }
  const prazos = reembolsoPorPlano.prazosPorPlano[planoId] ?? emptyReembolsoPrazosPlano()
  const customFiltered = custom.filter((p) => p.nome.trim() || valores[p.id]?.trim())
  return {
    valores,
    consultaDias: prazos.consultaDias,
    procedimentosDias: prazos.procedimentosDias,
    procedimentosCustomizados: customFiltered.map((p) => ({ ...p })),
  }
}

export function temReembolsoDetalhePreenchido(
  det: ReembolsoPlanoDetalhe,
  reembolsoFlag?: string,
  reembolsoConsulta?: string
): boolean {
  if (reembolsoFlag === 'Sim') return true
  if (reembolsoConsulta?.trim()) return true
  if (det.consultaDias.trim() || det.procedimentosDias.trim()) return true
  return Object.values(det.valores).some((v) => v.trim())
}

export function formatReembolsoProcedimentoCelula(
  det: ReembolsoPlanoDetalhe,
  procKey: string
): string {
  const v = det.valores[procKey]?.trim()
  if (!v) return '—'
  const display = formatReembolsoMoedaDisplay(v)
  return display ? `R$ ${display}` : v
}

export function formatReembolsoPrazoDias(dias: string): string {
  const d = sanitizeReembolsoDias(dias)
  if (!d) return '—'
  return `${d} dias`
}
