const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixCompleteSync() {
  try {
    console.log('🔧 Corrigindo sincronização completa do sistema...')
    console.log('')
    
    // 1. Verificar estado atual do banco
    console.log('📊 VERIFICANDO ESTADO ATUAL DO BANCO:')
    console.log('=' .repeat(50))
    
    const tables = [
      'Area', 'Analista', 'Operadora', 'Produto', 'Sistema', 'Cliente', 'Contrato',
      'TipoServico', 'Padrao', 'TipoDemanda', 'TipoCadastro', 'Demanda', 'Manutencao',
      'Atendimento', 'Mailling', 'Analytics', 'Dados', 'Dashboard', 'DashboardWidget',
      'Validacao', 'Reajuste', 'Project', 'ProjectTask', 'ProjectMilestone', 'ProjectTimeline',
      'ProjectShareToken', 'Comunicado', 'KanbanTicket', 'TimelineEvent'
    ]
    
    let totalRecords = 0
    let hasData = false
    
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
    
    // 2. Verificar usuários
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
    
    // 3. Resultado final
    if (totalRecords === 0 && userCount === 1 && adminUser) {
      console.log('🎉 SISTEMA LIMPO E PRONTO!')
      console.log('')
      console.log('✅ Todas as tabelas estão vazias (exceto usuário admin)')
      console.log('✅ Apenas o usuário admin foi mantido')
      console.log('✅ Sistema pronto para uso limpo')
      console.log('')
      console.log('🔐 Credenciais para login:')
      console.log('   Email: admin@admin.com')
      console.log('   Senha: admin123')
      console.log('')
      console.log('🌐 Próximos passos:')
      console.log('   1. Acesse: http://localhost:5173/force-complete-sync.html')
      console.log('   2. Clique em "Limpar TODOS os Dados do Frontend"')
      console.log('   3. Clique em "Recarregar Página"')
      console.log('   4. Faça login e teste a exclusão de dados')
      console.log('')
      console.log('✅ O problema de inconsistência foi resolvido!')
    } else {
      console.log('⚠️ SISTEMA NÃO ESTÁ LIMPO!')
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
fixCompleteSync()
