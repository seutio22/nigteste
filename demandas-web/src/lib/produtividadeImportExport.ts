import type { MasterDataState } from '../store/masterDataStore'
import type { ImportItem, ImportResult } from '../types/smartImporter'
import { formatSecondsToHms, parseHmsToSeconds } from '../pages/produtividadeJornada'
import { getPageConfig, type CatalogKey, type TipoFieldConfig } from '../pages/produtividadePageConfig'
import { parseSistemasDetalhe, type SistemaTempoLinha } from '../pages/produtividadeSistemasDetalhe'

export const PRODUTIVIDADE_REGRAS_ENDPOINT = '/produtividade-regras'

export type ProdutividadeRuleRow = {
  id: string
  pageKey: string
  tipo1Id?: string | null
  tipo2Id?: string | null
  tempoSistemasSeconds?: number | null
  tempoSistemasAdicionalSeconds?: number | null
  tempoSistemasAdicionalPorTotalSeconds?: number | null
  sistemasDetalhe?: SistemaTempoLinha[] | unknown | null
  tempoUsuariosSeconds?: number | null
  tempoUsuariosAdicionalSeconds?: number | null
  tempoClientesSeconds?: number | null
  tempoClientesAdicionalSeconds?: number | null
  tempoRetornosSeconds?: number | null
  tempoRetornosAdicionalSeconds?: number | null
  tempoItensSeconds?: number | null
  tempoItensAdicionalSeconds?: number | null
  tempoContratosSeconds?: number | null
  tempoContratosAdicionalSeconds?: number | null
  tempoSubsSeconds?: number | null
  tempoSubsAdicionalSeconds?: number | null
  tempoPrevistoSeconds?: number | null
  pesoPontos?: number | null
  ativo: boolean
}

const TEMPO_FIELDS = [
  'tempoSistemasSeconds',
  'tempoSistemasAdicionalSeconds',
  'tempoSistemasAdicionalPorTotalSeconds',
  'tempoUsuariosSeconds',
  'tempoUsuariosAdicionalSeconds',
  'tempoClientesSeconds',
  'tempoClientesAdicionalSeconds',
  'tempoRetornosSeconds',
  'tempoRetornosAdicionalSeconds',
  'tempoItensSeconds',
  'tempoItensAdicionalSeconds',
  'tempoContratosSeconds',
  'tempoContratosAdicionalSeconds',
  'tempoSubsSeconds',
  'tempoSubsAdicionalSeconds',
  'tempoPrevistoSeconds',
] as const

function catalogItems(
  store: MasterDataState,
  catalog: CatalogKey
): { id: string; nome: string }[] {
  const list = (store as unknown as Record<string, { id: string; nome?: string }[] | undefined>)[catalog]
  if (!Array.isArray(list)) return []
  return list.map((x) => ({ id: x.id, nome: x.nome ?? x.id }))
}

function resolveTipoLabel(
  store: MasterDataState,
  cfg: TipoFieldConfig | null | undefined,
  value: string | null | undefined
): string {
  if (!value) return ''
  if (!cfg) return value
  if (cfg.source === 'enum') {
    return cfg.options.find((o) => o.value === value)?.label ?? value
  }
  return catalogItems(store, cfg.catalog).find((c) => c.id === value)?.nome ?? value
}

function resolveTipoIdByName(
  store: MasterDataState,
  cfg: TipoFieldConfig | null | undefined,
  name: string | null | undefined
): string | null {
  if (!name?.trim() || !cfg) return null
  const needle = name.trim().toLowerCase()
  if (cfg.source === 'enum') {
    const hit = cfg.options.find(
      (o) => o.label.toLowerCase() === needle || o.value.toLowerCase() === needle
    )
    return hit?.value ?? null
  }
  const hit = catalogItems(store, cfg.catalog).find((c) => c.nome.toLowerCase() === needle)
  return hit?.id ?? null
}

