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
      return item.dataInicio || item.createdAt
    case 'reajustes':
      return item.dataInicio || item.createdAt
    case 'analytics':
      return item.dataCriacao || item.dataInicio || item.createdAt
    case 'mailling':
      return item.createdAt
    default:
      return item.createdAt || item.dataInicio
  }
}
