// Script para debugar o endpoint /setup-admin
const https = require('https');

async function debugSetupAdmin() {
  console.log('🔍 DEBUGANDO ENDPOINT /setup-admin');
  console.log('===================================');
  
  try {
    // 1. Verificar usuário atual
    console.log('\n📊 1. VERIFICANDO USUÁRIO ATUAL');
    console.log('-------------------------------');
    await checkCurrentUser();
    
    // 2. Chamar setup-admin com dados explícitos
    console.log('\n🔧 2. CHAMANDO /setup-admin COM DADOS EXPLÍCITOS');
    console.log('--------------------------------------------------');
    await callSetupAdminExplicit();
    
    // 3. Verificar usuário após setup
    console.log('\n📊 3. VERIFICANDO USUÁRIO APÓS SETUP');
    console.log('-------------------------------------');
    await checkCurrentUser();
    
    // 4. Tentar login
    console.log('\n🔐 4. TENTANDO LOGIN');
    console.log('---------------------');
    await tryLogin();
    
  } catch (error) {
    console.error('\n❌ ERRO NO DEBUG:', error.message);
  }
}

async function checkCurrentUser() {
  try {
    const users = await makeRequest('/usuarios-publicos');
    
    const adminUser = users.find(u => u.email === 'admin@admin.com');
    
    if (adminUser) {
      console.log('👤 Usuário admin encontrado:');
      console.log('   - ID:', adminUser.id);
      console.log('   - Nome:', adminUser.name);
      console.log('   - Email:', adminUser.email);
      console.log('   - Role:', adminUser.role);
      console.log('   - Ativo:', adminUser.active);
      console.log('   - Tem senha:', adminUser.password ? 'Sim' : 'Não');
      console.log('   - Senha (primeiros chars):', adminUser.password ? adminUser.password.substring(0, 10) + '...' : 'null');
    } else {
      console.log('❌ Usuário admin não encontrado');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar usuário:', error.message);
  }
}

async function callSetupAdminExplicit() {
  try {
    console.log('🔧 Enviando dados explícitos para /setup-admin...');
    
    const adminData = {
      name: 'Administrador',
      email: 'admin@admin.com',
      password: 'admin',
      role: 'admin'
    };
    
    console.log('📤 Dados enviados:', JSON.stringify(adminData, null, 2));
    
    const result = await makeRequest('/setup-admin', 'POST', adminData);
    
    console.log('📥 Resposta recebida:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Erro ao chamar setup-admin:', error.message);
    console.log('📄 Detalhes do erro:', error.message);
  }
}

async function tryLogin() {
  try {
    console.log('🔐 Tentando login...');
    
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin'
    };
    
    const result = await makeRequest('/auth/login', 'POST', loginData);
    
    console.log('✅ LOGIN FUNCIONOU!');
    console.log('   - Token:', result.token ? 'Gerado' : 'Não gerado');
    console.log('   - Usuário:', result.user?.name);
    
  } catch (error) {
    console.log('❌ Login falhou:', error.message);
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

debugSetupAdmin().catch(console.error);
