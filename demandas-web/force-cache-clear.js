// Script para executar no console do navegador para forçar limpeza completa

console.log('🧹 Forçando limpeza completa do cache...')

// 1. Limpar localStorage
const keys = Object.keys(localStorage)
console.log('📋 Chaves encontradas no localStorage:', keys)

keys.forEach(key => {
  if (key.includes('master-data') || key.includes('demand') || key.includes('auth')) {
    console.log(`🗑️ Removendo: ${key}`)
    localStorage.removeItem(key)
  }
})

// 2. Limpar sessionStorage
const sessionKeys = Object.keys(sessionStorage)
sessionKeys.forEach(key => {
  if (key.includes('master-data') || key.includes('demand') || key.includes('auth')) {
    console.log(`🗑️ Removendo sessionStorage: ${key}`)
    sessionStorage.removeItem(key)
  }
})

// 3. Forçar recarga completa
console.log('🔄 Cache limpo! Recarregando página em 2 segundos...')
setTimeout(() => {
  window.location.reload(true)
}, 2000)

console.log('✅ Limpeza iniciada! Após recarregar, faça login novamente.')
