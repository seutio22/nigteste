// Script para verificar o status do deploy
const https = require('https');

async function checkDeployStatus() {
  console.log('🚀 VERIFICANDO STATUS DO DEPLOY');
  console.log('===============================');
  
  try {
    // 1. Verificar versão atual
    console.log('\n📊 1. VERIFICANDO VERSÃO ATUAL');
    console.log('-------------------------------');
    await checkCurrentVersion();
    
    // 2. Verificar se logs de debug estão funcionando
    console.log('\n🔍 2. VERIFICANDO LOGS DE DEBUG');
    console.log('-------------------------------');
    await checkDebugLogs();
    
    // 3. Verificar se endpoint /create-admin existe
    console.log('\n🔧 3. VERIFICANDO ENDPOINT /create-admin');
    console.log('----------------------------------------');
    await checkCreateAdminEndpoint();
    
    // 4. Testar /setup-admin com dados diferentes
    console.log('\n🧪 4. TESTANDO /setup-admin COM DADOS DIFERENTES');
    console.log('------------------------------------------------');
    await testSetupAdminWithDifferentData();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

async function checkCurrentVersion() {
  try {
    const version = await makeRequest('/teste-versao-v200');
    console.log('✅ Versão da API:', version.version);
    console.log('📊 Package Version:', version.packageVersion);
    console.log('📅 Timestamp:', version.timestamp);
    
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
    console.log('❌ Erro ao verificar versão:', error.message);
  }
}

async function checkDebugLogs() {
  try {
    console.log('🔍 Testando se logs de debug estão funcionando...');
    
    const testData = {
      email: 'test@test.com',
      password: 'test123',
      name: 'Test User'
    };
    
    console.log('📤 Enviando dados de teste para /setup-admin...');
    
    // Fazer requisição e capturar logs (se possível)
    const result = await makeRequest('/setup-admin', 'POST', testData);
    
    console.log('📥 Resposta recebida:');
    console.log('   - Mensagem:', result.message);
    console.log('   - Email retornado:', result.user?.email);
    
    if (result.user?.email === 'test@test.com') {
      console.log('✅ Endpoint está processando dados do corpo corretamente');
    } else {
      console.log('❌ Endpoint está ignorando dados do corpo');
      console.log('💡 Deploy pode não ter sido aplicado ou há bug no código');
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar logs de debug:', error.message);
  }
}

async function checkCreateAdminEndpoint() {
  try {
    console.log('🔍 Verificando se endpoint /create-admin existe...');
    
    const testData = {
      email: 'test@test.com',
      password: 'test123'
    };
    
    await makeRequest('/create-admin', 'POST', testData);
    console.log('✅ Endpoint /create-admin existe e funcionando');
    
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('❌ Endpoint /create-admin não encontrado (404)');
      console.log('💡 Deploy não foi aplicado ou há erro no código');
    } else {
      console.log('❌ Erro no endpoint /create-admin:', error.message);
    }
  }
}

async function testSetupAdminWithDifferentData() {
  try {
    console.log('🧪 Testando /setup-admin com diferentes dados...');
    
    const testCases = [
      {
        email: 'admin@test.com',
        password: 'test123',
        name: 'Test Admin'
      },
      {
        email: 'test@admin.com',
        password: 'admin456',
        name: 'Admin Test'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Teste com email: ${testCase.email}`);
      
      try {
        const result = await makeRequest('/setup-admin', 'POST', testCase);
        
        console.log('📥 Resposta:');
        console.log('   - Mensagem:', result.message);
        console.log('   - Email retornado:', result.user?.email);
        
        if (result.user?.email === testCase.email) {
          console.log('✅ Endpoint processou dados corretamente');
        } else {
          console.log('❌ Endpoint ignorou dados do corpo');
        }
        
      } catch (error) {
        console.log('❌ Erro no teste:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar setup-admin:', error.message);
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

checkDeployStatus().catch(console.error);
