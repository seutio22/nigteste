// Script para testar a validação de email
const https = require('https');

async function testEmailValidation() {
  console.log('🧪 TESTANDO VALIDAÇÃO DE EMAIL');
  console.log('===============================');
  
  try {
    // 1. Verificar versão atual
    console.log('\n📊 1. VERIFICANDO VERSÃO ATUAL');
    console.log('-------------------------------');
    await checkCurrentVersion();
    
    // 2. Testar login com diferentes formatos de email
    console.log('\n🔐 2. TESTANDO DIFERENTES FORMATOS DE EMAIL');
    console.log('--------------------------------------------');
    await testDifferentEmailFormats();
    
    // 3. Verificar se há outros endpoints de auth
    console.log('\n🔍 3. VERIFICANDO OUTROS ENDPOINTS DE AUTH');
    console.log('-------------------------------------------');
    await checkOtherAuthEndpoints();
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
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
    
    if (diffMinutes < 3) {
      console.log('⚠️ Deploy muito recente - pode não ter sido aplicado ainda');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar versão:', error.message);
  }
}

async function testDifferentEmailFormats() {
  const testEmails = [
    'admin@admin.com',
    'admin@admin.com.br',
    'admin@test.com',
    'test@example.com',
    'user@domain.com'
  ];
  
  for (const email of testEmails) {
    try {
      console.log(`🧪 Testando: ${email}`);
      
      const loginData = {
        email: email,
        password: 'admin'
      };
      
      await makeRequest('/auth/login', 'POST', loginData);
      console.log(`✅ ${email}: Login funcionou!`);
      break; // Se funcionou, parar os testes
      
    } catch (error) {
      if (error.message.includes('400')) {
        console.log(`❌ ${email}: Erro 400 - validação ainda restritiva`);
      } else if (error.message.includes('401')) {
        console.log(`✅ ${email}: Erro 401 - validação passou, mas credenciais inválidas`);
      } else {
        console.log(`❓ ${email}: Erro inesperado - ${error.message}`);
      }
    }
  }
}

async function checkOtherAuthEndpoints() {
  try {
    // Verificar se há outros endpoints que podem estar interferindo
    console.log('🔍 Verificando se há outros endpoints de autenticação...');
    
    const endpoints = [
      '/auth/register',
      '/auth/verify',
      '/login',
      '/user/login'
    ];
    
    for (const endpoint of endpoints) {
      try {
        await makeRequest(endpoint);
        console.log(`⚠️ Endpoint encontrado: ${endpoint}`);
      } catch (error) {
        if (error.message.includes('404')) {
          console.log(`✅ ${endpoint}: Não encontrado (normal)`);
        } else {
          console.log(`❓ ${endpoint}: Erro - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar outros endpoints:', error.message);
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

testEmailValidation().catch(console.error);
