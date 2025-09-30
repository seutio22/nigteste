const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function insertDados() {
  try {
    console.log('🔍 Iniciando inserção de dados de configuração...')
    
    // Verificar se já existem dados
    const existingDados = await prisma.dados.findMany()
    if (existingDados.length > 0) {
      console.log('✅ Dados já existem no banco:', existingDados.length, 'registros')
      console.log('📋 Primeiro registro:', existingDados[0])
      return
    }
    
    // Dados de configuração para inserir
    const dadosConfiguracao = [
      {
        tipo: 'configuracao',
        chave: 'sistema.nome',
        valor: 'Sistema de Gestão de Demandas',
        descricao: 'Nome do sistema exibido no cabeçalho',
        categoria: 'sistema',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      },
      {
        tipo: 'parametro',
        chave: 'negocio.tempoLimiteValidacao',
        valor: '72',
        descricao: 'Tempo limite para validação em horas',
        categoria: 'negocio',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      },
      {
        tipo: 'configuracaoSistema',
        chave: 'interface.tema',
        valor: 'claro',
        descricao: 'Tema da interface (claro/escuro)',
        categoria: 'interface',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      },
      {
        tipo: 'configuracao',
        chave: 'sistema.versao',
        valor: '1.0.0',
        descricao: 'Versão atual do sistema',
        categoria: 'sistema',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      },
      {
        tipo: 'parametro',
        chave: 'negocio.maxDemandasPorAnalista',
        valor: '10',
        descricao: 'Número máximo de demandas por analista',
        categoria: 'negocio',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      },
      {
        tipo: 'configuracaoSistema',
        chave: 'seguranca.tempoSessao',
        valor: '480',
        descricao: 'Tempo de sessão em minutos',
        categoria: 'seguranca',
        ativo: true,
        dataInicio: new Date(),
        criadoPor: 'admin',
        atualizadoPor: 'admin'
      }
    ]
    
    console.log('📝 Inserindo dados de configuração...')
    
    for (const dado of dadosConfiguracao) {
      const created = await prisma.dados.create({
        data: dado
      })
      console.log(`✅ Dado criado: ${created.chave} = ${created.valor}`)
    }
    
    console.log('🎉 Todos os dados de configuração foram inseridos com sucesso!')
    
    // Verificar dados inseridos
    const dadosFinais = await prisma.dados.findMany()
    console.log('📊 Total de dados no banco:', dadosFinais.length)
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error)
  } finally {
    await prisma.$disconnect()
  }
}

insertDados()
