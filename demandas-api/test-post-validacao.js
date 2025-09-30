const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPostValidacao() {
  try {
    console.log('🔍 Testando criação de validação via API...');
    
    // Primeiro, obter IDs válidos para teste
    const analistas = await prisma.analista.findMany();
    const demandas = await prisma.demanda.findMany();
    
    if (analistas.length === 0 || demandas.length === 0) {
      console.log('❌ Não há analistas ou demandas para testar');
      return;
    }
    
    const analistaId = analistas[0].id;
    const demandaId = demandas[0].id;
    
    console.log('Analista ID:', analistaId);
    console.log('Demanda ID:', demandaId);
    
    // Testar criação direta no banco
    console.log('🔍 Testando criação direta no banco...');
    
    const validacaoCriada = await prisma.validacao.create({
      data: {
        demandaId: demandaId,
        analistaId: analistaId,
        status: 'Pendente',
        dataInicio: new Date('2024-03-01'),
        dataFim: new Date('2024-03-15'),
        observacoes: 'Teste de criação direta no banco'
      }
    });
    
    console.log('✅ Validação criada diretamente no banco:', validacaoCriada.id);
    
    // Agora testar via API
    console.log('🔍 Testando criação via API...');
    
    const response = await fetch('http://localhost:3333/validacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        demandaId: demandaId,
        analistaId: analistaId,
        status: 'Em Andamento',
        dataInicio: new Date('2024-04-01').toISOString(),
        dataFim: new Date('2024-04-15').toISOString(),
        observacoes: 'Teste de criação via API'
      })
    });
    
    console.log('Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Validação criada via API:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na API:', errorText);
    }
    
    // Verificar total de validações
    const totalValidacoes = await prisma.validacao.findMany();
    console.log('Total de validações no banco:', totalValidacoes.length);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPostValidacao();
