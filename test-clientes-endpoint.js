const https = require('https');

async function testClientesEndpoint() {
  console.log('🧪 Testando endpoint /clientes após deploy...\n');
  
  const baseUrl = 'https://nigteste-production.up.railway.app';
  
  // Testar GET primeiro
  try {
    console.log('📊 Testando GET /clientes...');
    const getResponse = await fetch(baseUrl + '/clientes');
    const getData = await getResponse.json();
    
    console.log(`   Status: ${getResponse.status}`);
    console.log(`   Dados encontrados: ${Array.isArray(getData) ? getData.length : 'N/A'}`);
    
    if (getResponse.status === 200) {
      console.log('   ✅ GET /clientes funcionando!');
    } else {
      console.log('   ❌ GET /clientes com problema');
    }
    console.log('');
    
  } catch (error) {
    console.log(`   ❌ Erro no GET: ${error.message}`);
    console.log('');
  }
  
  // Testar POST (criar cliente)
  try {
    console.log('📝 Testando POST /clientes...');
    
    const newCliente = {
      nome: 'Cliente Teste API',
      grupoEconomico: 'GRUPO_TESTE',
      cnpj: '12.345.678/0001-99',
      telefone: '(11) 99999-9999',
      email: 'teste@cliente.com',
      endereco: 'Rua Teste, 123 - São Paulo/SP'
    };
    
    const postResponse = await fetch(baseUrl + '/clientes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newCliente)
    });
    
    const postData = await postResponse.json();
    
    console.log(`   Status: ${postResponse.status}`);
    console.log(`   Resposta: ${JSON.stringify(postData).substring(0, 200)}...`);
    
    if (postResponse.status === 200 || postResponse.status === 201) {
      console.log('   ✅ POST /clientes funcionando!');
      console.log('   🎉 Cliente criado com sucesso!');
    } else {
      console.log('   ❌ POST /clientes com problema');
    }
    
  } catch (error) {
    console.log(`   ❌ Erro no POST: ${error.message}`);
  }
  
  console.log('\n🎯 Teste concluído!');
}

testClientesEndpoint();
