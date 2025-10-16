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

// Permissões para EMYLI (gerente) com DELETE habilitado para CADASTRO
const emyliPermissions = {
  home: fullPermission,
  dashboard: fullPermission,
  cadastro: { ...standardPermission, delete: true }, // DELETE HABILITADO!
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

async function createEMYLI() {
  try {
    console.log('🔍 Verificando se EMYLI já existe...')
    
    const existing = await prisma.user.findUnique({
      where: { email: 'emyli@demandas.com' }
    })

    if (existing) {
      console.log('✅ EMYLI já existe, atualizando permissões...')
      
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          permissions: JSON.stringify(emyliPermissions)
        }
      })
      
      console.log('✅ Permissões da EMYLI atualizadas com sucesso!')
      console.log('📋 DELETE para CADASTRO:', emyliPermissions.cadastro.delete)
      
    } else {
      console.log('📝 EMYLI não existe, criando usuária...')
      
      const hashedPassword = await bcrypt.hash('emyli123', 10)
      
      const user = await prisma.user.create({
        data: {
          name: 'EMYLI',
          email: 'emyli@demandas.com',
          password: hashedPassword,
          role: 'gerente',
          active: true,
          permissions: JSON.stringify(emyliPermissions)
        }
      })
      
      console.log('✅ Usuária EMYLI criada com sucesso!')
      console.log('📋 ID:', user.id)
      console.log('📋 Email:', user.email)
      console.log('📋 Role:', user.role)
      console.log('📋 DELETE para CADASTRO:', emyliPermissions.cadastro.delete)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createEMYLI()

