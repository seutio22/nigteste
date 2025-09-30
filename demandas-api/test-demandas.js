const API_BASE = 'http://localhost:3333'

async function testDemandasAPI() {
  console.log('🧪 Testando API de Demandas...')
  
  try {
    // Teste 1: Verificar se a rota está funcionando
    console.log('\n1️⃣ Testando GET /demandas...')
    const response = await fetch(`${API_BASE}/demandas`)
    console.log('Status:', response.status)
    console.log('OK:', response.ok)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Dados recebidos:', data.length, 'demandas')
      if (data.length > 0) {
        console.log('Primeira demanda:', data[0])
      }
    } else {
      const errorText = await response.text()
      console.log('Erro:', errorText)
    }
    
    // Teste 2: Verificar se consegue criar uma demanda
    console.log('\n2️⃣ Testando POST /demandas...')
    
    // Primeiro, buscar IDs válidos existentes
    console.log('🔍 Buscando IDs válidos para teste...')
    const clientesResponse = await fetch(`${API_BASE}/clientes`)
    const contratosResponse = await fetch(`${API_BASE}/contratos`)
    const operadorasResponse = await fetch(`${API_BASE}/operadoras`)
    const produtosResponse = await fetch(`${API_BASE}/produtos`)
    
    const clientes = await clientesResponse.json()
    const contratos = await contratosResponse.json()
    const operadoras = await operadorasResponse.json()
    const produtos = await produtosResponse.json()
    
    if (clientes.length === 0 || contratos.length === 0 || operadoras.length === 0 || produtos.length === 0) {
      console.log('❌ Dados mestres insuficientes para teste')
      return
    }
    
    const testDemanda = {
      status: 'Aberta',
      ticket: 'DEM-202412-001',
      clienteId: clientes[0].id,
      contratoId: contratos[0].id,
      operadoraId: operadoras[0].id,
      produtoId: produtos[0].id,
      descricao: 'Demanda de teste para verificar API'
    }
    
    const createResponse = await fetch(`${API_BASE}/demandas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testDemanda)
    })
    
    console.log('Status criação:', createResponse.status)
    console.log('OK criação:', createResponse.ok)
    
    if (createResponse.ok) {
      const created = await createResponse.json()
      console.log('Demanda criada:', created)
      
      // Teste 3: Verificar se consegue buscar a demanda criada
      console.log('\n3️⃣ Testando GET /demandas após criação...')
      const getResponse = await fetch(`${API_BASE}/demandas`)
      const updatedData = await getResponse.json()
      console.log('Total de demandas após criação:', updatedData.length)
      
      // Teste 4: Deletar a demanda de teste
      console.log('\n4️⃣ Testando DELETE /demandas...')
      const deleteResponse = await fetch(`${API_BASE}/demandas/${created.id}`, {
        method: 'DELETE'
      })
      console.log('Status delete:', deleteResponse.status)
      console.log('OK delete:', deleteResponse.ok)
      
    } else {
      const errorText = await createResponse.text()
      console.log('Erro na criação:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

// Executar o teste
testDemandasAPI()
