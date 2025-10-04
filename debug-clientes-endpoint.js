const { PrismaClient } = require('@prisma/client');

async function debugClientesEndpoint() {
  console.log('🔍 Debugando endpoint clientes...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Testar se o modelo Cliente existe no Prisma
    console.log('📊 Verificando modelo Cliente...');
    
    const clienteCount = await prisma.cliente.count();
    console.log(`   ✅ Modelo Cliente existe - ${clienteCount} registros`);
    
    // Testar operações CRUD básicas
    console.log('\n🧪 Testando operações CRUD...');
    
    // LIST
    const clientes = await prisma.cliente.findMany();
    console.log(`   ✅ LIST: ${clientes.length} clientes encontrados`);
    
    // CREATE (teste)
    const novoCliente = {
      nome: 'Cliente Teste Debug',
      grupoEconomico: 'GRUPO_DEBUG',
      cnpj: '11.222.333/0001-99',
      telefone: '(11) 99999-8888',
      email: 'debug@teste.com',
      endereco: 'Rua Debug, 123'
    };
    
    console.log('\n📝 Testando CREATE...');
    const clienteCriado = await prisma.cliente.create({
      data: novoCliente
    });
    console.log(`   ✅ CREATE: Cliente criado com ID ${clienteCriado.id}`);
    
    // GET
    console.log('\n🔍 Testando GET...');
    const clienteEncontrado = await prisma.cliente.findUnique({
      where: { id: clienteCriado.id }
    });
    console.log(`   ✅ GET: Cliente encontrado - ${clienteEncontrado.nome}`);
    
    // DELETE (limpeza)
    console.log('\n🗑️ Limpando teste...');
    await prisma.cliente.delete({
      where: { id: clienteCriado.id }
    });
    console.log(`   ✅ DELETE: Cliente removido`);
    
    console.log('\n🎉 TODAS AS OPERAÇÕES CRUD FUNCIONAM LOCALMENTE!');
    console.log('💡 O problema pode estar no deploy ou na configuração do Railway.');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugClientesEndpoint();
