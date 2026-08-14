import type { CotacaoFormState } from './CotacaoFormFields'
import {
  cloneReembolsoPlanoDetalhe,
  emptyReembolsoPlanoDetalhe,
  formatReembolsoPrazoDias,
  formatReembolsoProcedimentoCelula,
  REEMBOLSO_PROCEDIMENTOS_FIXOS,
  reembolsoDetalheFromAbertura,
  temReembolsoDetalhePreenchido,
  type ReembolsoPlanoDetalhe,
  type ReembolsoProcedimentoFixoKey,
} from './placementReembolso'
import {
  formatReembolsoConsultaValor,
  parseReembolsoPropostaFields,
  resolveReembolsoConsultaComparativo,
} from './placementReembolsoConsulta'
import {
  coletarEntradasComparativo,
  comparativoColunaId,
  ordenarEntradasPorEquivalencia,
  type PropostaColunaEntrada,
} from './placementPropostaComparativo'
import {
  labelPlanoReferencia,
  planosReferenciaAbertura,
  type PlanoReferenciaAbertura,
} from './placementPropostaEquivalencia'
import type { Operadora } from '../../../types/masterData'
import { TAB_COLORS } from './placementContratoAtual'
import { colunaSlotKey } from './placementComparativoEstudo'
import { colunasOcultasSet } from './placementComparativoVisibilidade'
import { parseBRLToCents } from './utils'

export type ComparacaoReembolsoVsAtual = 'acima' | 'abaixo' | 'igual'

export type ComparativoReembColuna = {
  id: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  produto: string
  planoLabel: string
  acomodacao: string
  tabColor: string
  detalhe: ReembolsoPlanoDetalhe
  reembolso: string
  reembolsoConsulta: string
  temReembolso: boolean
  planoReferenciaId?: string
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
  /** Slot vazio (sem oferta neste plano equivalente). */
  placeholder?: boolean
}

export type ComparativoReembLinha = {
  id: string
  label: string
  tipo: 'selo' | 'prazo_consulta' | 'prazo_procedimentos' | 'procedimento' | 'custom'
  procedimentoKey?: ReembolsoProcedimentoFixoKey | string
}

export type ComparativoReembolsoPagina = {
  pageIndex: number
  totalPages: number
  /** Plano de referência desta seção (equivalência). */
  grupoLabel?: string
  colunas: ComparativoReembColuna[]
  linhas: ComparativoReembLinha[]
}

export const COMPARATIVO_REEMB_LINHAS_FIXAS: ComparativoReembLinha[] = [
  { id: 'possui', label: 'Possui reembolso', tipo: 'selo' },
  { id: 'prazo_consulta', label: 'Prazo reembolso consulta', tipo: 'prazo_consulta' },
  { id: 'prazo_procedimentos', label: 'Prazo reembolso procedimentos', tipo: 'prazo_procedimentos' },
  ...REEMBOLSO_PROCEDIMENTOS_FIXOS.map((p) => ({
    id: `proc-${p.key}`,
    label: p.label,
    tipo: 'procedimento' as const,
    procedimentoKey: p.key,
  })),
]

type ReembOperadoraSlot = {
  key: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
}

function findPlanoAbertura(form: CotacaoFormState, refId: string, planoId: string) {
  const id = refId || planoId
  return (form.planos ?? []).find((p) => p.id === id)
}

