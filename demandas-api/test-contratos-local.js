const api = require('./dist/server.js');

async function testContratosLocal() {
  console.log('🧪 Testando API de contratos localmente...\n');

  try {
    // Teste 1: Buscar todos os contratos (sem filtro)
    console.log('📋 Teste 1: Buscando TODOS os contratos...');
    const response1 = await fetch('http://localhost:3333/contratos');
    const contratos1 = await response1.json();
    console.log(`✅ Encontrados ${contratos1.length} contratos (sem filtro)`);
    contratos1.forEach(c => console.log(`   - ID: ${c.id}, Status: ${c.status}, Numero: ${c.numero}`));
    console.log('');

    // Teste 2: Buscar apenas contratos ativos
    console.log('📋 Teste 2: Buscando apenas contratos ATIVOS...');
    const response2 = await fetch('http://localhost:3333/contratos?showOnlyActive=true');
    const contratos2 = await response2.json();
    console.log(`✅ Encontrados ${contratos2.length} contratos ativos`);
    contratos2.forEach(c => console.log(`   - ID: ${c.id}, Status: ${c.status}, Numero: ${c.numero}`));
    console.log('');

    // Teste 3: Criar um contrato inativo
    console.log('📋 Teste 3: Criando contrato INATIVO...');
    const contratoInativo = {
      numero: `TEST-INATIVO-${Date.now()}`,
      codigo: 'TEST123',
      grupoEconomico: 'TESTE',
      clienteId: contratos1[0]?.clienteId || '7a63111b-140e-4280-b9e1-f5c65b115864',
      status: 'Inativo'
    };

    const response3 = await fetch('http://localhost:3333/contratos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contratoInativo)
    });
    
    if (response3.ok) {
      const novoContrato = await response3.json();
      console.log(`✅ Contrato inativo criado com sucesso!`);
      console.log(`   - ID: ${novoContrato.id}, Status: ${novoContrato.status}, Numero: ${novoContrato.numero}`);
    } else {
      const error = await response3.text();
      console.log(`❌ Erro ao criar contrato inativo: ${error}`);
    }
    console.log('');

    // Teste 4: Verificar se o contrato inativo aparece na busca geral
    console.log('📋 Teste 4: Verificando se contrato inativo aparece na busca geral...');
    const response4 = await fetch('http://localhost:3333/contratos');
    const contratos4 = await response4.json();
    console.log(`✅ Total de contratos encontrados: ${contratos4.length}`);
    contratos4.forEach(c => console.log(`   - ID: ${c.id}, Status: ${c.status}, Numero: ${c.numero}`));

    const inativos = contratos4.filter(c => c.status === 'Inativo');
    console.log(`📊 Contratos inativos encontrados: ${inativos.length}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Aguardar um pouco para o servidor inicializar
setTimeout(testContratosLocal, 3000);
