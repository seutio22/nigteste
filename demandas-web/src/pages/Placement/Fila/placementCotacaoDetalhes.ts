import {
  coparticipacaoToApiPayload,
  emptyCoparticipacao,
  parseCoparticipacaoFromApi,
  type CoparticipacaoForm,
} from './placementCoparticipacao'
import {
  coberturasEspeciaisFromApi,
  coberturasEspeciaisToApi,
  EMPTY_COBERTURAS_ESPECIAIS,
  emptyCoberturasEspeciaisItens,
  type CoberturasEspeciais,
} from './placementCoberturasEspeciais'
import { onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import {
  dadosFinanceirosFromApi,
  dadosFinanceirosToApi,
  EMPTY_DADOS_FINANCEIROS,
  type DadosFinanceirosCotacao,
} from './placementCotacaoFinanceiro'

export type { DadosFinanceirosCotacao }
import {
  EMPTY_REEMBOLSO_POR_PLANO,
  reembolsoPorPlanoFromApi,
  reembolsoPorPlanoToApi,
  type ReembolsoPorPlano,
} from './placementReembolso'

export type { CoberturasEspeciais }
import {
  EMPTY_UPGRADE_DOWNGRADE_POR_PLANO,
  upgradeDowngradePorPlanoFromApi,
  type UpgradeDowngradePorPlano,
} from './UpgradeDowngradeFields'
import { parseBRLToCents } from './utils'

export type { ReembolsoPorPlano }

export type { CoparticipacaoForm }

/** Faixas etárias para custeio por plano (Saúde/Odontológico). */
export const FAIXAS_ETARIAS = [
  { key: '00-18', label: '00 - 18' },
  { key: '19-23', label: '19 - 23' },
  { key: '24-28', label: '24 - 28' },
  { key: '29-33', label: '29 - 33' },
  { key: '34-38', label: '34 - 38' },
  { key: '39-43', label: '39 - 43' },
  { key: '44-48', label: '44 - 48' },
  { key: '49-53', label: '49 - 53' },
  { key: '54-58', label: '54 - 58' },
  { key: '59-mais', label: '59 OU MAIS' },
] as const

export type FaixaEtariaKey = (typeof FAIXAS_ETARIAS)[number]['key']

export function emptyCustosFaixa(): Record<FaixaEtariaKey, string> {
  return Object.fromEntries(FAIXAS_ETARIAS.map((f) => [f.key, ''])) as Record<FaixaEtariaKey, string>
}

export function emptyVidasFaixa(): Record<FaixaEtariaKey, string> {
  return Object.fromEntries(FAIXAS_ETARIAS.map((f) => [f.key, ''])) as Record<FaixaEtariaKey, string>
}

function onlyDigitsCnpjLocal(value: string | null | undefined): string {
  return onlyDigitsCnpj(String(value ?? ''))
}

/** Vincula cliente master pelo CNPJ da condição Placement (quando existir em Clientes). */
export function resolveClienteIdFromCondicao(
  condicao: { cnpj?: string | null; razaoSocial?: string; grupoEconomico?: string | null } | null | undefined,
  clientes: { id: string; nome?: string; cnpj?: string | null; grupoEconomico?: string | null }[]
): string {
  if (!condicao) return ''
  const condCnpj = condicao.cnpj ? onlyDigitsCnpjLocal(condicao.cnpj) : ''
  if (condCnpj.length === 14) {
    const byCnpj = clientes.find((c) => onlyDigitsCnpjLocal(c.cnpj) === condCnpj)
    if (byCnpj) return byCnpj.id
  }
  const rs = String(condicao.razaoSocial ?? '')
    .trim()
    .toLowerCase()
  const ge = String(condicao.grupoEconomico ?? '').trim().toLowerCase()
  if (rs) {
    const byNome = clientes.find((c) => {
      const nome = String(c.nome ?? '')
        .trim()
        .toLowerCase()
      if (nome !== rs) return false
      if (!ge) return true
      const cge = String(c.grupoEconomico ?? '').trim().toLowerCase()
      return !cge || cge === ge
    })
    if (byNome) return byNome.id
  }
  return ''
}

export function newMapeamentoRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function newPlanoCoberturaId(): string {
  return newMapeamentoRowId()
}

export interface MapeamentoItemForm {
  id: string
  produtoId: string
  produtoNome: string
  /** Categoria do catálogo Placement (cotação Saúde). */
  categoria: string
  fornecedorId: string
}

/** Campos mínimos para saber se estipulante (casa/prospect) já foi definido no mapeamento. */
export interface EstipulanteMapeamentoLike {
  clienteTipo: 'casa' | 'prospect'
  clienteId: string
  condicaoId: string
  prospectId: string
}

export function mapeamentoEstipulanteCompleto(f: EstipulanteMapeamentoLike): boolean {
  if (f.clienteTipo === 'casa') return !!f.condicaoId?.trim()
  return !!(f.prospectId && f.prospectId.trim())
}

export function emptyMapeamentoItem(): MapeamentoItemForm {
  return {
    id: newMapeamentoRowId(),
    produtoId: '',
    produtoNome: '',
    categoria: '',
    fornecedorId: '',
  }
}

/** Linha de mapeamento completa conforme o tipo de formulário. */
export function mapeamentoItemCompleto(
  item: MapeamentoItemForm,
  formularioTipo?: string | null
): boolean {
  if (!item.fornecedorId?.trim()) return false
  if (formularioTipo === 'saude') return !!item.categoria?.trim()
  return !!(item.produtoId?.trim() && item.fornecedorId?.trim())
}

/** Normaliza produtoNome para persistência (Saúde usa categoria + ramo fixo). */
export function normalizeMapeamentoItemForSave(
  item: MapeamentoItemForm,
  formularioTipo?: string | null
): MapeamentoItemForm {
  if (formularioTipo === 'saude' && item.categoria?.trim()) {
    return { ...item, produtoNome: 'Saúde', produtoId: item.produtoId || 'saude' }
  }
  return item
}

export type TipoCustoPlano = 'per_capita' | 'faixa_etaria'

export interface PlanoCoberturaForm {
  id: string
  itemRowId: string
  /** ID do registro em Dados → Placement → Planos, quando selecionado do catálogo. */
  placementPlanoCatalogId?: string
  nomePlano: string
  acomodacao: '' | 'Apartamento' | 'Enfermaria'
  abrangencia: string
  elegibilidade: string
  numeroVidas: string
  tipoCusto: TipoCustoPlano
  custoPerCapitaBRL: string
  custosFaixa: Record<FaixaEtariaKey, string>
  /** Quantidade de vidas por faixa (custeio faixa etária). */
  vidasFaixa: Record<FaixaEtariaKey, string>
  coparticipacao: CoparticipacaoForm
}

export function emptyPlanoCobertura(itemRowId: string): PlanoCoberturaForm {
  return {
    id: newPlanoCoberturaId(),
    itemRowId,
    nomePlano: '',
    acomodacao: '',
    abrangencia: '',
    elegibilidade: '',
    numeroVidas: '',
    tipoCusto: 'per_capita',
    custoPerCapitaBRL: '',
    custosFaixa: emptyCustosFaixa(),
    vidasFaixa: emptyVidasFaixa(),
    coparticipacao: emptyCoparticipacao(),
  }
}

/** Produto tratado como plano (Saúde ou Odontológico). */
export function isSaudeOuOdonto(produtoNome: string): boolean {
  const n = (produtoNome || '').toLowerCase()
  return n.includes('saúde') || n.includes('saude') || n.includes('odonto')
}

/** Exibe módulo de planos quando houver ao menos uma linha Saúde/Odonto com produto e fornecedor (inclui contrato único). */
export function shouldShowPlanoModule(itens: MapeamentoItemForm[]): boolean {
  if (!itens.length) return false
  return itens.some((i) => isSaudeOuOdonto(i.produtoNome) && i.produtoId && i.fornecedorId)
}

export function rowIdsNeedingPlano(itens: MapeamentoItemForm[]): string[] {
  if (!shouldShowPlanoModule(itens)) return []
  return itens
    .filter((i) => isSaudeOuOdonto(i.produtoNome) && i.produtoId && i.fornecedorId)
    .map((i) => i.id)
}

/**
 * Mantém planos só de linhas ainda elegíveis; remove órfãos;
 * garante ao menos um plano por linha elegível (sem apagar extras do mesmo contrato).
 */
export function reconcilePlanosParaItens(
  planos: PlanoCoberturaForm[],
  neededRowIds: string[]
): PlanoCoberturaForm[] {
  const needed = new Set(neededRowIds)
  const kept = planos.filter((p) => needed.has(p.itemRowId))
  const byItem = new Map<string, PlanoCoberturaForm[]>()
  for (const p of kept) {
    const arr = byItem.get(p.itemRowId) ?? []
    arr.push(p)
    byItem.set(p.itemRowId, arr)
  }
  const out: PlanoCoberturaForm[] = []
  for (const rowId of neededRowIds) {
    const list = byItem.get(rowId) ?? []
    if (list.length === 0) out.push(emptyPlanoCobertura(rowId))
    else out.push(...list)
  }
  return out
}

function parseVidasInt(input: string): number {
  const n = Number(String(input ?? '').trim())
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** Custo estimado do plano (centavos): per capita = vidas × custo; faixa = Σ(vidas × custo por faixa). */
export function subtotalFaixaCents(vidasInput: string, custoInput: string): number | null {
  const vidas = parseVidasInt(vidasInput)
  const unit = parseBRLToCents(custoInput)
  if (vidas > 0 && unit != null) return vidas * unit
  return null
}

export function custoEstimadoPlanoCents(plano: PlanoCoberturaForm): number | null {
  if (plano.tipoCusto === 'per_capita') {
    const vidas = parseVidasInt(plano.numeroVidas)
    const unit = parseBRLToCents(plano.custoPerCapitaBRL)
    if (vidas > 0 && unit != null) return vidas * unit
    return null
  }
  let total = 0
  let any = false
  for (const fx of FAIXAS_ETARIAS) {
    const vidas = parseVidasInt(plano.vidasFaixa[fx.key] ?? '')
    const unit = parseBRLToCents(plano.custosFaixa[fx.key] ?? '')
    if (vidas > 0 && unit != null) {
      total += vidas * unit
      any = true
    }
  }
  return any ? total : null
}

export function sumCustoEstimadoPlanosCents(planos: PlanoCoberturaForm[]): number | null {
  let total = 0
  let any = false
  for (const p of planos) {
    const c = custoEstimadoPlanoCents(p)
    if (c != null) {
      total += c
      any = true
    }
  }
  return any ? total : null
}

/** Soma vidas informadas nos planos (para persistir no registro da cotação, se houver). */
export function sumVidasDosPlanos(planos: PlanoCoberturaForm[]): number | null {
  let total = 0
  let any = false
  for (const p of planos) {
    if (p.tipoCusto === 'faixa_etaria') {
      for (const fx of FAIXAS_ETARIAS) {
        const n = parseVidasInt(p.vidasFaixa[fx.key] ?? '')
        if (n > 0) {
          total += n
          any = true
        }
      }
      continue
    }
    const n = parseVidasInt(p.numeroVidas)
    if (n > 0) {
      total += n
      any = true
    }
  }
  return any ? total : null
}

export function itensToApiPayload(itens: MapeamentoItemForm[], formularioTipo?: string | null) {
  return itens
    .filter((i) => mapeamentoItemCompleto(i, formularioTipo))
    .map((i) => normalizeMapeamentoItemForSave(i, formularioTipo))
    .map((i) => ({
      id: i.id,
      produtoId: i.produtoId,
      produtoNome: i.produtoNome,
      categoria: i.categoria?.trim() || undefined,
      fornecedorId: i.fornecedorId,
    }))
}

export function summarizeItensNomes(itens: MapeamentoItemForm[]): string {
  const nomes = [...new Set(itens.map((i) => i.produtoNome).filter(Boolean))]
  return nomes.join(', ')
}

export function parseItensFromApi(raw: unknown): MapeamentoItemForm[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return emptyMapeamentoItem()
    const r = row as Record<string, unknown>
    return {
      id: r.id != null && String(r.id).length ? String(r.id) : newMapeamentoRowId(),
      produtoId: r.produtoId != null ? String(r.produtoId) : '',
      produtoNome: r.produtoNome != null ? String(r.produtoNome) : '',
      categoria: r.categoria != null ? String(r.categoria) : '',
      fornecedorId: r.fornecedorId != null ? String(r.fornecedorId) : '',
    }
  })
}