function resolveReembolsoColuna(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState
): Pick<ComparativoReembColuna, 'detalhe' | 'reembolso' | 'reembolsoConsulta' | 'temReembolso'> {
  const parsed = parseReembolsoPropostaFields(entrada.plano.reembolso, entrada.plano.reembolsoConsulta)
  let det = cloneReembolsoPlanoDetalhe(entrada.plano.reembolsoDetalhe ?? emptyReembolsoPlanoDetalhe())

  if (
    temReembolsoDetalhePreenchido(det, parsed.reembolso, parsed.reembolsoConsulta) ||
    parsed.reembolso === 'Sim'
  ) {
    if (parsed.reembolsoConsulta.trim() && !det.valores.consultas?.trim()) {
      det = {
        ...det,
        valores: { ...det.valores, consultas: parsed.reembolsoConsulta.trim() },
      }
    }
    const resolved = resolveReembolsoConsultaComparativo(parsed.reembolso || 'Sim', parsed.reembolsoConsulta)
    return {
      detalhe: det,
      reembolso: resolved.flag === '—' ? 'Sim' : resolved.flag,
      reembolsoConsulta: parsed.reembolsoConsulta,
      temReembolso: true,
    }
  }

  if (entrada.grupo === 'atual') {
    const abertura = findPlanoAbertura(form, entrada.planoReferenciaId, entrada.plano.id)
    const planoId = abertura?.id ?? entrada.planoReferenciaId
    if (planoId && form.reembolsoPorPlano) {
      det = reembolsoDetalheFromAbertura(planoId, form.reembolsoPorPlano)
      if (temReembolsoDetalhePreenchido(det)) {
        const consulta = det.valores.consultas?.trim() ?? ''
        return {
          detalhe: det,
          reembolso: 'Sim',
          reembolsoConsulta: consulta,
          temReembolso: true,
        }
      }
    }
  }

  const resolved = resolveReembolsoConsultaComparativo(parsed.reembolso, parsed.reembolsoConsulta)
  return {
    detalhe: det,
    reembolso: resolved.flag,
    reembolsoConsulta: parsed.reembolsoConsulta,
    temReembolso: resolved.temReembolso,
  }
}

function colunaFromEntrada(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState,
  referencias: PlanoReferenciaAbertura[],
  tabColor: string
): ComparativoReembColuna {
  const refLabel = labelPlanoReferencia(entrada.planoReferenciaId, referencias)
  const tituloCenario = entrada.cenarioTitulo.trim()
  let planoLabel = entrada.plano.nomePlano.trim() || refLabel || 'Plano'

  if (tituloCenario && entrada.grupo === 'atual') {
    planoLabel = `${refLabel !== '—' ? refLabel : planoLabel} · ${tituloCenario}`
  } else if (entrada.grupo === 'mercado') {
    const nomeOferta = entrada.plano.nomePlano.trim() || 'Proposta'
    if (tituloCenario) {
      planoLabel =
        refLabel !== '—'
          ? `${nomeOferta} · ${tituloCenario} (≈ ${refLabel})`
          : `${nomeOferta} · ${tituloCenario}`
    } else if (refLabel !== '—') {
      planoLabel = `${nomeOferta} (≈ ${refLabel})`
    } else {
      planoLabel = nomeOferta
    }
  }

  const reemb = resolveReembolsoColuna(entrada, form)

  return {
    id: comparativoColunaId(entrada.cenarioId, entrada.plano.id),
    grupo: entrada.grupo,
    operadora: entrada.fornecedorNome.toUpperCase(),
    operadoraId: entrada.operadoraId,
    produto: tituloCenario || (entrada.grupo === 'atual' ? 'Cenário atual' : 'Proposta'),
    planoLabel,
    acomodacao: entrada.plano.acomodacao.trim(),
    tabColor,
    ...reemb,
    planoReferenciaId: entrada.planoReferenciaId,
    cenarioId: entrada.cenarioId,
    cenarioTitulo: entrada.cenarioTitulo,
    cenarioOrdem: entrada.cenarioOrdem,
  }
}

function buildReembOperadoraSlots(colunas: ComparativoReembColuna[]): ReembOperadoraSlot[] {
  const map = new Map<string, ReembOperadoraSlot>()
  for (const col of colunas) {
    const key = colunaSlotKey(col)
    if (!map.has(key)) {
      map.set(key, {
        key,
        grupo: col.grupo,
        operadora: col.operadora,
        operadoraId: col.operadoraId,
        cenarioId: col.cenarioId,
        cenarioTitulo: col.cenarioTitulo,
        cenarioOrdem: col.cenarioOrdem,
      })
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.grupo !== b.grupo) return a.grupo === 'atual' ? -1 : 1
    const op = a.operadora.localeCompare(b.operadora, 'pt-BR')
    if (op !== 0) return op
    return (a.cenarioOrdem ?? 0) - (b.cenarioOrdem ?? 0)
  })
}

