const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyCleanup() {
  try {
    console.log('🔍 Verificando limpeza completa dos dados mock...')
    console.log('')
    
    // Verificar todas as tabelas principais
    const tables = [
      'Area', 'Analista', 'Operadora', 'Produto', 'Sistema', 'Cliente', 'Contrato',
      'TipoServico', 'Padrao', 'TipoDemanda', 'TipoCadastro', 'Demanda', 'Manutencao',
      'Atendimento', 'Mailling', 'Analytics', 'Dados', 'Dashboard', 'DashboardWidget',
      'Validacao', 'Reajuste', 'Project', 'ProjectTask', 'ProjectMilestone', 'ProjectTimeline',
      'ProjectShareToken', 'Comunicado', 'KanbanTicket', 'TimelineEvent'
    ]
    
    let totalRecords = 0
    let hasData = false
    
    console.log('📊 CONTAGEM DE REGISTROS POR TABELA:')
    console.log('=' .repeat(50))
    
    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count()
        totalRecords += count
        
        if (count > 0) {
          hasData = true
          console.log(`❌ ${table}: ${count} registros`)
        } else {
          console.log(`✅ ${table}: 0 registros`)
        }
      } catch (error) {
        console.log(`⚠️ ${table}: Erro ao verificar (${error.message})`)
      }
    }
    
    console.log('=' .repeat(50))
    console.log(`📈 TOTAL DE REGISTROS: ${totalRecords}`)
    console.log('')
    
    // Verificar usuários
    const userCount = await prisma.user.count()
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@admin.com' }
    })
    
    console.log('👤 VERIFICAÇÃO DE USUÁRIOS:')
    console.log('=' .repeat(30))
    console.log(`Total de usuários: ${userCount}`)
    
    if (adminUser) {
      console.log(`✅ Usuário admin encontrado: ${adminUser.email}`)
      console.log(`   Nome: ${adminUser.name}`)
      console.log(`   Role: ${adminUser.role}`)
      console.log(`   Ativo: ${adminUser.active}`)
    } else {
      console.log('❌ Usuário admin NÃO encontrado!')
    }
    
    console.log('')
    
    // Resultado final
    if (totalRecords === 0 && userCount === 1 && adminUser) {
      console.log('🎉 LIMPEZA COMPLETA E BEM-SUCEDIDA!')
      console.log('')
      console.log('✅ Todas as tabelas estão vazias')
      console.log('✅ Apenas o usuário admin foi mantido')
      console.log('✅ Sistema pronto para uso limpo')
      console.log('')
      console.log('🔐 Credenciais para login:')
      console.log('   Email: admin@admin.com')
      console.log('   Senha: admin123')
      console.log('')
      console.log('🌐 Acesse: http://localhost:5173')
      console.log('   A página de dados estará completamente vazia!')
    } else {
      console.log('⚠️ LIMPEZA INCOMPLETA!')
      console.log('')
      if (totalRecords > 0) {
        console.log(`❌ Ainda existem ${totalRecords} registros no banco`)
      }
      if (userCount !== 1) {
        console.log(`❌ Número incorreto de usuários: ${userCount} (deveria ser 1)`)
      }
      if (!adminUser) {
        console.log('❌ Usuário admin não encontrado')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar verificação
verifyCleanup()
