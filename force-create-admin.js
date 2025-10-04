// Script para forçar a criação do usuário admin diretamente no banco
const https = require('https');

async function forceCreateAdmin() {
  console.log('🔨 FORÇANDO CRIAÇÃO DO USUÁRIO ADMIN');
  console.log('====================================');
  
  try {
    // 1. Verificar versão atual
    console.log('\n📊 1. VERIFICANDO VERSÃO ATUAL');
    console.log('-------------------------------');
    await checkVersion();
    
    // 2. Tentar múltiplos métodos para criar o usuário
    console.log('\n🔧 2. TENTANDO MÚLTIPLOS MÉTODOS');
    console.log('---------------------------------');
    
    // Método 1: /setup-admin
    console.log('\n🔧 Método 1: /setup-admin');
    await tryMethod1();
    
    // Método 2: /create-admin
    console.log('\n🔧 Método 2: /create-admin');
    await tryMethod2();
    
    // Método 3: Tentar atualizar usuário existente
    console.log('\n🔧 Método 3: Atualizar usuário existente');
    await tryMethod3();
    
    // 3. Verificar resultado final
    console.log('\n📊 3. VERIFICANDO RESULTADO FINAL');
    console.log('----------------------------------');
    await checkFinalResult();
    
    // 4. Testar login
    console.log('\n🔐 4. TESTANDO LOGIN FINAL');
    console.log('---------------------------');
    await testFinalLogin();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

async function checkVersion() {
  try {
    // Tentar nova rota de teste
    const version = await makeRequest('/teste-versao-v202');
    console.log('✅ Versão da API:', version.version);
    console.log('📊 Package Version:', version.packageVersion);
    console.log('📅 Timestamp:', version.timestamp);
    console.log('🔧 Create Admin Endpoint:', version.createAdminEndpointAdded ? 'Sim' : 'Não');
    console.log('🔧 Setup Admin Fixed:', version.setupAdminFixed ? 'Sim' : 'Não');
    
  } catch (error) {
    console.log('❌ Rota v202 não encontrada, tentando v200...');
    try {
      const version = await makeRequest('/teste-versao-v200');
      console.log('✅ Versão da API:', version.version);
      console.log('📊 Package Version:', version.packageVersion);
    } catch (error2) {
      console.log('❌ Nenhuma rota de teste encontrada');
    }
  }
}

async function tryMethod1() {
  try {
    const adminData = {
      email: 'admin@demandas.com',
      password: 'admin123',
      name: 'Administrador'
    };
    
    console.log('📤 Enviando para /setup-admin...');
    const result = await makeRequest('/setup-admin', 'POST', adminData);
    
    console.log('📥 Resposta:', result.message);
    console.log('👤 Email retornado:', result.user?.email);
    
    if (result.user?.email === 'admin@demandas.com') {
      console.log('✅ Método 1 funcionou!');
      return true;
    } else {
      console.log('❌ Método 1 falhou - email não corresponde');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Método 1 falhou:', error.message);
    return false;
  }
}

async function tryMethod2() {
  try {
    const adminData = {
      email: 'admin@demandas.com',
      password: 'admin123',
      name: 'Administrador'
    };
    
    console.log('📤 Enviando para /create-admin...');
    const result = await makeRequest('/create-admin', 'POST', adminData);
    
    console.log('📥 Resposta:', result.message);
    console.log('👤 Email retornado:', result.user?.email);
    
    if (result.user?.email === 'admin@demandas.com') {
      console.log('✅ Método 2 funcionou!');
      return true;
    } else {
      console.log('❌ Método 2 falhou - email não corresponde');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Método 2 falhou:', error.message);
    return false;
  }
}

async function tryMethod3() {
  try {
    // Primeiro, verificar usuários existentes
    const users = await makeRequest('/usuarios-publicos');
    console.log('👥 Usuários existentes:', users.length);
    
    // Tentar atualizar o primeiro usuário admin
    const adminUser = users.find(u => u.role === 'admin');
    
    if (adminUser) {
      console.log('🔧 Tentando atualizar usuário admin existente...');
      console.log('   - Email atual:', adminUser.email);
      console.log('   - ID:', adminUser.id);
      
      // Tentar atualizar senha via setup-admin
      const updateData = {
        email: adminUser.email,
        password: 'admin123',
        name: adminUser.name
      };
      
      const result = await makeRequest('/setup-admin', 'POST', updateData);
      
      console.log('📥 Resultado da atualização:', result.message);
      
      if (result.user?.password) {
        console.log('✅ Método 3 funcionou - senha atualizada!');
        return true;
      } else {
        console.log('❌ Método 3 falhou - senha não foi atualizada');
        return false;
      }
    } else {
      console.log('❌ Método 3 falhou - nenhum usuário admin encontrado');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Método 3 falhou:', error.message);
    return false;
  }
}

async function checkFinalResult() {
  try {
    const users = await makeRequest('/usuarios-publicos');
    console.log(`📊 Total de usuários: ${users.length}`);
    
    let adminFound = false;
    
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   - Nome: ${user.name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Ativo: ${user.active}`);
      console.log(`   - Tem senha: ${user.password ? 'Sim' : 'Não'}`);
      
      if (user.email === 'admin@demandas.com' && user.password) {
        adminFound = true;
        console.log('   ✅ USUÁRIO ADMIN CRIADO COM SUCESSO!');
      }
      console.log('');
    });
    
    if (!adminFound) {
      console.log('❌ Nenhum usuário admin com senha encontrado');
      console.log('💡 Tentando criar manualmente...');
      
      // Última tentativa: criar via endpoint genérico
      await tryGenericCreation();
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar resultado:', error.message);
  }
}

async function tryGenericCreation() {
  try {
    console.log('🔧 Tentativa final: criar via endpoint genérico...');
    
    // Tentar criar via endpoint de usuários (se existir)
    const userData = {
      name: 'Administrador',
      email: 'admin@demandas.com',
      password: 'admin123',
      role: 'admin',
      active: true
    };
    
    // Tentar diferentes endpoints
    const endpoints = ['/usuarios', '/users', '/admin/create'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔧 Tentando endpoint: ${endpoint}`);
        const result = await makeRequest(endpoint, 'POST', userData);
        console.log('✅ Endpoint funcionou:', endpoint);
        return;
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} falhou:`, error.message.includes('404') ? 'Não encontrado' : 'Erro');
      }
    }
    
    console.log('❌ Nenhum endpoint funcionou para criar usuário');
    
  } catch (error) {
    console.log('❌ Erro na tentativa genérica:', error.message);
  }
}

async function testFinalLogin() {
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
    
    return true;
    
  } catch (error) {
    console.log('❌ LOGIN FALHOU:', error.message);
    
    // Tentar com outros emails possíveis
    console.log('💡 Tentando com outros emails...');
    
    const testEmails = [
      'admin@admin.com',
      'admin@test.com',
      'admin@demandas.com'
    ];
    
    for (const email of testEmails) {
      try {
        console.log(`🔐 Tentando login com: ${email}`);
        const loginResult = await makeRequest('/auth/login', 'POST', {
          email: email,
          password: 'admin123'
        });
        
        console.log(`✅ LOGIN FUNCIONOU com ${email}!`);
        console.log('   - Usuário:', loginResult.user?.name);
        console.log('   - Role:', loginResult.user?.role);
        return true;
        
      } catch (loginError) {
        console.log(`❌ Login com ${email} falhou`);
      }
    }
    
    console.log('❌ Nenhum login funcionou');
    return false;
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      timeout: 20000,
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

forceCreateAdmin().catch(console.error);
