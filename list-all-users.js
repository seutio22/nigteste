const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAllUsers() {
  try {
    console.log('🔍 Buscando todos os usuários no banco de dados...\n')
    
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`✅ Total de usuários encontrados: ${allUsers.length}\n`)
    console.log('=' .repeat(80))
    
    allUsers.forEach((user, index) => {
      console.log(`\n📋 Usuário #${index + 1}:`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - Nome: ${user.name}`)
      console.log(`   - Email: ${user.email}`)
      console.log(`   - Role: ${user.role}`)
      console.log(`   - Ativo: ${user.active ? 'Sim' : 'Não'}`)
      console.log(`   - Criado em: ${user.createdAt}`)
      
      // Verificar permissões
      if (user.permissions) {
        try {
          const perms = JSON.parse(user.permissions)
          const cadastroPerms = perms.cadastro
          
          if (cadastroPerms) {
            console.log(`   - Permissões CADASTRO:`)
            console.log(`      • Visualizar: ${cadastroPerms.view ? '✅' : '❌'}`)
            console.log(`      • Criar: ${cadastroPerms.create ? '✅' : '❌'}`)
            console.log(`      • Editar: ${cadastroPerms.edit ? '✅' : '❌'}`)
            console.log(`      • Excluir: ${cadastroPerms.delete ? '✅' : '❌'}`)
            console.log(`      • Exportar: ${cadastroPerms.export ? '✅' : '❌'}`)
            console.log(`      • Importar: ${cadastroPerms.import ? '✅' : '❌'}`)
          } else {
            console.log(`   - ⚠️  Sem permissões para CADASTRO`)
          }
        } catch (e) {
          console.log(`   - ❌ Erro ao parsear permissões: ${e.message}`)
        }
      } else {
        console.log(`   - ⚠️  Sem permissões definidas`)
      }
      
      console.log('-'.repeat(80))
    })
    
    console.log('\n📊 RESUMO:')
    const byRole = {}
    allUsers.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1
    })
    
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} usuário(s)`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAllUsers()