export function parsePlanosFromApi(raw: unknown): PlanoCoberturaForm[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return emptyPlanoCobertura('')
    const r = row as Record<string, unknown>
    const custosRaw =
      r.custosFaixa && typeof r.custosFaixa === 'object' ? (r.custosFaixa as Record<string, string>) : {}
    const custosFaixa = emptyCustosFaixa()
    for (const k of Object.keys(custosFaixa) as FaixaEtariaKey[]) {
      if (custosRaw[k] != null) custosFaixa[k] = String(custosRaw[k])
    }
    const vidasRaw =
      r.vidasFaixa && typeof r.vidasFaixa === 'object' ? (r.vidasFaixa as Record<string, string>) : {}
    const vidasFaixa = emptyVidasFaixa()
    for (const k of Object.keys(vidasFaixa) as FaixaEtariaKey[]) {
      if (vidasRaw[k] != null) vidasFaixa[k] = String(vidasRaw[k])
    }
    const tipo = r.tipoCusto === 'faixa_etaria' ? 'faixa_etaria' : 'per_capita'
    const itemRowId = r.itemRowId != null ? String(r.itemRowId) : ''
    return {
      id: r.id != null && String(r.id).length ? String(r.id) : newPlanoCoberturaId(),
      itemRowId,
      placementPlanoCatalogId:
        r.placementPlanoCatalogId != null ? String(r.placementPlanoCatalogId) : '',
      nomePlano: r.nomePlano != null ? String(r.nomePlano) : '',
      acomodacao:
        r.acomodacao === 'Apartamento' || r.acomodacao === 'Enfermaria' ? r.acomodacao : '',
      abrangencia: r.abrangencia != null ? String(r.abrangencia) : '',
      elegibilidade: r.elegibilidade != null ? String(r.elegibilidade) : '',
      numeroVidas: r.numeroVidas != null ? String(r.numeroVidas) : '',
      tipoCusto: tipo,
      custoPerCapitaBRL: r.custoPerCapitaBRL != null ? String(r.custoPerCapitaBRL) : '',
      custosFaixa,
      vidasFaixa,
      coparticipacao: parseCoparticipacaoFromApi(r.coparticipacao),
    }
  })
}

