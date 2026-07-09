import type { PeriodType } from '../types/dashboardIndicators'

type MasterItem = {
  id?: string
  nome?: string
  name?: string
}

const normalize = (value?: string): string => (value || '').trim().toLowerCase()

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value?: string | null): boolean =>
  Boolean(value && UUID_REGEX.test(String(value)))

const findAnalistaById = (id: string, list?: MasterItem[]) =>
  list?.find((item) => String(item.id) === String(id))

const findAnalistasByName = (name: string, list?: MasterItem[]) =>
  list?.filter((item) => normalize(item.nome || item.name) === normalize(name)) ?? []

/** Agrupa registros operacionais sem analista resolvido no master em um único card. */
export const UNASSIGNED_ANALISTA_KEY = '__unassigned__'

type AnalistaMaster = MasterItem & { email?: string }

/** Projetos usam owner/manager como usuário do sistema — mapeia para analista por e-mail/nome. */
export const resolveProjectAnalistaValue = (
  project: Record<string, unknown>,
  analistas?: AnalistaMaster[]
): unknown => {
  const matchByUserProfile = (user?: { email?: string; name?: string; nome?: string }) => {
    if (!user || !analistas?.length) return undefined
    const email = (user.email || '').trim().toLowerCase()
    const name = (user.name || user.nome || '').trim()
    return analistas.find((a) => {
      const aEmail = (a.email || '').trim().toLowerCase()
      const aNome = (a.nome || a.name || '').trim()
      if (email && aEmail && email === aEmail) return true
      if (name && aNome && normalize(name) === normalize(aNome)) return true
      return false
    })?.id
  }

  const manager = project.manager
  const owner = project.owner

  if (manager && typeof manager === 'object') {
    const byProfile = matchByUserProfile(manager as { email?: string; name?: string; nome?: string })
    if (byProfile) return byProfile
  }
  if (owner && typeof owner === 'object') {
    const byProfile = matchByUserProfile(owner as { email?: string; name?: string; nome?: string })
    if (byProfile) return byProfile
  }

  const candidates = [
    project.managerId,
    typeof manager === 'string' ? manager : (manager as { id?: string } | undefined)?.id,
    project.ownerId,
    typeof owner === 'object' ? (owner as { id?: string }).id : owner,
    manager,
    owner,
  ]

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue
    const resolved = resolveIdFromValue(candidate, analistas)
    if (resolved && isAnalistaKnownInMaster(resolved, analistas)) return resolved
  }

  return project.managerId || project.ownerId || manager || owner
}

export const isAnalistaKnownInMaster = (
  resolvedId: string | undefined,
  list?: MasterItem[]
): boolean => {
  if (!resolvedId || !list?.length) return false
  if (isUuid(resolvedId)) return Boolean(findAnalistaById(resolvedId, list))
  return findAnalistasByName(resolvedId, list).length > 0
}

export const resolveIdFromValue = (value: unknown, list?: MasterItem[]): string | undefined => {
  if (value === null || value === undefined) return undefined

  if (typeof value === 'object') {
    const obj = value as { id?: string; nome?: string; name?: string; value?: string }
    if (obj.id) {
      const byId = findAnalistaById(String(obj.id), list)
      return byId?.id || obj.id
    }
    if (obj.value) {
      if (isUuid(obj.value)) {
        const byId = findAnalistaById(obj.value, list)
        return byId?.id || obj.value
      }
      const match = list?.find((item) => normalize(item.nome || item.name) === normalize(obj.value))
      return match?.id || obj.value
    }
    if (obj.nome || obj.name) {
      const name = obj.nome || obj.name
      const match = list?.find((item) => normalize(item.nome || item.name) === normalize(name))
      return match?.id || name
    }
    return undefined
  }

  if (typeof value === 'string') {
    if (isUuid(value)) {
      const byId = findAnalistaById(value, list)
      return byId?.id || value
    }
    const match = list?.find((item) => normalize(item.nome || item.name) === normalize(value))
    return match?.id || value
  }

  return String(value)
}

