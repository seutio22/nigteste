import { ENTITY_CONFIGS } from '../config/entityConfigs'
import type { TabKey } from '../types/dadosTypes'
import type { ImportItem, ImportResult } from '../types/smartImporter'
import type { MasterDataState } from '../store/masterDataStore'

/** Abas de Dados (NIG) com importador inteligente e modos insert/update/upsert. */
export const NIG_DADOS_SMART_IMPORT_TABS = [
  'clientes',
  'contratos',
  'operadoras',
  'produtos',
  'sistemas',
  'grupos',
  'analistas',
  'areas',
  'tipos',
  'tipos-cadastro',
  'servicos',
  'solicitantes',
  'relatorios',
  'modelos',
  'padrao',
  'areasMailling',
  'cargosMailling',
  'filiaisMailling',
] as const satisfies readonly TabKey[]

const STORE_KEY_BY_TAB: Partial<Record<TabKey, keyof MasterDataState>> = {
  tipos: 'tiposDemanda',
  'tipos-cadastro': 'tiposCadastro',
  servicos: 'tiposServico',
}

export function getDadosSmartImportStoreKey(tab: TabKey): keyof MasterDataState | null {
  const key = (STORE_KEY_BY_TAB[tab] ?? tab) as keyof MasterDataState
  return key
}

function parseAtivo(value: unknown, fallback = true): boolean {
  if (value === true || value === false) return value
  if (value === 'true' || value === 'TRUE' || value === 1 || value === '1') return true
  if (value === 'false' || value === 'FALSE' || value === 0 || value === '0') return false
  return fallback
}

export function buildDadosSmartImportPayload(
  tab: TabKey,
  data: Record<string, unknown>,
  options?: { existingId?: string; store?: MasterDataState },
): { endpoint: string; payload: Record<string, unknown> } | null {
  const config = ENTITY_CONFIGS[tab]
  if (!config?.endpoint) return null

  switch (tab) {
    case 'clientes':
      return {
        endpoint: config.endpoint,
        payload: { nome: data.nome, grupoEconomico: data.grupoEconomico ?? null },
      }
    case 'contratos': {
      const existing = options?.existingId
        ? options.store?.contratos.find((c) => c.id === options.existingId)
        : undefined
      return {
        endpoint: config.endpoint,
        payload: {
          codigo: data.codigo,
          numero: data.numero || existing?.numero || data.codigo || `CONT-${Date.now()}`,
          grupoEconomico: data.grupoEconomico,
          status: data.status || existing?.status || 'Ativo',
          clienteId: existing?.clienteId || options?.store?.clientes[0]?.id,
        },
      }
    }
    case 'operadoras':
    case 'produtos':
    case 'sistemas':
    case 'grupos':
    case 'areas':
      return { endpoint: config.endpoint, payload: { nome: data.nome } }
    case 'analistas':
      return {
        endpoint: config.endpoint,
        payload: {
          nome: data.nome,
          email: data.email ? String(data.email).trim().toLowerCase() : undefined,
        },
      }
    case 'solicitantes':
      return {
        endpoint: config.endpoint,
        payload: {
          nome: data.nome,
          email: String(data.email ?? '').trim().toLowerCase(),
        },
      }
    case 'tipos':
      return {
        endpoint: config.endpoint,
        payload: { nome: data.nome, ativo: parseAtivo(data.ativo, true) },
      }
    case 'tipos-cadastro':
    case 'servicos':
      return {
        endpoint: config.endpoint,
        payload: { nome: data.nome, descricao: data.descricao ?? null },
      }
    case 'relatorios':
      return {
        endpoint: config.endpoint,
        payload: { nome: data.nome, descricao: data.descricao ?? '' },
      }
    case 'modelos':
      return {
        endpoint: config.endpoint,
        payload: { nome: data.nome, descricao: data.descricao ?? '' },
      }
    case 'padrao':
      return {
        endpoint: config.endpoint,
        payload: {
          nome: data.nome,
          tipoServicoId: data.tipoServicoId ?? null,
          ativo: parseAtivo(data.ativo, true),
        },
      }
    case 'areasMailling':
    case 'cargosMailling':
    case 'filiaisMailling':
      return {
        endpoint: config.endpoint,
        payload: {
          nome: data.nome,
          descricao: data.descricao ?? '',
          ativo: parseAtivo(data.ativo, true),
        },
      }
    default:
      return null
  }
}

