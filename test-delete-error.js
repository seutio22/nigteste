// Script para testar o erro de DELETE na API
const https = require('https');

async function testDeleteError() {
  console.log('🔍 TESTE: ERRO DE DELETE - MANUTENÇÃO');
  console.log('=====================================');
  
  try {
    // 1. Verificar se a API está funcionando
    console.log('\n📊 1. VERIFICANDO CONECTIVIDADE');
    console.log('-------------------------------');
    await testConnectivity();
    
    // 2. Listar manutenções existentes
    console.log('\n📋 2. LISTANDO MANUTENÇÕES EXISTENTES');
    console.log('-------------------------------------');
    const manutencoes = await listManutencoes();
    
    // 3. Testar DELETE com ID inexistente
    console.log('\n❌ 3. TESTANDO DELETE COM ID INEXISTENTE');
    console.log('---------------------------------------');
    await testDeleteNonExistent();
    
    // 4. Se houver manutenções, testar DELETE com ID existente
    if (manutencoes.length > 0) {
      console.log('\n✅ 4. TESTANDO DELETE COM ID EXISTENTE');
      console.log('------------------------------------');
      await testDeleteExistent(manutencoes[0].id);
    }
    
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('================');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
  }
}

async function testConnectivity() {
  try {
    const health = await makeRequest('/health');
    console.log('✅ API: OK');
    console.log('📊 Status:', health.status);
  } catch (error) {
    console.log('❌ API: ERRO -', error.message);
    throw error;
  }
}

async function listManutencoes() {
  try {
    const manutencoes = await makeRequest('/manutencoes');
    console.log(`📊 Total de manutenções: ${manutencoes.length}`);
    
    if (manutencoes.length > 0) {
      console.log('📋 Manutenções encontradas:');
      manutencoes.forEach((m, index) => {
        console.log(`  ${index + 1}. ID: ${m.id}`);
        console.log(`     Nome: ${m.nome || 'Sem nome'}`);
        console.log(`     Status: ${m.status || 'Sem status'}`);
      });
    } else {
      console.log('⚠️ Nenhuma manutenção encontrada');
    }
    
    return manutencoes;
  } catch (error) {
    console.log('❌ Erro ao listar manutenções:', error.message);
    return [];
  }
}

async function testDeleteNonExistent() {
  const fakeId = '3ef1fbe9-dbe1-4df7-8e1b-dbe5a01fa893';
  
  try {
    console.log(`🧪 Tentando deletar ID inexistente: ${fakeId}`);
    await makeRequest(`/manutencoes/${fakeId}`, 'DELETE');
    console.log('❌ ERRO: Deveria ter falhado mas funcionou!');
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('✅ CORRETO: Retornou 404 para ID inexistente');
    } else if (error.message.includes('500')) {
      console.log('⚠️ PROBLEMA: Retornou 500 em vez de 404');
      console.log('📝 Erro:', error.message);
    } else {
      console.log('❌ ERRO INESPERADO:', error.message);
    }
  }
}

async function testDeleteExistent(id) {
  try {
    console.log(`🧪 Tentando deletar ID existente: ${id}`);
    const result = await makeRequest(`/manutencoes/${id}`, 'DELETE');
    console.log('✅ DELETE bem-sucedido:', result);
    
    // Verificar se foi realmente deletado
    console.log('🔍 Verificando se foi deletado...');
    try {
      await makeRequest(`/manutencoes/${id}`);
      console.log('❌ PROBLEMA: Registro ainda existe após DELETE');
    } catch (error) {
      if (error.message.includes('404')) {
        console.log('✅ CORRETO: Registro foi deletado com sucesso');
      } else {
        console.log('⚠️ ERRO ao verificar deleção:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ ERRO ao deletar:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      timeout: 10000,
      headers: {}
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(responseData ? JSON.parse(responseData) : {});
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`${method} ${path} - Status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

testDeleteError().catch(console.error);
