type MasterItem = {
  id?: string
  nome?: string
  name?: string
}

const normalize = (value?: string): string => (value || '').trim().toLowerCase()

export const resolveIdFromValue = (value: unknown, list?: MasterItem[]): string | undefined => {
  if (value === null || value === undefined) return undefined

  if (typeof value === 'object') {
    const obj = value as { id?: string; nome?: string; name?: string; value?: string }
    if (obj.id) return obj.id
    if (obj.value) return obj.value
    if (obj.nome || obj.name) {
      const name = obj.nome || obj.name
      const match = list?.find((item) => normalize(item.nome || item.name) === normalize(name))
      return match?.id || name
    }
    return undefined
  }

  if (typeof value === 'string') {
    const match = list?.find((item) => normalize(item.nome || item.name) === normalize(value))
    return match?.id || value
  }

  return String(value)
}

export const resolveNameFromValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object') {
    const obj = value as { nome?: string; name?: string; titulo?: string }
    return obj.nome || obj.name || obj.titulo
  }
  return String(value)
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