export interface DadosSmartImportRunResult {
  totalImported: number
  totalSavedToDatabase: number
  totalInserted: number
  totalUpdated: number
  errors: string[]
  savedInserts: unknown[]
  savedUpdates: unknown[]
  successMessage: string
}

export function buildDadosSmartImportSuccessMessage(
  result: ImportResult,
  totals: Pick<DadosSmartImportRunResult, 'totalSavedToDatabase' | 'totalImported' | 'totalInserted' | 'totalUpdated'>,
): string {
  const mode = result.importMode ?? 'insert'
  const { totalSavedToDatabase, totalImported, totalInserted, totalUpdated } = totals

  if (totalSavedToDatabase <= 0) {
    return `Importação inteligente concluída! ${totalImported} registros processados localmente.`
  }
  if (mode === 'upsert' && totalInserted > 0 && totalUpdated > 0) {
    return `Importação concluída! ${totalInserted} incluído(s) e ${totalUpdated} atualizado(s) no banco.`
  }
  if (mode === 'update' || (mode === 'upsert' && totalUpdated > 0 && totalInserted === 0)) {
    return `Importação concluída! ${totalUpdated} registro(s) atualizado(s) no banco.`
  }
  if (totalInserted > 0) {
    return `Importação concluída! ${totalInserted} registro(s) incluído(s) no banco.`
  }
  return `Importação concluída! ${totalSavedToDatabase} registro(s) salvos no banco.`
}

export async function runDadosSmartImport(
  tab: TabKey,
  result: ImportResult,
  api: { post: (url: string, body: unknown) => Promise<unknown>; put: (url: string, body: unknown) => Promise<unknown> },
  store: MasterDataState,
): Promise<DadosSmartImportRunResult> {
  let totalImported = 0
  let totalSavedToDatabase = 0
  let totalInserted = 0
  let totalUpdated = 0
  const errors: string[] = []
  const savedInserts: unknown[] = []
  const savedUpdates: unknown[] = []

  const BATCH_SIZE = 50
  const batches: ImportItem[][] = []
  for (let i = 0; i < result.valid.length; i += BATCH_SIZE) {
    batches.push(result.valid.slice(i, i + BATCH_SIZE))
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i]
      const globalIndex = batchIndex * BATCH_SIZE + i
      const data = (item.isCorrected ? item.correctedData : item.data) as Record<string, unknown>

      try {
        const request = buildDadosSmartImportPayload(tab, data, {
          existingId: item.existingId,
          store,
        })

        if (!request) {
          console.warn(`Importador inteligente: aba não suportada (${tab})`)
          continue
        }

        const isUpdate = item.importAction === 'update' && item.existingId

        if (isUpdate) {
          const updated = await api.put(`${request.endpoint}/${item.existingId}`, request.payload)
          savedUpdates.push(updated)
          totalUpdated++
        } else {
          const created = await api.post(request.endpoint, request.payload)
          savedInserts.push(created)
          totalInserted++
        }

        totalSavedToDatabase++
        totalImported++

        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (apiError: unknown) {
        const err = apiError as { message?: string; data?: { message?: string } }
        const errorMessage =
          err?.message || err?.data?.message || (typeof apiError === 'string' ? apiError : 'Erro desconhecido')
        const itemIdentifier =
          String(data.nome ?? data.codigo ?? data.email ?? data.numero ?? `item-${globalIndex + 1}`)
        errors.push(`${itemIdentifier}: ${errorMessage}`)

        if (errors.length > 100) break
      }
    }

    if (errors.length > 100) break

    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  const storeKey = getDadosSmartImportStoreKey(tab)
  if (storeKey && storeKey in store) {
    const currentItems = [...(store[storeKey] as unknown[])]

    for (const updated of savedUpdates) {
      const record = updated as { id?: string }
      if (!record?.id) continue
      const index = currentItems.findIndex((row) => (row as { id?: string }).id === record.id)
      if (index >= 0) currentItems[index] = updated
    }

    store.upsertMany({ [storeKey]: [...currentItems, ...savedInserts] } as Partial<MasterDataState>)
  }

  return {
    totalImported,
    totalSavedToDatabase,
    totalInserted,
    totalUpdated,
    errors,
    savedInserts,
    savedUpdates,
    successMessage: buildDadosSmartImportSuccessMessage(result, {
      totalImported,
      totalSavedToDatabase,
      totalInserted,
      totalUpdated,
    }),
  }
}
