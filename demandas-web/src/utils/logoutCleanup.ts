/**
 * 🧹 UTILITÁRIO DE LIMPEZA COMPLETA NO LOGOUT
 * 
 * Este arquivo contém todas as chaves do localStorage que devem ser
 * removidas quando o usuário faz logout para garantir segurança.
 * 
 * ⚠️ PROBLEMA CRÍTICO CORRIGIDO:
 * - Dados sensíveis ficavam armazenados após logout
 * - Timeout não funcionava corretamente
 * - Múltiplos usuários podiam ver dados uns dos outros
 */

// 🔒 Chaves dos stores Zustand com persist
const ZUSTAND_STORE_KEYS = [
  'auth-store',
  'demands-v1',
  'demands-v2', 
  'validations-v1',
  'manutencoes-v1',
  'atendimentos-v1',
  'comunicados-v1',
  'mailling-v1',
  'master-data-store',
  'kanban-store-v1',
  'tickets-v1',
  'reports-v1',
  'timeline-store-v1',
  'notifications-store-v1',
  'dashboard-v1'
]

// 📄 Chaves de configuração das páginas de lista
const PAGE_CONFIG_KEYS = [
  'demands-list-view-v1',
  'demands-user-filter-v1',
  'validations-list-view-v1', 
  'validations-user-filter-v1',
  'reajustes-list-view-v1',
  'reajustes-user-filter-v1',
  'manutencoes-list-view-v1',
  'manutencoes-user-filter-v1',
  'atendimento-user-filter-v1',
  'analytics-list-view-v1',
  'analytics-user-filter-v1'
]

// ⚙️ Chaves de configuração do sistema
const SYSTEM_CONFIG_KEYS = [
  'theme',
  'language', 
  'notifications-enabled',
  'auto-save'
]

// 🔔 Chaves de notificações (padrão dinâmico)
const NOTIFICATION_KEY_PATTERN = 'deadline-notification-'

/**
 * 🧹 Limpa TODOS os dados do localStorage relacionados ao sistema
 * 
 * Esta função deve ser chamada sempre que o usuário faz logout para:
 * - Garantir que dados sensíveis sejam removidos
 * - Evitar vazamento de informações entre usuários
 * - Permitir que o timeout funcione corretamente
 * - Resetar completamente o estado da aplicação
 */
export function clearAllSystemData(): void {
  console.log('🧹 Iniciando limpeza completa do localStorage...')
  
  let removedCount = 0
  
  // 1. 🔒 Limpar stores Zustand
  ZUSTAND_STORE_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`🗑️ Removido store: ${key}`)
    }
  })
  
  // 2. 📄 Limpar configurações das páginas
  PAGE_CONFIG_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`🗑️ Removido config de página: ${key}`)
    }
  })
  
  // 3. ⚙️ Limpar configurações do sistema
  SYSTEM_CONFIG_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`🗑️ Removido config do sistema: ${key}`)
    }
  })
  
  // 4. 🔔 Limpar notificações dinâmicas
  const allKeys = Object.keys(localStorage)
  allKeys.forEach(key => {
    if (key.startsWith(NOTIFICATION_KEY_PATTERN)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`🗑️ Removido notificação: ${key}`)
    }
  })
  
  // 5. 🧹 Limpeza adicional de chaves conhecidas
  const additionalKeys = [
    'token', // Token JWT (caso não esteja no auth-store)
    'user', // Dados do usuário (caso não esteja no auth-store)
    'comunicado-storage', // Storage específico de comunicados
    'masterDataStore', // Versão antiga do master data
    'demands-v1', // Versão antiga
    'validations-v1', // Versão antiga
    'comunicados-v1', // Versão antiga
    'manutencoes-v1', // Versão antiga
    'projects-v1' // Versão antiga
  ]
  
  additionalKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`🗑️ Removido chave adicional: ${key}`)
    }
  })
  
  console.log(`✅ Limpeza concluída! ${removedCount} itens removidos do localStorage`)
  
  // 6. 🔍 Verificação final
  const remainingSystemKeys = Object.keys(localStorage).filter(key => 
    key.includes('store') || 
    key.includes('demand') || 
    key.includes('validation') || 
    key.includes('manutencao') || 
    key.includes('atendimento') || 
    key.includes('comunicado') || 
    key.includes('mailling') || 
    key.includes('kanban') || 
    key.includes('ticket') || 
    key.includes('report') || 
    key.includes('timeline') || 
    key.includes('notification') || 
    key.includes('dashboard') ||
    key.includes('auth') ||
    key.includes('theme') ||
    key.includes('language')
  )
  
  if (remainingSystemKeys.length > 0) {
    console.warn('⚠️ Ainda existem chaves do sistema no localStorage:', remainingSystemKeys)
    // Remover chaves restantes para garantir limpeza completa
    remainingSystemKeys.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ Removido chave restante: ${key}`)
    })
  }
  
  console.log('🔒 Logout seguro concluído - todos os dados sensíveis foram removidos')
}

/**
 * 🔍 Verifica se existem dados do sistema no localStorage
 * Útil para debugging e verificação de segurança
 */
export function checkSystemDataInStorage(): string[] {
  const allKeys = Object.keys(localStorage)
  return allKeys.filter(key => 
    ZUSTAND_STORE_KEYS.includes(key) ||
    PAGE_CONFIG_KEYS.includes(key) ||
    SYSTEM_CONFIG_KEYS.includes(key) ||
    key.startsWith(NOTIFICATION_KEY_PATTERN) ||
    key.includes('store') ||
    key.includes('demand') ||
    key.includes('validation') ||
    key.includes('manutencao') ||
    key.includes('atendimento') ||
    key.includes('comunicado') ||
    key.includes('mailling') ||
    key.includes('kanban') ||
    key.includes('ticket') ||
    key.includes('report') ||
    key.includes('timeline') ||
    key.includes('notification') ||
    key.includes('dashboard') ||
    key.includes('auth')
  )
}

/**
 * 🧪 Função de teste para verificar a limpeza
 * Chame no console do navegador para testar
 */
export function testLogoutCleanup(): void {
  console.log('🧪 Testando limpeza do logout...')
  console.log('📊 Dados antes da limpeza:', checkSystemDataInStorage())
  clearAllSystemData()
  console.log('📊 Dados após limpeza:', checkSystemDataInStorage())
  console.log('✅ Teste concluído!')
}