/** Chave única para agrupar métricas de analista (evita duplicar por id vs nome). */
export const buildAnalistaAggregationKey = (
  resolvedId: string | undefined,
  analistaNome: string,
  list?: MasterItem[]
): { key: string; canonicalId: string; canonicalNome: string } => {
  const nomeNorm = normalize(analistaNome)

  if (resolvedId && isUuid(resolvedId)) {
    const byId = findAnalistaById(resolvedId, list)
    if (byId?.id) {
      return {
        key: String(byId.id),
        canonicalId: String(byId.id),
        canonicalNome: byId.nome || byId.name || analistaNome
      }
    }
    return {
      key: UNASSIGNED_ANALISTA_KEY,
      canonicalId: UNASSIGNED_ANALISTA_KEY,
      canonicalNome: 'Analista não encontrado'
    }
  }

  const lookupName = resolvedId && !isUuid(resolvedId) ? String(resolvedId) : analistaNome
  const byName = findAnalistasByName(lookupName, list)
  if (byName.length === 1 && byName[0]?.id) {
    return {
      key: String(byName[0].id),
      canonicalId: String(byName[0].id),
      canonicalNome: byName[0].nome || byName[0].name || analistaNome
    }
  }
  if (byName.length > 1) {
    const canonicalNome = byName[0].nome || byName[0].name || analistaNome
    return {
      key: `name:${normalize(canonicalNome)}`,
      canonicalId: String(byName[0].id ?? canonicalNome),
      canonicalNome
    }
  }

  if (nomeNorm === 'analista não encontrado' || !nomeNorm) {
    return {
      key: UNASSIGNED_ANALISTA_KEY,
      canonicalId: UNASSIGNED_ANALISTA_KEY,
      canonicalNome: 'Analista não encontrado'
    }
  }

  return {
    key: `name:${nomeNorm}`,
    canonicalId: resolvedId || analistaNome,
    canonicalNome: analistaNome
  }
}

export const resolveNameFromValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object') {
    const obj = value as { nome?: string; name?: string; titulo?: string }
    return obj.nome || obj.name || obj.titulo
  }
  return String(value)
}

export const resolveAnalistaDisplayName = (
  analistaRaw: unknown,
  resolvedId: string | undefined,
  list?: MasterItem[]
): string => {
  const embedded = resolveNameFromValue(analistaRaw)
  if (embedded && !isUuid(embedded)) return embedded

  if (resolvedId && isUuid(resolvedId)) {
    const byId = findAnalistaById(resolvedId, list)
    const masterName = byId?.nome || byId?.name
    if (masterName) return masterName
  }

  if (resolvedId && !isUuid(resolvedId)) return resolvedId
  return 'Analista não encontrado'
}

export const matchesByIdOrName = (
  value: unknown,
  filterId?: string,
  list?: MasterItem[]
): boolean => {
  if (!filterId) return true
  if (value === null || value === undefined) return false

  const itemId = resolveIdFromValue(value, list)
  if (itemId === filterId) return true

  const filterName = list?.find((item) => item.id === filterId)?.nome
    || list?.find((item) => item.id === filterId)?.name

  if (filterName) {
    const itemName = resolveNameFromValue(value)
    if (itemName && normalize(itemName) === normalize(filterName)) return true
  }

  return false
}

export const getItemDateForPage = (page: string, item: any): string | undefined => {
  switch (page) {
    case 'demandas':
    case 'manutencoes':
    case 'validacoes':
    case 'atendimentos':
      return item.createdAt || item.dataInicio
    case 'reajustes':
      return item.createdAt || item.dataInicio
    case 'analytics':
      return item.dataCriacao || item.createdAt || item.dataInicio
    case 'mailling':
      return item.createdAt
    case 'projetos':
      return item.createdAt || item.startDate || item.updatedAt
    default:
      return item.createdAt || item.dataInicio
  }
}

