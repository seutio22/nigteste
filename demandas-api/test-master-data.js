// Script para testar se a API está retornando dados dos dados mestres
const BASE_URL = 'http://localhost:3333'

async function testMasterData() {
  console.log('🔍 Testando dados mestres da API...')
  
  const endpoints = [
    '/clientes',
    '/contratos', 
    '/operadoras',
    '/produtos',
    '/sistemas',
    '/analistas',
    '/areas',
    '/tiposDemanda',
    '/tiposServico'
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testando: ${endpoint}`)
      const response = await fetch(`${BASE_URL}${endpoint}`)
      
      if (!response.ok) {
        console.error(`❌ ${endpoint}: HTTP ${response.status}`)
        continue
      }
      
      const data = await response.json()
      console.log(`✅ ${endpoint}: ${data.length} registros`)
      
      if (data.length > 0) {
        console.log(`   Primeiro registro:`, data[0])
      } else {
        console.log(`   ⚠️ Nenhum dado encontrado`)
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint}: Erro -`, error.message)
    }
  }
}

// Executar teste
testMasterData().catch(console.error)
