import type { CotacaoFormState } from './CotacaoFormFields'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import {
  DIFERENCIAL_ITEM_KEYS,
  isCatalogDiferencialKey,
  labelDiferencialItem,
  listDiferencialItens,
  slugifyDiferencialLabel,
  type DiferencialItemExtra,
  type DiferencialItemKey,
} from './placementDiferenciaisCatalogo'
import {
  CONDICAO_CONTRATUAL_ITEM_KEYS,
  labelCondicaoContratualItem,
} from './placementCondicoesContratuaisCatalogo'
import {
  INDICADOR_OPERADORA_ITEM_KEYS,
  INDICADORES_NOTAS_RODAPE_DEFAULT,
  labelIndicadorOperadoraItem,
} from './placementIndicadoresOperadorasCatalogo'
import type {
  PlacementDiferencial,
  PlacementPlano,
  PlacementCondicaoContratual,
  PlacementIndicadorOperadora,
} from '../../../store/placementStore'
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
  /** Vários planos com a mesma descrição (compatível com o campo único acima). */
  placementPlanoIds?: string[]
  planoLabels?: string[]
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
  /** itemKey → colunaId (fornecedor) → células (matriz por fornecedor; plano opcional) */
  condicoes: Record<string, Record<string, DiferencialCelulaCotacao[]>>
  /** itemKey → colunaId (fornecedor) → células (indicadores por operadora) */
  indicadores: Record<string, Record<string, DiferencialCelulaCotacao[]>>
  resumoCoberturas: string
  /** Observações livres (legado / complementar às condições estruturadas). */
  condicoesContratuais: string
  notasRodape?: string
  /**
   * Itens ocultos da proposta/comparativo (não saem no slide).
   * Chaves = itemKey do catálogo correspondente.
   */
  itensOcultos?: {
    diferenciais?: string[]
    condicoes?: string[]
    indicadores?: string[]
  }
  /** Diferenciais extras desta cotação (além do catálogo fixo). */
  itensExtras?: {
    diferenciais?: DiferencialItemExtra[]
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyConsolidandoDadosState(): ConsolidandoDadosState {
  return {
    diferenciais: {},
    condicoes: {},
    indicadores: {},
    resumoCoberturas: '',
    condicoesContratuais: '',
    notasRodape:
      'Informações sujeitas a limites e critérios contratuais. Podem ser revisadas a qualquer momento, sem aviso prévio.',
    itensOcultos: { diferenciais: [], condicoes: [], indicadores: [] },
    itensExtras: { diferenciais: [] },
  }
}

function emptyDiferenciaisMap(): Record<string, Record<string, DiferencialCelulaCotacao[]>> {
  const map: Record<string, Record<string, DiferencialCelulaCotacao[]>> = {}
  for (const key of DIFERENCIAL_ITEM_KEYS) {
    map[key] = {}
  }
  return map
}

function emptyCondicoesMap(): Record<string, Record<string, DiferencialCelulaCotacao[]>> {
  const map: Record<string, Record<string, DiferencialCelulaCotacao[]>> = {}
  for (const key of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    map[key] = {}
  }
  return map
}

function emptyIndicadoresMap(): Record<string, Record<string, DiferencialCelulaCotacao[]>> {
  const map: Record<string, Record<string, DiferencialCelulaCotacao[]>> = {}
  for (const key of INDICADOR_OPERADORA_ITEM_KEYS) {
    map[key] = {}
  }
  return map
}

function parseStringList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.map((v) => String(v ?? '').trim()).filter(Boolean)
}

function parseCelulaList(celulasRaw: unknown): DiferencialCelulaCotacao[] {
  if (!Array.isArray(celulasRaw)) return []
  return celulasRaw
    .map((c) => {
      if (!c || typeof c !== 'object') return null
      const cell = c as Record<string, unknown>
      const texto = String(cell.texto ?? '')
      const placementPlanoId = String(cell.placementPlanoId ?? '')
      const planoLabel = String(cell.planoLabel ?? '')
      const placementPlanoIds = parseStringList(cell.placementPlanoIds)
      const planoLabels = parseStringList(cell.planoLabels)
      return {
        id: String(cell.id ?? uid('cc')),
        placementPlanoId,
        planoLabel,
        ...(placementPlanoIds ? { placementPlanoIds } : {}),
        ...(planoLabels ? { planoLabels } : {}),
        texto,
        fromMaster: cell.fromMaster === true,
      } satisfies DiferencialCelulaCotacao
    })
    .filter(Boolean) as DiferencialCelulaCotacao[]
}

