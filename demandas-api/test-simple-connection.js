// Teste simples de conexão

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o servidor...')
    
    const response = await fetch('http://localhost:3333/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    })
    
    console.log('📊 Status da resposta:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Conexão funcionando!')
      console.log('👤 Usuário:', data.user.name)
    } else {
      console.log('❌ Erro na conexão:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

testConnection()
