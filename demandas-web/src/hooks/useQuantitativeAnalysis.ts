import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { getItemDateForPage, matchesByIdOrName, parseDateForFilter } from '../utils/dashboardFilters'
import {
  inferItensConcluidosDetalhe,
  parseItensConcluidosDetalhe,
  sumItensConcluidosDetalhe,
} from '../pages/Validacao/validacaoItensConcluidos'
import { parseContratosVinculos } from '../utils/manutencaoContratos'

export type QuantitativeMetric = { label: string; value: number }

export type QuantitativeModule = {
  id: string
  title: string
  metrics: QuantitativeMetric[]
}

export function safeSum(n: unknown): number {
  if (n == null || n === '') return 0
  const v = typeof n === 'number' ? n : Number(String(n).replace(',', '.'))
  return Number.isFinite(v) ? v : 0
}

type SistemaMetricKey = 'qtdUsuarios' | 'qtdClientesVinculados'

type SistemaRef = { id: string; nome?: string }

/**
 * Soma métricas do fluxo novo (`sistemasMetrics` por sistemaId).
 * Se `sistemaNomeMatch` for informado, só conta sistemas cujo nome casa (ex.: EDGE / MOVE).
 * Sem `sistemasMetrics` (ou vazio), cai nos campos legados do chamado.
 */
export function sumDemandMetric(
  items: any[],
  metricKey: SistemaMetricKey,
  options?: {
    sistemas?: SistemaRef[]
    sistemaNomeMatch?: RegExp
    legacyField?: string
  }
): number {
  const sistemas = options?.sistemas ?? []
  const nomeMatch = options?.sistemaNomeMatch
  const legacyField = options?.legacyField

  return items.reduce((acc, d) => {
    const sm = d?.sistemasMetrics
    const hasSm =
      sm &&
      typeof sm === 'object' &&
      !Array.isArray(sm) &&
      Object.keys(sm).length > 0

    if (hasSm) {
      let local = 0
      let matchedKeys = 0
      for (const [sid, raw] of Object.entries(sm as Record<string, unknown>)) {
        if (nomeMatch) {
          const nome =
            sistemas.find((s) => String(s.id) === String(sid))?.nome ??
            (typeof (raw as any)?.sistemaNome === 'string' ? (raw as any).sistemaNome : '') ??
            ''
          if (!nomeMatch.test(String(nome))) continue
          matchedKeys += 1
        }
        const row = raw as Record<string, unknown> | null
        local += safeSum(row?.[metricKey])
      }
      // Sem match de nome (cadastro de sistemas ainda não carregou / id órfão): tenta legado.
      if (nomeMatch && matchedKeys === 0 && legacyField) {
        return acc + safeSum(d?.[legacyField])
      }
      return acc + local
    }

    if (legacyField) return acc + safeSum(d?.[legacyField])
    if (metricKey === 'qtdUsuarios') {
      return acc + safeSum(d?.qtdUsuarios ?? d?.periodicidade)
    }
    return acc + safeSum(d?.[metricKey])
  }, 0)
}

/** Total de itens concluídos (detalhe Contrato/SUB's ou campo numérico legado). */
export function sumItensConcluidosItem(item: any): number {
  const detalhe = inferItensConcluidosDetalhe(
    item?.itensConcluidos,
    item?.itensConcluidosDetalhe,
    item?.tipo
  )
  const fromDetalhe = sumItensConcluidosDetalhe(detalhe)
  if (fromDetalhe > 0) return fromDetalhe
  return safeSum(item?.itensConcluidos)
}

/** Soma só a parte Contrato (inclui legado inferido por tipo). */
export function sumItensConcluidosContratos(items: any[]): number {
  return items.reduce((acc, item) => {
    const detalhe = inferItensConcluidosDetalhe(
      item?.itensConcluidos,
      item?.itensConcluidosDetalhe,
      item?.tipo
    )
    return acc + safeSum(detalhe.contrato)
  }, 0)
}

/** Soma só a parte SUB's (inclui legado inferido por tipo). */
export function sumItensConcluidosSubs(items: any[]): number {
  return items.reduce((acc, item) => {
    const detalhe = inferItensConcluidosDetalhe(
      item?.itensConcluidos,
      item?.itensConcluidosDetalhe,
      item?.tipo
    )
    return acc + safeSum(detalhe.subs)
  }, 0)
}

