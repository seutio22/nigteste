// Script para verificar e corrigir o usuário admin
const https = require('https');

async function checkAndFixAdminUser() {
  console.log('👤 VERIFICANDO E CORRIGINDO USUÁRIO ADMIN');
  console.log('==========================================');
  
  try {
    // 1. Verificar usuários existentes
    console.log('\n📊 1. VERIFICANDO USUÁRIOS EXISTENTES');
    console.log('-------------------------------------');
    await checkExistingUsers();
    
    // 2. Criar/atualizar usuário admin
    console.log('\n🔧 2. CRIANDO/ATUALIZANDO USUÁRIO ADMIN');
    console.log('--------------------------------------');
    await createAdminUser();
    
    // 3. Testar login após correção
    console.log('\n🔐 3. TESTANDO LOGIN APÓS CORREÇÃO');
    console.log('----------------------------------');
    await testLogin();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

async function checkExistingUsers() {
  try {
    const users = await makeRequest('/usuarios-publicos');
    console.log(`📊 Total de usuários encontrados: ${users.length}`);
    
    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado - banco pode estar vazio');
      return;
    }
    
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

async function createAdminUser() {
  try {
    console.log('🔧 Criando usuário admin...');
    
    const adminData = {
      name: 'Administrador',
      email: 'admin@admin.com',
      password: 'admin',
      role: 'admin'
    };
    
    const result = await makeRequest('/setup-admin', 'POST', adminData);
    
    if (result.error) {
      if (result.error.includes('já existe')) {
        console.log('✅ Usuário admin já existe - tentando atualizar senha...');
        
        // Tentar atualizar senha via endpoint específico
        try {
          const updateResult = await makeRequest('/setup-admin', 'POST', {
            ...adminData,
            updateExisting: true
          });
          console.log('✅ Senha atualizada com sucesso!');
        } catch (updateError) {
          console.log('⚠️ Não foi possível atualizar senha:', updateError.message);
        }
      } else {
        console.log('❌ Erro ao criar admin:', result.message);
      }
    } else {
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   - ID:', result.user?.id);
      console.log('   - Email:', result.user?.email);
    }
    
  } catch (error) {
    console.log('❌ Erro ao criar admin:', error.message);
  }
}

async function testLogin() {
  try {
    console.log('🔐 Testando login com admin@admin.com...');
    
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin'
    };
    
    const result = await makeRequest('/auth/login', 'POST', loginData);
    
    console.log('✅ LOGIN FUNCIONOU!');
    console.log('   - Token gerado:', result.token ? 'Sim' : 'Não');
    console.log('   - Usuário:', result.user?.name);
    console.log('   - Role:', result.user?.role);
    console.log('   - Permissões:', result.user?.permissions ? 'Sim' : 'Não');
    
    if (result.user?.permissions) {
      console.log('   - Permissões JSON:', JSON.stringify(result.user.permissions, null, 2));
    }
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('❌ LOGIN FALHOU - Credenciais ainda inválidas');
      console.log('💡 Possíveis causas:');
      console.log('   - Senha não foi atualizada corretamente');
      console.log('   - Hash da senha está incorreto');
      console.log('   - Usuário não existe no banco');
    } else {
      console.log('❌ Erro inesperado no login:', error.message);
    }
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

checkAndFixAdminUser().catch(console.error);
