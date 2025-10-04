const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
});

async function exportAllData() {
  console.log('📦 Exportando TODOS os dados do banco local...\n');
  
  try {
    // Buscar TODOS os dados
    const [clientes, demandas, manutencoes, validacoes, projetos, analistas, areas, operadoras, produtos, sistemas, solicitantes, users] = await Promise.all([
      prisma.cliente.findMany(),
      prisma.demanda.findMany(),
      prisma.manutencao.findMany(),
      prisma.validacao.findMany(),
      prisma.project.findMany(),
      prisma.analista.findMany(),
      prisma.area.findMany(),
      prisma.operadora.findMany(),
      prisma.produto.findMany(),
      prisma.sistema.findMany(),
      prisma.solicitante.findMany(),
      prisma.user.findMany()
    ]);
    
    const allData = {
      clientes,
      demandas,
      manutencoes,
      validacoes,
      projetos,
      analistas,
      areas,
      operadoras,
      produtos,
      sistemas,
      solicitantes,
      users,
      exportedAt: new Date().toISOString()
    };
    
    // Salvar em arquivo
    fs.writeFileSync('backup-dados-local.json', JSON.stringify(allData, null, 2));
    
    console.log('📊 RESUMO DOS DADOS ENCONTRADOS:');
    console.log(`   👥 Clientes: ${clientes.length}`);
    console.log(`   📝 Demandas: ${demandas.length}`);
    console.log(`   🔧 Manutenções: ${manutencoes.length}`);
    console.log(`   ✅ Validações: ${validacoes.length}`);
    console.log(`   📋 Projetos: ${projetos.length}`);
    console.log(`   👨‍💼 Analistas: ${analistas.length}`);
    console.log(`   📍 Áreas: ${areas.length}`);
    console.log(`   📱 Operadoras: ${operadoras.length}`);
    console.log(`   📦 Produtos: ${produtos.length}`);
    console.log(`   💻 Sistemas: ${sistemas.length}`);
    console.log(`   👤 Solicitantes: ${solicitantes.length}`);
    console.log(`   🔐 Usuários: ${users.length}`);
    
    console.log('\n✅ Dados exportados para: backup-dados-local.json');
    console.log('💡 Agora vamos restaurar esses dados no Railway!');
    
    if (clientes.length > 0) {
      console.log('\n📋 Primeiros 5 clientes encontrados:');
      clientes.slice(0, 5).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.nome} (${c.cnpj || 'Sem CNPJ'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();
