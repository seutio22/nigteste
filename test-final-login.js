// Script para testar o login final após todas as correções
const https = require('https');

async function testFinalLogin() {
  console.log('🔐 TESTE FINAL DE LOGIN');
  console.log('======================');
  
  try {
    // 1. Aguardar um pouco para o deploy
    console.log('⏳ Aguardando deploy...');
    await sleep(10000); // 10 segundos
    
    // 2. Verificar se o endpoint /setup-admin está funcionando
    console.log('\n🔧 TESTANDO ENDPOINT /setup-admin');
    console.log('----------------------------------');
    await testSetupAdminEndpoint();
    
    // 3. Testar login final
    console.log('\n🔐 TESTANDO LOGIN FINAL');
    console.log('------------------------');
    await testFinalLoginAttempt();
    
    // 4. Verificar permissões do usuário
    console.log('\n👤 VERIFICANDO PERMISSÕES DO USUÁRIO');
    console.log('-------------------------------------');
    await checkUserPermissions();
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE FINAL:', error.message);
  }
}

async function testSetupAdminEndpoint() {
  try {
    console.log('🔧 Chamando /setup-admin para configurar usuário...');
    
    const adminData = {
      name: 'Administrador',
      email: 'admin@admin.com',
      password: 'admin',
      role: 'admin'
    };
    
    const result = await makeRequest('/setup-admin', 'POST', adminData);
    
    console.log('✅ Resultado do setup-admin:');
    console.log('   - Mensagem:', result.message);
    console.log('   - Usuário ID:', result.user?.id);
    console.log('   - Email:', result.user?.email);
    console.log('   - Role:', result.user?.role);
    
  } catch (error) {
    console.log('❌ Erro no setup-admin:', error.message);
  }
}

async function testFinalLoginAttempt() {
  try {
    console.log('🔐 Tentando login com admin@admin.com / admin...');
    
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin'
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
        
        console.log('   - Permissões detalhadas:');
        Object.keys(permissions).forEach(key => {
          console.log(`     * ${key}:`, permissions[key]);
        });
      } catch (e) {
        console.log('   - Erro ao parsear permissões:', e.message);
      }
    }
    
    return result.token;
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('❌ LOGIN FALHOU - Credenciais ainda inválidas');
      console.log('💡 Verificando se o usuário existe...');
      await checkExistingUsers();
    } else {
      console.log('❌ Erro inesperado no login:', error.message);
    }
    return null;
  }
}

async function checkExistingUsers() {
  try {
    const users = await makeRequest('/usuarios-publicos');
    console.log(`📊 Usuários encontrados: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   - Nome: ${user.name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Ativo: ${user.active}`);
      console.log(`   - Tem senha: ${user.password ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
  } catch (error) {
    console.log('❌ Erro ao verificar usuários:', error.message);
  }
}

async function checkUserPermissions() {
  try {
    // Fazer login para obter token
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin'
    };
    
    const loginResult = await makeRequest('/auth/login', 'POST', loginData);
    
    if (!loginResult.token) {
      console.log('❌ Não foi possível obter token para verificar permissões');
      return;
    }
    
    // Usar token para verificar permissões
    console.log('🔍 Verificando permissões com token...');
    
    // Tentar acessar um endpoint protegido
    const protectedResult = await makeRequestWithToken('/usuarios', 'GET', null, loginResult.token);
    console.log('✅ Endpoint protegido acessível:', protectedResult ? 'Sim' : 'Não');
    
  } catch (error) {
    console.log('❌ Erro ao verificar permissões:', error.message);
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

function makeRequestWithToken(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      timeout: 15000,
      headers: {}
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testFinalLogin().catch(console.error);