function parseCelulasMap(
  rawDiff: unknown,
  keys: readonly string[]
): Record<string, Record<string, DiferencialCelulaCotacao[]>> {
  const map: Record<string, Record<string, DiferencialCelulaCotacao[]>> = {}
  for (const key of keys) map[key] = {}
  if (!rawDiff || typeof rawDiff !== 'object' || Array.isArray(rawDiff)) return map
  const raw = rawDiff as Record<string, unknown>
  const allKeys = [...keys]
  for (const extraKey of Object.keys(raw)) {
    if (!allKeys.includes(extraKey)) allKeys.push(extraKey)
  }
  for (const itemKey of allKeys) {
    const porColunaRaw = raw[itemKey]
    if (!porColunaRaw || typeof porColunaRaw !== 'object' || Array.isArray(porColunaRaw)) continue
    if (!map[itemKey]) map[itemKey] = {}
    for (const [colunaId, celulasRaw] of Object.entries(porColunaRaw as Record<string, unknown>)) {
      map[itemKey][colunaId] = parseCelulaList(celulasRaw)
    }
  }
  return map
}

function parseDiferenciaisExtras(
  raw: unknown,
  diferenciaisMap?: Record<string, Record<string, DiferencialCelulaCotacao[]>>
): DiferencialItemExtra[] {
  const listed: DiferencialItemExtra[] = []
  const seen = new Set<string>(DIFERENCIAL_ITEM_KEYS)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const key = String(rec.key ?? '').trim()
      const label = String(rec.label ?? '').trim()
      if (!key || !label || seen.has(key) || isCatalogDiferencialKey(key)) continue
      seen.add(key)
      listed.push({ key, label })
    }
  }
  for (const key of Object.keys(diferenciaisMap ?? {})) {
    if (seen.has(key) || isCatalogDiferencialKey(key)) continue
    seen.add(key)
    listed.push({ key, label: labelDiferencialItem(key) })
  }
  return listed
}

function parseItensOcultos(
  raw: unknown,
  extraDiferencialKeys: readonly string[] = []
): {
  diferenciais: string[]
  condicoes: string[]
  indicadores: string[]
} {
  const empty = { diferenciais: [] as string[], condicoes: [] as string[], indicadores: [] as string[] }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty
  const o = raw as Record<string, unknown>
  const asKeys = (v: unknown, allowed: readonly string[]) => {
    if (!Array.isArray(v)) return [] as string[]
    const allow = new Set(allowed)
    return v.map((x) => String(x ?? '').trim()).filter((k) => k && allow.has(k))
  }
  return {
    diferenciais: asKeys(o.diferenciais, [...DIFERENCIAL_ITEM_KEYS, ...extraDiferencialKeys]),
    condicoes: asKeys(o.condicoes, CONDICAO_CONTRATUAL_ITEM_KEYS),
    indicadores: asKeys(o.indicadores, INDICADOR_OPERADORA_ITEM_KEYS),
  }
}

export function parseConsolidandoDadosFromKickOff(
  estrategia: KickOffEstrategia | null | undefined
): ConsolidandoDadosState | null {
  const raw = (estrategia as { consolidandoDados?: unknown } | null | undefined)?.consolidandoDados
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const extrasRaw =
    o.itensExtras && typeof o.itensExtras === 'object' && !Array.isArray(o.itensExtras)
      ? (o.itensExtras as Record<string, unknown>).diferenciais
      : undefined
  const extrasDraft = parseDiferenciaisExtras(extrasRaw)
  const extraKeys = extrasDraft.map((e) => e.key)
  const diferenciais = parseCelulasMap(o.diferenciais, [...DIFERENCIAL_ITEM_KEYS, ...extraKeys])
  const extras = parseDiferenciaisExtras(extrasRaw, diferenciais)

  return {
    diferenciais,
    condicoes: parseCelulasMap(o.condicoes, CONDICAO_CONTRATUAL_ITEM_KEYS),
    indicadores: parseCelulasMap(o.indicadores, INDICADOR_OPERADORA_ITEM_KEYS),
    resumoCoberturas: String(o.resumoCoberturas ?? ''),
    condicoesContratuais: String(o.condicoesContratuais ?? ''),
    notasRodape: o.notasRodape != null ? String(o.notasRodape) : undefined,
    itensOcultos: parseItensOcultos(
      o.itensOcultos,
      extras.map((e) => e.key)
    ),
    itensExtras: { diferenciais: extras },
  }
}