function placeholderReembColuna(slot: ReembOperadoraSlot): ComparativoReembColuna {
  const titulo = slot.cenarioTitulo?.trim()
  return {
    id: `empty-${slot.key}`,
    grupo: slot.grupo,
    operadora: slot.operadora,
    operadoraId: slot.operadoraId,
    produto: titulo || '—',
    planoLabel: '—',
    acomodacao: '',
    tabColor: '#bdbdbd',
    detalhe: emptyReembolsoPlanoDetalhe(),
    reembolso: '—',
    reembolsoConsulta: '',
    temReembolso: false,
    cenarioId: slot.cenarioId,
    cenarioTitulo: slot.cenarioTitulo,
    cenarioOrdem: slot.cenarioOrdem,
    placeholder: true,
  }
}

export function buildComparativoReembolsoColunas(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoReembColuna[] {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  const entradas = ordenarEntradasPorEquivalencia(
    coletarEntradasComparativo(form, operadoras, operadorasById, incluirAtual),
    referencias
  )
  return entradas.map((e, i) =>
    colunaFromEntrada(e, form, referencias, TAB_COLORS[i % TAB_COLORS.length])
  )
}

function consultasDisplay(col: ComparativoReembColuna): string {
  const fromDet = formatReembolsoProcedimentoCelula(col.detalhe, 'consultas')
  if (fromDet !== '—') return fromDet
  if (col.temReembolso && col.reembolsoConsulta.trim()) {
    return formatReembolsoConsultaValor(col.reembolsoConsulta)
  }
  return '—'
}

export function valorReembolsoLinha(col: ComparativoReembColuna, linha: ComparativoReembLinha): string {
  if (col.placeholder) return '—'
  if (linha.tipo === 'selo') {
    return col.temReembolso ? 'Sim' : col.reembolso === 'Não' ? 'Não' : '—'
  }
  if (linha.tipo === 'prazo_consulta') {
    return col.temReembolso ? formatReembolsoPrazoDias(col.detalhe.consultaDias) : '—'
  }
  if (linha.tipo === 'prazo_procedimentos') {
    return col.temReembolso ? formatReembolsoPrazoDias(col.detalhe.procedimentosDias) : '—'
  }
  if (linha.tipo === 'procedimento' && linha.procedimentoKey) {
    if (linha.procedimentoKey === 'consultas') return consultasDisplay(col)
    return col.temReembolso
      ? formatReembolsoProcedimentoCelula(col.detalhe, linha.procedimentoKey)
      : '—'
  }
  if (linha.tipo === 'custom' && linha.procedimentoKey) {
    return col.temReembolso
      ? formatReembolsoProcedimentoCelula(col.detalhe, linha.procedimentoKey)
      : '—'
  }
  return '—'
}

/** Linhas com valor monetário de reembolso (comparáveis ao cenário atual). */
export function linhaReembolsoComparavel(linha: ComparativoReembLinha): boolean {
  return linha.tipo === 'procedimento' || linha.tipo === 'custom'
}

/** Extrai valor numérico (centavos) de texto exibido ou bruto (R$ 350,00 / 350,00). */
export function parseReembolsoValorNumerico(texto: string): number | null {
  const t = String(texto ?? '').trim()
  if (!t || t === '—') return null
  return parseBRLToCents(t)
}

/**
 * Compara valor de reembolso do mercado com o cenário atual.
 * Maior = melhor (acima), menor = abaixo, igual = igual.
 */
export function compararValorReembolsoVsAtual(
  valorMercado: string,
  valorAtual: string
): ComparacaoReembolsoVsAtual | null {
  const atual = parseReembolsoValorNumerico(valorAtual)
  const mercado = parseReembolsoValorNumerico(valorMercado)
  if (atual == null || mercado == null) return null
  if (mercado > atual) return 'acima'
  if (mercado < atual) return 'abaixo'
  return 'igual'
}

export function comparacaoReembolsoCelula(
  col: ComparativoReembColuna,
  linha: ComparativoReembLinha,
  colAtual: ComparativoReembColuna | undefined
): ComparacaoReembolsoVsAtual | null {
  if (!colAtual || col.placeholder || colAtual.placeholder) return null
  if (col.grupo === 'atual' || col.id === colAtual.id) return null
  if (!linhaReembolsoComparavel(linha)) return null
  return compararValorReembolsoVsAtual(
    valorReembolsoLinha(col, linha),
    valorReembolsoLinha(colAtual, linha)
  )
}

function buildLinhasForPage(colunas: ComparativoReembColuna[]): ComparativoReembLinha[] {
  const customKeys = new Map<string, string>()
  for (const col of colunas) {
    if (col.placeholder) continue
    for (const c of col.detalhe.procedimentosCustomizados) {
      if (c.nome.trim() || col.detalhe.valores[c.id]?.trim()) {
        customKeys.set(c.id, c.nome.trim() || 'Outros')
      }
    }
  }
  const customLinhas: ComparativoReembLinha[] = [...customKeys.entries()].map(([id, nome]) => ({
    id: `custom-${id}`,
    label: nome.toUpperCase(),
    tipo: 'custom',
    procedimentoKey: id,
  }))
  return [...COMPARATIVO_REEMB_LINHAS_FIXAS, ...customLinhas]
}

/**
 * Uma página por plano equivalente; colunas alinhadas por operadora/cenário.
 */
export function buildComparativoReembolsoPagesAlinhadas(
  colunasTodas: ComparativoReembColuna[],
  colunasOcultas: string[] | undefined,
  referencias: PlanoReferenciaAbertura[]
): ComparativoReembolsoPagina[] {
  if (!colunasTodas.length) return []

  const ocultas = colunasOcultasSet(colunasOcultas)
  const colunasVisiveis = colunasTodas.filter((c) => !ocultas.has(c.id))
  if (!colunasVisiveis.length) return []

  const slots = buildReembOperadoraSlots(colunasVisiveis)

  const byRef = new Map<string, ComparativoReembColuna[]>()
  for (const c of colunasVisiveis) {
    const key = c.planoReferenciaId?.trim() || c.id
    const list = byRef.get(key) ?? []
    list.push(c)
    byRef.set(key, list)
  }

  const groups: { label: string; cols: ComparativoReembColuna[] }[] = []
  const seen = new Set<string>()

  for (const ref of referencias) {
    const cols = byRef.get(ref.id)
    if (!cols?.length) continue
    groups.push({ label: ref.label, cols })
    seen.add(ref.id)
  }
  for (const [key, cols] of byRef) {
    if (seen.has(key)) continue
    groups.push({ label: cols[0]?.planoLabel || 'Outros planos', cols })
  }

  const pages: ComparativoReembolsoPagina[] = []
  for (const g of groups) {
    const byKey = new Map<string, ComparativoReembColuna>()
    for (const col of g.cols) {
      byKey.set(colunaSlotKey(col), col)
    }
    const alinhadas = slots.map((slot) => byKey.get(slot.key) ?? placeholderReembColuna(slot))
    if (!alinhadas.some((c) => !c.placeholder)) continue
    pages.push({
      pageIndex: 0,
      totalPages: 1,
      grupoLabel: g.label,
      colunas: alinhadas,
      linhas: buildLinhasForPage(alinhadas),
    })
  }

  return pages.map((p, i) => ({ ...p, pageIndex: i, totalPages: pages.length }))
}

/** @deprecated Use buildComparativoReembolsoPagesAlinhadas. */
export function buildComparativoReembolsoPages(
  colunas: ComparativoReembColuna[],
  colunasPorSlide: number
): ComparativoReembolsoPagina[] {
  if (!colunas.length) return []
  const chunk = Math.max(1, colunasPorSlide)
  const totalPages = Math.ceil(colunas.length / chunk)
  const pages: ComparativoReembolsoPagina[] = []
  for (let i = 0; i < totalPages; i++) {
    const slice = colunas.slice(i * chunk, i * chunk + chunk)
    pages.push({
      pageIndex: i,
      totalPages,
      colunas: slice,
      linhas: buildLinhasForPage(slice),
    })
  }
  return pages
}
