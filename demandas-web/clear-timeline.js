// Script para limpar o histórico de alterações poluído
console.log('🧹 Limpando histórico de alterações...')

// Limpar localStorage
try {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('reports') || key.includes('timeline') || key.includes('analytics')) {
      console.log(`🗑️ Removendo chave: ${key}`)
      localStorage.removeItem(key)
    }
  })
  console.log('✅ LocalStorage limpo!')
} catch (error) {
  console.error('❌ Erro ao limpar localStorage:', error)
}

console.log('🔄 Recarregue a página para ver as mudanças')
