// Script para testar criação de demanda e identificar o erro
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCreateDemanda() {
  try {
    console.log('🔍 Testando criação de demanda...');
    
    // Dados de teste similares ao que o frontend envia
    const testData = {
      status: 'Aberta',
      nome: 'Teste de Demanda - ' + new Date().toISOString(),
      descricao: 'Descrição de teste para identificar erro',
      userId: 'test-user-id',
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
      qtdClientesVinculados: 5,
      usuariosEmpresa: 10,
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
    
    // Limpar o teste
    await prisma.demanda.delete({
      where: { id: createdDemanda.id }
    });
    console.log('🗑️ Demanda de teste removida');
    
  } catch (error) {
    console.error('❌ Erro ao criar demanda:', error.message);
    console.error('❌ Código do erro:', error.code);
    console.error('❌ Detalhes:', error);
    
    // Verificar se é erro de validação
    if (error.code === 'P2002') {
      console.log('🔍 Erro P2002: Violação de constraint única');
    } else if (error.code === 'P2003') {
      console.log('🔍 Erro P2003: Violação de chave estrangeira');
    } else if (error.code === 'P2025') {
      console.log('🔍 Erro P2025: Registro não encontrado');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCreateDemanda();
