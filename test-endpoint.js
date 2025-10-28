// Script para testar o endpoint /analytics?ticket=1212
const baseUrl = 'https://nigteste-production.up.railway.app'

async function testAnalyticsEndpoint() {
  try {
    console.log('🔍 Testando endpoint /analytics?ticket=1212...')
    
    const response = await fetch(`${baseUrl}/analytics?ticket=1212`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('📡 Status da resposta:', response.status)
    console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('❌ Erro na resposta:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    
    console.log('📋 Dados retornados:')
    console.log('   - Tipo:', typeof data)
    console.log('   - É array?', Array.isArray(data))
    console.log('   - Tamanho:', Array.isArray(data) ? data.length : 'N/A')
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('📋 Primeiros 3 registros:')
      data.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`)
        console.log(`      Ticket: "${item.ticket}"`)
        console.log(`      Título: ${item.titulo}`)
        console.log(`      Analista: ${item.analista}`)
        console.log(`      Status: ${item.status}`)
        console.log('')
      })
      
      // Verificar se algum tem ticket "1212"
      const exactMatch = data.find(item => item.ticket === '1212')
      if (exactMatch) {
        console.log('🎯 ENCONTRADO registro com ticket exato "1212":')
        console.log('   - ID:', exactMatch.id)
        console.log('   - Título:', exactMatch.titulo)
        console.log('   - Analista:', exactMatch.analista)
      } else {
        console.log('❌ NENHUM registro encontrado com ticket exato "1212"')
        console.log('🔍 Tickets encontrados:', data.map(item => `"${item.ticket}"`).join(', '))
      }
    } else {
      console.log('📋 Dados vazios ou não é array')
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error)
  }
}

testAnalyticsEndpoint()
