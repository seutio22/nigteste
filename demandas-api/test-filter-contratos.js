const https = require('https')

async function testFilterContratos() {
  try {
    console.log('🔍 Testando filtro de contratos...')
    console.log('')
    
    const apiUrl = 'https://nigteste-production.up.railway.app'
    
    // Teste 1: Buscar contratos sem parâmetro (deve retornar apenas ativos)
    console.log('📡 Teste 1: Buscando contratos SEM parâmetro (apenas ativos)')
    const contratosSemParametro = await fetch(`${apiUrl}/contratos`)
      .then(response => {
        console.log(`   Status: ${response.status}`)
        return response.json()
      })
      .catch(error => {
        console.error('   ❌ Erro:', error.message)
        return []
      })
    
    console.log(`   📊 Resultado: ${contratosSemParametro.length} contrato(s)`)
    if (contratosSemParametro.length > 0) {
      contratosSemParametro.forEach((c, i) => {
        console.log(`      ${i+1}. ${c.numero || c.codigo || 'Sem número'} - Status: ${c.status}`)
      })
    }
    console.log('')
    
    // Teste 2: Buscar contratos com includeInactive=false (deve retornar apenas ativos)
    console.log('📡 Teste 2: Buscando contratos com includeInactive=false')
    const contratosInactiveFalse = await fetch(`${apiUrl}/contratos?includeInactive=false`)
      .then(response => {
        console.log(`   Status: ${response.status}`)
        return response.json()
      })
      .catch(error => {
        console.error('   ❌ Erro:', error.message)
        return []
      })
    
    console.log(`   📊 Resultado: ${contratosInactiveFalse.length} contrato(s)`)
    if (contratosInactiveFalse.length > 0) {
      contratosInactiveFalse.forEach((c, i) => {
        console.log(`      ${i+1}. ${c.numero || c.codigo || 'Sem número'} - Status: ${c.status}`)
      })
    }
    console.log('')
    
    // Teste 3: Buscar contratos com includeInactive=true (deve retornar todos)
    console.log('📡 Teste 3: Buscando contratos com includeInactive=true')
    const todosContratos = await fetch(`${apiUrl}/contratos?includeInactive=true`)
      .then(response => {
        console.log(`   Status: ${response.status}`)
        return response.json()
      })
      .catch(error => {
        console.error('   ❌ Erro:', error.message)
        return []
      })
    
    console.log(`   📊 Resultado: ${todosContratos.length} contrato(s)`)
    if (todosContratos.length > 0) {
      todosContratos.forEach((c, i) => {
        console.log(`      ${i+1}. ${c.numero || c.codigo || 'Sem número'} - Status: ${c.status}`)
      })
    }
    console.log('')
    
    // Análise dos resultados
    console.log('📋 Análise dos resultados:')
    console.log(`   🔴 Sem parâmetro: ${contratosSemParametro.length} contratos`)
    console.log(`   🟡 includeInactive=false: ${contratosInactiveFalse.length} contratos`)
    console.log(`   🟢 includeInactive=true: ${todosContratos.length} contratos`)
    console.log('')
    
    // Verificar se o filtro está funcionando
    if (contratosSemParametro.length === contratosInactiveFalse.length) {
      console.log('✅ Filtro funcionando: Sem parâmetro = includeInactive=false')
    } else {
      console.log('❌ Problema: Sem parâmetro ≠ includeInactive=false')
    }
    
    if (todosContratos.length >= contratosSemParametro.length) {
      console.log('✅ Filtro funcionando: includeInactive=true ≥ sem parâmetro')
    } else {
      console.log('❌ Problema: includeInactive=true < sem parâmetro')
    }
    
    // Verificar se há contratos inativos
    const contratosInativos = todosContratos.filter(c => 
      !contratosSemParametro.some(ativo => ativo.id === c.id)
    )
    
    if (contratosInativos.length > 0) {
      console.log(`✅ Contratos inativos encontrados: ${contratosInativos.length}`)
      contratosInativos.forEach((c, i) => {
        console.log(`   ${i+1}. ${c.numero || c.codigo || 'Sem número'} - Status: ${c.status}`)
      })
    } else {
      console.log('ℹ️ Nenhum contrato inativo encontrado no banco')
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

testFilterContratos()
