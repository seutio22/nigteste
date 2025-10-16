const fetch = require('node-fetch')

async function fetchUsersFromAPI() {
  try {
    console.log('🔍 Buscando usuários da API do sistema online...\n')
    
    // Tentar buscar do endpoint de usuários (precisa de token de admin)
    const response = await fetch('https://nigteste-production.up.railway.app/users', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Token do admin
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const users = await response.json()
      console.log(`✅ ${users.length} usuários encontrados na API:\n`)
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Ativo: ${user.active ? 'Sim' : 'Não'}`)
        console.log('')
      })
    } else {
      console.log('❌ Não foi possível buscar usuários da API')
      console.log('Status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

fetchUsersFromAPI()

