const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Estrutura completa de permissões (8 campos)
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

// Permissões padrão por role
const DEFAULT_PERMISSIONS = {
  admin: {
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
  },
  gerente: {
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
  },
  analista: {
    home: standardPermission,
    dashboard: standardPermission,
    cadastro: standardPermission,
    manutencao: standardPermission,
    atendimento: standardPermission,
    comunicados: readOnlyPermission,
    validacao: standardPermission,
    reajuste: standardPermission,
    mailling: standardPermission,
    analytics: standardPermission,
    kanban: standardPermission,
    projetos: standardPermission,
    dados: standardPermission,
    usuarios: readOnlyPermission,
    configuracoes: readOnlyPermission,
    relatorios: standardPermission
  },
  solicitante: {
    home: readOnlyPermission,
    dashboard: readOnlyPermission,
    cadastro: { view: true, create: true, edit: false, delete: false, export: false, import: false, approve: false, reject: false },
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
    usuarios: { view: false, create: false, edit: false, delete: false, export: false, import: false, approve: false, reject: false },
    configuracoes: { view: false, create: false, edit: false, delete: false, export: false, import: false, approve: false, reject: false },
    relatorios: readOnlyPermission
  }
}

async function fixAllUsersPermissions() {
  try {
    console.log('🔍 Buscando todos os usuários...')
    
    const users = await prisma.user.findMany()
    
    console.log(`✅ Encontrados ${users.length} usuários`)

    for (const user of users) {
      console.log(`\n📝 Processando usuário: ${user.name} (${user.role})`)
      
      let currentPermissions = null
      try {
        currentPermissions = user.permissions ? JSON.parse(user.permissions) : null
      } catch (e) {
        console.log(`⚠️  Erro ao parsear permissões atuais, usando padrão do role`)
      }

      // Obter permissões padrão para o role do usuário
      const defaultPermissions = DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.analista
      
      // Se o usuário já tem permissões customizadas, manter e apenas garantir que todos os 8 campos existam
      let newPermissions = {}
      
      if (currentPermissions && typeof currentPermissions === 'object') {
        // Usuário tem permissões customizadas, vamos apenas completar os campos faltantes
        console.log('   ℹ️  Usuário tem permissões customizadas, completando campos faltantes...')
        
        for (const module of Object.keys(defaultPermissions)) {
          if (!currentPermissions[module]) {
            // Módulo não existe, usar padrão
            newPermissions[module] = defaultPermissions[module]
          } else {
            // Módulo existe, garantir que tem todos os 8 campos
            newPermissions[module] = {
              view: currentPermissions[module].view !== undefined ? currentPermissions[module].view : defaultPermissions[module].view,
              create: currentPermissions[module].create !== undefined ? currentPermissions[module].create : defaultPermissions[module].create,
              edit: currentPermissions[module].edit !== undefined ? currentPermissions[module].edit : defaultPermissions[module].edit,
              delete: currentPermissions[module].delete !== undefined ? currentPermissions[module].delete : defaultPermissions[module].delete,
              export: currentPermissions[module].export !== undefined ? currentPermissions[module].export : defaultPermissions[module].export,
              import: currentPermissions[module].import !== undefined ? currentPermissions[module].import : defaultPermissions[module].import,
              approve: currentPermissions[module].approve !== undefined ? currentPermissions[module].approve : defaultPermissions[module].approve,
              reject: currentPermissions[module].reject !== undefined ? currentPermissions[module].reject : defaultPermissions[module].reject,
            }
          }
        }
      } else {
        // Usuário não tem permissões ou são inválidas, usar padrão do role
        console.log('   ℹ️  Usuário sem permissões válidas, aplicando padrão do role...')
        newPermissions = defaultPermissions
      }

      // Verificar se houve mudança
      const newPermissionsString = JSON.stringify(newPermissions)
      const oldPermissionsString = user.permissions
      
      if (newPermissionsString !== oldPermissionsString) {
        // Salvar no banco
        await prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: newPermissionsString
          }
        })
        console.log('   ✅ Permissões atualizadas!')
        
        // Mostrar exemplo de uma permissão específica
        console.log(`   📋 Exemplo - Cadastro: view=${newPermissions.cadastro.view}, delete=${newPermissions.cadastro.delete}, export=${newPermissions.cadastro.export}`)
      } else {
        console.log('   ✅ Permissões já estão corretas!')
      }
    }

    console.log('\n✅ Todos os usuários foram processados com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllUsersPermissions()

