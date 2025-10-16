const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function findEMYLI() {
  try {
    console.log('🔍 Buscando todos os usuários no banco...')
    
    const allUsers = await prisma.user.findMany()
    
    console.log(`✅ Total de usuários encontrados: ${allUsers.length}`)
    
    allUsers.forEach(user => {
      console.log(`\n📋 Usuário:`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - Name: ${user.name}`)
      console.log(`   - Email: ${user.email}`)
      console.log(`   - Role: ${user.role}`)
      
      if (user.name.includes('EMYLI') || user.name.includes('Emyli') || user.email.includes('emyli')) {
        console.log(`\n🎯 ENCONTROU EMYLI!`)
        console.log(`   - Permissões (raw):`, user.permissions)
        
        if (user.permissions) {
          try {
            const perms = JSON.parse(user.permissions)
            console.log(`   - Permissão DELETE para CADASTRO:`, perms.cadastro?.delete)
          } catch (e) {
            console.log(`   - Erro ao parsear permissões:`, e.message)
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findEMYLI()