export function ensureConsolidandoDadosState(
  current: ConsolidandoDadosState | null | undefined
): ConsolidandoDadosState {
  const base = emptyConsolidandoDadosState()
  if (!current) return base
  const extras = parseDiferenciaisExtras(current.itensExtras?.diferenciais, current.diferenciais)
  const extraKeys = extras.map((e) => e.key)
  const mergedDiff = emptyDiferenciaisMap()
  for (const itemKey of [...DIFERENCIAL_ITEM_KEYS, ...extraKeys]) {
    mergedDiff[itemKey] = { ...(current.diferenciais?.[itemKey] ?? {}) }
  }
  for (const [itemKey, porColuna] of Object.entries(current.diferenciais ?? {})) {
    if (!mergedDiff[itemKey]) mergedDiff[itemKey] = { ...porColuna }
  }
  const mergedCond = emptyCondicoesMap()
  for (const itemKey of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    mergedCond[itemKey] = { ...(current.condicoes?.[itemKey] ?? {}) }
  }
  const mergedInd = emptyIndicadoresMap()
  for (const itemKey of INDICADOR_OPERADORA_ITEM_KEYS) {
    mergedInd[itemKey] = { ...(current.indicadores?.[itemKey] ?? {}) }
  }
  const ocultos = parseItensOcultos(current.itensOcultos, extraKeys)
  return {
    ...base,
    ...current,
    diferenciais: mergedDiff,
    condicoes: mergedCond,
    indicadores: mergedInd,
    resumoCoberturas: current.resumoCoberturas ?? '',
    condicoesContratuais: current.condicoesContratuais ?? '',
    itensOcultos: ocultos,
    itensExtras: { diferenciais: extras },
  }
}

export function isConsolidandoItemOculto(
  state: ConsolidandoDadosState,
  secao: 'diferenciais' | 'condicoes' | 'indicadores',
  itemKey: string
): boolean {
  const list = state.itensOcultos?.[secao] ?? []
  return list.includes(itemKey)
}

export function toggleConsolidandoItemOculto(
  state: ConsolidandoDadosState,
  secao: 'diferenciais' | 'condicoes' | 'indicadores',
  itemKey: string
): ConsolidandoDadosState {
  const current = new Set(state.itensOcultos?.[secao] ?? [])
  if (current.has(itemKey)) current.delete(itemKey)
  else current.add(itemKey)
  return {
    ...state,
    itensOcultos: {
      diferenciais:
        secao === 'diferenciais' ? Array.from(current) : [...(state.itensOcultos?.diferenciais ?? [])],
      condicoes: secao === 'condicoes' ? Array.from(current) : [...(state.itensOcultos?.condicoes ?? [])],
      indicadores:
        secao === 'indicadores' ? Array.from(current) : [...(state.itensOcultos?.indicadores ?? [])],
    },
  }
}

export function celulaPlanoLabels(celula: DiferencialCelulaCotacao): string[] {
  if (Array.isArray(celula.planoLabels)) {
    return celula.planoLabels.map((s) => s.trim()).filter(Boolean)
  }
  const label = celula.planoLabel.trim()
  return label ? [label] : []
}

export function celulaPlanoIds(celula: DiferencialCelulaCotacao): string[] {
  if (Array.isArray(celula.placementPlanoIds)) {
    return celula.placementPlanoIds.map((s) => String(s ?? '').trim())
  }
  return celula.placementPlanoId ? [celula.placementPlanoId] : []
}

export function formatCelulaPlanoLabel(celula: DiferencialCelulaCotacao): string {
  return celulaPlanoLabels(celula).join(', ')
}

export function formatDiferencialCelulasTexto(celulas: DiferencialCelulaCotacao[] | undefined): string {
  if (!celulas?.length) return '—'
  return celulas
    .map((c) => {
      const label = formatCelulaPlanoLabel(c)
      const prefix = label ? `${label}: ` : ''
      return `${prefix}${c.texto.trim()}`
    })
    .join(' ')
}

export function emptyDiferencialCelula(planoLabel = ''): DiferencialCelulaCotacao {
  const label = planoLabel.trim()
  return {
    id: uid('dc'),
    placementPlanoId: '',
    planoLabel: label,
    placementPlanoIds: [],
    planoLabels: label ? [label] : [],
    texto: '',
  }
}

