// Script para verificar status do deploy e testar a correção
const https = require('https');

async function testDeployStatus() {
  console.log('🔍 VERIFICANDO STATUS DO DEPLOY E TESTANDO CORREÇÃO');
  console.log('====================================================');
  
  try {
    // 1. Verificar timestamp do deploy
    console.log('\n📊 1. VERIFICANDO TIMESTAMP DO DEPLOY');
    console.log('-------------------------------------');
    await checkDeployTimestamp();
    
    // 2. Testar DELETE novamente
    console.log('\n❌ 2. TESTANDO DELETE COM ID INEXISTENTE');
    console.log('---------------------------------------');
    await testDeleteNonExistent();
    
    // 3. Verificar se há logs de erro no servidor
    console.log('\n📝 3. VERIFICANDO LOGS DO SERVIDOR');
    console.log('----------------------------------');
    await checkServerLogs();
    
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('================');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
  }
}

async function checkDeployTimestamp() {
  try {
    const version = await makeRequest('/teste-versao-v200');
    console.log('✅ Versão da API:', version.version);
    console.log('📊 Timestamp:', version.timestamp);
    console.log('🔧 Build Forçado:', version.buildForced);
    
    // Verificar se é recente (últimos 5 minutos)
    const now = new Date();
    const deployTime = new Date(version.timestamp);
    const diffMinutes = (now - deployTime) / (1000 * 60);
    
    console.log(`⏰ Tempo desde deploy: ${Math.round(diffMinutes)} minutos`);
    
    if (diffMinutes > 5) {
      console.log('⚠️ Deploy pode não ter sido aplicado ainda');
    } else {
      console.log('✅ Deploy recente detectado');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar versão:', error.message);
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
      console.log('🎉 CORREÇÃO APLICADA COM SUCESSO!');
    } else if (error.message.includes('500')) {
      console.log('❌ PROBLEMA: Ainda retorna 500');
      console.log('📝 Erro:', error.message);
      console.log('⏰ Deploy pode não ter sido aplicado ainda');
    } else {
      console.log('❓ ERRO INESPERADO:', error.message);
    }
  }
}

async function checkServerLogs() {
  try {
    // Fazer uma requisição que pode gerar logs
    console.log('📝 Fazendo requisição para gerar logs...');
    await makeRequest('/manutencoes');
    console.log('✅ Requisição concluída - logs devem ter sido gerados');
  } catch (error) {
    console.log('❌ Erro ao verificar logs:', error.message);
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

testDeployStatus().catch(console.error);
