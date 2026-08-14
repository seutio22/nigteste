import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  custoEstimadoPlanoCents,
  FAIXAS_ETARIAS,
  parseItensFromApi,
  parsePlanosBundleFromApi,
  subtotalFaixaCents,
  type FaixaEtariaKey,
  type MapeamentoItemForm,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import type { DadosFinanceirosCotacao } from './placementCotacaoFinanceiro'
import { COPART_PROCEDIMENTOS, type CoparticipacaoForm } from './placementCoparticipacao'
import { formatCentsToBRL, parseBRLToCents } from './utils'
import { CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE } from './placementContratoAtualLayout'
import type { ColunaVariacaoComparativo } from './placementComparativoVariacao'

export const PLANOS_POR_PAGINA = 3

export const TAB_COLORS = [
  '#5B4FCF',
  '#E87B35',
  '#F4B740',
  '#3DAA86',
  '#009FDF',
  '#004F75',
] as const

export type FaixaEtariaLinha = {
  key: FaixaEtariaKey
  label: string
  vidas: number
  custo: string
  subtotal: string
}

export type FaixaMatrixCell = {
  custo: string
  vidas: number
  subtotal: string
}

export type FaixaMatrixData = {
  rows: { key: FaixaEtariaKey; label: string; labelDisplay: string }[]
  getCell: (colId: string, key: FaixaEtariaKey) => FaixaMatrixCell | null
}

/** Rótulo amigável para a coluna de faixas (estilo tabela de precificação). */
export function faixaLabelDisplay(label: string): string {
  const u = label.toUpperCase()
  if (u.includes('OU MAIS') || u.includes('59')) return '59 anos ou mais'
  const m = label.match(/(\d+)\s*-\s*(\d+)/)
  if (m) return `${m[1]} a ${m[2]} anos`
  return label
}

export function buildFaixaMatrixForPage(page: ContratoAtualPagina): FaixaMatrixData | null {
  const faixaCols = page.colunas.filter((c) => c.tipoCusto === 'faixa_etaria')
  if (faixaCols.length === 0) return null

  const keysSet = new Set<FaixaEtariaKey>()
  for (const col of faixaCols) {
    for (const fx of col.faixas) {
      keysSet.add(fx.key)
    }
  }

  const rows = FAIXAS_ETARIAS.filter((f) => keysSet.has(f.key)).map((f) => ({
    key: f.key,
    label: f.label,
    labelDisplay: faixaLabelDisplay(f.label),
  }))

  const getCell = (colId: string, key: FaixaEtariaKey): FaixaMatrixCell | null => {
    const col = page.colunas.find((c) => c.id === colId)
    if (!col || col.tipoCusto !== 'faixa_etaria') return null
    const fx = col.faixas.find((f) => f.key === key)
    if (!fx || (fx.vidas <= 0 && fx.custo === '—')) return null
    return { custo: fx.custo, vidas: fx.vidas, subtotal: fx.subtotal }
  }

  return { rows, getCell }
}

export function pageUsesFaixaMatrix(page: ContratoAtualPagina): boolean {
  return page.colunas.some((c) => c.tipoCusto === 'faixa_etaria')
}

export type ContratoPlanoColuna = {
  id: string
  operadoraId: string
  operadora: string
  produto: string
  planoLabel: string
  acomodacao: string
  elegibilidade: string
  elegibilidadeLinhas: string[]
  contribuicao: string
  coparticipacao: string
  temCoparticipacao: boolean
  vidas: number
  tipoCusto: 'per_capita' | 'faixa_etaria'
  premioPerCapita: string | null
  faixas: FaixaEtariaLinha[]
  faturaEstimada: string
  tabColor: string
  /** Metadados do comparativo de propostas (opcional). */
  grupo?: 'atual' | 'mercado'
  planoReferenciaId?: string
  /** Cenário da proposta (ex.: AMIL Cenário 1 / 2) — usado para colunas separadas no empilhado. */
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
  variacao?: ColunaVariacaoComparativo
}

