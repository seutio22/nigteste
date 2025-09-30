const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    console.log('👤 Criando usuário administrador com suas credenciais...')
    
    // Dados do usuário
    const userData = {
      name: 'Administrador',
      email: 'admin@admin.com',
      password: await bcrypt.hash('admin123', 10), // Senha: admin123
      role: 'admin',
      active: true
    }
    
    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })
    
    if (existingUser) {
      console.log('⚠️ Usuário já existe! Atualizando senha...')
      
      // Atualizar senha
      const updatedUser = await prisma.user.update({
        where: { email: userData.email },
        data: { password: userData.password }
      })
      
      console.log('✅ Senha atualizada com sucesso!')
      console.log(`   Email: ${updatedUser.email}`)
      console.log(`   Senha: admin123`)
    } else {
      // Criar usuário
      const user = await prisma.user.create({
        data: userData
      })
      
      console.log('✅ Usuário criado com sucesso!')
      console.log(`   ID: ${user.id}`)
      console.log(`   Nome: ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
    }
    
    console.log('\n🔐 Suas credenciais para login:')
    console.log('   Email: admin@admin.com')
    console.log('   Senha: admin123')
    
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar usuário:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
