const https = require('https')

async function testFilterCorrect() {
  try {
    console.log('🔍 Testando filtro de contratos - ANÁLISE CORRETA DO CAMPO STATUS...')
    console.log('')
    
    const apiUrl = 'https://nigteste-production.up.railway.app'
    
    // Teste 1: Buscar contratos sem parâmetro (deve retornar apenas ativos)
    console.log('📡 Teste 1: Buscando contratos SEM parâmetro (apenas ativos)')
    const contratosSemParametro = await fetch(`${apiUrl}/contratos`)
      .then(response => {
        console.log(`   Status HTTP: ${response.status}`)
        return response.json()
      })
      .catch(error => {
        console.error('   ❌ Erro:', error.message)
        return []
      })
    
    console.log(`   📊 Resultado: ${contratosSemParametro.length} contrato(s)`)
    contratosSemParametro.forEach((c, i) => {
      console.log(`      ${i+1}. Número: ${c.numero} | Código: ${c.codigo} | STATUS: ${c.status}`)
    })
    console.log('')
    
    // Teste 2: Buscar contratos com includeInactive=true (deve retornar todos)
    console.log('📡 Teste 2: Buscando contratos com includeInactive=true')
    const todosContratos = await fetch(`${apiUrl}/contratos?includeInactive=true`)
      .then(response => {
        console.log(`   Status HTTP: ${response.status}`)
        return response.json()
      })
      .catch(error => {
        console.error('   ❌ Erro:', error.message)
        return []
      })
    
    console.log(`   📊 Resultado: ${todosContratos.length} contrato(s)`)
    todosContratos.forEach((c, i) => {
      console.log(`      ${i+1}. Número: ${c.numero} | Código: ${c.codigo} | STATUS: ${c.status}`)
    })
    console.log('')
    
    // Análise detalhada por STATUS
    console.log('📋 Análise detalhada por STATUS:')
    console.log(`   🔴 Sem parâmetro: ${contratosSemParametro.length} contratos`)
    console.log(`   🟢 includeInactive=true: ${todosContratos.length} contratos`)
    console.log(`   ❌ Contratos inativos: ${todosContratos.length - contratosSemParametro.length}`)
    console.log('')
    
    // Agrupar contratos por status
    const statusCount = todosContratos.reduce((acc, contrato) => {
      const status = contrato.status || 'Sem status'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    
    console.log('📈 Contratos por STATUS:')
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} contrato(s)`)
    })
    console.log('')
    
    // Verificar se o filtro está funcionando
    if (todosContratos.length > contratosSemParametro.length) {
      console.log('✅ Filtro funcionando: Há contratos inativos sendo filtrados')
      
      const contratosInativos = todosContratos.filter(c => 
        !contratosSemParametro.some(ativo => ativo.id === c.id)
      )
      
      console.log('🎯 Contratos inativos encontrados:')
      contratosInativos.forEach((c, i) => {
        console.log(`   ${i+1}. Número: ${c.numero} | Código: ${c.codigo} | STATUS: ${c.status}`)
      })
    } else {
      console.log('ℹ️ Todos os contratos estão ativos - não há contratos inativos no banco')
    }
    
    // Verificar se há contratos com status diferente de "Ativo"
    const contratosNaoAtivos = todosContratos.filter(c => c.status && c.status.toLowerCase() !== 'ativo')
    if (contratosNaoAtivos.length > 0) {
      console.log('')
      console.log('🔍 Contratos com status diferente de "Ativo":')
      contratosNaoAtivos.forEach((c, i) => {
        console.log(`   ${i+1}. Número: ${c.numero} | Código: ${c.codigo} | STATUS: ${c.status}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

testFilterCorrect()
