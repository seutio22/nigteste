const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixEMYLIPermissions() {
  try {
    console.log('🔍 Buscando usuária EMYLI...')
    
    const user = await prisma.user.findFirst({
      where: { name: 'EMYLI' }
    })

    if (!user) {
      console.log('❌ Usuária EMYLI não encontrada')
      return
    }

    console.log('✅ Usuária encontrada:', user.name)
    console.log('📋 Permissões atuais:', user.permissions)

    // Parse das permissões atuais
    let permissions = JSON.parse(user.permissions)
    
    console.log('🔍 Permissão atual de DELETE para CADASTRO:', permissions.cadastro?.delete)

    // Atualizar permissão de delete para cadastro
    permissions.cadastro.delete = true

    console.log('✅ Nova permissão de DELETE para CADASTRO:', permissions.cadastro.delete)

    // Salvar no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        permissions: JSON.stringify(permissions)
      }
    })

    console.log('✅ Permissões atualizadas com sucesso!')
    
    // Verificar
    const updated = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    const updatedPermissions = JSON.parse(updated.permissions)
    console.log('✅ Verificação - DELETE para CADASTRO agora é:', updatedPermissions.cadastro.delete)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixEMYLIPermissions()

