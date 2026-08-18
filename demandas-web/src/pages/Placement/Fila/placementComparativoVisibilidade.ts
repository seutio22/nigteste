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

  const keep = (c: { id: string; grupo?: string }) => c.grupo === 'atual' || !ocultas.has(c.id)

  // Contrato atual nunca some por filtro de visibilidade (referência do comparativo).
  const allColunas = resumo.allColunas.filter(keep)
  if (!allColunas.length) return resumo

  // Não remonta blocos por id solto: isso troca TNP4 por S2500 e some com o ATUAL.
  const pages = resumo.pages
    .map((p, pageIndex) => {
      const cols = p.colunas.filter(keep)
      if (!cols.length) return null
      return {
        ...contratoPageFromColunas(cols, pageIndex, resumo.pages.length, p.grupoLabel),
        grupoLabel: p.grupoLabel,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p, pageIndex, arr) => ({ ...p, pageIndex, totalPages: arr.length }))

  const totalVidas = allColunas.reduce((s, c) => s + (c.vidas || 0), 0)

  return {
    ...resumo,
    allColunas,
    pages: pages.length ? pages : resumo.pages,
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
