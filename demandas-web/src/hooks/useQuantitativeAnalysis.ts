import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { getItemDateForPage, matchesByIdOrName, parseDateForFilter } from '../utils/dashboardFilters'

export type QuantitativeMetric = { label: string; value: number }

export type QuantitativeModule = {
  id: string
  title: string
  metrics: QuantitativeMetric[]
}

function safeSum(n: unknown): number {
  if (n == null || n === '') return 0
  const v = typeof n === 'number' ? n : Number(String(n).replace(',', '.'))
  return Number.isFinite(v) ? v : 0
}

/**
 * Qtd de usuários: API/store usam `qtdUsuarios`; dados antigos podem ter `periodicidade` ou `analiseQuantitativa` no import.
 */
function sumAnaliseQuantitativaCadastro(items: any[]): number {
  return items.reduce((s, d) => {
    const p = d?.qtdUsuarios ?? d?.periodicidade
    if (p != null && String(p).trim() !== '') {
      const n = Number(String(p).replace(',', '.'))
      return s + (Number.isFinite(n) ? n : 0)
    }
    return s + safeSum(d?.analiseQuantitativa)
  }, 0)
}

export function useQuantitativeAnalysis(filters?: {
  areaId?: string
  analistaId?: string
  fromDate?: string
  toDate?: string
  userScopePending?: boolean
}): QuantitativeModule[] {
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const reportStore = useReportStore()
  const masterDataStore = useMasterDataStore()

  return useMemo(() => {
    const f = filters

    const inRange = (iso?: string) => {
      if (!f) return true
      if (!iso) return true
      if (!f.fromDate && !f.toDate) return true
      try {
        const itemDate = parseDateForFilter(iso)
        if (!itemDate || isNaN(itemDate.getTime())) return true
        const normalizeStart = (dateStr: string) => {
          const d = parseDateForFilter(dateStr)
          if (!d) return 0
          d.setHours(0, 0, 0, 0)
          return d.getTime()
        }
        const normalizeEnd = (dateStr: string) => {
          const d = parseDateForFilter(dateStr)
          if (!d) return 0
          d.setHours(23, 59, 59, 999)
          return d.getTime()
        }
        const t = itemDate.getTime()
        if (f.fromDate && t < normalizeStart(f.fromDate)) return false
        if (f.toDate && t > normalizeEnd(f.toDate)) return false
        return true
      } catch {
        return true
      }
    }

    const apply = (items: any[], page: string) => {
      if (!f) return Array.isArray(items) ? items : []
      if (f.userScopePending) return []
      const list = Array.isArray(items) ? items : []

      const getAnalistaValue = (item: any) => {
        if (page === 'reajustes') return item.responsavelAnalista
        if (page === 'manutencoes') return item.analistaId || item.analista
        if (page === 'validacoes') {
          return (
            item.analistaId ||
            item.analistaObj?.id ||
            (typeof item.analista === 'object' ? item.analista?.id : item.analista)
          )
        }
        return item.analistaId || item.analista
      }

      return list.filter((item) => {
        if (f.areaId && (page === 'demandas' || page === 'atendimentos')) {
          const itemArea = item.areaId || item.area
          if (!matchesByIdOrName(itemArea, f.areaId, masterDataStore.areas)) return false
        }
        if (f.analistaId) {
          const av = getAnalistaValue(item)
          if (!matchesByIdOrName(av, f.analistaId, masterDataStore.analistas)) return false
        }
        const itemDate = getItemDateForPage(page, item)
        if (!itemDate || !inRange(itemDate)) return false
        return true
      })
    }

    const demandas = apply(demandStore.items, 'demandas')
    const manutencoes = apply(manutencaoStore.items, 'manutencoes')
    const validacoes = apply(validationStore.items, 'validacoes')
    const reajustes = apply(reajusteStore.items, 'reajustes')
    const analytics = apply(reportStore.items, 'analytics')

    const cadastro: QuantitativeModule = {
      id: 'cadastro',
      title: 'Cadastro',
      metrics: [
        { label: 'Qtd de usuários', value: sumAnaliseQuantitativaCadastro(demandas) },
        {
          label: 'Qtd clientes vinculados — EDGE',
          value: demandas.reduce((s, d) => s + safeSum(d.qtdClientesVinculados), 0)
        },
        {
          label: 'Usuário empresa — MOVE',
          value: demandas.reduce((s, d) => s + safeSum(d.usuariosEmpresa), 0)
        },
        { label: 'Qtde de retornos', value: demandas.reduce((s, d) => s + safeSum(d.qtdRetornos), 0) }
      ]
    }

    const manutencao: QuantitativeModule = {
      id: 'manutencao',
      title: 'Manutenção',
      metrics: [
        { label: 'Total', value: manutencoes.reduce((s, m) => s + safeSum(m.total), 0) },
        { label: 'Quantidade de retornos', value: manutencoes.reduce((s, m) => s + safeSum(m.qtdRetornos), 0) }
      ]
    }

    const validacao: QuantitativeModule = {
      id: 'validacao',
      title: 'Validação',
      metrics: [
        {
          label: 'Itens concluídos',
          value: validacoes.reduce((s, v) => s + safeSum(v.itensConcluidos), 0)
        },
        { label: 'Qtd de retornos', value: validacoes.reduce((s, v) => s + safeSum(v.qtdRetornos), 0) }
      ]
    }

    const reajuste: QuantitativeModule = {
      id: 'reajuste',
      title: 'Reajuste',
      metrics: [
        {
          label: 'Itens concluídos',
          value: reajustes.reduce((s, r) => s + safeSum(r.itensConcluidos), 0)
        }
      ]
    }

    const analyticsMod: QuantitativeModule = {
      id: 'analytics',
      title: 'Analytics',
      metrics: [
        {
          label: 'Total (quantitativo)',
          value: analytics.reduce((s, r) => s + safeSum(r.total), 0)
        }
      ]
    }

    return [cadastro, manutencao, validacao, reajuste, analyticsMod]
  }, [
    filters?.areaId,
    filters?.analistaId,
    filters?.userScopePending,
    filters?.fromDate,
    filters?.toDate,
    demandStore.items,
    manutencaoStore.items,
    validationStore.items,
    reajusteStore.items,
    reportStore.items,
    masterDataStore.areas,
    masterDataStore.analistas
  ])
}