export function planosToApiPayload(planos: PlanoCoberturaForm[]) {
  return planos.map((p) => ({
    id: p.id,
    itemRowId: p.itemRowId,
    nomePlano: p.nomePlano.trim(),
    acomodacao: p.acomodacao,
    abrangencia: p.abrangencia.trim(),
    elegibilidade: p.elegibilidade.trim(),
    numeroVidas: p.numeroVidas.trim(),
    tipoCusto: p.tipoCusto,
    custoPerCapitaBRL: p.custoPerCapitaBRL.trim(),
    custosFaixa: p.custosFaixa,
    vidasFaixa: p.vidasFaixa,
    custoEstimadoCents: custoEstimadoPlanoCents(p),
    coparticipacao: coparticipacaoToApiPayload(p.coparticipacao),
  }))
}

export type PlanosCoberturaBundle = {
  planos: PlanoCoberturaForm[]
  coparticipacaoDetalhePorPlanos: string
  upgradeDowngradePorPlano: UpgradeDowngradePorPlano
  reembolsoPorPlano: ReembolsoPorPlano
  coberturasEspeciais: CoberturasEspeciais
  dadosFinanceiros: DadosFinanceirosCotacao
}

export function parsePlanosBundleFromApi(
  raw: unknown,
  cotacaoLegado?: Record<string, unknown>
): PlanosCoberturaBundle {
  const empty = (): PlanosCoberturaBundle => ({
    planos: [],
    coparticipacaoDetalhePorPlanos: '',
    upgradeDowngradePorPlano: { ...EMPTY_UPGRADE_DOWNGRADE_POR_PLANO },
    reembolsoPorPlano: { ...EMPTY_REEMBOLSO_POR_PLANO },
    coberturasEspeciais: { itens: emptyCoberturasEspeciaisItens() },
    dadosFinanceiros: {
      atual: { ...EMPTY_DADOS_FINANCEIROS.atual, participacao: { ...EMPTY_DADOS_FINANCEIROS.atual.participacao } },
      estudo: { ...EMPTY_DADOS_FINANCEIROS.estudo, participacao: { ...EMPTY_DADOS_FINANCEIROS.estudo.participacao } },
    },
  })

  if (Array.isArray(raw)) {
    const planos = parsePlanosFromApi(raw)
    return {
      planos,
      coparticipacaoDetalhePorPlanos: '',
      upgradeDowngradePorPlano: upgradeDowngradePorPlanoFromApi(
        undefined,
        planos,
        cotacaoLegado
      ),
      reembolsoPorPlano: reembolsoPorPlanoFromApi(undefined, planos),
      coberturasEspeciais: coberturasEspeciaisFromApi(undefined, planos),
      dadosFinanceiros: dadosFinanceirosFromApi(undefined),
    }
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const dadosFinanceiros = dadosFinanceirosFromApi(o.dadosFinanceiros)
    if (Array.isArray(o.planos)) {
      const planos = parsePlanosFromApi(o.planos)
      return {
        planos,
        coparticipacaoDetalhePorPlanos:
          o.coparticipacaoDetalhePorPlanos != null
            ? String(o.coparticipacaoDetalhePorPlanos)
            : '',
        upgradeDowngradePorPlano: upgradeDowngradePorPlanoFromApi(
          o.upgradeDowngradePorPlano ?? o.upgradeDowngrade,
          planos,
          cotacaoLegado
        ),
        reembolsoPorPlano: reembolsoPorPlanoFromApi(o.reembolsoPorPlano ?? o.reembolso, planos),
        coberturasEspeciais: coberturasEspeciaisFromApi(
          o.coberturasEspeciais ?? o.coberturasEspeciaisPorPlano,
          planos
        ),
        dadosFinanceiros,
      }
    }
    if (o.dadosFinanceiros != null) {
      return { ...empty(), dadosFinanceiros }
    }
  }
  return empty()
}