export function cloneDiferencialCelulas(
  celulas: DiferencialCelulaCotacao[] | undefined
): DiferencialCelulaCotacao[] {
  return (celulas ?? []).map((c) => {
    const labels = celulaPlanoLabels(c)
    return {
      ...c,
      id: uid('dc'),
      placementPlanoId: '',
      placementPlanoIds: labels.map(() => ''),
      planoLabels: labels,
      planoLabel: labels.join(', '),
      fromMaster: false,
    }
  })
}

export function diferencialCelulasTemConteudo(celulas: DiferencialCelulaCotacao[] | undefined): boolean {
  return (celulas ?? []).some((c) => c.texto.trim() || celulaPlanoLabels(c).length > 0)
}

export function replicarDiferencialParaColunas(
  state: ConsolidandoDadosState,
  itemKey: string,
  fromColunaId: string,
  toColunaIds: string[],
  opts?: { onlyEmpty?: boolean }
): ConsolidandoDadosState {
  const source = state.diferenciais[itemKey]?.[fromColunaId] ?? []
  const toCopy = diferencialCelulasTemConteudo(source)
    ? source.filter((c) => c.texto.trim() || celulaPlanoLabels(c).length > 0)
    : source
  let next = state
  for (const toId of toColunaIds) {
    if (!toId || toId === fromColunaId) continue
    const dest = next.diferenciais[itemKey]?.[toId] ?? []
    if (opts?.onlyEmpty && diferencialCelulasTemConteudo(dest)) continue
    next = patchDiferencialCelulas(next, itemKey, toId, cloneDiferencialCelulas(toCopy))
  }
  return next
}

export function replicarCondicaoParaColunas(
  state: ConsolidandoDadosState,
  itemKey: string,
  fromColunaId: string,
  toColunaIds: string[],
  opts?: { onlyEmpty?: boolean }
): ConsolidandoDadosState {
  const source = state.condicoes[itemKey]?.[fromColunaId] ?? []
  const toCopy = diferencialCelulasTemConteudo(source)
    ? source.filter((c) => c.texto.trim() || celulaPlanoLabels(c).length > 0)
    : source
  let next = state
  for (const toId of toColunaIds) {
    if (!toId || toId === fromColunaId) continue
    const dest = next.condicoes[itemKey]?.[toId] ?? []
    if (opts?.onlyEmpty && diferencialCelulasTemConteudo(dest)) continue
    next = patchCondicaoCelulas(next, itemKey, toId, cloneDiferencialCelulas(toCopy))
  }
  return next
}

