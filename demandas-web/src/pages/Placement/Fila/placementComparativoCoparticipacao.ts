import type { CotacaoFormState } from './CotacaoFormFields'
import {
  cloneCoparticipacao,
  COPART_PROCEDIMENTOS,
  emptyCoparticipacao,
  formatCopartInternacaoCelula,
  formatCopartProcedimentoCelula,
  labelFormaCobrancaCopart,
  type CoparticipacaoForm,
  type CopartProcedimentoKey,
} from './placementCoparticipacao'
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

export type ComparativoCopartColuna = {
  id: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  produto: string
  planoLabel: string
  acomodacao: string
  tabColor: string
  copart: CoparticipacaoForm
  planoReferenciaId?: string
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
  /** Slot vazio (operadora oculta ou sem oferta neste plano equivalente). */
  placeholder?: boolean
}

export type ComparativoCopartLinha = {
  id: string
  label: string
  tipo: 'selo' | 'forma' | 'procedimento' | 'internacao'
  procedimentoKey?: CopartProcedimentoKey
}

export type ComparativoCoparticipacaoPagina = {
  pageIndex: number
  totalPages: number
  /** Plano de referência desta seção (equivalência). */
  grupoLabel?: string
  colunas: ComparativoCopartColuna[]
  linhas: ComparativoCopartLinha[]
}

export const COMPARATIVO_COPART_LINHAS: ComparativoCopartLinha[] = [
  { id: 'possui', label: 'Possui coparticipação', tipo: 'selo' },
  { id: 'forma', label: 'Forma de cobrança', tipo: 'forma' },
  ...COPART_PROCEDIMENTOS.map((p) => ({
    id: `proc-${p.key}`,
    label: p.label,
    tipo: 'procedimento' as const,
    procedimentoKey: p.key,
  })),
  { id: 'internacao', label: 'Internação', tipo: 'internacao' },
]

