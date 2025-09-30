// Teste simples do endpoint tiposCadastro

async function testTipoCadastroEndpointSimple() {
  try {
    console.log('🔍 Testando endpoint /tiposCadastro...')
    
    // 1. Fazer login
    const loginResponse = await fetch('http://localhost:3333/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error('Erro no login')
    }
    
    const tokenData = await loginResponse.json()
    const headers = { 'Authorization': `Bearer ${tokenData.token}` }
    
    // 2. Testar listagem
    console.log('\n📋 Testando listagem...')
    const listResponse = await fetch('http://localhost:3333/tiposCadastro', { headers })
    console.log('📊 Status:', listResponse.status)
    
    if (listResponse.ok) {
      const tipos = await listResponse.json()
      console.log('✅ Listagem funcionando!')
      console.log('📋 Tipos encontrados:', tipos.length)
      if (tipos.length > 0) {
        console.log('📋 Primeiro tipo:', tipos[0])
      }
    } else {
      const errorText = await listResponse.text()
      console.error('❌ Erro na listagem:', errorText)
    }
    
    // 3. Testar criação
    console.log('\n📝 Testando criação...')
    const novoCadastro = {
      nome: 'Teste Novo Modelo ' + new Date().toISOString().slice(0, 19)
    }
    
    const createResponse = await fetch('http://localhost:3333/tiposCadastro', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
      },
      body: JSON.stringify(novoCadastro)
    })
    
    console.log('📊 Status da criação:', createResponse.status)
    
    if (createResponse.ok) {
      const tipoCriado = await createResponse.json()
      console.log('✅ Criação funcionando!')
      console.log('📋 Tipo criado:', tipoCriado)
    } else {
      const errorText = await createResponse.text()
      console.error('❌ Erro na criação:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

testTipoCadastroEndpointSimple()
