// Script AGESSIVO para limpar TODOS os dados persistentes
console.log('🚨 INICIANDO LIMPEZA FORÇADA DE TODOS OS DADOS...')

// Função para limpar tudo de uma vez
function forceClearAll() {
  console.log('🗑️ LIMPANDO TUDO FORÇADAMENTE...')
  
  // 1. Limpar localStorage
  try {
    const localStorageCount = Object.keys(localStorage).length
    localStorage.clear()
    console.log(`✅ localStorage limpo: ${localStorageCount} chaves removidas`)
  } catch (error) {
    console.error('❌ Erro ao limpar localStorage:', error)
  }
  
  // 2. Limpar sessionStorage
  try {
    const sessionStorageCount = Object.keys(sessionStorage).length
    sessionStorage.clear()
    console.log(`✅ sessionStorage limpo: ${sessionStorageCount} chaves removidas`)
  } catch (error) {
    console.error('❌ Erro ao limpar sessionStorage:', error)
  }
  
  // 3. Limpar IndexedDB (se existir)
  try {
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
            console.log(`✅ IndexedDB removido: ${db.name}`)
          }
        })
      })
    }
  } catch (error) {
    console.log('ℹ️ IndexedDB não disponível ou erro ao limpar')
  }
  
  // 4. Limpar cookies relacionados ao domínio
  try {
    const cookies = document.cookie.split(';')
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
      console.log(`✅ Cookie removido: ${name}`)
    })
  } catch (error) {
    console.log('ℹ️ Erro ao limpar cookies')
  }
  
  // 5. Forçar limpeza de stores Zustand
  try {
    // Tentar limpar stores específicos se existirem
    if (window.__ZUSTAND_STORES__) {
      Object.keys(window.__ZUSTAND_STORES__).forEach(storeName => {
        try {
          window.__ZUSTAND_STORES__[storeName].setState({})
          console.log(`✅ Store Zustand limpo: ${storeName}`)
        } catch (e) {
          console.log(`ℹ️ Erro ao limpar store: ${storeName}`)
        }
      })
    }
  } catch (error) {
    console.log('ℹ️ Stores Zustand não encontrados')
  }
  
  // 6. Limpar variáveis globais que possam conter dados
  try {
    const globalVars = ['__md', '__stores', '__data', '__cache']
    globalVars.forEach(varName => {
      if (window[varName]) {
        delete window[varName]
        console.log(`✅ Variável global removida: ${varName}`)
      }
    })
  } catch (error) {
    console.log('ℹ️ Erro ao limpar variáveis globais')
  }
}

// Função para verificar se ainda há dados
function checkRemainingData() {
  console.log('\n🔍 VERIFICANDO DADOS RESTANTES...')
  
  const localStorageKeys = Object.keys(localStorage)
  const sessionStorageKeys = Object.keys(sessionStorage)
  
  console.log(`📊 localStorage: ${localStorageKeys.length} chaves`)
  console.log(`📊 sessionStorage: ${sessionStorageKeys.length} chaves`)
  
  if (localStorageKeys.length > 0) {
    console.log('\n⚠️ AINDA HÁ DADOS NO localStorage:')
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key)
      const size = new Blob([value]).size
      console.log(`   - ${key} (${size} bytes)`)
    })
  }
  
  if (sessionStorageKeys.length > 0) {
    console.log('\n⚠️ AINDA HÁ DADOS NO sessionStorage:')
    sessionStorageKeys.forEach(key => {
      const value = sessionStorage.getItem(key)
      const size = new Blob([value]).size
      console.log(`   - ${key} (${size} bytes)`)
    })
  }
  
  if (localStorageKeys.length === 0 && sessionStorageKeys.length === 0) {
    console.log('✅ TODOS OS DADOS FORAM REMOVIDOS!')
  }
}

// Função para forçar recarregamento
function forceReload() {
  console.log('\n🔄 FORÇANDO RECARREGAMENTO COMPLETO...')
  
  // Limpar cache do navegador
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name)
        console.log(`✅ Cache removido: ${name}`)
      })
    })
  }
  
  // Forçar recarregamento sem cache
  setTimeout(() => {
    console.log('🔄 Recarregando página...')
    window.location.reload(true)
  }, 1000)
}

// EXECUTAR LIMPEZA FORÇADA
console.log('🚀 EXECUTANDO LIMPEZA FORÇADA...\n')

// 1. Mostrar estado atual
console.log('📊 ESTADO ATUAL ANTES DA LIMPEZA:')
checkRemainingData()

// 2. Executar limpeza forçada
forceClearAll()

// 3. Verificar se ainda há dados
setTimeout(() => {
  console.log('\n📊 ESTADO APÓS LIMPEZA:')
  checkRemainingData()
  
  // 4. Se ainda houver dados, tentar novamente
  if (Object.keys(localStorage).length > 0 || Object.keys(sessionStorage).length > 0) {
    console.log('\n⚠️ AINDA HÁ DADOS! TENTANDO NOVAMENTE...')
    forceClearAll()
    
    setTimeout(() => {
      console.log('\n📊 ESTADO FINAL:')
      checkRemainingData()
      
      if (Object.keys(localStorage).length === 0 && Object.keys(sessionStorage).length === 0) {
        console.log('\n🎉 LIMPEZA FORÇADA CONCLUÍDA COM SUCESSO!')
        console.log('💡 Agora recarregue a página (F5) para ver os dados reais do backend.')
      } else {
        console.log('\n❌ AINDA HÁ DADOS PERSISTENTES!')
        console.log('💡 Tente fechar e abrir o navegador novamente.')
      }
    }, 500)
  } else {
    console.log('\n🎉 LIMPEZA FORÇADA CONCLUÍDA COM SUCESSO!')
    console.log('💡 Agora recarregue a página (F5) para ver os dados reais do backend.')
  }
}, 500)

// 5. Oferecer opção de recarregamento forçado
setTimeout(() => {
  console.log('\n🔄 OPÇÕES DISPONÍVEIS:')
  console.log('1. Recarregue a página (F5)')
  console.log('2. Execute forceReload() para recarregamento forçado')
  console.log('3. Feche e abra o navegador novamente')
}, 2000)
