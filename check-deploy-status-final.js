// Script para verificar o status final do deploy
const https = require('https');

async function checkDeployStatusFinal() {
  console.log('🚀 VERIFICANDO STATUS FINAL DO DEPLOY');
  console.log('=====================================');
  
  try {
    // 1. Verificar versão atual
    console.log('\n📊 1. VERIFICANDO VERSÃO ATUAL');
    console.log('-------------------------------');
    await checkCurrentVersion();
    
    // 2. Verificar endpoints críticos
    console.log('\n🔗 2. VERIFICANDO ENDPOINTS CRÍTICOS');
    console.log('-----------------------------------');
    await checkCriticalEndpoints();
    
    // 3. Verificar se endpoints foram aplicados
    console.log('\n🔧 3. VERIFICANDO SE ENDPOINTS FORAM APLICADOS');
    console.log('----------------------------------------------');
    await checkIfEndpointsApplied();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

async function checkCurrentVersion() {
  try {
    // Tentar nova rota de teste
    const version = await makeRequest('/teste-versao-v202');
    console.log('✅ Versão da API:', version.version);
    console.log('📊 Package Version:', version.packageVersion);
    console.log('📅 Timestamp:', version.timestamp);
    console.log('🔧 Create Admin Endpoint:', version.createAdminEndpointAdded ? 'Sim' : 'Não');
    console.log('🔧 Setup Admin Fixed:', version.setupAdminFixed ? 'Sim' : 'Não');
    
    const now = new Date();
    const deployTime = new Date(version.timestamp);
    const diffMinutes = (now - deployTime) / (1000 * 60);
    
    console.log(`⏰ Tempo desde deploy: ${Math.round(diffMinutes)} minutos`);
    
    if (diffMinutes > 10) {
      console.log('⚠️ Deploy antigo - pode não ter as correções mais recentes');
    } else {
      console.log('✅ Deploy recente - deve ter as correções');
    }
    
  } catch (error) {
    console.log('❌ Rota v202 não encontrada, tentando v200...');
    try {
      const version = await makeRequest('/teste-versao-v200');
      console.log('✅ Versão da API:', version.version);
      console.log('📊 Package Version:', version.packageVersion);
      console.log('📅 Timestamp:', version.timestamp);
    } catch (error2) {
      console.log('❌ Nenhuma rota de teste encontrada');
    }
  }
}

async function checkCriticalEndpoints() {
  try {
    console.log('🔗 Verificando endpoints críticos para o menu...');
    
    const endpoints = [
      { path: '/usuarios', name: 'Usuários' },
      { path: '/tipos-demanda', name: 'Tipos Demanda' },
      { path: '/tipos-servico', name: 'Tipos Serviço' },
      { path: '/create-new-user', name: 'Criar Novo Usuário' },
      { path: '/usuario-edicao/me', name: 'Usuário Atual' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        await makeRequest(endpoint.path);
        console.log(`✅ ${endpoint.name} (${endpoint.path}): Funcionando`);
      } catch (error) {
        if (error.message.includes('404')) {
          console.log(`❌ ${endpoint.name} (${endpoint.path}): Não encontrado (404)`);
        } else if (error.message.includes('401')) {
          console.log(`🔐 ${endpoint.name} (${endpoint.path}): Requer autenticação (401)`);
        } else {
          console.log(`❌ ${endpoint.name} (${endpoint.path}): Erro - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar endpoints:', error.message);
  }
}

async function checkIfEndpointsApplied() {
  try {
    console.log('🔧 Verificando se as correções foram aplicadas...');
    
    // Verificar se o endpoint /create-new-user existe
    try {
      await makeRequest('/create-new-user', 'POST', {
        email: 'test@test.com',
        password: 'test123',
        name: 'Test User'
      });
      console.log('✅ Endpoint /create-new-user: Funcionando');
    } catch (error) {
      if (error.message.includes('409')) {
        console.log('✅ Endpoint /create-new-user: Funcionando (usuário já existe)');
      } else if (error.message.includes('404')) {
        console.log('❌ Endpoint /create-new-user: Não aplicado (404)');
      } else {
        console.log('❌ Endpoint /create-new-user: Erro -', error.message);
      }
    }
    
    // Verificar se o endpoint /usuarios existe
    try {
      await makeRequest('/usuarios');
      console.log('✅ Endpoint /usuarios: Funcionando');
    } catch (error) {
      if (error.message.includes('404')) {
        console.log('❌ Endpoint /usuarios: Não aplicado (404)');
      } else {
        console.log('❌ Endpoint /usuarios: Erro -', error.message);
      }
    }
    
    // Verificar aliases de tipos
    try {
      await makeRequest('/tipos-demanda');
      console.log('✅ Endpoint /tipos-demanda: Funcionando');
    } catch (error) {
      if (error.message.includes('404')) {
        console.log('❌ Endpoint /tipos-demanda: Não aplicado (404)');
      } else {
        console.log('❌ Endpoint /tipos-demanda: Erro -', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar aplicação dos endpoints:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      timeout: 15000,
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

checkDeployStatusFinal().catch(console.error);
