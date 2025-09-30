// Script para testar as funcionalidades de comunicados
const BASE_URL = 'http://localhost:3333'

async function testComunicados() {
  console.log('🔍 Testando funcionalidades de comunicados...')
  
  try {
    // 1. Testar listagem de comunicados
    console.log('\n🔍 Testando: GET /comunicados')
    const response = await fetch(`${BASE_URL}/comunicados`)
    
    if (!response.ok) {
      console.error(`❌ GET /comunicados: HTTP ${response.status}`)
      return
    }
    
    const comunicados = await response.json()
    console.log(`✅ GET /comunicados: ${comunicados.length} comunicados encontrados`)
    
    if (comunicados.length === 0) {
      console.log('⚠️ Nenhum comunicado encontrado para testar')
      return
    }
    
    const comunicado = comunicados[0]
    console.log(`🔍 Usando comunicado para testes: ${comunicado.titulo} (ID: ${comunicado.id})`)
    
    // 2. Testar reação (like)
    console.log('\n🔍 Testando: POST /comunicados/:id/reacoes (like)')
    const reacaoResponse = await fetch(`${BASE_URL}/comunicados/${comunicado.id}/reacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo: 'like',
        usuarioId: 'test-user-1',
        usuarioNome: 'Usuário Teste'
      })
    })
    
    if (!reacaoResponse.ok) {
      console.error(`❌ POST /comunicados/:id/reacoes: HTTP ${reacaoResponse.status}`)
      const errorText = await reacaoResponse.text()
      console.error(`   Erro: ${errorText}`)
    } else {
      console.log('✅ POST /comunicados/:id/reacoes (like): Sucesso')
    }
    
    // 3. Testar comentário
    console.log('\n🔍 Testando: POST /comunicados/:id/comentarios')
    const comentarioResponse = await fetch(`${BASE_URL}/comunicados/${comunicado.id}/comentarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        autor: 'Usuário Teste',
        autorId: 'test-user-1',
        conteudo: 'Este é um comentário de teste'
      })
    })
    
    if (!comentarioResponse.ok) {
      console.error(`❌ POST /comunicados/:id/comentarios: HTTP ${comentarioResponse.status}`)
      const errorText = await comentarioResponse.text()
      console.error(`   Erro: ${errorText}`)
    } else {
      console.log('✅ POST /comunicados/:id/comentarios: Sucesso')
    }
    
    // 4. Testar visualização
    console.log('\n🔍 Testando: POST /comunicados/:id/visualizacoes')
    const visualizacaoResponse = await fetch(`${BASE_URL}/comunicados/${comunicado.id}/visualizacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuarioId: 'test-user-1',
        usuarioNome: 'Usuário Teste',
        usuarioRole: 'analista'
      })
    })
    
    if (!visualizacaoResponse.ok) {
      console.error(`❌ POST /comunicados/:id/visualizacoes: HTTP ${visualizacaoResponse.status}`)
      const errorText = await visualizacaoResponse.text()
      console.error(`   Erro: ${errorText}`)
    } else {
      console.log('✅ POST /comunicados/:id/visualizacoes: Sucesso')
    }
    
    // 5. Verificar comunicado atualizado
    console.log('\n🔍 Testando: GET /comunicados/:id (para verificar atualizações)')
    const updatedResponse = await fetch(`${BASE_URL}/comunicados/${comunicado.id}`)
    
    if (!updatedResponse.ok) {
      console.error(`❌ GET /comunicados/:id: HTTP ${updatedResponse.status}`)
    } else {
      const updatedComunicado = await updatedResponse.json()
      console.log('✅ GET /comunicados/:id: Sucesso')
      console.log(`   Reações: ${updatedComunicado.reacoes?.likes?.length || 0} likes, ${updatedComunicado.reacoes?.dislikes?.length || 0} dislikes`)
      console.log(`   Comentários: ${updatedComunicado.reacoes?.comentarios?.length || 0}`)
      console.log(`   Visualizações: ${updatedComunicado.visualizacoes?.length || 0}`)
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
  }
}

// Executar teste
testComunicados().catch(console.error)
