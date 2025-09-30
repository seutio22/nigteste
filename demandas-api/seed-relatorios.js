const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedRelatorios() {
  try {
    console.log('🌱 Inserindo dados de exemplo para relatórios...');
    
    // Dados de exemplo para relatórios
    const relatoriosExemplo = [
      { nome: 'Relatório Mensal' },
      { nome: 'Relatório Trimestral' },
      { nome: 'Relatório Anual' },
      { nome: 'Relatório de Performance' },
      { nome: 'Relatório de Qualidade' },
      { nome: 'Relatório de Produtividade' },
      { nome: 'Relatório de Custos' }
    ];
    
    // Inserir relatórios
    for (const relatorio of relatoriosExemplo) {
      const existente = await prisma.relatorio.findFirst({
        where: { nome: relatorio.nome }
      });
      
      if (!existente) {
        await prisma.relatorio.create({
          data: relatorio
        });
        console.log(`✅ Relatório criado: ${relatorio.nome}`);
      } else {
        console.log(`⚠️ Relatório já existe: ${relatorio.nome}`);
      }
    }
    
    // Dados de exemplo para solicitantes
    const solicitantesExemplo = [
      { nome: 'João Silva' },
      { nome: 'Maria Santos' },
      { nome: 'Pedro Oliveira' },
      { nome: 'Ana Costa' },
      { nome: 'Carlos Ferreira' }
    ];
    
    // Inserir solicitantes
    for (const solicitante of solicitantesExemplo) {
      const existente = await prisma.solicitante.findFirst({
        where: { nome: solicitante.nome }
      });
      
      if (!existente) {
        await prisma.solicitante.create({
          data: solicitante
        });
        console.log(`✅ Solicitante criado: ${solicitante.nome}`);
      } else {
        console.log(`⚠️ Solicitante já existe: ${solicitante.nome}`);
      }
    }
    
    // Dados de exemplo para modelos
    const modelosExemplo = [
      { nome: 'Modelo Padrão' },
      { nome: 'Modelo Executivo' },
      { nome: 'Modelo Técnico' },
      { nome: 'Modelo Financeiro' }
    ];
    
    // Inserir modelos
    for (const modelo of modelosExemplo) {
      const existente = await prisma.modelo.findFirst({
        where: { nome: modelo.nome }
      });
      
      if (!existente) {
        await prisma.modelo.create({
          data: modelo
        });
        console.log(`✅ Modelo criado: ${modelo.nome}`);
      } else {
        console.log(`⚠️ Modelo já existe: ${modelo.nome}`);
      }
    }
    
    console.log('\n✅ Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRelatorios();
