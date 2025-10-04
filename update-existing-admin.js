// Script para atualizar a senha do usuário admin existente
const https = require('https');

async function updateExistingAdmin() {
  console.log('🔧 ATUALIZANDO SENHA DO USUÁRIO ADMIN EXISTENTE');
  console.log('===============================================');
  
  try {
    // 1. Verificar usuários existentes
    console.log('\n📊 1. VERIFICANDO USUÁRIOS EXISTENTES');
    console.log('-------------------------------------');
    await checkExistingUsers();
    
    // 2. Atualizar senha do admin existente
    console.log('\n🔧 2. ATUALIZANDO SENHA DO ADMIN EXISTENTE');
    console.log('------------------------------------------');
    await updateAdminPassword();
    
    // 3. Verificar usuários após atualização
    console.log('\n📊 3. VERIFICANDO USUÁRIOS APÓS ATUALIZAÇÃO');
    console.log('-------------------------------------------');
    await checkExistingUsers();
    
    // 4. Testar login
    console.log('\n🔐 4. TESTANDO LOGIN');
    console.log('---------------------');
    await testLogin();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
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

async function updateAdminPassword() {
  try {
    console.log('🔧 Atualizando senha do usuário admin@admin.com...');
    
    // Tentar via /setup-admin com email específico
    const updateData = {
      email: 'admin@admin.com',
      password: 'admin123',
      name: 'Administrador'
    };
    
    console.log('📤 Dados de atualização:');
    console.log('   - Email:', updateData.email);
    console.log('   - Nova senha:', updateData.password);
    console.log('   - Nome:', updateData.name);
    
    const result = await makeRequest('/setup-admin', 'POST', updateData);
    
    console.log('📥 Resposta do servidor:');
    console.log('   - Mensagem:', result.message);
    console.log('   - Email:', result.user?.email);
    console.log('   - Nome:', result.user?.name);
    console.log('   - Role:', result.user?.role);
    
    if (result.error) {
      console.log('❌ Erro na atualização:', result.error);
      return false;
    } else {
      console.log('✅ Senha atualizada com sucesso!');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Erro ao atualizar senha:', error.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('🔐 Testando login com admin@admin.com...');
    
    const loginData = {
      email: 'admin@admin.com',
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
    
    console.log('\n🎯 CREDENCIAIS PARA USO:');
    console.log('   - Email: admin@admin.com');
    console.log('   - Senha: admin123');
    
    return true;
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('❌ LOGIN FALHOU - Credenciais inválidas');
    } else {
      console.log('❌ Erro no login:', error.message);
    }
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

updateExistingAdmin().catch(console.error);