function parseAtivo(value: unknown, fallback = true): boolean {
  if (value === true || value === false) return value
  if (value == null || value === '') return fallback
  const s = String(value).trim().toLowerCase()
  if (['true', '1', 'ativo', 'sim', 'yes'].includes(s)) return true
  if (['false', '0', 'inativo', 'não', 'nao', 'no'].includes(s)) return false
  return fallback
}

/** Aceita HH:MM:SS, minutos ou número já em segundos (export antigo). */
export function parseTempoCell(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  const raw = String(value).trim()
  if (!raw) return null
  const fromHms = parseHmsToSeconds(raw)
  if (fromHms != null) return fromHms
  const asNum = Number(raw.replace(',', '.'))
  if (Number.isFinite(asNum) && asNum >= 0) return Math.round(asNum)
  return null
}

function parsePeso(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = String(value).trim().replace(/\s/g, '')
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function parseSistemasDetalheCell(value: unknown): SistemaTempoLinha[] | null {
  if (value == null || value === '') return null
  if (typeof value === 'object') {
    const parsed = parseSistemasDetalhe(value)
    return parsed.length ? parsed : null
  }
  const raw = String(value).trim()
  if (!raw) return null
  try {
    const parsed = parseSistemasDetalhe(JSON.parse(raw))
    return parsed.length ? parsed : null
  } catch {
    return null
  }
}

export function buildProdutividadeExportRows(
  rows: ProdutividadeRuleRow[],
  store: MasterDataState
): Record<string, unknown>[] {
  return rows.map((row) => {
    const cfg = getPageConfig(row.pageKey)
    let totalSeconds = row.tempoPrevistoSeconds ?? null
    if (totalSeconds == null || totalSeconds <= 0) {
      let sum = 0
      for (const field of TEMPO_FIELDS) {
        if (field === 'tempoPrevistoSeconds') continue
        const v = row[field]
        if (typeof v === 'number' && Number.isFinite(v)) sum += v
      }
      const detalhe = parseSistemasDetalhe(row.sistemasDetalhe)
      for (const line of detalhe) {
        if (typeof line.tempoSeconds === 'number') sum += line.tempoSeconds
        if (typeof line.tempoAdicionalPorTotalSeconds === 'number') {
          sum += line.tempoAdicionalPorTotalSeconds
        }
      }
      totalSeconds = sum > 0 ? sum : null
    }

    const out: Record<string, unknown> = {
      id: row.id,
      pageKey: row.pageKey,
      pageLabel: cfg.label,
      tipo1Id: row.tipo1Id ?? '',
      tipo1Nome: resolveTipoLabel(store, cfg.tipo1, row.tipo1Id),
      tipo2Id: row.tipo2Id ?? '',
      tipo2Nome: resolveTipoLabel(store, cfg.tipo2, row.tipo2Id),
      // Mesmo rótulo da grade (coluna "Total")
      total: formatSecondsToHms(totalSeconds),
      tempoPrevistoSeconds: formatSecondsToHms(totalSeconds),
      pesoPontos: row.pesoPontos ?? '',
      ativo: row.ativo !== false ? 'Ativo' : 'Inativo',
      sistemasDetalhe: row.sistemasDetalhe
        ? JSON.stringify(parseSistemasDetalhe(row.sistemasDetalhe))
        : '',
    }
    for (const field of TEMPO_FIELDS) {
      if (field === 'tempoPrevistoSeconds') continue
      out[field] = formatSecondsToHms(row[field] as number | null | undefined)
    }
    return out
  })
}

export function buildProdutividadeImportPayload(
  data: Record<string, unknown>,
  store?: MasterDataState
): Record<string, unknown> {
  const pageKey = String(data.pageKey ?? '')
    .trim()
    .toLowerCase()
  const cfg = getPageConfig(pageKey)

  let tipo1Id =
    data.tipo1Id != null && String(data.tipo1Id).trim() !== ''
      ? String(data.tipo1Id).trim()
      : null
  let tipo2Id =
    data.tipo2Id != null && String(data.tipo2Id).trim() !== ''
      ? String(data.tipo2Id).trim()
      : null

  if (!tipo1Id && store && data.tipo1Nome) {
    tipo1Id = resolveTipoIdByName(store, cfg.tipo1, String(data.tipo1Nome))
  }
  if (!tipo2Id && store && data.tipo2Nome) {
    tipo2Id = resolveTipoIdByName(store, cfg.tipo2, String(data.tipo2Nome))
  }

  const payload: Record<string, unknown> = {
    pageKey,
    tipo1Id: cfg.tipo1 ? tipo1Id : null,
    tipo2Id: cfg.tipo2 ? tipo2Id : null,
    pesoPontos: parsePeso(data.pesoPontos),
    ativo: parseAtivo(data.ativo, true),
    qtdSistemas: null,
    qtdUsuarios: null,
    qtdClientes: null,
    qtdRetornos: null,
    qtdItens: null,
    qtdContratos: null,
    qtdSubs: null,
  }

  for (const field of TEMPO_FIELDS) {
    if (field === 'tempoPrevistoSeconds') continue
    payload[field] = parseTempoCell(data[field])
  }

  payload.sistemasDetalhe = parseSistemasDetalheCell(data.sistemasDetalhe)

  // Aceita coluna "total" (export amigável) ou tempoPrevistoSeconds
  const previsto =
    parseTempoCell(data.total) ?? parseTempoCell(data.tempoPrevistoSeconds)
  if (previsto != null) {
    payload.tempoPrevistoSeconds = previsto
  } else {
    let total = 0
    for (const field of TEMPO_FIELDS) {
      if (field === 'tempoPrevistoSeconds') continue
      const v = payload[field]
      if (typeof v === 'number') total += v
    }
    const detalhe = payload.sistemasDetalhe as SistemaTempoLinha[] | null
    if (Array.isArray(detalhe)) {
      for (const line of detalhe) {
        if (typeof line.tempoSeconds === 'number') total += line.tempoSeconds
        if (typeof line.tempoAdicionalPorTotalSeconds === 'number') {
          total += line.tempoAdicionalPorTotalSeconds
        }
      }
    }
    payload.tempoPrevistoSeconds = total > 0 ? total : null
  }

  return payload
}

export type ProdutividadeSmartImportRunResult = {
  totalImported: number
  totalInserted: number
  totalUpdated: number
  errors: string[]
}

type ApiLike = {
  post: (url: string, body: unknown) => Promise<unknown>
  put: (url: string, body: unknown) => Promise<unknown>
}

export async function runProdutividadeSmartImport(
  api: ApiLike,
  result: ImportResult,
  store?: MasterDataState
): Promise<ProdutividadeSmartImportRunResult> {
  let totalImported = 0
  let totalInserted = 0
  let totalUpdated = 0
  const errors: string[] = []

  const items: ImportItem[] = result.valid || []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const data = (item.isCorrected ? item.correctedData : item.data) as Record<string, unknown>
    try {
      const payload = buildProdutividadeImportPayload(data, store)
      const isUpdate = item.importAction === 'update' && item.existingId

      if (isUpdate) {
        await api.put(`${PRODUTIVIDADE_REGRAS_ENDPOINT}/${item.existingId}`, payload)
        totalUpdated++
      } else {
        await api.post(PRODUTIVIDADE_REGRAS_ENDPOINT, payload)
        totalInserted++
      }
      totalImported++

      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    } catch (apiError: unknown) {
      const err = apiError as { message?: string; data?: { message?: string } }
      const errorMessage =
        err?.message || err?.data?.message || (typeof apiError === 'string' ? apiError : 'Erro desconhecido')
      const label = String(data.pageKey ?? data.id ?? `linha-${item.originalRow}`)
      errors.push(`${label}: ${errorMessage}`)
    }
  }

  return { totalImported, totalInserted, totalUpdated, errors }
}
