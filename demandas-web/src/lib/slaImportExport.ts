import type { MasterDataState } from '../store/masterDataStore'
import type { ImportItem, ImportResult } from '../types/smartImporter'
import {
  buildProdutividadeExportRows,
  buildProdutividadeImportPayload,
  type ProdutividadeRuleRow,
} from './produtividadeImportExport'
import { getSlaImpactoLabel, isSlaImpacto, type SlaImpacto } from '../pages/slaImpact'
import {
  diasUteisToHorasCorridas,
  parseHmsToSeconds,
  secondsToDiasUteis,
} from '../pages/produtividadeJornada'

export const SLA_REGRAS_ENDPOINT = '/sla-regras'

export type SlaRuleRow = ProdutividadeRuleRow & {
  impacto: SlaImpacto
  faixasPrazo?: unknown
}

function parseImpacto(value: unknown): SlaImpacto | null {
  if (value == null || value === '') return null
  const raw = String(value).trim().toLowerCase()
  const map: Record<string, SlaImpacto> = {
    alta: 'alta',
    high: 'alta',
    'alta prioridade': 'alta',
    media: 'media',
    média: 'media',
    medium: 'media',
    'media prioridade': 'media',
    'média prioridade': 'media',
    baixa: 'baixa',
    low: 'baixa',
    'baixa prioridade': 'baixa',
  }
  const hit = map[raw]
  if (hit) return hit
  return isSlaImpacto(raw) ? raw : null
}

export function buildSlaExportRows(
  rows: SlaRuleRow[],
  store: MasterDataState
): Record<string, unknown>[] {
  return buildProdutividadeExportRows(rows, store).map((row, index) => {
    const seconds =
      rows[index]?.tempoPrevistoSeconds ??
      parseHmsToSeconds(String(row.tempoPrevistoSeconds ?? row.total ?? ''))
    const dias = secondsToDiasUteis(seconds)
    const faixas = rows[index]?.faixasPrazo
    return {
      ...row,
      impacto: rows[index]?.impacto ?? '',
      impactoLabel: getSlaImpactoLabel(rows[index]?.impacto),
      diasUteis: dias,
      horasCorridas: diasUteisToHorasCorridas(dias),
      faixasPrazo: faixas != null ? JSON.stringify(faixas) : '',
    }
  })
}

export function buildSlaImportPayload(
  data: Record<string, unknown>,
  store?: MasterDataState
): Record<string, unknown> {
  const base = buildProdutividadeImportPayload(data, store)
  const fromImpacto = parseImpacto(data.impacto)
  const fromLabel = parseImpacto(data.impactoLabel)
  const impacto = fromImpacto ?? fromLabel ?? 'media'
  const payload: Record<string, unknown> = { ...base, impacto }

  if (data.faixasPrazo != null && data.faixasPrazo !== '') {
    try {
      const parsed =
        typeof data.faixasPrazo === 'string'
          ? JSON.parse(data.faixasPrazo)
          : data.faixasPrazo
      if (Array.isArray(parsed)) payload.faixasPrazo = parsed
    } catch {
      /* ignora JSON inválido */
    }
  }

  return payload
}

export type SlaSmartImportRunResult = {
  totalImported: number
  totalInserted: number
  totalUpdated: number
  errors: string[]
}

type ApiLike = {
  post: (url: string, body: unknown) => Promise<unknown>
  put: (url: string, body: unknown) => Promise<unknown>
}

export async function runSlaSmartImport(
  api: ApiLike,
  result: ImportResult,
  store?: MasterDataState
): Promise<SlaSmartImportRunResult> {
  let totalImported = 0
  let totalInserted = 0
  let totalUpdated = 0
  const errors: string[] = []

  const items: ImportItem[] = result.valid || []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const data = (item.isCorrected ? item.correctedData : item.data) as Record<string, unknown>
    try {
      const payload = buildSlaImportPayload(data, store)
      const isUpdate = item.importAction === 'update' && item.existingId

      if (isUpdate) {
        await api.put(`${SLA_REGRAS_ENDPOINT}/${item.existingId}`, payload)
        totalUpdated++
      } else {
        await api.post(SLA_REGRAS_ENDPOINT, payload)
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
      const label = `${data.pageKey ?? ''}/${data.impacto ?? ''}`.trim() || String(data.id ?? `linha-${item.originalRow}`)
      errors.push(`${label}: ${errorMessage}`)
    }
  }

  return { totalImported, totalInserted, totalUpdated, errors }
}

export type SlaSyncFromProdutividadeResult = {
  created: number
  skipped: number
  totalProdutividade: number
}

export async function syncSlaFromProdutividade(
  api: ApiLike
): Promise<SlaSyncFromProdutividadeResult> {
  const res = (await api.post(`${SLA_REGRAS_ENDPOINT}/sync-from-produtividade`, {})) as SlaSyncFromProdutividadeResult
  return res
}
