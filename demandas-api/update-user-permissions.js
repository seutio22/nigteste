const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateUserPermissions() {
  try {
    console.log('🔐 Atualizando permissões do usuário administrador...')
    
    // Permissões de administrador (acesso total a tudo)
    const adminPermissions = {
      home: { view: true, create: true, edit: true, delete: true },
      dashboard: { view: true, create: true, edit: true, delete: true },
      cadastro: { view: true, create: true, edit: true, delete: true },
      manutencao: { view: true, create: true, edit: true, delete: true },
      atendimento: { view: true, create: true, edit: true, delete: true },
      comunicados: { view: true, create: true, edit: true, delete: true },
      validacao: { view: true, create: true, edit: true, delete: true },
      reajuste: { view: true, create: true, edit: true, delete: true },
      mailling: { view: true, create: true, edit: true, delete: true },
      analytics: { view: true, create: true, edit: true, delete: true },
      kanban: { view: true, create: true, edit: true, delete: true },
      projetos: { view: true, create: true, edit: true, delete: true },
      dados: { view: true, create: true, edit: true, delete: true },
      usuarios: { view: true, create: true, edit: true, delete: true },
      configuracoes: { view: true, create: true, edit: true, delete: true },
      relatorios: { view: true, create: true, edit: true, delete: true }
    }
    
    // Atualizar usuário com permissões
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@admin.com' },
      data: { 
        permissions: JSON.stringify(adminPermissions)
      }
    })
    
    console.log('✅ Permissões atualizadas com sucesso!')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   Permissões: Administrador completo`)
    
    console.log('\n🔐 Agora você tem acesso total a todos os módulos!')
    
  } catch (error) {
    console.error('❌ Erro ao atualizar permissões:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserPermissions()
