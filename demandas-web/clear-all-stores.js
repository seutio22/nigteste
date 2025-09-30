// Script para limpar TODOS os stores persistentes do sistema
console.log('🧹 Iniciando limpeza completa de todos os stores...')

// Lista de todas as chaves de storage conhecidas do sistema
const allStorageKeys = [
  // Stores principais
  'master-data-v2',
  'dados-storage',
  'project-store',
  'demanda-store',
  'atendimento-store',
  'validacao-store',
  'reajuste-store',
  'comunicado-store',
  'kanban-store',
  'user-store',
  'auth-store',
  
  // Versões específicas
  'atendimento-store-v4',
  'reajuste-store-v4',
  'comunicado-store-v2',
  'kanban-store-v1',
  'validation-store-v1',
  'timeline-store-v1',
  'notification-store-v1',
  'dashboard-store-v1',
  'report-store-v1',
  'mailling-store-v1',
  'ticket-store-v1',
  
  // Outros possíveis
  'demand-store-v1',
  'demand-store-v2',
  'demand-store-v3',
  'demand-store-v4',
  'demand-store-v5',
  'demand-store-v6',
  'demand-store-v7',
  'demand-store-v8',
  'demand-store-v9',
  'demand-store-v10',
  
  // Stores de timeline
  'timeline-store-v1',
  'timeline-store-v2',
  'timeline-store-v3',
  
  // Stores de notificação
  'notification-store-v1',
  'notification-store-v2',
  
  // Stores de dashboard
  'dashboard-store-v1',
  'dashboard-store-v2',
  
  // Stores de relatório
  'report-store-v1',
  'report-store-v2',
  
  // Stores de mailling
  'mailling-store-v1',
  'mailling-store-v2',
  
  // Stores de ticket
  'ticket-store-v1',
  'ticket-store-v2',
  
  // Stores de validação
  'validation-store-v1',
  'validation-store-v2',
  
  // Stores de reajuste
  'reajuste-store-v1',
  'reajuste-store-v2',
  'reajuste-store-v3',
  'reajuste-store-v4',
  
  // Stores de atendimento
  'atendimento-store-v1',
  'atendimento-store-v2',
  'atendimento-store-v3',
  'atendimento-store-v4',
  
  // Stores de comunicado
  'comunicado-store-v1',
  'comunicado-store-v2',
  
  // Stores de kanban
  'kanban-store-v1',
  'kanban-store-v2',
  
  // Stores de usuário
  'user-store-v1',
  'user-store-v2',
  
  // Stores de autenticação
  'auth-store-v1',
  'auth-store-v2',
  
  // Stores de dados
  'dados-storage',
  'dados-store-v1',
  'dados-store-v2',
  
  // Stores de dados mestres
  'master-data-v1',
  'master-data-v2',
  'master-data-v3',
  
  // Stores de projeto
  'project-store-v1',
  'project-store-v2',
  'project-store-v3'
]

// Função para limpar chaves específicas
function clearSpecificKeys() {
  console.log('🎯 Limpando chaves específicas...')
  
  let removedCount = 0
  const notFoundKeys = []
  
  allStorageKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      removedCount++
      console.log(`✅ Removido: ${key}`)
    } else {
      notFoundKeys.push(key)
    }
  })
  
  console.log(`\n📊 Resultado da limpeza específica:`)
  console.log(`   ✅ Chaves removidas: ${removedCount}`)
  console.log(`   ❌ Chaves não encontradas: ${notFoundKeys.length}`)
  
  if (notFoundKeys.length > 0) {
    console.log('\n🔍 Chaves não encontradas:')
    notFoundKeys.forEach(key => console.log(`   - ${key}`))
  }
  
  return removedCount
}

// Função para limpar tudo
function clearAllStorage() {
  console.log('🗑️ Limpando todo o storage...')
  
  const beforeCount = Object.keys(localStorage).length
  const beforeSessionCount = Object.keys(sessionStorage).length
  
  localStorage.clear()
  sessionStorage.clear()
  
  const afterCount = Object.keys(localStorage).length
  const afterSessionCount = Object.keys(sessionStorage).length
  
  console.log(`\n📊 Resultado da limpeza total:`)
  console.log(`   📦 localStorage: ${beforeCount} → ${afterCount} chaves`)
  console.log(`   📦 sessionStorage: ${beforeCount} → ${afterSessionCount} chaves`)
  
  return beforeCount + beforeSessionCount
}

// Função para mostrar informações atuais
function showCurrentStorage() {
  const localStorageKeys = Object.keys(localStorage)
  const sessionStorageKeys = Object.keys(sessionStorage)
  
  console.log('\n📊 Storage Atual:')
  console.log(`   📦 localStorage: ${localStorageKeys.length} chaves`)
  console.log(`   📦 sessionStorage: ${sessionStorageKeys.length} chaves`)
  
  if (localStorageKeys.length > 0) {
    console.log('\n🔍 Chaves no localStorage:')
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key)
      const size = new Blob([value]).size
      console.log(`   - ${key} (${size} bytes)`)
    })
  }
  
  if (sessionStorageKeys.length > 0) {
    console.log('\n🔍 Chaves no sessionStorage:')
    sessionStorageKeys.forEach(key => {
      const value = sessionStorage.getItem(key)
      const size = new Blob([value]).size
      console.log(`   - ${key} (${size} bytes)`)
    })
  }
  
  if (localStorageKeys.length === 0 && sessionStorageKeys.length === 0) {
    console.log('   ✅ Storage completamente vazio!')
  }
}

// Função para buscar chaves que contêm palavras específicas
function searchStorageKeys(searchTerm) {
  console.log(`🔍 Buscando chaves que contêm: "${searchTerm}"`)
  
  const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
  const matchingKeys = allKeys.filter(key => 
    key.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  if (matchingKeys.length > 0) {
    console.log(`\n✅ Encontradas ${matchingKeys.length} chaves:`)
    matchingKeys.forEach(key => {
      const storage = localStorage.getItem(key) ? 'localStorage' : 'sessionStorage'
      console.log(`   - ${key} (${storage})`)
    })
  } else {
    console.log(`\n❌ Nenhuma chave encontrada contendo "${searchTerm}"`)
  }
  
  return matchingKeys
}

// Executar limpeza
console.log('🚀 Executando limpeza...\n')

// 1. Mostrar storage atual
showCurrentStorage()

// 2. Limpar chaves específicas
const removedCount = clearSpecificKeys()

// 3. Se ainda houver dados, limpar tudo
if (Object.keys(localStorage).length > 0 || Object.keys(sessionStorage).length > 0) {
  console.log('\n⚠️ Ainda há dados persistentes, executando limpeza total...')
  const totalRemoved = clearAllStorage()
  console.log(`\n🎉 Limpeza total concluída! ${totalRemoved} chaves removidas.`)
} else {
  console.log('\n🎉 Limpeza específica foi suficiente!')
}

// 4. Mostrar resultado final
console.log('\n📊 Estado final:')
showCurrentStorage()

// 5. Buscar por chaves que possam ter sido perdidas
console.log('\n🔍 Verificando se há outras chaves...')
searchStorageKeys('store')
searchStorageKeys('data')
searchStorageKeys('demand')
searchStorageKeys('project')

console.log('\n✅ Limpeza concluída! Recarregue a página para ver os dados reais do backend.')
console.log('💡 Dica: Use F5 ou Ctrl+R para recarregar completamente a página.')