/** Custo unitário médio — per capita informado ou fatura ÷ vidas (faixa etária). */
export function custoMedioColuna(col: ContratoPlanoColuna): string | null {
  if (col.premioPerCapita?.trim() && col.premioPerCapita !== '—') {
    return col.premioPerCapita
  }
  const fatura = parseBRLToCents(col.faturaEstimada)
  if (fatura != null && col.vidas > 0) {
    return formatCentsToBRL(Math.round(fatura / col.vidas))
  }
  return null
}

export type ContratoAtualPagina = {
  pageIndex: number
  totalPages: number
  colunas: ContratoPlanoColuna[]
  contribuicaoUnica: string | null
  coparticipacaoUnica: string | null
  totalVidas: number
  totalFatura: string
  /** Plano de referência (comparativo de propostas). */
  grupoLabel?: string
}

export type ContratoAtualResumo = {
  /** Todas as colunas (antes da paginação). */
  allColunas: ContratoPlanoColuna[]
  pages: ContratoAtualPagina[]
  totalVidas: number
  totalFatura: string
}

function normKey(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isAtivo(status: string | null | undefined): boolean {
  const s = normKey(status)
  if (!s) return true
  return s === 'ativo' || s.includes('estagiario')
}

function parseVidasInt(input: string): number {
  const n = Number(String(input ?? '').trim())
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function formatBRLInput(input: string): string {
  const cents = parseBRLToCents(input)
  if (cents != null) return formatCentsToBRL(cents)
  const t = String(input ?? '').trim()
  return t || '—'
}

function parsePercent(input: string): number {
  const n = Number(String(input ?? '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function formatContribuicaoResumo(df: DadosFinanceirosCotacao): string {
  const mds = parsePercent(df.atual.participacao.mds)
  const corr = parsePercent(df.atual.participacao.corretorParceiro)
  const empresa = Math.max(0, 100 - mds - corr)
  if (empresa >= 99 && mds <= 0 && corr <= 0) return 'Empresa 100% para titular'
  const parts: string[] = []
  if (empresa > 0) parts.push(`Empresa ${Math.round(empresa)}%`)
  if (mds > 0) parts.push(`MDS ${Math.round(mds)}%`)
  if (corr > 0) parts.push(`Corretor ${Math.round(corr)}%`)
  return parts.length ? parts.join(' · ') : '—'
}

export function formatCoparticipacaoResumo(
  copart: CoparticipacaoForm,
  detalheGlobal: string
): string {
  const det = detalheGlobal.trim()
  if (det) return det
  if (!copart.possui) return 'Sem coparticipação'
  const suffix = copart.formaCobranca === 'valor' ? '' : '%'
  const trechos: string[] = []
  for (const p of COPART_PROCEDIMENTOS) {
    const v = copart.linhas[p.key]?.valor?.trim()
    if (v) trechos.push(`${v}${suffix} ${p.label}`)
  }
  if (trechos.length) {
    const consultas = trechos.find((t) => t.toLowerCase().includes('consulta'))
    const exames = trechos.find((t) => t.toLowerCase().includes('exame'))
    if (consultas && exames) {
      const pct = consultas.split(' ')[0]
      return `${pct} Consultas e exames simples`
    }
    return trechos.slice(0, 2).join(' · ')
  }
  const intern = copart.internacao.valor?.trim()
  if (intern) return `Internação: ${intern}${suffix}`
  return 'Com coparticipação'
}

export type CoparticipacaoSimNao = 'Sim' | 'Não' | '—'

/** Normaliza valor de coparticipação (proposta ou legado) para exibição Sim/Não no comparativo. */
export function coparticipacaoSimNaoLabel(valor: string | undefined | null): CoparticipacaoSimNao {
  const v = String(valor ?? '').trim()
  if (!v || v === '—') return '—'
  const lower = v.toLowerCase()
  if (
    lower === 'não' ||
    lower === 'nao' ||
    lower === 'sem coparticipação' ||
    lower === 'sem coparticipacao'
  ) {
    return 'Não'
  }
  if (lower === 'sim' || lower === 'com coparticipação' || lower === 'com coparticipacao') {
    return 'Sim'
  }
  return 'Sim'
}

export function temCoparticipacaoFromValor(valor: string | undefined | null): boolean {
  return coparticipacaoSimNaoLabel(valor) === 'Sim'
}

export function coparticipacaoFromCopartForm(
  copart: CoparticipacaoForm,
  detalheGlobal: string
): CoparticipacaoSimNao {
  if (detalheGlobal.trim() || copart.possui) return 'Sim'
  return 'Não'
}

export function labelPlano(p: PlanoCoberturaForm): string {
  const nome = p.nomePlano.trim() || 'Plano'
  if (!p.acomodacao) return nome
  const abbr = p.acomodacao === 'Apartamento' ? 'Apt' : 'Enf'
  return `${nome} ${abbr}`
}

function planoMatchKeys(nome: string, label: string): string[] {
  const keys = new Set<string>()
  for (const s of [nome, label, nome.replace(/\s+(apt|enf)$/i, '')]) {
    const k = normKey(s)
    if (k) keys.add(k)
  }
  return [...keys]
}

function matchesPlanoBeneficiario(
  b: PlacementBeneficiario,
  nomePlano: string,
  label: string
): boolean {
  const bp = normKey(b.planoAtual ?? '')
  if (!bp) return false
  return planoMatchKeys(nomePlano, label).some((k) => bp === k || bp.includes(k) || k.includes(bp))
}

/** Elegibilidade a partir da base (cargo / status), com fallback do cadastro do plano. */
export function elegibilidadeDaBase(
  beneficiarios: PlacementBeneficiario[],
  p: PlanoCoberturaForm
): { texto: string; linhas: string[] } {
  const label = labelPlano(p)
  const cargos = new Map<string, number>()
  const status = new Map<string, number>()

  for (const b of beneficiarios) {
    if (!isAtivo(b.statusBeneficiario)) continue
    if (!matchesPlanoBeneficiario(b, p.nomePlano, label)) continue
    const cargo = String(b.cargo ?? '').trim()
    if (cargo) cargos.set(cargo, (cargos.get(cargo) ?? 0) + 1)
    else {
      const st = String(b.statusBeneficiario ?? '').trim()
      if (st) status.set(st, (status.get(st) ?? 0) + 1)
    }
  }

  const linhas = [...cargos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)

  if (linhas.length === 0) {
    const stLinhas = [...status.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    if (stLinhas.length) {
      return { texto: stLinhas.join(' · '), linhas: stLinhas }
    }
    const form = p.elegibilidade.trim()
    if (form) return { texto: form, linhas: form.split(/\s*[,·]\s*/) }
    return { texto: '—', linhas: [] }
  }

  return { texto: linhas.join(' · '), linhas }
}

function buildFaixas(p: PlanoCoberturaForm): FaixaEtariaLinha[] {
  return FAIXAS_ETARIAS.map((fx) => {
    const vidas = parseVidasInt(p.vidasFaixa[fx.key] ?? '')
    const custo = formatBRLInput(p.custosFaixa[fx.key] ?? '')
    const subCents = subtotalFaixaCents(p.vidasFaixa[fx.key] ?? '', p.custosFaixa[fx.key] ?? '')
    return {
      key: fx.key,
      label: fx.label,
      vidas,
      custo,
      subtotal: subCents != null ? formatCentsToBRL(subCents) : '—',
    }
  }).filter((f) => f.vidas > 0 || f.custo !== '—')
}

function vidasPlano(p: PlanoCoberturaForm, beneficiarios: PlacementBeneficiario[]): number {
  if (p.tipoCusto === 'faixa_etaria') {
    let t = 0
    for (const fx of FAIXAS_ETARIAS) {
      t += parseVidasInt(p.vidasFaixa[fx.key] ?? '')
    }
    if (t > 0) return t
  }
  const fromPlan = parseVidasInt(p.numeroVidas)
  if (fromPlan > 0) return fromPlan

  const label = labelPlano(p)
  let n = 0
  for (const b of beneficiarios) {
    if (!isAtivo(b.statusBeneficiario)) continue
    if (matchesPlanoBeneficiario(b, p.nomePlano, label)) n += 1
  }
  return n
}

export function buildContratoPlanoColuna(
  p: PlanoCoberturaForm,
  itens: MapeamentoItemForm[],
  operadoraNomeById: Map<string, string>,
  beneficiarios: PlacementBeneficiario[],
  contribuicao: string,
  copartGlobal: string,
  tabColor: string
): ContratoPlanoColuna {
  const item = itens.find((i) => i.id === p.itemRowId)
  const opNome = (item?.fornecedorId && operadoraNomeById.get(item.fornecedorId)) || '—'
  const copartText = formatCoparticipacaoResumo(p.coparticipacao, copartGlobal)
  const eleg = elegibilidadeDaBase(beneficiarios, p)
  const faturaCents = custoEstimadoPlanoCents(p)

  return {
    id: p.id,
    operadoraId: item?.fornecedorId?.trim() ?? '',
    operadora: opNome.toUpperCase(),
    produto: item?.produtoNome?.trim() || 'Produto',
    planoLabel: labelPlano(p),
    acomodacao: p.acomodacao || '',
    elegibilidade: eleg.texto,
    elegibilidadeLinhas: eleg.linhas,
    contribuicao,
    coparticipacao: copartText,
    temCoparticipacao: p.coparticipacao.possui || !!copartGlobal.trim(),
    vidas: vidasPlano(p, beneficiarios),
    tipoCusto: p.tipoCusto,
    premioPerCapita: p.tipoCusto === 'per_capita' ? formatBRLInput(p.custoPerCapitaBRL) : null,
    faixas: p.tipoCusto === 'faixa_etaria' ? buildFaixas(p) : [],
    faturaEstimada: faturaCents != null ? formatCentsToBRL(faturaCents) : '—',
    tabColor,
  }
}

function buildColunasFromBeneficiarios(beneficiarios: PlacementBeneficiario[]): ContratoPlanoColuna[] {
  const map = new Map<
    string,
    {
      operadora: string
      plano: string
      cargos: Map<string, number>
      vidas: number
      premioSum: number
      premioCount: number
    }
  >()

  for (const b of beneficiarios) {
    if (!isAtivo(b.statusBeneficiario)) continue
    const op = String(b.operadora ?? '—').trim() || '—'
    const plano = String(b.planoAtual ?? '—').trim() || '—'
    const key = `${op}|${plano}`
    const cur = map.get(key) ?? {
      operadora: op,
      plano,
      cargos: new Map(),
      vidas: 0,
      premioSum: 0,
      premioCount: 0,
    }
    cur.vidas += 1
    const cargo = String(b.cargo ?? '').trim()
    if (cargo) cur.cargos.set(cargo, (cur.cargos.get(cargo) ?? 0) + 1)
    const cents = parseBRLToCents(String(b.custoPerCapita ?? ''))
    if (cents != null) {
      cur.premioSum += cents
      cur.premioCount += 1
    }
    map.set(key, cur)
  }

  return [...map.values()]
    .sort((a, b) => b.vidas - a.vidas)
    .map((g, i) => {
      const linhas = [...g.cargos.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
      const premioCents = g.premioCount > 0 ? Math.round(g.premioSum / g.premioCount) : null
      const faturaCents = premioCents != null ? premioCents * g.vidas : null
      return {
        id: `ben-${i}`,
        operadoraId: '',
        operadora: g.operadora.toUpperCase(),
        produto: 'Base importada',
        planoLabel: g.plano,
        acomodacao: '',
        elegibilidade: linhas.join(' · ') || '—',
        elegibilidadeLinhas: linhas,
        contribuicao: '—',
        coparticipacao: '—',
        temCoparticipacao: false,
        vidas: g.vidas,
        tipoCusto: 'per_capita' as const,
        premioPerCapita: premioCents != null ? formatCentsToBRL(premioCents) : null,
        faixas: [],
        faturaEstimada: faturaCents != null ? formatCentsToBRL(faturaCents) : '—',
        tabColor: TAB_COLORS[i % TAB_COLORS.length],
      }
    })
}

function paginateColunas(
  colunas: ContratoPlanoColuna[],
  planosPorPagina: number = PLANOS_POR_PAGINA
): ContratoPlanoColuna[][] {
  if (!colunas.length) return [[]]
  const perPage = Math.max(1, Math.min(CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE, planosPorPagina))
  const pages: ContratoPlanoColuna[][] = []
  for (let i = 0; i < colunas.length; i += perPage) {
    pages.push(colunas.slice(i, i + perPage))
  }
  return pages
}

export function contratoPageFromColunas(
  cols: ContratoPlanoColuna[],
  pageIndex: number,
  totalPages: number,
  grupoLabel?: string
): ContratoAtualPagina {
  const contribs = uniq(cols.map((c) => c.contribuicao))
  const coparts = uniq(cols.map((c) => c.coparticipacao))
  let pv = 0
  let pf = 0
  let af = false
  for (const c of cols) {
    pv += c.vidas
    const f = parseBRLToCents(c.faturaEstimada)
    if (f != null) {
      pf += f
      af = true
    }
  }
  return {
    pageIndex,
    totalPages,
    colunas: cols,
    contribuicaoUnica: contribs.length === 1 ? contribs[0] : null,
    coparticipacaoUnica: coparts.length === 1 ? coparts[0] : null,
    totalVidas: pv,
    totalFatura: af ? formatCentsToBRL(pf) : '—',
    grupoLabel,
  }
}

/** Repagina colunas já montadas (troca de layout no dashboard). */
export function buildContratoAtualPages(
  colunas: ContratoPlanoColuna[],
  planosPorPagina: number = PLANOS_POR_PAGINA
): ContratoAtualPagina[] {
  const pageChunks = paginateColunas(colunas, planosPorPagina)
  return pageChunks.map((cols, pageIndex) =>
    contratoPageFromColunas(cols, pageIndex, pageChunks.length)
  )
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function computeContratoAtualResumo(
  cotacaoRaw: Record<string, unknown>,
  beneficiarios: PlacementBeneficiario[],
  operadoraNomeById: Map<string, string>
): ContratoAtualResumo {
  const itens = parseItensFromApi(cotacaoRaw.itensMapeamento)
  const bundle = parsePlanosBundleFromApi(cotacaoRaw.planosCobertura, cotacaoRaw)
  const contribuicao = formatContribuicaoResumo(bundle.dadosFinanceiros)
  const copartGlobal = bundle.coparticipacaoDetalhePorPlanos

  let colunas = bundle.planos
    .filter(
      (p) =>
        p.nomePlano.trim() ||
        p.numeroVidas.trim() ||
        p.custoPerCapitaBRL.trim() ||
        p.tipoCusto === 'faixa_etaria'
    )
    .map((p, i) =>
      buildContratoPlanoColuna(
        p,
        itens,
        operadoraNomeById,
        beneficiarios,
        contribuicao,
        copartGlobal,
        TAB_COLORS[i % TAB_COLORS.length]
      )
    )

  if (colunas.length === 0) {
    colunas = buildColunasFromBeneficiarios(beneficiarios).map((c) => ({
      ...c,
      contribuicao: contribuicao !== '—' ? contribuicao : c.contribuicao,
      coparticipacao: copartGlobal || c.coparticipacao,
      temCoparticipacao: !!copartGlobal.trim(),
    }))
  }

  const totalVidas = colunas.reduce((s, c) => s + c.vidas, 0)
  let totalFaturaCents = 0
  let anyFatura = false
  for (const c of colunas) {
    const f = parseBRLToCents(c.faturaEstimada)
    if (f != null) {
      totalFaturaCents += f
      anyFatura = true
    }
  }
  const totalFatura = anyFatura ? formatCentsToBRL(totalFaturaCents) : '—'

  const pages = buildContratoAtualPages(colunas)

  return { allColunas: colunas, pages, totalVidas, totalFatura }
}
