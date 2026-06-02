import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isItemPendente } from '../types/dashboardIndicators'

export type HomePanoramaPage =
  | 'demandas'
  | 'atendimentos'
  | 'validacoes'
  | 'manutencoes'
  | 'reajustes'
  | 'analytics'

export const HOME_OPEN_QUERY = 'emAberto'
export const HOME_MY_QUEUE_QUERY = 'minhaFila'

/** URL da lista com filtros da Home: só em aberto + minha fila (mesmo critério de "Prioridades na sua fila"). */
export function homePanoramaListPath(basePath: string): string {
  const sep = basePath.includes('?') ? '&' : '?'
  return `${basePath}${sep}${HOME_OPEN_QUERY}=1&${HOME_MY_QUEUE_QUERY}=1`
}

export function filterEmAbertoForPage<T>(page: HomePanoramaPage, items: T[]): T[] {
  return items.filter((item) => isItemPendente(page, item as Record<string, unknown>))
}

/**
 * Lê ?emAberto=1&minhaFila=1 (atalho do Panorama operacional) e aplica filtro de pendências.
 */
export function useHomePanoramaListFilters<T>(
  page: HomePanoramaPage,
  items: T[],
  setShowOnlyMine: (value: boolean) => void
) {
  const [searchParams] = useSearchParams()
  const emAbertoOnly = searchParams.get(HOME_OPEN_QUERY) === '1'
  const minhaFilaOnly = searchParams.get(HOME_MY_QUEUE_QUERY) === '1'

  useEffect(() => {
    if (minhaFilaOnly) setShowOnlyMine(true)
  }, [minhaFilaOnly, setShowOnlyMine])

  // Após efeitos de preferência (localStorage) no mount, reforça "minha fila" vinda da Home
  useEffect(() => {
    if (!minhaFilaOnly) return
    const timer = window.setTimeout(() => setShowOnlyMine(true), 0)
    return () => window.clearTimeout(timer)
  }, [minhaFilaOnly, setShowOnlyMine])

  const itemsForGrid = useMemo(() => {
    if (!emAbertoOnly) return items
    return filterEmAbertoForPage(page, items)
  }, [emAbertoOnly, items, page])

  return { emAbertoOnly, minhaFilaOnly, itemsForGrid }
}
