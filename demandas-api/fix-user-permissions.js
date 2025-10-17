const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserPermissions() {
  try {
    console.log('🔧 Atualizando permissões de todos os usuários para incluir import/export em reajuste...')

    // Buscar todos os usuários
    const users = await prisma.user.findMany()
    console.log(`📊 Total de usuários encontrados: ${users.length}`)

    for (const user of users) {
      console.log(`\n🔍 Processando usuário: ${user.name} (${user.role})`)
      
      // Parse das permissões atuais
      let permissions = {}
      try {
        permissions = user.permissions ? JSON.parse(user.permissions) : {}
      } catch (error) {
        console.log(`⚠️ Erro ao parsear permissões, usando objeto vazio`)
      }

      // Atualizar permissões de reajuste
      if (user.role === 'admin' || user.role === 'gerente') {
        permissions.reajuste = {
          ...permissions.reajuste,
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true,
          approve: true,
          reject: true
        }
        
        // Atualizar analytics também
        permissions.analytics = {
          ...permissions.analytics,
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true,
          approve: true,
          reject: true
        }
      } else if (user.role === 'analista') {
        permissions.reajuste = {
          ...permissions.reajuste,
          view: true,
          create: true,
          edit: true,
          delete: false,
          export: true,
          import: true,
          approve: false,
          reject: false
        }
      }

      // Atualizar no banco
      await prisma.user.update({
        where: { id: user.id },
        data: {
          permissions: JSON.stringify(permissions)
        }
      })

      console.log(`✅ Permissões atualizadas para ${user.name}`)
      console.log(`   - reajuste.import: ${permissions.reajuste?.import}`)
      console.log(`   - reajuste.export: ${permissions.reajuste?.export}`)
    }

    console.log('\n✅ Todas as permissões foram atualizadas com sucesso!')
    console.log('\n⚠️ IMPORTANTE: Faça LOGOUT e LOGIN novamente para recarregar as permissões!')
    
  } catch (error) {
    console.error('❌ Erro ao atualizar permissões:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserPermissions()