type CopartOperadoraSlot = {
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

function resolveCopartForm(entrada: PropostaColunaEntrada, form: CotacaoFormState): CoparticipacaoForm {
  const det = entrada.plano.coparticipacaoDetalhe
  const temDetalhePreenchido =
    det.possui ||
    COPART_PROCEDIMENTOS.some(
      (p) => det.linhas[p.key].valor.trim() || det.linhas[p.key].limitador.trim()
    ) ||
    det.internacao.valor.trim() ||
    det.internacao.limitador.trim()

  if (temDetalhePreenchido || (entrada.plano.coparticipacao === 'Sim' && det.possui)) {
    return cloneCoparticipacao(det.possui ? det : { ...det, possui: true })
  }

  if (entrada.grupo === 'atual') {
    const abertura = findPlanoAbertura(form, entrada.planoReferenciaId, entrada.plano.id)
    if (abertura) return cloneCoparticipacao(abertura.coparticipacao)
  }

  if (entrada.plano.coparticipacao === 'Sim') {
    return { ...emptyCoparticipacao(), possui: true }
  }

  return emptyCoparticipacao()
}

function colunaFromEntrada(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState,
  referencias: PlanoReferenciaAbertura[],
  tabColor: string
): ComparativoCopartColuna {
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

  return {
    id: comparativoColunaId(entrada.cenarioId, entrada.plano.id),
    grupo: entrada.grupo,
    operadora: entrada.fornecedorNome.toUpperCase(),
    operadoraId: entrada.operadoraId,
    produto: tituloCenario || (entrada.grupo === 'atual' ? 'Cenário atual' : 'Proposta'),
    planoLabel,
    acomodacao: entrada.plano.acomodacao.trim(),
    tabColor,
    copart: resolveCopartForm(entrada, form),
    planoReferenciaId: entrada.planoReferenciaId,
    cenarioId: entrada.cenarioId,
    cenarioTitulo: entrada.cenarioTitulo,
    cenarioOrdem: entrada.cenarioOrdem,
  }
}

function buildCopartOperadoraSlots(colunas: ComparativoCopartColuna[]): CopartOperadoraSlot[] {
  const map = new Map<string, CopartOperadoraSlot>()
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

function placeholderCopartColuna(slot: CopartOperadoraSlot): ComparativoCopartColuna {
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
    copart: emptyCoparticipacao(),
    cenarioId: slot.cenarioId,
    cenarioTitulo: slot.cenarioTitulo,
    cenarioOrdem: slot.cenarioOrdem,
    placeholder: true,
  }
}

export function buildComparativoCoparticipacaoColunas(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoCopartColuna[] {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  const entradas = ordenarEntradasPorEquivalencia(
    coletarEntradasComparativo(form, operadoras, operadorasById, incluirAtual),
    referencias
  )
  return entradas.map((e, i) =>
    colunaFromEntrada(e, form, referencias, TAB_COLORS[i % TAB_COLORS.length])
  )
}

export function valorCopartLinha(col: ComparativoCopartColuna, linha: ComparativoCopartLinha): string {
  if (col.placeholder) return '—'
  const { copart } = col
  if (linha.tipo === 'selo') {
    return copart.possui ? 'Sim' : 'Não'
  }
  if (linha.tipo === 'forma') {
    return copart.possui ? labelFormaCobrancaCopart(copart.formaCobranca) : '—'
  }
  if (linha.tipo === 'procedimento' && linha.procedimentoKey) {
    return formatCopartProcedimentoCelula(copart, linha.procedimentoKey)
  }
  if (linha.tipo === 'internacao') {
    return formatCopartInternacaoCelula(copart)
  }
  return '—'
}

/**
 * Uma página por plano equivalente; colunas alinhadas por operadora/cenário.
 * Ocultar operadora remove o slot dela, mas os demais permanecem no mesmo plano (≈ TNP4, etc.).
 * Oferta ausente em um plano vira placeholder (não “sobe” coluna de outro plano).
 */
export function buildComparativoCoparticipacaoPagesAlinhadas(
  colunasTodas: ComparativoCopartColuna[],
  colunasOcultas: string[] | undefined,
  referencias: PlanoReferenciaAbertura[]
): ComparativoCoparticipacaoPagina[] {
  if (!colunasTodas.length) return []

  const ocultas = colunasOcultasSet(colunasOcultas)
  const colunasVisiveis = colunasTodas.filter((c) => !ocultas.has(c.id))
  if (!colunasVisiveis.length) return []

  const slots = buildCopartOperadoraSlots(colunasVisiveis)

  const byRef = new Map<string, ComparativoCopartColuna[]>()
  for (const c of colunasVisiveis) {
    const key = c.planoReferenciaId?.trim() || c.id
    const list = byRef.get(key) ?? []
    list.push(c)
    byRef.set(key, list)
  }

  const groups: { label: string; cols: ComparativoCopartColuna[] }[] = []
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

  const pages: ComparativoCoparticipacaoPagina[] = []
  for (const g of groups) {
    const byKey = new Map<string, ComparativoCopartColuna>()
    for (const col of g.cols) {
      byKey.set(colunaSlotKey(col), col)
    }
    const alinhadas = slots.map((slot) => byKey.get(slot.key) ?? placeholderCopartColuna(slot))
    if (!alinhadas.some((c) => !c.placeholder)) continue
    pages.push({
      pageIndex: 0,
      totalPages: 1,
      grupoLabel: g.label,
      colunas: alinhadas,
      linhas: COMPARATIVO_COPART_LINHAS,
    })
  }

  return pages.map((p, i) => ({ ...p, pageIndex: i, totalPages: pages.length }))
}

/** @deprecated Use buildComparativoCoparticipacaoPagesAlinhadas. */
export function buildComparativoCoparticipacaoPages(
  colunas: ComparativoCopartColuna[],
  colunasPorSlide: number
): ComparativoCoparticipacaoPagina[] {
  if (!colunas.length) return []
  const chunk = Math.max(1, colunasPorSlide)
  const totalPages = Math.ceil(colunas.length / chunk)
  const pages: ComparativoCoparticipacaoPagina[] = []
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      pageIndex: i,
      totalPages,
      colunas: colunas.slice(i * chunk, i * chunk + chunk),
      linhas: COMPARATIVO_COPART_LINHAS,
    })
  }
  return pages
}
