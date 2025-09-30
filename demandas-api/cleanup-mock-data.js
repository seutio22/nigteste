const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupMockData() {
  try {
    console.log('🧹 Iniciando limpeza de dados mock...')
    
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
    
    // Limpar project subtasks
    const projectSubtasks = await prisma.projectSubtask.deleteMany({})
    console.log(`   ✅ Project Subtasks removidos: ${projectSubtasks.count}`)
    
    // Limpar project tasks
    const projectTasks = await prisma.projectTask.deleteMany({})
    console.log(`   ✅ Project Tasks removidos: ${projectTasks.count}`)
    
    // Limpar project members
    const projectMembers = await prisma.projectMember.deleteMany({})
    console.log(`   ✅ Project Members removidos: ${projectMembers.count}`)
    
    // Limpar project external members
    const projectExternalMembers = await prisma.projectExternalMember.deleteMany({})
    console.log(`   ✅ Project External Members removidos: ${projectExternalMembers.count}`)
    
    // Limpar projects
    const projects = await prisma.project.deleteMany({})
    console.log(`   ✅ Projects removidos: ${projects.count}`)
    
    // Limpar kanban tickets
    const kanbanTickets = await prisma.kanbanTicket.deleteMany({})
    console.log(`   ✅ Kanban Tickets removidos: ${kanbanTickets.count}`)
    
    // Limpar comunicado comentários
    const comunicadoComentarios = await prisma.comunicadoComentario.deleteMany({})
    console.log(`   ✅ Comunicado Comentários removidos: ${comunicadoComentarios.count}`)
    
    // Limpar comunicado visualizações
    const comunicadoVisualizacoes = await prisma.comunicadoVisualizacao.deleteMany({})
    console.log(`   ✅ Comunicado Visualizações removidos: ${comunicadoVisualizacoes.count}`)
    
    // Limpar comunicados
    const comunicados = await prisma.comunicado.deleteMany({})
    console.log(`   ✅ Comunicados removidos: ${comunicados.count}`)
    
    // Limpar user permissions
    const userPermissions = await prisma.userPermission.deleteMany({})
    console.log(`   ✅ User Permissions removidos: ${userPermissions.count}`)
    
    // Limpar permissions
    const permissions = await prisma.permission.deleteMany({})
    console.log(`   ✅ Permissions removidos: ${permissions.count}`)
    
    // Limpar dashboard widgets
    const dashboardWidgets = await prisma.dashboardWidget.deleteMany({})
    console.log(`   ✅ Dashboard Widgets removidos: ${dashboardWidgets.count}`)
    
    // Limpar dashboards
    const dashboards = await prisma.dashboard.deleteMany({})
    console.log(`   ✅ Dashboards removidos: ${dashboards.count}`)
    
    // Limpar analytics
    const analytics = await prisma.analytics.deleteMany({})
    console.log(`   ✅ Analytics removidos: ${analytics.count}`)
    
    // Limpar dados
    const dados = await prisma.dados.deleteMany({})
    console.log(`   ✅ Dados removidos: ${dados.count}`)
    
    // Limpar mailling
    const mailling = await prisma.mailling.deleteMany({})
    console.log(`   ✅ Mailling removidos: ${mailling.count}`)
    
    // Limpar reajustes manutenção
    const reajustesManutencao = await prisma.reajusteManutencao.deleteMany({})
    console.log(`   ✅ Reajustes Manutenção removidos: ${reajustesManutencao.count}`)
    
    // Limpar reajustes
    const reajustes = await prisma.reajuste.deleteMany({})
    console.log(`   ✅ Reajustes removidos: ${reajustes.count}`)
    
    // Limpar validações manutenção
    const validacoesManutencao = await prisma.validacaoManutencao.deleteMany({})
    console.log(`   ✅ Validações Manutenção removidos: ${validacoesManutencao.count}`)
    
    // Limpar validações
    const validacoes = await prisma.validacao.deleteMany({})
    console.log(`   ✅ Validações removidos: ${validacoes.count}`)
    
    // Limpar manutenções
    const manutencoes = await prisma.manutencao.deleteMany({})
    console.log(`   ✅ Manutenções removidos: ${manutencoes.count}`)
    
    // Limpar atendimentos
    const atendimentos = await prisma.atendimento.deleteMany({})
    console.log(`   ✅ Atendimentos removidos: ${atendimentos.count}`)
    
    // Limpar demandas
    const demandas = await prisma.demanda.deleteMany({})
    console.log(`   ✅ Demandas removidos: ${demandas.count}`)
    
    // 2. Limpar dados mestres (mantendo apenas o usuário admin)
    console.log('\n🗑️ Removendo dados mestres...')
    
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
    console.log(`   ✅ Operadoras removidos: ${operadoras.count}`)
    
    // Limpar sistemas
    const sistemas = await prisma.sistema.deleteMany({})
    console.log(`   ✅ Sistemas removidos: ${sistemas.count}`)
    
    // Limpar analistas
    const analistas = await prisma.analista.deleteMany({})
    console.log(`   ✅ Analistas removidos: ${analistas.count}`)
    
    // Limpar áreas
    const areas = await prisma.area.deleteMany({})
    console.log(`   ✅ Áreas removidos: ${areas.count}`)
    
    // Limpar padrões
    const padroes = await prisma.padrao.deleteMany({})
    console.log(`   ✅ Padrões removidos: ${padroes.count}`)
    
    // Limpar tipos de cadastro
    const tiposCadastro = await prisma.tipoCadastro.deleteMany({})
    console.log(`   ✅ Tipos Cadastro removidos: ${tiposCadastro.count}`)
    
    // Limpar tipos de demanda
    const tiposDemanda = await prisma.tipoDemanda.deleteMany({})
    console.log(`   ✅ Tipos Demanda removidos: ${tiposDemanda.count}`)
    
    // Limpar tipos de serviço
    const tiposServico = await prisma.tipoServico.deleteMany({})
    console.log(`   ✅ Tipos Serviço removidos: ${tiposServico.count}`)
    
    // 3. Verificar usuários (manter apenas o admin)
    console.log('\n👥 Verificando usuários...')
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    })
    
    console.log(`   📊 Total de usuários encontrados: ${allUsers.length}`)
    
    // Remover usuários que não são admin@admin.com
    const usersToDelete = allUsers.filter(user => user.email !== 'admin@admin.com')
    
    if (usersToDelete.length > 0) {
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          email: {
            not: 'admin@admin.com'
          }
        }
      })
      console.log(`   ✅ Usuários removidos: ${deletedUsers.count}`)
    }
    
    // Verificar usuário admin
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      select: { id: true, name: true, email: true, role: true }
    })
    
    if (adminUser) {
      console.log(`   ✅ Usuário admin mantido: ${adminUser.name} (${adminUser.email})`)
    } else {
      console.log('   ❌ Usuário admin não encontrado!')
    }
    
    console.log('\n🎉 Limpeza concluída com sucesso!')
    console.log('✅ Banco de dados limpo - apenas usuário admin mantido')
    console.log('🔐 Credenciais: admin@admin.com / admin123')
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupMockData()
