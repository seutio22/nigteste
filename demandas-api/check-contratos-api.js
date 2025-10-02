const https = require('https')

async function checkContratosAPI() {
  try {
    console.log('🔍 Verificando contratos via API de produção...')
    console.log('')
    
    // URL da API de produção
    const apiUrl = 'https://nigteste-production.up.railway.app'
    
    // Fazer requisição para buscar contratos (apenas ativos - padrão)
    console.log('📡 Buscando contratos ativos...')
    const contratosAtivos = await fetch(`${apiUrl}/contratos`)
      .then(response => response.json())
      .catch(error => {
        console.error('❌ Erro ao buscar contratos ativos:', error.message)
        return []
      })
    
    // Fazer requisição para buscar todos os contratos (incluindo inativos)
    console.log('📡 Buscando todos os contratos (incluindo inativos)...')
    const todosContratos = await fetch(`${apiUrl}/contratos?includeInactive=true`)
      .then(response => response.json())
      .catch(error => {
        console.error('❌ Erro ao buscar todos os contratos:', error.message)
        return []
      })
    
    console.log('')
    console.log('📊 Resultados:')
    console.log(`   ✅ Contratos ativos (filtro padrão): ${contratosAtivos.length}`)
    console.log(`   📋 Total de contratos (incluindo inativos): ${todosContratos.length}`)
    console.log(`   ❌ Contratos inativos: ${todosContratos.length - contratosAtivos.length}`)
    console.log('')
    
    if (todosContratos.length > contratosAtivos.length) {
      console.log('🎯 Contratos inativos encontrados:')
      const contratosInativos = todosContratos.filter(contrato => 
        !contratosAtivos.some(ativo => ativo.id === contrato.id)
      )
      
      contratosInativos.forEach((contrato, index) => {
        console.log(`   ${index + 1}. ${contrato.numero || contrato.codigo || 'Sem número'}`)
        console.log(`      Status: ${contrato.status || 'Sem status'}`)
        console.log(`      Grupo: ${contrato.grupoEconomico || 'Não informado'}`)
        console.log('')
      })
    } else {
      console.log('✅ Todos os contratos estão ativos - não há contratos inativos no banco.')
    }
    
    // Mostrar alguns exemplos de contratos
    if (todosContratos.length > 0) {
      console.log('📋 Exemplos de contratos no banco:')
      todosContratos.slice(0, 5).forEach((contrato, index) => {
        console.log(`   ${index + 1}. ${contrato.numero || contrato.codigo || 'Sem número'}`)
        console.log(`      Status: ${contrato.status || 'Sem status'}`)
        console.log(`      Grupo: ${contrato.grupoEconomico || 'Não informado'}`)
        console.log(`      Criado: ${new Date(contrato.createdAt).toLocaleDateString('pt-BR')}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

checkContratosAPI()