/** IDs de sistema presentes em um chamado de manutenção. */
function manutencaoSistemaIds(item: any): string[] {
  const ids = item?.sistemasIds
  if (Array.isArray(ids) && ids.length) {
    return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]
  }
  if (item?.sistemaId) {
    const sid = String(item.sistemaId).trim()
    return sid ? [sid] : []
  }
  if (item?.sistemasTotais && typeof item.sistemasTotais === 'object') {
    return Object.keys(item.sistemasTotais)
      .map((k) => String(k).trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Quantidade de sistemas distintos usados no período.
 * O mesmo sistema em vários processos conta uma vez só.
 */
export function countManutencaoSistemasDistintos(items: any[]): number {
  const all = new Set<string>()
  for (const item of items) {
    for (const id of manutencaoSistemaIds(item)) all.add(id)
  }
  return all.size
}

/**
 * Quantidade de contratos vinculados em um reajuste.
 * Prefere `contratosVinculos`; no legado, o campo `contrato` conta como 1.
 */
export function countReajusteContratosVinculados(item: any): number {
  const vinculos = parseContratosVinculos(item?.contratosVinculos, {})
  if (vinculos.length) {
    return new Set(vinculos.map((v) => String(v.contratoId).trim()).filter(Boolean)).size
  }
  const legado = String(item?.contrato ?? '').trim()
  return legado ? 1 : 0
}

/** Soma totais por sistemaId a partir de sistemasTotais (com fallback no total legado). */
export function aggregateManutencaoTotaisPorSistema(
  items: any[],
  sistemas: SistemaRef[] = []
): { sistemaId: string; nome: string; total: number }[] {
  const map = new Map<string, number>()

  for (const item of items) {
    const st = item?.sistemasTotais
    if (st && typeof st === 'object' && !Array.isArray(st) && Object.keys(st).length > 0) {
      for (const [sid, raw] of Object.entries(st as Record<string, unknown>)) {
        const id = String(sid).trim()
        if (!id) continue
        map.set(id, (map.get(id) ?? 0) + safeSum(raw))
      }
      continue
    }
    // Legado: um único sistema + total no topo
    const sid = String(item?.sistemaId ?? '').trim()
    if (sid && safeSum(item?.total) > 0) {
      map.set(sid, (map.get(sid) ?? 0) + safeSum(item.total))
    }
  }

  return [...map.entries()]
    .map(([sistemaId, total]) => ({
      sistemaId,
      nome: sistemas.find((s) => String(s.id) === sistemaId)?.nome?.trim() || sistemaId,
      total,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
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
        // Sem data: não entra no recorte temporal (evita inflar totais com registros órfãos).
        if (!itemDate || !inRange(itemDate)) return false
        return true
      })
    }

    const demandas = apply(demandStore.items, 'demandas')
    const manutencoes = apply(manutencaoStore.items, 'manutencoes')
    const validacoes = apply(validationStore.items, 'validacoes')
    const reajustes = apply(reajusteStore.items, 'reajustes')
    const analytics = apply(reportStore.items, 'analytics')
    const sistemas = masterDataStore.sistemas ?? []

    const cadastro: QuantitativeModule = {
      id: 'cadastro',
      title: 'Cadastro',
      metrics: [
        {
          label: 'Qtd de usuários',
          value: sumDemandMetric(demandas, 'qtdUsuarios', {
            sistemas,
            legacyField: 'qtdUsuarios',
          }),
        },
        {
          label: 'Qtd clientes vinculados — EDGE',
          value: sumDemandMetric(demandas, 'qtdClientesVinculados', {
            sistemas,
            sistemaNomeMatch: /edge/i,
            legacyField: 'qtdClientesVinculados',
          }),
        },
        {
          label: 'Usuário empresa — MOVE',
          // No fluxo novo o campo “Usuários” do sistema MOVE equivale ao antigo usuariosEmpresa.
          value: sumDemandMetric(demandas, 'qtdUsuarios', {
            sistemas,
            sistemaNomeMatch: /move/i,
            legacyField: 'usuariosEmpresa',
          }),
        },
        { label: 'Qtde de retornos', value: demandas.reduce((s, d) => s + safeSum(d.qtdRetornos), 0) },
      ],
    }

    const totaisPorSistema = aggregateManutencaoTotaisPorSistema(manutencoes, sistemas)
    const manutencao: QuantitativeModule = {
      id: 'manutencao',
      title: 'Manutenção',
      metrics: [
        {
          label: 'Qtd de sistemas utilizados',
          value: countManutencaoSistemasDistintos(manutencoes),
        },
        ...totaisPorSistema.map((row) => ({
          label: `Total — ${row.nome}`,
          value: row.total,
        })),
        {
          label: 'Total (geral)',
          value: manutencoes.reduce((s, m) => {
            const fromSistemas = m?.sistemasTotais && typeof m.sistemasTotais === 'object'
              ? Object.values(m.sistemasTotais as Record<string, unknown>).reduce(
                  (a, v) => a + safeSum(v),
                  0
                )
              : 0
            return s + (fromSistemas > 0 ? fromSistemas : safeSum(m.total))
          }, 0),
        },
        {
          label: 'Quantidade de retornos',
          value: manutencoes.reduce((s, m) => s + safeSum(m.qtdRetornos), 0),
        },
      ],
    }

    const validacao: QuantitativeModule = {
      id: 'validacao',
      title: 'Validação',
      metrics: [
        {
          label: 'Contratos',
          value: sumItensConcluidosContratos(validacoes),
        },
        {
          label: "SUB's",
          value: sumItensConcluidosSubs(validacoes),
        },
        {
          label: 'Itens concluídos (total)',
          value: validacoes.reduce((s, v) => s + sumItensConcluidosItem(v), 0),
        },
        { label: 'Qtd de retornos', value: validacoes.reduce((s, v) => s + safeSum(v.qtdRetornos), 0) },
      ],
    }

    const reajuste: QuantitativeModule = {
      id: 'reajuste',
      title: 'Reajuste',
      metrics: [
        {
          label: 'Itens concluídos',
          value: reajustes.reduce((s, r) => s + sumItensConcluidosItem(r), 0),
        },
        {
          label: 'Contratos vinculados',
          value: reajustes.reduce((s, r) => s + countReajusteContratosVinculados(r), 0),
        },
      ],
    }

    const analyticsMod: QuantitativeModule = {
      id: 'analytics',
      title: 'Analytics',
      metrics: [
        {
          label: 'Total (quantitativo)',
          value: analytics.reduce((s, r) => s + safeSum(r.total), 0),
        },
      ],
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
    masterDataStore.analistas,
    masterDataStore.sistemas,
  ])
}
