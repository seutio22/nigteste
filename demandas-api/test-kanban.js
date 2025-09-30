const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3333'

async function testKanbanRoutes() {
  try {
    console.log('🧪 Testando rotas do Kanban...')
    
    // Teste 1: GET /kanban/tickets
    console.log('\n📋 Teste 1: GET /kanban/tickets')
    try {
      const response = await fetch(`${BASE_URL}/kanban/tickets`)
      if (response.ok) {
        const tickets = await response.json()
        console.log('✅ GET /kanban/tickets funcionando!')
        console.log(`📊 Total de tickets: ${tickets.length}`)
        if (tickets.length > 0) {
          console.log('📋 Primeiro ticket:', {
            id: tickets[0].id,
            title: tickets[0].title,
            status: tickets[0].status,
            type: tickets[0].type
          })
        }
      } else {
        console.log(`❌ GET /kanban/tickets falhou: ${response.status}`)
      }
    } catch (error) {
      console.log('❌ Erro no GET /kanban/tickets:', error.message)
    }
    
    // Teste 2: POST /kanban/tickets (criar projeto)
    console.log('\n📋 Teste 2: POST /kanban/tickets (projeto)')
    try {
      const projectData = {
        type: 'project',
        title: 'Projeto Teste Kanban',
        description: 'Projeto criado via API do Kanban',
        status: 'todo',
        priority: 'medium',
        assignee: 'unassigned',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
      }
      
      const response = await fetch(`${BASE_URL}/kanban/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })
      
      if (response.ok) {
        const createdProject = await response.json()
        console.log('✅ POST /kanban/tickets (projeto) funcionando!')
        console.log('📋 Projeto criado:', {
          id: createdProject.id,
          title: createdProject.title,
          status: createdProject.status
        })
        
        // Teste 3: PUT /kanban/tickets (atualizar projeto)
        console.log('\n📋 Teste 3: PUT /kanban/tickets (atualizar projeto)')
        const updateData = {
          title: 'Projeto Teste Kanban - Atualizado',
          status: 'in-progress',
          priority: 'high'
        }
        
        const updateResponse = await fetch(`${BASE_URL}/kanban/tickets/${createdProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (updateResponse.ok) {
          const updatedProject = await updateResponse.json()
          console.log('✅ PUT /kanban/tickets funcionando!')
          console.log('📋 Projeto atualizado:', {
            id: updatedProject.id,
            title: updatedProject.title,
            status: updatedProject.status,
            priority: updatedProject.priority
          })
        } else {
          console.log(`❌ PUT /kanban/tickets falhou: ${updateResponse.status}`)
        }
        
        // Teste 4: DELETE /kanban/tickets (deletar projeto)
        console.log('\n📋 Teste 4: DELETE /kanban/tickets (deletar projeto)')
        const deleteResponse = await fetch(`${BASE_URL}/kanban/tickets/${createdProject.id}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          const deleteResult = await deleteResponse.json()
          console.log('✅ DELETE /kanban/tickets funcionando!')
          console.log('📋 Resultado:', deleteResult)
        } else {
          console.log(`❌ DELETE /kanban/tickets falhou: ${deleteResponse.status}`)
        }
        
      } else {
        console.log(`❌ POST /kanban/tickets falhou: ${response.status}`)
        const errorText = await response.text()
        console.log('📋 Erro:', errorText)
      }
    } catch (error) {
      console.log('❌ Erro no POST /kanban/tickets:', error.message)
    }
    
    console.log('\n🎉 Testes do Kanban concluídos!')
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error)
  }
}

testKanbanRoutes()