export const getItemStartDate = (page: string, item: any): string | undefined => {
  switch (page) {
    case 'demandas':
    case 'manutencoes':
    case 'validacoes':
    case 'atendimentos':
      return item.dataInicio || item.createdAt
    case 'reajustes':
      return item.dataInicio || item.createdAt
    case 'analytics':
      return item.dataCriacao || item.dataInicio || item.createdAt
    case 'projetos':
      return item.startDate || item.createdAt || item.updatedAt
    default:
      return item.dataInicio || item.createdAt
  }
}

export const getItemEndDate = (page: string, item: any): string | undefined => {
  switch (page) {
    case 'demandas':
    case 'manutencoes':
      return item.dataFinal || item.dataFinalizacao
    case 'validacoes':
      return item.dataFinal || item.dataFim || item.dataFinalizacao
    case 'atendimentos':
      return item.dataFinal || item.dataFinalizacao
    case 'reajustes':
      return item.dataFim || item.dataFinal || item.dataFinalizacao
    case 'analytics':
      return item.dataAtualizacao || item.dataFinalizacao
    default:
      return item.dataFinal || item.dataFinalizacao
  }
}

/**
 * Data de início do chamado para cálculo de tempo de execução (dias úteis).
 * Não usa data de criação — apenas campos operacionais (ex.: dataInicio, dataAbertura).
 */
export const getExecutionStartDate = (page: string, item: any): string | undefined => {
  switch (page) {
    case 'demandas':
    case 'manutencoes':
    case 'validacoes':
      return item.dataInicio || undefined
    case 'atendimentos':
      return item.dataInicio || item.dataAbertura || undefined
    case 'reajustes':
      return item.dataInicio || undefined
    case 'analytics':
      return item.dataInicio || undefined
    default:
      return item.dataInicio || undefined
  }
}

/**
 * Data final do chamado para tempo de execução. Não usa criação nem "última atualização"
 * como substituto de encerramento (analytics usa dataFinalizacao / dataFinal).
 */
export const getExecutionEndDate = (page: string, item: any): string | undefined => {
  switch (page) {
    case 'demandas':
    case 'manutencoes':
      return item.dataFinal || item.dataFinalizacao
    case 'validacoes':
      return item.dataFinal || item.dataFim || item.dataFinalizacao
    case 'atendimentos':
      return item.dataFinal || item.dataResolucao || item.dataFinalizacao
    case 'reajustes':
      return item.dataFim || item.dataFinal || item.dataFinalizacao
    case 'analytics':
      return item.dataFinalizacao || item.dataFinal
    default:
      return item.dataFinal || item.dataFinalizacao
  }
}

/**
 * Data usada em métricas de “concluído no período” (Dashboard resumo, Home produção).
 * Usa o instante mais recente entre fim operacional (dataFinal, etc.) e última gravação do registro.
 * Assim não subconta quando dataFinal guarda prazo antigo e o status virou Concluída com updatedAt de hoje.
 * Se não houver nem fim nem updatedAt, cai em createdAt (útil a fechos no mesmo dia sem datas de encerramento).
 */
export const getDataReferenciaConclusao = (page: string, item: any): string | undefined => {
  const end = getExecutionEndDate(page, item)
  const updated = item?.updatedAt || item?.updated_at
  const created = item?.createdAt || item?.created_at

  if (end && updated) {
    try {
      const te = new Date(end).getTime()
      const tu = new Date(updated).getTime()
      if (!Number.isNaN(te) && !Number.isNaN(tu)) {
        return tu >= te ? updated : end
      }
    } catch {
      /* ignore */
    }
  }
  if (end) return end
  if (updated) return updated
  return created
}

export const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

export const parseDateForFilter = (value?: string | null): Date | null => {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}

