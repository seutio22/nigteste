const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function removeAllMockData() {
  try {
    console.log('🧹 Iniciando remoção completa de dados mock...')
    
    // 1. Limpar dados relacionados primeiro (devido às foreign keys)
    console.log('🗑️ Removendo dados relacionados...')
    
    // Limpar timeline events
    const timelineEvents = await prisma.timelineEvent.deleteMany({})
    console.log(`   ✅ Timeline Events removidos: ${timelineEvents.count}`)
    
    // Limpar project share tokens
    const shareTokens = await prisma.projectShareToken.deleteMany({})
    console.log(`   ✅ Project Share Tokens removidos: ${shareTokens.count}`)
    
    // Limpar project timelines
    const projectTimelines = await prisma.projectTimeline.deleteMany({})
    console.log(`   ✅ Project Timelines removidos: ${projectTimelines.count}`)
    
    // Limpar project milestones
    const projectMilestones = await prisma.projectMilestone.deleteMany({})
    console.log(`   ✅ Project Milestones removidos: ${projectMilestones.count}`)
    
    // Limpar project tasks
    const projectTasks = await prisma.projectTask.deleteMany({})
    console.log(`   ✅ Project Tasks removidos: ${projectTasks.count}`)
    
    // Limpar projects
    const projects = await prisma.project.deleteMany({})
    console.log(`   ✅ Projects removidos: ${projects.count}`)
    
    // 2. Limpar dados mestres
    console.log('🗑️ Removendo dados mestres...')
    
    // Limpar dados
    const dados = await prisma.dado.deleteMany({})
    console.log(`   ✅ Dados removidos: ${dados.count}`)
    
    // Limpar contratos
    const contratos = await prisma.contrato.deleteMany({})
    console.log(`   ✅ Contratos removidos: ${contratos.count}`)
    
    // Limpar clientes
    const clientes = await prisma.cliente.deleteMany({})
    console.log(`   ✅ Clientes removidos: ${clientes.count}`)
    
    // Limpar produtos
    const produtos = await prisma.produto.deleteMany({})
    console.log(`   ✅ Produtos removidos: ${produtos.count}`)
    
    // Limpar operadoras
    const operadoras = await prisma.operadora.deleteMany({})
    console.log(`   ✅ Operadoras removidas: ${operadoras.count}`)
    
    // Limpar sistemas
    const sistemas = await prisma.sistema.deleteMany({})
    console.log(`   ✅ Sistemas removidos: ${sistemas.count}`)
    
    // Limpar analistas
    const analistas = await prisma.analista.deleteMany({})
    console.log(`   ✅ Analistas removidos: ${analistas.count}`)
    
    // Limpar areas
    const areas = await prisma.area.deleteMany({})
    console.log(`   ✅ Áreas removidas: ${areas.count}`)
    
    // Limpar tipos cadastro
    const tiposCadastro = await prisma.tipoCadastro.deleteMany({})
    console.log(`   ✅ Tipos Cadastro removidos: ${tiposCadastro.count}`)
    
    // Limpar tipos demanda
    const tiposDemanda = await prisma.tipoDemanda.deleteMany({})
    console.log(`   ✅ Tipos Demanda removidos: ${tiposDemanda.count}`)
    
    // Limpar tipos servico
    const tiposServico = await prisma.tipoServico.deleteMany({})
    console.log(`   ✅ Tipos Serviço removidos: ${tiposServico.count}`)
    
    // Limpar padrao
    const padrao = await prisma.padrao.deleteMany({})
    console.log(`   ✅ Padrão removido: ${padrao.count}`)
    
    // Limpar areas mailling
    const areasMailling = await prisma.areaMailling.deleteMany({})
    console.log(`   ✅ Áreas Mailling removidas: ${areasMailling.count}`)
    
    // Limpar cargos mailling
    const cargosMailling = await prisma.cargoMailling.deleteMany({})
    console.log(`   ✅ Cargos Mailling removidos: ${cargosMailling.count}`)
    
    // Limpar filiais mailling
    const filiaisMailling = await prisma.filialMailling.deleteMany({})
    console.log(`   ✅ Filiais Mailling removidas: ${filiaisMailling.count}`)
    
    // 3. Limpar dados de negócio
    console.log('🗑️ Removendo dados de negócio...')
    
    // Limpar demandas
    const demandas = await prisma.demanda.deleteMany({})
    console.log(`   ✅ Demandas removidas: ${demandas.count}`)
    
    // Limpar atendimentos
    const atendimentos = await prisma.atendimento.deleteMany({})
    console.log(`   ✅ Atendimentos removidos: ${atendimentos.count}`)
    
    // Limpar validacoes
    const validacoes = await prisma.validacao.deleteMany({})
    console.log(`   ✅ Validações removidas: ${validacoes.count}`)
    
    // Limpar reajustes
    const reajustes = await prisma.reajuste.deleteMany({})
    console.log(`   ✅ Reajustes removidos: ${reajustes.count}`)
    
    // Limpar mailling
    const mailling = await prisma.mailling.deleteMany({})
    console.log(`   ✅ Mailling removido: ${mailling.count}`)
    
    // Limpar analytics
    const analytics = await prisma.analytics.deleteMany({})
    console.log(`   ✅ Analytics removidos: ${analytics.count}`)
    
    // Limpar comunicados
    const comunicados = await prisma.comunicado.deleteMany({})
    console.log(`   ✅ Comunicados removidos: ${comunicados.count}`)
    
    // Limpar dashboards
    const dashboards = await prisma.dashboard.deleteMany({})
    console.log(`   ✅ Dashboards removidos: ${dashboards.count}`)
    
    // Limpar dashboard widgets
    const dashboardWidgets = await prisma.dashboardWidget.deleteMany({})
    console.log(`   ✅ Dashboard Widgets removidos: ${dashboardWidgets.count}`)
    
    // Limpar reports
    const reports = await prisma.report.deleteMany({})
    console.log(`   ✅ Reports removidos: ${reports.count}`)
    
    // 4. Manter apenas o usuário administrador
    console.log('👤 Mantendo apenas usuário administrador...')
    
    const users = await prisma.user.findMany()
    console.log(`   📊 Total de usuários encontrados: ${users.length}`)
    
    if (users.length > 1) {
      // Manter apenas o usuário admin
      const adminUser = users.find(u => u.email === 'admin@admin.com')
      if (adminUser) {
        const otherUsers = users.filter(u => u.id !== adminUser.id)
        for (const user of otherUsers) {
          await prisma.user.delete({ where: { id: user.id } })
        }
        console.log(`   ✅ Usuários removidos: ${otherUsers.length}`)
        console.log(`   ✅ Usuário admin mantido: ${adminUser.email}`)
      }
    }
    
    console.log('')
    console.log('🎉 LIMPEZA COMPLETA CONCLUÍDA!')
    console.log('')
    console.log('📊 RESUMO DA LIMPEZA:')
    console.log(`   • Timeline Events: ${timelineEvents.count}`)
    console.log(`   • Project Share Tokens: ${shareTokens.count}`)
    console.log(`   • Project Timelines: ${projectTimelines.count}`)
    console.log(`   • Project Milestones: ${projectMilestones.count}`)
    console.log(`   • Project Tasks: ${projectTasks.count}`)
    console.log(`   • Projects: ${projects.count}`)
    console.log(`   • Dados: ${dados.count}`)
    console.log(`   • Contratos: ${contratos.count}`)
    console.log(`   • Clientes: ${clientes.count}`)
    console.log(`   • Produtos: ${produtos.count}`)
    console.log(`   • Operadoras: ${operadoras.count}`)
    console.log(`   • Sistemas: ${sistemas.count}`)
    console.log(`   • Analistas: ${analistas.count}`)
    console.log(`   • Áreas: ${areas.count}`)
    console.log(`   • Tipos Cadastro: ${tiposCadastro.count}`)
    console.log(`   • Tipos Demanda: ${tiposDemanda.count}`)
    console.log(`   • Tipos Serviço: ${tiposServico.count}`)
    console.log(`   • Padrão: ${padrao.count}`)
    console.log(`   • Áreas Mailling: ${areasMailling.count}`)
    console.log(`   • Cargos Mailling: ${cargosMailling.count}`)
    console.log(`   • Filiais Mailling: ${filiaisMailling.count}`)
    console.log(`   • Demandas: ${demandas.count}`)
    console.log(`   • Atendimentos: ${atendimentos.count}`)
    console.log(`   • Validações: ${validacoes.count}`)
    console.log(`   • Reajustes: ${reajustes.count}`)
    console.log(`   • Mailling: ${mailling.count}`)
    console.log(`   • Analytics: ${analytics.count}`)
    console.log(`   • Comunicados: ${comunicados.count}`)
    console.log(`   • Dashboards: ${dashboards.count}`)
    console.log(`   • Dashboard Widgets: ${dashboardWidgets.count}`)
    console.log(`   • Reports: ${reports.count}`)
    console.log('')
    console.log('✅ BANCO DE DADOS COMPLETAMENTE LIMPO!')
    console.log('✅ APENAS USUÁRIO ADMIN MANTIDO!')
    console.log('')
    console.log('🔐 Credenciais do usuário admin:')
    console.log('   Email: admin@admin.com')
    console.log('   Senha: admin123')
    console.log('')
    console.log('🌐 Agora acesse: http://localhost:5173')
    console.log('   Faça login e a página de dados estará vazia!')
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar limpeza
removeAllMockData()
