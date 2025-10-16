const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const fullPermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  export: true,
  import: true,
  approve: true,
  reject: true
}

const standardPermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  export: true,
  import: true,
  approve: false,
  reject: false
}

const analistaPermission = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  export: true,
  import: true,
  approve: false,
  reject: false
}

const readOnlyPermission = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  export: true,
  import: false,
  approve: false,
  reject: false
}

const solicitantePermission = {
  view: true,
  create: true,
  edit: false,
  delete: false,
  export: false,
  import: false,
  approve: false,
  reject: false
}

const noPermission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  export: false,
  import: false,
  approve: false,
  reject: false
}

// Função para gerar permissões baseadas no role
function getPermissionsByRole(role) {
  switch (role) {
    case 'admin':
      return {
        home: fullPermission,
        dashboard: fullPermission,
        cadastro: fullPermission,
        manutencao: fullPermission,
        atendimento: fullPermission,
        comunicados: fullPermission,
        validacao: fullPermission,
        reajuste: fullPermission,
        mailling: fullPermission,
        analytics: fullPermission,
        kanban: fullPermission,
        projetos: fullPermission,
        dados: fullPermission,
        usuarios: fullPermission,
        configuracoes: fullPermission,
        relatorios: fullPermission
      }
    
    case 'gerente':
      return {
        home: fullPermission,
        dashboard: fullPermission,
        cadastro: { ...standardPermission, delete: true },
        manutencao: { ...standardPermission, delete: true },
        atendimento: { ...standardPermission, delete: true },
        comunicados: fullPermission,
        validacao: { ...standardPermission, delete: true },
        reajuste: { ...standardPermission, approve: true, delete: true },
        mailling: { ...standardPermission, delete: true },
        analytics: fullPermission,
        kanban: fullPermission,
        projetos: fullPermission,
        dados: { ...standardPermission, delete: true },
        usuarios: readOnlyPermission,
        configuracoes: readOnlyPermission,
        relatorios: fullPermission
      }
    
    case 'analista':
      return {
        home: standardPermission,
        dashboard: standardPermission,
        cadastro: analistaPermission,
        manutencao: analistaPermission,
        atendimento: analistaPermission,
        comunicados: readOnlyPermission,
        validacao: analistaPermission,
        reajuste: analistaPermission,
        mailling: analistaPermission,
        analytics: analistaPermission,
        kanban: standardPermission,
        projetos: standardPermission,
        dados: analistaPermission,
        usuarios: readOnlyPermission,
        configuracoes: readOnlyPermission,
        relatorios: analistaPermission
      }
    
    case 'solicitante':
      return {
        home: readOnlyPermission,
        dashboard: readOnlyPermission,
        cadastro: solicitantePermission,
        manutencao: readOnlyPermission,
        atendimento: readOnlyPermission,
        comunicados: readOnlyPermission,
        validacao: readOnlyPermission,
        reajuste: readOnlyPermission,
        mailling: readOnlyPermission,
        analytics: readOnlyPermission,
        kanban: readOnlyPermission,
        projetos: readOnlyPermission,
        dados: readOnlyPermission,
        usuarios: noPermission,
        configuracoes: noPermission,
        relatorios: readOnlyPermission
      }
    
    default:
      return getPermissionsByRole('analista')
  }
}

// Lista de usuários para criar
const usersToCreate = [
  { name: 'MIKE', email: 'mike@demandas.com', role: 'gerente', password: 'mike123' },
  { name: 'DENISON', email: 'denison@demandas.com', role: 'analista', password: 'denison123' },
  { name: 'KARINA', email: 'karina@demandas.com', role: 'analista', password: 'karina123' },
  { name: 'LARISSA', email: 'larissa@demandas.com', role: 'admin', password: 'larissa123' },
  { name: 'BRUNO', email: 'bruno@demandas.com', role: 'analista', password: 'bruno123' },
  { name: 'JULIANA', email: 'juliana@demandas.com', role: 'analista', password: 'juliana123' },
  { name: 'CARLOS', email: 'carlos@demandas.com', role: 'gerente', password: 'carlos123' },
  { name: 'PATRICIA', email: 'patricia@demandas.com', role: 'analista', password: 'patricia123' },
]

async function createAllUsers() {
  try {
    console.log('🔍 Iniciando criação de usuários...\n')
    console.log('=' .repeat(80))
    
    let created = 0
    let updated = 0
    let skipped = 0
    
    for (const userData of usersToCreate) {
      console.log(`\n📝 Processando: ${userData.name} (${userData.email})`)
      
      // Verificar se usuário já existe
      const existing = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existing) {
        console.log(`   ⚠️  Usuário já existe, atualizando permissões...`)
        
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: userData.name,
            role: userData.role,
            permissions: JSON.stringify(getPermissionsByRole(userData.role)),
            active: true
          }
        })
        
        console.log(`   ✅ Permissões atualizadas!`)
        updated++
        
      } else {
        console.log(`   📝 Criando novo usuário...`)
        
        const hashedPassword = await bcrypt.hash(userData.password, 10)
        
        const user = await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            active: true,
            permissions: JSON.stringify(getPermissionsByRole(userData.role))
          }
        })
        
        console.log(`   ✅ Usuário criado! ID: ${user.id}`)
        console.log(`   📋 Role: ${user.role}`)
        console.log(`   🔑 Senha: ${userData.password}`)
        created++
      }
      
      console.log('-'.repeat(80))
    }
    
    console.log('\n📊 RESUMO DA OPERAÇÃO:')
    console.log(`   ✅ Usuários criados: ${created}`)
    console.log(`   🔄 Usuários atualizados: ${updated}`)
    console.log(`   ⏭️  Usuários ignorados: ${skipped}`)
    console.log(`   📝 Total processado: ${created + updated + skipped}`)
    
    console.log('\n📋 CREDENCIAIS DE ACESSO:')
    console.log('=' .repeat(80))
    usersToCreate.forEach(u => {
      console.log(`   ${u.name.padEnd(15)} | ${u.email.padEnd(30)} | ${u.password}`)
    })
    console.log('=' .repeat(80))
    
    // Listar todos os usuários agora
    console.log('\n✅ Todos os usuários no banco de dados:')
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`\n📊 Total de usuários: ${allUsers.length}`)
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.role}) - ${user.email}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAllUsers()

