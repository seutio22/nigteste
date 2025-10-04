// Script para testar /setup-admin com credenciais específicas
const https = require('https');

async function testSetupAdminSpecific() {
  console.log('🔧 TESTANDO /setup-admin COM CREDENCIAIS ESPECÍFICAS');
  console.log('====================================================');
  
  try {
    // 1. Verificar usuários existentes
    console.log('\n📊 1. VERIFICANDO USUÁRIOS EXISTENTES');
    console.log('-------------------------------------');
    await checkExistingUsers();
    
    // 2. Chamar /setup-admin com dados específicos
    console.log('\n🔧 2. CHAMANDO /setup-admin COM DADOS ESPECÍFICOS');
    console.log('--------------------------------------------------');
    await callSetupAdminWithSpecificData();
    
    // 3. Verificar usuários após setup
    console.log('\n📊 3. VERIFICANDO USUÁRIOS APÓS SETUP');
    console.log('---------------------------------------');
    await checkExistingUsers();
    
    // 4. Testar login com as credenciais
    console.log('\n🔐 4. TESTANDO LOGIN');
    console.log('---------------------');
    await testLogin();
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
  }
}

async function checkExistingUsers() {
  try {
    const users = await makeRequest('/usuarios-publicos');
    console.log(`📊 Total de usuários: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   - Nome: ${user.name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Ativo: ${user.active}`);
      console.log(`   - Tem senha: ${user.password ? 'Sim' : 'Não'}`);
      if (user.password) {
        console.log(`   - Senha (hash): ${user.password.substring(0, 20)}...`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.log('❌ Erro ao verificar usuários:', error.message);
  }
}

async function callSetupAdminWithSpecificData() {
  try {
    console.log('🔧 Enviando dados específicos para /setup-admin...');
    
    const adminData = {
      email: 'admin@demandas.com',
      password: 'admin123',
      name: 'Administrador'
    };
    
    console.log('📤 Dados enviados:', JSON.stringify(adminData, null, 2));
    
    const result = await makeRequest('/setup-admin', 'POST', adminData);
    
    console.log('📥 Resposta recebida:');
    console.log('   - Mensagem:', result.message);
    console.log('   - Usuário ID:', result.user?.id);
    console.log('   - Email:', result.user?.email);
    console.log('   - Nome:', result.user?.name);
    console.log('   - Role:', result.user?.role);
    console.log('   - Ativo:', result.user?.active);
    
    if (result.error) {
      console.log('❌ Erro na resposta:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Erro ao chamar setup-admin:', error.message);
    console.log('📄 Detalhes do erro:', error.message);
  }
}

async function testLogin() {
  try {
    console.log('🔐 Testando login com admin@demandas.com / admin123...');
    
    const loginData = {
      email: 'admin@demandas.com',
      password: 'admin123'
    };
    
    const result = await makeRequest('/auth/login', 'POST', loginData);
    
    console.log('🎉 LOGIN FUNCIONOU!');
    console.log('   - Token gerado:', result.token ? 'Sim' : 'Não');
    console.log('   - Usuário:', result.user?.name);
    console.log('   - Email:', result.user?.email);
    console.log('   - Role:', result.user?.role);
    console.log('   - Ativo:', result.user?.active);
    console.log('   - Permissões:', result.user?.permissions ? 'Sim' : 'Não');
    
    if (result.user?.permissions) {
      try {
        const permissions = typeof result.user.permissions === 'string' 
          ? JSON.parse(result.user.permissions) 
          : result.user.permissions;
        
        console.log('   - Permissões disponíveis:');
        Object.keys(permissions).forEach(key => {
          console.log(`     * ${key}`);
        });
      } catch (e) {
        console.log('   - Erro ao parsear permissões:', e.message);
      }
    }
    
    return result.token;
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('❌ LOGIN FALHOU - Credenciais inválidas');
      console.log('💡 Verifique se a senha foi definida corretamente');
    } else {
      console.log('❌ Erro no login:', error.message);
    }
    return null;
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

testSetupAdminSpecific().catch(console.error);
