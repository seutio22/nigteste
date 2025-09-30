const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔐 Criando usuário administrador...')
    
    // Hash da senha
    const adminPassword = await bcrypt.hash('admin123', 10)
    
    // Criar usuário admin
    const adminUser = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@admin.com',
        password: adminPassword,
        role: 'admin',
        active: true,
        viewOwnDataOnly: false,
        permissions: JSON.stringify({
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
          usuarios: { view: true, create: true, edit: true, delete: true }
        })
      }
    })

    console.log('✅ Usuário administrador criado com sucesso!')
    console.log(`📧 Email: ${adminUser.email}`)
    console.log(`🔑 Senha: admin123`)
    console.log(`👑 Role: ${adminUser.role}`)
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
