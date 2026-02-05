import { useAuthStore } from '../store/authStore'

// Função para verificar se o usuário tem permissão para ver todos os dados
export const canViewAllData = (userRole?: string): boolean => {
  // Sempre retornar true - permissões controladas pelo painel de usuário
  return true
}

// Função para verificar se o usuário é analista
export const isAnalista = (userRole?: string): boolean => {
  return userRole === 'analista'
}

// Função para verificar se o usuário é administrador
export const isAdmin = (userRole?: string): boolean => {
  return userRole === 'admin'
}

// Função para verificar se o usuário pode editar uma demanda específica
export const canEditDemand = (
  demand: { analistaId?: string },
  user: { id?: string; role?: string } | null
): boolean => {
  // Se não há usuário logado, não pode editar
  if (!user) return false
  
  // Administradores podem editar qualquer demanda
  if (isAdmin(user.role)) return true
  
  // Outros usuários só podem editar suas próprias demandas
  return demand.analistaId === user.id
}

// Função para verificar se o usuário pode editar uma manutenção específica
export const canEditManutencao = (
  manutencao: { analistaId?: string },
  user: { id?: string; role?: string } | null
): boolean => {
  // Se não há usuário logado, não pode editar
  if (!user) return false
  
  // Administradores podem editar qualquer manutenção
  if (isAdmin(user.role)) return true
  
  // Outros usuários só podem editar suas próprias manutenções
  return manutencao.analistaId === user.id
}

// Função para verificar se o usuário pode editar um atendimento específico
// Nota: atendimento.analista é o analistaId (Analista), user.id é o userId (User) - entidades diferentes.
// Por isso aceita analistaNome opcional para comparar por nome (analista.nome === user.name)
export const canEditAtendimento = (
  atendimento: { analista?: string },
  user: { id?: string; name?: string; role?: string } | null,
  analistaNome?: string
): boolean => {
  // Se não há usuário logado, não pode editar
  if (!user) return false
  
  // Administradores podem editar qualquer atendimento
  if (isAdmin(user.role)) return true
  
  // Outros usuários só podem editar seus próprios atendimentos
  // 1) Comparar por ID (caso analista e user compartilhem o mesmo ID em alguns cenários)
  if (atendimento.analista && atendimento.analista === user.id) return true
  
  // 2) Comparar por nome: analista (master data) e user (auth) são entidades diferentes,
  //    então usamos o nome para identificar se o usuário é o dono do atendimento
  if (analistaNome && user.name) {
    const a = analistaNome.toLowerCase().trim()
    const u = user.name.toLowerCase().trim()
    if (a === u || a.includes(u) || u.includes(a)) return true
  }
  
  return false
}

// Hook para obter dados filtrados por permissão do usuário
export const useFilteredData = <T extends { id?: string; analista?: string; responsavelAnalista?: string }>(
  items: T[],
  userRole?: string,
  userId?: string,
  viewOwnDataOnly?: boolean
): T[] => {
  
  // Se não há usuário logado, retornar todos os dados
  if (!userId) {
    return items
  }
  
  // Se a permissão viewOwnDataOnly está ativada, filtrar por dados próprios
  if (viewOwnDataOnly) {
    const filtered = items.filter(item => {
      // Verificar campo analista (Demandas, Validação, Analytics)
      // O campo analista agora contém o ID do analista (ex: 'analista-1')
      if ('analista' in item && item.analista === userId) {
        return true
      }
      // Verificar campo responsavelAnalista (Reajuste)
      if ('responsavelAnalista' in item && item.responsavelAnalista === userId) {
        return true
      }
      return false
    })
    return filtered
  }
  
  // Se viewOwnDataOnly está desativado, retornar todos os dados
  return items
}

export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ')
}

export function fmt(date?: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

export function calcTempo(inicio?: string, fim?: string) {
  if (!inicio) return '-'
  const start = new Date(inicio).getTime()
  const end = fim ? new Date(fim).getTime() : Date.now()
  const diff = Math.max(0, end - start)
  const dias = Math.floor(diff / (24 * 60 * 60 * 1000))
  const horas = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return `${dias}d ${horas}h`
}


