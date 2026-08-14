import type { ContratoAtualResumo } from './placementContratoAtual'
import { contratoPageFromColunas } from './placementContratoAtual'
import type { ComparativoColunaEstudo } from './placementComparativoEstudo'
import type { ComparativoLinhaChave } from './placementComparativoConfig'
export type { ComparativoLinhaChave, ComparativoVisualizacao } from './placementComparativoConfig'
export {
  COMPARATIVO_LINHA_CHAVES,
  COMPARATIVO_LINHA_HINTS,
  COMPARATIVO_LINHA_LABELS,
} from './placementComparativoConfig'

export function colunasOcultasSet(ids: string[] | undefined): Set<string> {
  return new Set((ids ?? []).map((id) => String(id).trim()).filter(Boolean))
}

export function linhasOcultasSet(ids: ComparativoLinhaChave[] | undefined): Set<ComparativoLinhaChave> {
  return new Set(ids ?? [])
}

export function filterComparativoColunas<T extends { id: string; grupo?: string }>(
  colunas: T[],
  colunasOcultas: string[] | undefined
): T[] {
  const ocultas = colunasOcultasSet(colunasOcultas)
  if (!ocultas.size) return colunas
  return colunas.filter((c) => c.grupo === 'atual' || !ocultas.has(c.id))
}

/**
 * Filtra colunas ocultas e remonta as páginas por plano de equivalência.
 * Evita o bug de «ativar mais itens do mercado» e o ATUAL sumir (ficava preso numa página filtrada).
 */
export function filterContratoResumoPorVisibilidade(
  resumo: ContratoAtualResumo,
  colunasOcultas: string[] | undefined
): ContratoAtualResumo {
  const ocultas = colunasOcultasSet(colunasOcultas)
  if (!ocultas.size) return resumo

  // Contrato atual nunca some por filtro de visibilidade (referência do comparativo).
  const allColunas = resumo.allColunas.filter(
    (c) => c.grupo === 'atual' || !ocultas.has(c.id)
  )
  if (!allColunas.length) return resumo

  const byRef = new Map<string, typeof allColunas>()
  for (const c of allColunas) {
    const key = c.planoReferenciaId?.trim() || c.id
    const list = byRef.get(key) ?? []
    list.push(c)
    byRef.set(key, list)
  }

  const orderedKeys: string[] = []
  const seen = new Set<string>()
  for (const page of resumo.pages) {
    for (const c of page.colunas) {
      const key = c.planoReferenciaId?.trim() || c.id
      if (byRef.has(key) && !seen.has(key)) {
        orderedKeys.push(key)
        seen.add(key)
      }
    }
  }
  for (const key of byRef.keys()) {
    if (!seen.has(key)) orderedKeys.push(key)
  }

  const groups = orderedKeys
    .map((key) => ({
      key,
      cols: byRef.get(key)!,
      label:
        resumo.pages.find((p) =>
          p.colunas.some((c) => (c.planoReferenciaId?.trim() || c.id) === key)
        )?.grupoLabel || byRef.get(key)?.[0]?.planoLabel,
    }))
    .filter((g) => g.cols.length > 0)

  const total = groups.length
  const pages = groups.map((g, pageIndex) =>
    contratoPageFromColunas(g.cols, pageIndex, total, g.label || undefined)
  )

  const totalVidas = allColunas.reduce((s, c) => s + (c.vidas || 0), 0)

  return {
    ...resumo,
    allColunas,
    pages,
    totalVidas,
  }
}

export type ColunaVisibilidadeItem = {
  id: string
  label: string
  grupo: string
  operadora: string
  planoLabel: string
}

export function listarColunasComparativo(
  colunas: ComparativoColunaEstudo[]
): ColunaVisibilidadeItem[] {
  return colunas.map((c) => ({
    id: c.id,
    label: `${c.operadora} · ${c.planoLabel}`,
    grupo: c.grupo === 'atual' ? 'Contrato atual' : 'Mercado consultado',
    operadora: c.operadora,
    planoLabel: c.planoLabel,
  }))
}

/** Lista colunas do modo contrato_plano (mesmos IDs usados no filtro de visibilidade). */
export function listarColunasContratoPlano(
  colunas: { id: string; operadora: string; planoLabel: string; grupo?: 'atual' | 'mercado' }[]
): ColunaVisibilidadeItem[] {
  return colunas.map((c) => ({
    id: c.id,
    label: `${c.operadora} · ${c.planoLabel}`,
    grupo: c.grupo === 'atual' ? 'Contrato atual' : 'Mercado consultado',
    operadora: c.operadora,
    planoLabel: c.planoLabel,
  }))
}