/** Payload para API: array legado ou objeto com detalhe quando preenchido. */
function upgradeDowngradePorPlanoToApi(ud: UpgradeDowngradePorPlano) {
  const hasUd =
    ud.permiteUpgrade !== '' ||
    ud.permiteDowngrade !== '' ||
    ud.planosIdsUpgrade.length > 0 ||
    ud.planosIdsDowngrade.length > 0 ||
    ud.regraUpgrade.trim() ||
    ud.regraDowngrade.trim()
  if (!hasUd) return undefined
  return {
    permiteUpgrade: ud.permiteUpgrade === 'sim',
    permiteDowngrade: ud.permiteDowngrade === 'sim',
    planosIdsUpgrade: ud.permiteUpgrade === 'sim' ? ud.planosIdsUpgrade : [],
    planosIdsDowngrade: ud.permiteDowngrade === 'sim' ? ud.planosIdsDowngrade : [],
    regraUpgrade: ud.permiteUpgrade === 'sim' ? ud.regraUpgrade.trim() : '',
    regraDowngrade: ud.permiteDowngrade === 'sim' ? ud.regraDowngrade.trim() : '',
  }
}

export function planosBundleToApiPayload(
  planos: PlanoCoberturaForm[],
  coparticipacaoDetalhePorPlanos: string,
  upgradeDowngradePorPlano: UpgradeDowngradePorPlano = EMPTY_UPGRADE_DOWNGRADE_POR_PLANO,
  reembolsoPorPlano: ReembolsoPorPlano = EMPTY_REEMBOLSO_POR_PLANO,
  coberturasEspeciais: CoberturasEspeciais = EMPTY_COBERTURAS_ESPECIAIS,
  dadosFinanceiros: DadosFinanceirosCotacao = EMPTY_DADOS_FINANCEIROS
): unknown[] | Record<string, unknown> | null {
  const arr = planosToApiPayload(planos)
  const detalhe = coparticipacaoDetalhePorPlanos.trim()
  const ud = upgradeDowngradePorPlanoToApi(upgradeDowngradePorPlano)
  const reemb = reembolsoPorPlanoToApi(reembolsoPorPlano)
  const cobEsp = coberturasEspeciaisToApi(coberturasEspeciais)
  const fin = dadosFinanceirosToApi(dadosFinanceiros)
  if (!arr.length && !detalhe && !ud && !reemb && !cobEsp && !fin) return null
  if (!detalhe && !ud && !reemb && !cobEsp && !fin) return arr
  return {
    planos: arr,
    ...(detalhe ? { coparticipacaoDetalhePorPlanos: detalhe } : {}),
    ...(ud ? { upgradeDowngradePorPlano: ud } : {}),
    ...(reemb ? { reembolsoPorPlano: reemb } : {}),
    ...(cobEsp ? { coberturasEspeciais: cobEsp } : {}),
    ...(fin ? { dadosFinanceiros: fin } : {}),
  }
}
