// Script para testar a API de áreas diretamente
const fetch = require('node-fetch')

async function testApiAreas() {
  try {
    console.log('🔍 Testando API de áreas...')
    
    const baseUrl = 'http://localhost:3001' // Assumindo que o backend está rodando na porta 3001
    
    // Primeiro, criar uma área
    console.log('📝 Criando área via API...')
    const createResponse = await fetch(`${baseUrl}/areas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: 'Área de Teste API - ' + Date.now()
      })
    })
    
    if (!createResponse.ok) {
      console.error('❌ Erro ao criar área:', createResponse.status, createResponse.statusText)
      return
    }
    
    const createdArea = await createResponse.json()
    console.log(`✅ Área criada via API: ${createdArea.nome} (ID: ${createdArea.id})`)
    
    // Agora tentar excluir
    console.log('🗑️ Tentando excluir área via API...')
    const deleteResponse = await fetch(`${baseUrl}/areas/${createdArea.id}`, {
      method: 'DELETE'
    })
    
    console.log(`📊 Status da exclusão: ${deleteResponse.status}`)
    
    if (deleteResponse.ok) {
      console.log('✅ Área excluída com sucesso via API')
    } else {
      const errorText = await deleteResponse.text()
      console.error('❌ Erro ao excluir área via API:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API de áreas:', error)
  }
}

testApiAreas()
