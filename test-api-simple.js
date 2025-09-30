// Teste simples da API
console.log('🧪 TESTE: Verificando API...')

// Simular chamada da API
const testApiCall = async (endpoint) => {
  try {
    console.log(`🔍 Testando endpoint: ${endpoint}`)
    
    // Simular resposta da API
    const mockData = [
      { id: '1', nome: `Teste ${endpoint}` },
      { id: '2', nome: `Outro ${endpoint}` }
    ]
    
    console.log(`✅ ${endpoint}: Dados simulados:`, mockData.length, 'registros')
    return mockData
    
  } catch (error) {
    console.error(`❌ ${endpoint}: Erro:`, error)
    return []
  }
}

// Testar todos os endpoints
const testAllEndpoints = async () => {
  console.log('\n🚀 Testando todos os endpoints...')
  
  const endpoints = [
    '/clientes',
    '/contratos', 
    '/operadoras',
    '/produtos',
    '/sistemas',
    '/analistas',
    '/areas',
    '/tiposDemanda',
    '/tiposServico',
    '/padrao'
  ]
  
  const results = await Promise.all(
    endpoints.map(endpoint => testApiCall(endpoint))
  )
  
  console.log('\n📊 Resumo dos testes:')
  results.forEach((data, index) => {
    console.log(`${endpoints[index]}: ${data.length} registros`)
  })
  
  const totalRecords = results.reduce((sum, data) => sum + data.length, 0)
  console.log(`\n🎯 Total de registros simulados: ${totalRecords}`)
}

// Executar teste
testAllEndpoints()
