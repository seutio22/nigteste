// Script para testar criação de demanda com usuário válido
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCreateDemandaValid() {
  try {
    console.log('🔍 Testando criação de demanda com usuário válido...');
    
    // Usar um usuário válido do banco
    const validUserId = '7bd485dd-fc4e-412e-a3bb-1cb6cbaa5e2f'; // Administrador
    
    // Dados de teste similares ao que o frontend envia
    const testData = {
      status: 'Aberta',
      nome: 'Teste de Demanda - ' + new Date().toISOString(),
      descricao: 'Descrição de teste para identificar erro',
      userId: validUserId, // Usuário válido
      analistaId: null,
      ticket: null,
      solicitante: null,
      areaId: null,
      tipoId: null,
      tipoServicoId: null,
      clienteId: null,
      contratoId: null,
      operadoraId: null,
      produtoId: null,
      sistemaId: null,
      dataInicio: null,
      dataFinal: null,
      qtdRetornos: null,
      qualidade: null,
      observacoes: null
    };
    
    console.log('📋 Dados de teste:', testData);
    
    // Tentar criar a demanda
    const createdDemanda = await prisma.demanda.create({
      data: testData
    });
    
    console.log('✅ Demanda criada com sucesso!');
    console.log('📊 ID:', createdDemanda.id);
    console.log('📊 Nome:', createdDemanda.nome);
    console.log('📊 Status:', createdDemanda.status);
    console.log('📊 User ID:', createdDemanda.userId);
    
    // Limpar o teste
    await prisma.demanda.delete({
      where: { id: createdDemanda.id }
    });
    console.log('🗑️ Demanda de teste removida');
    
  } catch (error) {
    console.error('❌ Erro ao criar demanda:', error.message);
    console.error('❌ Código do erro:', error.code);
    
    if (error.code === 'P2003') {
      console.log('🔍 Erro P2003: Violação de chave estrangeira');
      console.log('🔍 Verifique se todos os IDs referenciados existem no banco');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCreateDemandaValid();
