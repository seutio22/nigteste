// Script para testar os endpoints de validação de ticket
const baseUrl = 'https://nigteste-production.up.railway.app'

async function testTicketEndpoints() {
  const ticket = '1212'
  
  console.log(`🔍 Testando validação de ticket "${ticket}" em todos os endpoints...`)
  
  const endpoints = [
    { name: 'Demandas', url: '/demandas' },
    { name: 'Manutenções', url: '/manutencoes' },
    { name: 'Analytics', url: '/analytics' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testando ${endpoint.name}...`)
      
      const response = await fetch(`${baseUrl}${endpoint.url}?ticket=${encodeURIComponent(ticket)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log(`   Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   Tipo: ${typeof data}`)
        console.log(`   É array: ${Array.isArray(data)}`)
        console.log(`   Tamanho: ${Array.isArray(data) ? data.length : 'N/A'}`)
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   Primeiros tickets: ${data.slice(0, 3).map(item => `"${item.ticket}"`).join(', ')}`)
          
          const exactMatch = data.find(item => item.ticket === ticket)
          if (exactMatch) {
            console.log(`   ✅ ENCONTRADO ticket exato "${ticket}"`)
          } else {
            console.log(`   ❌ NÃO encontrado ticket exato "${ticket}"`)
          }
        } else {
          console.log(`   ✅ Nenhum registro encontrado (correto)`)
        }
      } else {
        console.log(`   ❌ Erro: ${response.status} ${response.statusText}`)
      }
      
    } catch (error) {
      console.error(`   ❌ Erro ao testar ${endpoint.name}:`, error.message)
    }
  }
}

testTicketEndpoints()