export function addCustomDiferencialItem(
  state: ConsolidandoDadosState,
  labelRaw: string
): { ok: true; state: ConsolidandoDadosState; key: string } | { ok: false; error: string } {
  const label = String(labelRaw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
  if (!label) return { ok: false, error: 'Informe o nome do diferencial.' }
  const existing = listDiferencialItens(state.itensExtras?.diferenciais)
  if (existing.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
    return { ok: false, error: 'Já existe um diferencial com esse nome.' }
  }
  let slug = slugifyDiferencialLabel(label)
  if (!slug) slug = 'item'
  let key = `custom_${slug}`
  const used = new Set(existing.map((i) => i.key))
  if (used.has(key)) {
    let n = 2
    while (used.has(`${key}_${n}`)) n += 1
    key = `${key}_${n}`
  }
  return {
    ok: true,
    key,
    state: {
      ...state,
      itensExtras: {
        ...state.itensExtras,
        diferenciais: [...(state.itensExtras?.diferenciais ?? []), { key, label }],
      },
      diferenciais: {
        ...state.diferenciais,
        [key]: {},
      },
    },
  }
}

export function removeCustomDiferencialItem(
  state: ConsolidandoDadosState,
  itemKey: string
): ConsolidandoDadosState {
  if (!itemKey.startsWith('custom_')) return state
  const { [itemKey]: _removed, ...restDiff } = state.diferenciais
  return {
    ...state,
    diferenciais: restDiff,
    itensExtras: {
      ...state.itensExtras,
      diferenciais: (state.itensExtras?.diferenciais ?? []).filter((i) => i.key !== itemKey),
    },
    itensOcultos: {
      diferenciais: (state.itensOcultos?.diferenciais ?? []).filter((k) => k !== itemKey),
      condicoes: [...(state.itensOcultos?.condicoes ?? [])],
      indicadores: [...(state.itensOcultos?.indicadores ?? [])],
    },
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

export function patchCondicaoCelulas(
  state: ConsolidandoDadosState,
  itemKey: string,
  colunaId: string,
  celulas: DiferencialCelulaCotacao[]
): ConsolidandoDadosState {
  return {
    ...state,
    condicoes: {
      ...state.condicoes,
      [itemKey]: {
        ...(state.condicoes[itemKey] ?? {}),
        [colunaId]: celulas,
      },
    },
  }
}

export function patchIndicadorCelulas(
  state: ConsolidandoDadosState,
  itemKey: string,
  colunaId: string,
  celulas: DiferencialCelulaCotacao[]
): ConsolidandoDadosState {
  return {
    ...state,
    indicadores: {
      ...state.indicadores,
      [itemKey]: {
        ...(state.indicadores[itemKey] ?? {}),
        [colunaId]: celulas,
      },
    },
  }
}

function mapTemTextoPreenchido(
  map: Record<string, Record<string, DiferencialCelulaCotacao[]>>,
  keys?: readonly string[]
): boolean {
  const list = keys ?? Object.keys(map)
  for (const itemKey of list) {
    const porColuna = map[itemKey] ?? {}
    for (const celulas of Object.values(porColuna)) {
      if (celulas.some((c) => c.texto.trim())) return true
    }
  }
  return false
}

function consolidandoFromForm(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): ConsolidandoDadosState {
  return ensureConsolidandoDadosState(
    parseConsolidandoDadosFromKickOff(estrategia ?? form.kickOffEstrategia)
  )
}

export function consolidandoHasResumoCoberturas(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  return consolidandoFromForm(form, estrategia).resumoCoberturas.trim().length > 0
}

export function consolidandoHasCondicoes(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  const cd = consolidandoFromForm(form, estrategia)
  return (
    mapTemTextoPreenchido(cd.condicoes, CONDICAO_CONTRATUAL_ITEM_KEYS) ||
    cd.condicoesContratuais.trim().length > 0
  )
}

export function consolidandoHasDiferenciais(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  const cd = consolidandoFromForm(form, estrategia)
  const keys = listDiferencialItens(cd.itensExtras?.diferenciais).map((i) => i.key)
  return mapTemTextoPreenchido(cd.diferenciais, keys)
}

export function consolidandoHasIndicadores(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  return mapTemTextoPreenchido(
    consolidandoFromForm(form, estrategia).indicadores,
    INDICADOR_OPERADORA_ITEM_KEYS
  )
}

export function consolidandoDadosIsComplete(
  form: CotacaoFormState,
  estrategia?: KickOffEstrategia | null
): boolean {
  return (
    consolidandoHasCondicoes(form, estrategia) &&
    consolidandoHasDiferenciais(form, estrategia)
  )
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

export function celulaPlanosSelecionados(
  celula: DiferencialCelulaCotacao,
  options: DiferencialPlanoOpcao[]
): DiferencialPlanoOpcao[] {
  const labels = celulaPlanoLabels(celula)
  const ids = celulaPlanoIds(celula)
  const n = Math.max(labels.length, ids.length)
  if (!n) return []
  const selected: DiferencialPlanoOpcao[] = []
  const seen = new Set<string>()
  for (let i = 0; i < n; i++) {
    const slice: DiferencialCelulaCotacao = {
      ...celula,
      placementPlanoId: ids[i] ?? '',
      planoLabel: labels[i] ?? '',
      placementPlanoIds: undefined,
      planoLabels: undefined,
    }
    const hit = matchDiferencialPlanoOpcao(slice, options)
    const opt =
      hit ??
      (slice.planoLabel.trim()
        ? {
            key: `celula-${celula.id}-${i}-${normPlanoNome(slice.planoLabel)}`,
            planoLabel: slice.planoLabel.trim(),
            placementPlanoId: slice.placementPlanoId,
            grupo: 'Digitado',
          }
        : null)
    if (!opt) continue
    const dedupe = `${normPlanoNome(opt.planoLabel)}|${opt.placementPlanoId}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    selected.push(opt)
  }
  return selected
}

export function applyPlanosToCelula(
  celula: DiferencialCelulaCotacao,
  selected: (DiferencialPlanoOpcao | string)[]
): DiferencialCelulaCotacao {
  const planos = selected
    .map((p) =>
      typeof p === 'string'
        ? { planoLabel: p.trim(), placementPlanoId: '' }
        : {
            planoLabel: p.planoLabel.trim(),
            placementPlanoId: p.placementPlanoId ?? '',
          }
    )
    .filter((p) => p.planoLabel)
  const labels = planos.map((p) => p.planoLabel)
  const ids = planos.map((p) => p.placementPlanoId)
  return {
    ...celula,
    planoLabels: labels,
    placementPlanoIds: ids,
    planoLabel: labels.join(', '),
    placementPlanoId: ids.find((id) => id) ?? '',
    fromMaster: false,
  }
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

export function resolvePlacementPlanoIdsForCelula(
  celula: DiferencialCelulaCotacao,
  operadoraId: string,
  placementPlanos: PlacementPlano[],
  propostaPlanos?: PropostaPlanoLinha[]
): string[] {
  const labels = celulaPlanoLabels(celula)
  const ids = celulaPlanoIds(celula)
  const n = Math.max(labels.length, ids.length)
  if (!n) return []
  const resolved: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < n; i++) {
    const slice: DiferencialCelulaCotacao = {
      ...celula,
      placementPlanoId: ids[i] ?? '',
      planoLabel: labels[i] ?? '',
      placementPlanoIds: undefined,
      planoLabels: undefined,
    }
    const id = resolvePlacementPlanoIdForCelula(
      slice,
      operadoraId,
      placementPlanos,
      propostaPlanos
    )
    if (!id || seen.has(id)) continue
    seen.add(id)
    resolved.push(id)
  }
  return resolved
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

  for (const item of listDiferencialItens(consolidando.itensExtras?.diferenciais)) {
    const itemKey = item.key
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

        const placementPlanoIds = resolvePlacementPlanoIdsForCelula(
          celula,
          operadoraId,
          args.placementPlanos,
          propostaPlanos
        )
        if (!placementPlanoIds.length) {
          skipped += 1
          continue
        }

        for (const placementPlanoId of placementPlanoIds) {
          const dedupeKey = `${operadoraId}|${placementPlanoId}|${itemKey}`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)
          items.push({ operadoraId, placementPlanoId, itemKey, texto })
        }
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
  const extraKeys = Object.keys(imported).filter((k) => !isCatalogDiferencialKey(k))
  const extras = extraKeys.map((key) => ({ key, label: labelDiferencialItem(key) }))
  const rows: DiferencialPreviewRow[] = []
  for (const item of listDiferencialItens(extras)) {
    const celulas = imported[item.key] ?? []
    for (const c of celulas) {
      const plano = placementPlanos.find((p) => p.id === c.placementPlanoId)
      rows.push({
        itemKey: item.key,
        itemLabel: item.label,
        planoLabel: formatCelulaPlanoLabel(c) || plano?.plano || '—',
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

export function importCondicoesFromMaster(args: {
  operadoraId: string
  masterCondicoes: PlacementCondicaoContratual[]
  placementPlanos: PlacementPlano[]
  propostaPlanos?: PropostaPlanoLinha[]
}): Record<string, DiferencialCelulaCotacao[]> {
  const { operadoraId, masterCondicoes, placementPlanos, propostaPlanos } = args
  const nomesProposta = new Set(planosPropostaFornecedor(propostaPlanos).map(normPlanoNome))
  const planosOperadora = placementPlanos.filter((p) => p.operadoraId === operadoraId)
  const planosRelevantes =
    nomesProposta.size > 0
      ? planosOperadora.filter((p) => nomesProposta.has(normPlanoNome(p.plano)))
      : planosOperadora
  const planoIds = new Set(planosRelevantes.map((p) => p.id))

  const out: Record<string, DiferencialCelulaCotacao[]> = {}
  for (const itemKey of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    const hits = masterCondicoes.filter((d) => {
      if (d.operadoraId !== operadoraId || d.itemKey !== itemKey) return false
      if (!d.porPlano) return true
      return !!d.placementPlanoId && planoIds.has(d.placementPlanoId)
    })
    if (!hits.length) continue
    out[itemKey] = hits.map((d) => {
      const plano = d.placementPlanoId
        ? planosRelevantes.find((p) => p.id === d.placementPlanoId) ??
          placementPlanos.find((p) => p.id === d.placementPlanoId)
        : undefined
      return {
        id: uid('cc'),
        placementPlanoId: d.porPlano ? d.placementPlanoId ?? '' : '',
        planoLabel: d.porPlano ? plano?.plano ?? d.placementPlano?.plano ?? '' : '',
        texto: d.texto.trim(),
        fromMaster: true,
      }
    })
  }
  return out
}

export function mergeCondicoesColuna(
  state: ConsolidandoDadosState,
  colunaId: string,
  imported: Record<string, DiferencialCelulaCotacao[]>,
  replace = false
): ConsolidandoDadosState {
  const condicoes = { ...state.condicoes }
  for (const [itemKey, celulas] of Object.entries(imported)) {
    if (!celulas.length) continue
    const porColuna = { ...(condicoes[itemKey] ?? {}) }
    porColuna[colunaId] = replace ? celulas : [...(porColuna[colunaId] ?? []), ...celulas]
    condicoes[itemKey] = porColuna
  }
  return { ...state, condicoes }
}

export type CondicaoMasterUpsertItem = {
  operadoraId: string
  porPlano: boolean
  placementPlanoId?: string | null
  itemKey: string
  texto: string
}

export function buildCondicoesMasterUpsertItems(
  consolidando: ConsolidandoDadosState,
  args: {
    fornecedores: string[]
    resolveOperadoraId: (nome: string) => string
    placementPlanos: PlacementPlano[]
    propostasByColuna: Record<string, { planos?: PropostaPlanoLinha[] } | undefined>
  }
): { items: CondicaoMasterUpsertItem[]; skipped: number } {
  const items: CondicaoMasterUpsertItem[] = []
  let skipped = 0
  const seen = new Set<string>()

  for (const itemKey of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    const porColuna = consolidando.condicoes[itemKey] ?? {}
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

        const placementPlanoIds = resolvePlacementPlanoIdsForCelula(
          celula,
          operadoraId,
          args.placementPlanos,
          propostaPlanos
        )
        const temPlanoLabel =
          celulaPlanoLabels(celula).length > 0 || celulaPlanoIds(celula).some(Boolean)

        if (temPlanoLabel && !placementPlanoIds.length) {
          skipped += 1
          continue
        }

        if (!temPlanoLabel) {
          const dedupeKey = `${operadoraId}||${itemKey}|0`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)
          items.push({
            operadoraId,
            porPlano: false,
            placementPlanoId: null,
            itemKey,
            texto,
          })
          continue
        }

        for (const placementPlanoId of placementPlanoIds) {
          const dedupeKey = `${operadoraId}|${placementPlanoId}|${itemKey}|1`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)
          items.push({
            operadoraId,
            porPlano: true,
            placementPlanoId,
            itemKey,
            texto,
          })
        }
      }
    }
  }

  return { items, skipped }
}

export function buildImportCondicoesPreviewRows(
  imported: Record<string, DiferencialCelulaCotacao[]>,
  placementPlanos: PlacementPlano[]
): DiferencialPreviewRow[] {
  const rows: DiferencialPreviewRow[] = []
  for (const itemKey of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    const celulas = imported[itemKey] ?? []
    for (const c of celulas) {
      const plano = placementPlanos.find((p) => p.id === c.placementPlanoId)
      rows.push({
        itemKey,
        itemLabel: labelCondicaoContratualItem(itemKey),
        planoLabel: formatCelulaPlanoLabel(c) || plano?.plano || 'Fornecedor (geral)',
        texto: c.texto.trim(),
      })
    }
  }
  return rows
}

export function buildSaveCondicoesPreviewRows(
  items: CondicaoMasterUpsertItem[],
  placementPlanos: PlacementPlano[]
): DiferencialPreviewRow[] {
  return items.map((item) => {
    const plano = item.placementPlanoId
      ? placementPlanos.find((p) => p.id === item.placementPlanoId)
      : undefined
    return {
      itemKey: item.itemKey,
      itemLabel: labelCondicaoContratualItem(item.itemKey),
      planoLabel: item.porPlano ? plano?.plano ?? '—' : 'Fornecedor (geral)',
      texto: item.texto,
    }
  })
}

export function previewImportCondicoesFromMaster(args: {
  operadoraId: string
  masterCondicoes: PlacementCondicaoContratual[]
  placementPlanos: PlacementPlano[]
  propostaPlanos?: PropostaPlanoLinha[]
}): { imported: Record<string, DiferencialCelulaCotacao[]>; rows: DiferencialPreviewRow[] } {
  const imported = importCondicoesFromMaster(args)
  return {
    imported,
    rows: buildImportCondicoesPreviewRows(imported, args.placementPlanos),
  }
}

export function importIndicadoresFromMaster(args: {
  operadoraId: string
  masterIndicadores: PlacementIndicadorOperadora[]
}): Record<string, DiferencialCelulaCotacao[]> {
  const { operadoraId, masterIndicadores } = args
  const out: Record<string, DiferencialCelulaCotacao[]> = {}
  for (const itemKey of INDICADOR_OPERADORA_ITEM_KEYS) {
    const hits = masterIndicadores.filter(
      (d) => d.operadoraId === operadoraId && d.itemKey === itemKey && d.texto.trim()
    )
    if (!hits.length) continue
    out[itemKey] = hits.map((d) => ({
      id: uid('io'),
      placementPlanoId: '',
      planoLabel: '',
      texto: d.texto.trim(),
      fromMaster: true,
    }))
  }
  return out
}

export function mergeIndicadoresColuna(
  state: ConsolidandoDadosState,
  colunaId: string,
  imported: Record<string, DiferencialCelulaCotacao[]>,
  replace = false
): ConsolidandoDadosState {
  const indicadores = { ...state.indicadores }
  for (const [itemKey, celulas] of Object.entries(imported)) {
    if (!celulas.length) continue
    const porColuna = { ...(indicadores[itemKey] ?? {}) }
    porColuna[colunaId] = replace ? celulas : [...(porColuna[colunaId] ?? []), ...celulas]
    indicadores[itemKey] = porColuna
  }
  return { ...state, indicadores }
}

export type IndicadorMasterUpsertItem = {
  operadoraId: string
  itemKey: string
  texto: string
}

export function buildIndicadoresMasterUpsertItems(
  consolidando: ConsolidandoDadosState,
  args: {
    fornecedores: string[]
    resolveOperadoraId: (nome: string) => string
  }
): { items: IndicadorMasterUpsertItem[]; skipped: number } {
  const items: IndicadorMasterUpsertItem[] = []
  let skipped = 0
  const seen = new Set<string>()

  for (const itemKey of INDICADOR_OPERADORA_ITEM_KEYS) {
    const porColuna = consolidando.indicadores[itemKey] ?? {}
    for (const [colunaId, celulas] of Object.entries(porColuna)) {
      const operadoraId = operadoraIdFromColunaId(colunaId, args.fornecedores, args.resolveOperadoraId)
      if (!operadoraId) {
        skipped += celulas.filter((c) => c.texto.trim()).length
        continue
      }
      for (const celula of celulas) {
        const texto = celula.texto.trim()
        if (!texto) continue
        const dedupeKey = `${operadoraId}|${itemKey}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        items.push({ operadoraId, itemKey, texto })
      }
    }
  }

  return { items, skipped }
}

export function buildImportIndicadoresPreviewRows(
  imported: Record<string, DiferencialCelulaCotacao[]>
): DiferencialPreviewRow[] {
  const rows: DiferencialPreviewRow[] = []
  for (const itemKey of INDICADOR_OPERADORA_ITEM_KEYS) {
    for (const c of imported[itemKey] ?? []) {
      rows.push({
        itemKey,
        itemLabel: labelIndicadorOperadoraItem(itemKey),
        planoLabel: 'Fornecedor',
        texto: c.texto.trim(),
      })
    }
  }
  return rows
}

export function buildSaveIndicadoresPreviewRows(
  items: IndicadorMasterUpsertItem[]
): DiferencialPreviewRow[] {
  return items.map((item) => ({
    itemKey: item.itemKey,
    itemLabel: labelIndicadorOperadoraItem(item.itemKey),
    planoLabel: 'Fornecedor',
    texto: item.texto,
  }))
}

export function previewImportIndicadoresFromMaster(args: {
  operadoraId: string
  masterIndicadores: PlacementIndicadorOperadora[]
}): { imported: Record<string, DiferencialCelulaCotacao[]>; rows: DiferencialPreviewRow[] } {
  const imported = importIndicadoresFromMaster(args)
  return { imported, rows: buildImportIndicadoresPreviewRows(imported) }
}

export { INDICADORES_NOTAS_RODAPE_DEFAULT }
