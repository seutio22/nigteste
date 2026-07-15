import type { CotacaoFormState } from './CotacaoFormFields'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import {
  DIFERENCIAL_ITEM_KEYS,
  labelDiferencialItem,
  type DiferencialItemKey,
} from './placementDiferenciaisCatalogo'
import type { PlacementDiferencial, PlacementPlano } from '../../../store/placementStore'
import type { PropostaPlanoLinha, AguardandoOperadoraState } from './placementAguardandoOperadora'
import { normMercadoKey } from './placementMercadoQuadro'
import { isFornecedorAtualNome } from './placementPropostaCenarioAtual'
import { buildComparativoColunas } from './placementComparativoEstudo'
import type { Operadora } from '../../../types/masterData'

export type DiferencialCelulaCotacao = {
  id: string
  /** Plano cadastrado em Dados → Placement (opcional para texto geral do fornecedor). */
  placementPlanoId: string
  planoLabel: string
  texto: string
  fromMaster?: boolean
}

export type DiferencialPlanoOpcao = {
  key: string
  planoLabel: string
  placementPlanoId: string
  grupo: string
}

export type ConsolidandoDadosState = {
  /** itemKey → colunaId (fornecedor) → células */
  diferenciais: Record<string, Record<string, DiferencialCelulaCotacao[]>>
  resumoCoberturas: string
  condicoesContratuais: string
  notasRodape?: string
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyConsolidandoDadosState(): ConsolidandoDadosState {
  return {
    diferenciais: {},
    resumoCoberturas: '',
    condicoesContratuais: '',
    notasRodape:
      'Informações sujeitas a limites e critérios contratuais. Podem ser revisadas a qualquer momento, sem aviso prévio.',
  }
}

function emptyDiferenciaisMap(): Record<string, Record<string, DiferencialCelulaCotacao[]>> {
  const map: Record<string, Record<string, DiferencialCelulaCotacao[]>> = {}
  for (const key of DIFERENCIAL_ITEM_KEYS) {
    map[key] = {}
  }
  return map
}

export function parseConsolidandoDadosFromKickOff(
  estrategia: KickOffEstrategia | null | undefined
): ConsolidandoDadosState | null {
  const raw = (estrategia as { consolidandoDados?: unknown } | null | undefined)?.consolidandoDados
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const diferenciais = emptyDiferenciaisMap()
  const rawDiff = o.diferenciais
  if (rawDiff && typeof rawDiff === 'object' && !Array.isArray(rawDiff)) {
    for (const itemKey of DIFERENCIAL_ITEM_KEYS) {
      const porColunaRaw = (rawDiff as Record<string, unknown>)[itemKey]
      if (!porColunaRaw || typeof porColunaRaw !== 'object' || Array.isArray(porColunaRaw)) continue
      for (const [colunaId, celulasRaw] of Object.entries(porColunaRaw as Record<string, unknown>)) {
        if (!Array.isArray(celulasRaw)) continue
        diferenciais[itemKey][colunaId] = celulasRaw
          .map((c) => {
            if (!c || typeof c !== 'object') return null
            const cell = c as Record<string, unknown>
            const texto = String(cell.texto ?? '')
            return {
              id: String(cell.id ?? uid('dc')),
              placementPlanoId: String(cell.placementPlanoId ?? ''),
              planoLabel: String(cell.planoLabel ?? ''),
              texto,
              fromMaster: cell.fromMaster === true,
            } satisfies DiferencialCelulaCotacao
          })
          .filter(Boolean) as DiferencialCelulaCotacao[]
      }
    }
  }

  return {
    diferenciais,
    resumoCoberturas: String(o.resumoCoberturas ?? ''),
    condicoesContratuais: String(o.condicoesContratuais ?? ''),
    notasRodape: o.notasRodape != null ? String(o.notasRodape) : undefined,
  }
}

export function ensureConsolidandoDadosState(
  current: ConsolidandoDadosState | null | undefined
): ConsolidandoDadosState {
  const base = emptyConsolidandoDadosState()
  if (!current) return base
  const mergedDiff = emptyDiferenciaisMap()
  for (const itemKey of DIFERENCIAL_ITEM_KEYS) {
    mergedDiff[itemKey] = { ...(current.diferenciais?.[itemKey] ?? {}) }
  }
  return {
    ...base,
    ...current,
    diferenciais: mergedDiff,
    resumoCoberturas: current.resumoCoberturas ?? '',
    condicoesContratuais: current.condicoesContratuais ?? '',
  }
}

export function formatDiferencialCelulasTexto(celulas: DiferencialCelulaCotacao[] | undefined): string {
  if (!celulas?.length) return '—'
  return celulas
    .map((c) => {
      const label = c.planoLabel.trim()
      const prefix = label ? `${label}: ` : ''
      return `${prefix}${c.texto.trim()}`
    })
    .join(' ')
}

export function emptyDiferencialCelula(planoLabel = ''): DiferencialCelulaCotacao {
  return {
    id: uid('dc'),
    placementPlanoId: '',
    planoLabel,
    texto: '',
  }
}

function normPlanoNome(n: string): string {
  return n.trim().toLowerCase()
}

function planosPropostaFornecedor(propostaPlanos: PropostaPlanoLinha[] | undefined): string[] {
  return (propostaPlanos ?? [])
    .map((p) => p.nomePlano.trim())
    .filter(Boolean)
}

export function importDiferenciaisFromMaster(args: {
  operadoraId: string
  colunaId: string
  masterDiferenciais: PlacementDiferencial[]
  placementPlanos: PlacementPlano[]
  propostaPlanos?: PropostaPlanoLinha[]
  itemKey?: DiferencialItemKey
}): Record<string, DiferencialCelulaCotacao[]> {
  const {
    operadoraId,
    colunaId,
    masterDiferenciais,
    placementPlanos,
    propostaPlanos,
    itemKey,
  } = args

  const nomesProposta = new Set(planosPropostaFornecedor(propostaPlanos).map(normPlanoNome))
  const planosOperadora = placementPlanos.filter((p) => p.operadoraId === operadoraId)
  const planosRelevantes =
    nomesProposta.size > 0
      ? planosOperadora.filter((p) => nomesProposta.has(normPlanoNome(p.plano)))
      : planosOperadora

  const planoIds = new Set(planosRelevantes.map((p) => p.id))
  const keys = itemKey ? [itemKey] : DIFERENCIAL_ITEM_KEYS
  const out: Record<string, DiferencialCelulaCotacao[]> = {}

  for (const key of keys) {
    const hits = masterDiferenciais.filter(
      (d) => d.operadoraId === operadoraId && d.itemKey === key && planoIds.has(d.placementPlanoId)
    )
    if (!hits.length) continue
    out[key] = hits.map((d) => {
      const plano = planosRelevantes.find((p) => p.id === d.placementPlanoId)
      return {
        id: uid('dc'),
        placementPlanoId: d.placementPlanoId,
        planoLabel: plano?.plano ?? d.placementPlano?.plano ?? '',
        texto: d.texto.trim(),
        fromMaster: true,
      }
    })
  }

  if (Object.keys(out).length && colunaId) {
    // noop — colunaId used by caller when merging
  }

  return out
}

export function mergeDiferenciaisColuna(
  state: ConsolidandoDadosState,
  colunaId: string,
  imported: Record<string, DiferencialCelulaCotacao[]>,
  replace = false
): ConsolidandoDadosState {
  const diferenciais = { ...state.diferenciais }
  for (const [itemKey, celulas] of Object.entries(imported)) {
    if (!celulas.length) continue
    const porColuna = { ...(diferenciais[itemKey] ?? {}) }
    porColuna[colunaId] = replace ? celulas : [...(porColuna[colunaId] ?? []), ...celulas]
    diferenciais[itemKey] = porColuna
  }
  return { ...state, diferenciais }
}

export function patchDiferencialCelulas(
  state: ConsolidandoDadosState,
  itemKey: string,
  colunaId: string,
  celulas: DiferencialCelulaCotacao[]
): ConsolidandoDadosState {
  return {
    ...state,
    diferenciais: {
      ...state.diferenciais,
      [itemKey]: {
        ...(state.diferenciais[itemKey] ?? {}),
        [colunaId]: celulas,
      },
    },
  }
}

export function consolidandoDadosIsComplete(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  const cd = ensureConsolidandoDadosState(
    parseConsolidandoDadosFromKickOff(estrategia ?? form.kickOffEstrategia)
  )
  if (!cd.resumoCoberturas.trim() || !cd.condicoesContratuais.trim()) return false

  let temAlgumDiferencial = false
  for (const itemKey of DIFERENCIAL_ITEM_KEYS) {
    const porColuna = cd.diferenciais[itemKey] ?? {}
    for (const celulas of Object.values(porColuna)) {
      if (celulas.some((c) => c.texto.trim())) {
        temAlgumDiferencial = true
        break
      }
    }
    if (temAlgumDiferencial) break
  }
  return temAlgumDiferencial
}

export function fornecedorColunaId(nome: string): string {
  return normMercadoKey(nome)
}

function resolvePlacementPlanoIdByNome(
  planoLabel: string,
  operadoraId: string,
  placementPlanos: PlacementPlano[]
): string {
  const norm = normPlanoNome(planoLabel)
  if (!norm || !operadoraId) return ''
  return (
    placementPlanos.find(
      (p) => p.operadoraId === operadoraId && normPlanoNome(p.plano) === norm
    )?.id ?? ''
  )
}

/** Planos sugeridos a partir do comparativo financeiro (entrada + propostas) e catálogo. */
export function buildDiferencialPlanoOpcoes(args: {
  form: CotacaoFormState
  fornecedorAtivo: string
  colunaId: string
  operadoraId: string
  fornecedoresVisiveis: string[]
  aguardandoOperadora: AguardandoOperadoraState
  placementPlanos: PlacementPlano[]
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
}): DiferencialPlanoOpcao[] {
  const {
    form,
    fornecedorAtivo,
    colunaId,
    operadoraId,
    fornecedoresVisiveis,
    aguardandoOperadora,
    placementPlanos,
    operadoras,
    operadorasById,
  } = args

  const options: DiferencialPlanoOpcao[] = []
  const seen = new Set<string>()
  let seq = 0

  const push = (planoLabel: string, grupo: string, catalogId = '') => {
    const label = planoLabel.trim()
    if (!label || label === '—') return
    const norm = normPlanoNome(label)
    if (seen.has(norm)) return
    seen.add(norm)
    const placementPlanoId =
      catalogId || resolvePlacementPlanoIdByNome(label, operadoraId, placementPlanos)
    options.push({
      key: `plano-${seq++}-${norm}`,
      planoLabel: label,
      placementPlanoId,
      grupo,
    })
  }

  const isAtual =
    aguardandoOperadora.fornecedores[colunaId]?.classificacaoMercado === 'fornecedor_atual' ||
    isFornecedorAtualNome(fornecedorAtivo, form, operadoras, operadorasById)

  const colunasFinanceiro = buildComparativoColunas(form, operadoras, [], operadorasById, true)

  if (isAtual) {
    for (const col of colunasFinanceiro) {
      if (col.grupo !== 'atual') continue
      push(col.planoLabel, 'Entrada do processo')
    }
  }

  for (const col of colunasFinanceiro) {
    if (normMercadoKey(col.operadora) !== colunaId) continue
    if (col.grupo === 'atual') continue
    push(col.planoLabel, `Proposta · ${fornecedorAtivo}`)
  }

  for (const nome of fornecedoresVisiveis) {
    const fk = normMercadoKey(nome)
    if (fk === colunaId) continue
    for (const col of colunasFinanceiro) {
      if (normMercadoKey(col.operadora) !== fk) continue
      if (col.grupo === 'atual') continue
      push(col.planoLabel, `Proposta · ${nome}`)
    }
  }

  for (const p of placementPlanos) {
    if (p.operadoraId !== operadoraId) continue
    push(p.plano, 'Catálogo · Dados', p.id)
  }

  return options
}

export function matchDiferencialPlanoOpcao(
  celula: DiferencialCelulaCotacao,
  options: DiferencialPlanoOpcao[]
): DiferencialPlanoOpcao | null {
  if (celula.placementPlanoId) {
    const byId = options.find((o) => o.placementPlanoId === celula.placementPlanoId)
    if (byId) return byId
  }
  const label = celula.planoLabel.trim()
  if (!label) return null
  const norm = normPlanoNome(label)
  return options.find((o) => normPlanoNome(o.planoLabel) === norm) ?? null
}

export type DiferencialMasterUpsertItem = {
  operadoraId: string
  placementPlanoId: string
  itemKey: string
  texto: string
}

/** Resolve o plano cadastrado em Dados → Planos a partir da célula da cotação. */
export function resolvePlacementPlanoIdForCelula(
  celula: DiferencialCelulaCotacao,
  operadoraId: string,
  placementPlanos: PlacementPlano[],
  propostaPlanos?: PropostaPlanoLinha[]
): string {
  if (celula.placementPlanoId) {
    const byId = placementPlanos.find(
      (p) => p.id === celula.placementPlanoId && p.operadoraId === operadoraId
    )
    if (byId) return byId.id
  }

  const label = celula.planoLabel.trim()
  if (label) {
    const norm = normPlanoNome(label)
    const byLabel = placementPlanos.find(
      (p) => p.operadoraId === operadoraId && normPlanoNome(p.plano) === norm
    )
    if (byLabel) return byLabel.id
  }

  for (const pp of propostaPlanos ?? []) {
    const nomeProposta = pp.nomePlano.trim()
    if (!nomeProposta) continue
    if (label && normPlanoNome(nomeProposta) !== normPlanoNome(label)) continue
    const hit = placementPlanos.find(
      (p) => p.operadoraId === operadoraId && normPlanoNome(p.plano) === normPlanoNome(nomeProposta)
    )
    if (hit) return hit.id
  }

  return ''
}

export function operadoraIdFromColunaId(
  colunaId: string,
  fornecedores: string[],
  resolveOperadoraId: (nome: string) => string
): string {
  const nome = fornecedores.find((f) => normMercadoKey(f) === colunaId)
  return nome ? resolveOperadoraId(nome) : ''
}

/** Monta payload para gravar/atualizar o catálogo master (tabela diferenciais). */
export function buildDiferenciaisMasterUpsertItems(
  consolidando: ConsolidandoDadosState,
  args: {
    fornecedores: string[]
    resolveOperadoraId: (nome: string) => string
    placementPlanos: PlacementPlano[]
    propostasByColuna: Record<string, { planos?: PropostaPlanoLinha[] } | undefined>
  }
): { items: DiferencialMasterUpsertItem[]; skipped: number } {
  const items: DiferencialMasterUpsertItem[] = []
  let skipped = 0
  const seen = new Set<string>()

  for (const itemKey of DIFERENCIAL_ITEM_KEYS) {
    const porColuna = consolidando.diferenciais[itemKey] ?? {}
    for (const [colunaId, celulas] of Object.entries(porColuna)) {
      const operadoraId = operadoraIdFromColunaId(colunaId, args.fornecedores, args.resolveOperadoraId)
      if (!operadoraId) {
        skipped += celulas.filter((c) => c.texto.trim()).length
        continue
      }
      const propostaPlanos = args.propostasByColuna[colunaId]?.planos

      for (const celula of celulas) {
        const texto = celula.texto.trim()
        if (!texto) continue

        const placementPlanoId = resolvePlacementPlanoIdForCelula(
          celula,
          operadoraId,
          args.placementPlanos,
          propostaPlanos
        )
        if (!placementPlanoId) {
          skipped += 1
          continue
        }

        const dedupeKey = `${operadoraId}|${placementPlanoId}|${itemKey}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        items.push({ operadoraId, placementPlanoId, itemKey, texto })
      }
    }
  }

  return { items, skipped }
}

export type DiferencialPreviewRow = {
  itemKey: string
  itemLabel: string
  planoLabel: string
  texto: string
}

export function buildImportPreviewRows(
  imported: Record<string, DiferencialCelulaCotacao[]>,
  placementPlanos: PlacementPlano[]
): DiferencialPreviewRow[] {
  const rows: DiferencialPreviewRow[] = []
  for (const itemKey of DIFERENCIAL_ITEM_KEYS) {
    const celulas = imported[itemKey] ?? []
    for (const c of celulas) {
      const plano = placementPlanos.find((p) => p.id === c.placementPlanoId)
      rows.push({
        itemKey,
        itemLabel: labelDiferencialItem(itemKey),
        planoLabel: c.planoLabel.trim() || plano?.plano || '—',
        texto: c.texto.trim(),
      })
    }
  }
  return rows
}

export function buildSavePreviewRows(
  items: DiferencialMasterUpsertItem[],
  placementPlanos: PlacementPlano[]
): DiferencialPreviewRow[] {
  return items.map((item) => {
    const plano = placementPlanos.find((p) => p.id === item.placementPlanoId)
    return {
      itemKey: item.itemKey,
      itemLabel: labelDiferencialItem(item.itemKey),
      planoLabel: plano?.plano ?? '—',
      texto: item.texto,
    }
  })
}

/** Prévia de importação para um fornecedor (sem alterar a cotação). */
export function previewImportDiferenciaisFromMaster(args: {
  operadoraId: string
  masterDiferenciais: PlacementDiferencial[]
  placementPlanos: PlacementPlano[]
  propostaPlanos?: PropostaPlanoLinha[]
}): { imported: Record<string, DiferencialCelulaCotacao[]>; rows: DiferencialPreviewRow[] } {
  const imported = importDiferenciaisFromMaster({
    ...args,
    colunaId: '',
  })
  return {
    imported,
    rows: buildImportPreviewRows(imported, args.placementPlanos),
  }
}
