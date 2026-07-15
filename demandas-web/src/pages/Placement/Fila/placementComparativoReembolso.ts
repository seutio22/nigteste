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
  } else if (entrada.grupo === 'mercado' && refLabel !== '—') {
    planoLabel = `${entrada.plano.nomePlano.trim() || 'Proposta'} (≈ ${refLabel})`
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

function buildLinhasForPage(colunas: ComparativoReembColuna[]): ComparativoReembLinha[] {
  const customKeys = new Map<string, string>()
  for (const col of colunas) {
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
