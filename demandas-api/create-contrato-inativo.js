const https = require('https')

async function createContratoInativo() {
  try {
    console.log('🔍 Criando contrato inativo para teste...')
    console.log('')
    
    const apiUrl = 'https://nigteste-production.up.railway.app'
    
    // Primeiro, buscar um cliente para vincular o contrato
    console.log('📡 Buscando clientes...')
    const clientes = await fetch(`${apiUrl}/clientes`)
      .then(response => response.json())
      .catch(error => {
        console.error('❌ Erro ao buscar clientes:', error.message)
        return []
      })
    
    if (clientes.length === 0) {
      console.log('❌ Nenhum cliente encontrado. Criando cliente primeiro...')
      
      // Criar um cliente
      const novoCliente = await fetch(`${apiUrl}/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: 'Cliente Teste',
          grupoEconomico: 'GRUPO_TESTE'
        })
      })
      .then(response => response.json())
      .catch(error => {
        console.error('❌ Erro ao criar cliente:', error.message)
        return null
      })
      
      if (novoCliente) {
        console.log('✅ Cliente criado:', novoCliente.nome)
        clientes.push(novoCliente)
      }
    }
    
    if (clientes.length === 0) {
      console.log('❌ Não foi possível obter um cliente. Abortando.')
      return
    }
    
    const cliente = clientes[0]
    console.log(`✅ Usando cliente: ${cliente.nome} (ID: ${cliente.id})`)
    
    // Criar contrato inativo
    const contratoInativo = {
      numero: `INATIVO-${Date.now()}`,
      codigo: `CTR-INATIVO-${Date.now()}`,
      grupoEconomico: 'GRUPO_TESTE',
      clienteId: cliente.id,
      status: 'Inativo'
    }
    
    console.log('📡 Criando contrato inativo...')
    console.log('   Dados:', JSON.stringify(contratoInativo, null, 2))
    
    const resultado = await fetch(`${apiUrl}/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contratoInativo)
    })
    .then(response => {
      console.log(`   Status da resposta: ${response.status}`)
      return response.json()
    })
    .catch(error => {
      console.error('❌ Erro ao criar contrato:', error.message)
      return null
    })
    
    if (resultado) {
      console.log('✅ Contrato inativo criado com sucesso!')
      console.log('   ID:', resultado.id)
      console.log('   Número:', resultado.numero)
      console.log('   Status:', resultado.status)
      console.log('')
      
      // Testar o filtro novamente
      console.log('🔍 Testando filtro após criação do contrato inativo...')
      
      const contratosAtivos = await fetch(`${apiUrl}/contratos`)
        .then(response => response.json())
        .catch(() => [])
      
      const todosContratos = await fetch(`${apiUrl}/contratos?includeInactive=true`)
        .then(response => response.json())
        .catch(() => [])
      
      console.log(`📊 Resultados:`)
      console.log(`   ✅ Contratos ativos: ${contratosAtivos.length}`)
      console.log(`   📋 Total de contratos: ${todosContratos.length}`)
      console.log(`   ❌ Contratos inativos: ${todosContratos.length - contratosAtivos.length}`)
      
      if (todosContratos.length > contratosAtivos.length) {
        console.log('')
        console.log('🎯 Contratos inativos encontrados:')
        const contratosInativos = todosContratos.filter(c => 
          !contratosAtivos.some(ativo => ativo.id === c.id)
        )
        contratosInativos.forEach((c, i) => {
          console.log(`   ${i+1}. ${c.numero || c.codigo} - Status: ${c.status}`)
        })
      }
      
    } else {
      console.log('❌ Falha ao criar contrato inativo')
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

createContratoInativo()
