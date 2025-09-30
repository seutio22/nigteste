const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    console.log('👤 Criando usuário administrador...')
    
    // Dados do usuário
    const userData = {
      name: 'Administrador',
      email: 'admin@demandas.com',
      password: await bcrypt.hash('123456', 10), // Senha: 123456
      role: 'admin',
      active: true
    }
    
    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })
    
    if (existingUser) {
      console.log('⚠️ Usuário já existe!')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Nome: ${existingUser.name}`)
      console.log(`   Role: ${existingUser.role}`)
      return
    }
    
    // Criar usuário
    const user = await prisma.user.create({
      data: userData
    })
    
    console.log('✅ Usuário criado com sucesso!')
    console.log(`   ID: ${user.id}`)
    console.log(`   Nome: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Senha: 123456`)
    
    console.log('\n🔐 Credenciais para login:')
    console.log('   Email: admin@demandas.com')
    console.log('   Senha: 123456')
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