export const formatDateYMD = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Limites do período do indicador quando não há datas manuais. */
export const getPeriodBounds = (period: PeriodType): { start: Date; end: Date } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (period) {
    case 'daily':
      return {
        start: new Date(today),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      }
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      }
    case 'quarterly': {
      const quarter = Math.floor(now.getMonth() / 3)
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
      }
    }
    default:
      return { start: today, end: today }
  }
}

/** Intervalo exibido nos gráficos (datas do filtro ou período corrente). */
export const resolveIndicatorDateRange = (
  period: PeriodType,
  fromDate?: string,
  toDate?: string
): { from: string; to: string } => {
  if (fromDate && toDate) return { from: fromDate, to: toDate }
  const { start, end } = getPeriodBounds(period)
  return { from: formatDateYMD(start), to: formatDateYMD(end) }
}

/**
 * Período imediatamente anterior para comparação: ontem (daily), mês calendário anterior (monthly),
 * trimestre calendário anterior (quarterly).
 */
export const getPreviousComparisonRange = (
  currentFrom: string,
  currentTo: string,
  period: PeriodType
): { from: string; to: string } | null => {
  const start = parseDateForFilter(currentFrom)
  if (!start || isNaN(start.getTime())) return null

  if (period === 'daily') {
    const prev = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
    const ymd = formatDateYMD(prev)
    return { from: ymd, to: ymd }
  }

  if (period === 'monthly') {
    const y = start.getFullYear()
    const m = start.getMonth()
    const prevStart = new Date(y, m - 1, 1)
    const prevEnd = new Date(y, m, 0, 23, 59, 59, 999)
    return { from: formatDateYMD(prevStart), to: formatDateYMD(prevEnd) }
  }

  if (period === 'quarterly') {
    const y = start.getFullYear()
    const m = start.getMonth()
    const q = Math.floor(m / 3)
    let py = y
    let pq = q - 1
    if (pq < 0) {
      pq = 3
      py -= 1
    }
    const prevStart = new Date(py, pq * 3, 1)
    const prevEnd = new Date(py, pq * 3 + 3, 0, 23, 59, 59, 999)
    return { from: formatDateYMD(prevStart), to: formatDateYMD(prevEnd) }
  }

  return null
}

export const isItemDateInRange = (
  iso: string | undefined | null,
  fromYmd: string,
  toYmd: string
): boolean => {
  if (!iso) return false
  // Alguns registros chegam com "data-only" serializada como meia-noite UTC (ex.: 2026-05-07T00:00:00.000Z).
  // No fuso -03 isso cai no dia anterior e quebra o recorte diário. Nesses casos,
  // tratamos como data de calendário (YYYY-MM-DD) para comparação.
  const isoStr = String(iso)
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(isoStr)) {
    const ymd = isoStr.slice(0, 10)
    return ymd >= fromYmd && ymd <= toYmd
  }
  const itemDate = parseDateForFilter(iso)
  if (!itemDate || isNaN(itemDate.getTime())) return false
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
  return t >= normalizeStart(fromYmd) && t <= normalizeEnd(toYmd)
}

export const isSameCalendarDay = (
  iso: string | undefined | null,
  dayYmd: string
): boolean => {
  if (!iso) return false
  const itemDate = parseDateForFilter(iso)
  const day = parseDateForFilter(dayYmd)
  if (!itemDate || !day || isNaN(itemDate.getTime()) || isNaN(day.getTime())) return false
  return (
    itemDate.getFullYear() === day.getFullYear() &&
    itemDate.getMonth() === day.getMonth() &&
    itemDate.getDate() === day.getDate()
  )
}

export const enumerateDaysYmd = (fromYmd: string, toYmd: string): string[] => {
  const start = parseDateForFilter(fromYmd)
  const end = parseDateForFilter(toYmd)
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return []
  const out: string[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cur.getTime() <= endDay.getTime()) {
    out.push(formatDateYMD(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}
