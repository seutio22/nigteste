// Script para criar um novo usuário administrador sem limpar os existentes
const https = require('https');

async function createNewAdminUser() {
  console.log('👤 CRIANDO NOVO USUÁRIO ADMINISTRADOR');
  console.log('=====================================');
  
  try {
    // 1. Verificar usuários existentes
    console.log('\n📊 1. VERIFICANDO USUÁRIOS EXISTENTES');
    console.log('-------------------------------------');
    await checkExistingUsers();
    
    // 2. Criar novo usuário admin
    console.log('\n🔧 2. CRIANDO NOVO USUÁRIO ADMIN');
    console.log('---------------------------------');
    await createNewAdmin();
    
    // 3. Verificar usuários após criação
    console.log('\n📊 3. VERIFICANDO USUÁRIOS APÓS CRIAÇÃO');
    console.log('---------------------------------------');
    await checkExistingUsers();
    
    // 4. Testar login com novo usuário
    console.log('\n🔐 4. TESTANDO LOGIN COM NOVO USUÁRIO');
    console.log('--------------------------------------');
    await testLoginWithNewUser();
    
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
      console.log('');
    });
    
  } catch (error) {
    console.log('❌ Erro ao verificar usuários:', error.message);
  }
}

async function createNewAdmin() {
  try {
    console.log('🔧 Criando novo usuário administrador...');
    console.log('   - Email: admin@demandas.com');
    console.log('   - Senha: admin123');
    console.log('   - Nome: Administrador Sistema');
    console.log('   - Role: admin');
    
    // Criar hash da senha
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    console.log('🔐 Hash da senha gerado:', hashedPassword.substring(0, 20) + '...');
    
    // Dados do novo usuário
    const newAdminData = {
      name: 'Administrador Sistema',
      email: 'admin@demandas.com',
      password: hashedPassword,
      role: 'admin',
      active: true,
      permissions: JSON.stringify({
        home: { view: true, create: true, edit: true, delete: true },
        dashboard: { view: true, create: true, edit: true, delete: true },
        cadastro: { view: true, create: true, edit: true, delete: true },
        manutencao: { view: true, create: true, edit: true, delete: true },
        atendimento: { view: true, create: true, edit: true, delete: true },
        comunicados: { view: true, create: true, edit: true, delete: true },
        validacao: { view: true, create: true, edit: true, delete: true },
        reajuste: { view: true, create: true, edit: true, delete: true },
        mailling: { view: true, create: true, edit: true, delete: true },
        analytics: { view: true, create: true, edit: true, delete: true },
        kanban: { view: true, create: true, edit: true, delete: true },
        projetos: { view: true, create: true, edit: true, delete: true },
        dados: { view: true, create: true, edit: true, delete: true },
        usuarios: { view: true, create: true, edit: true, delete: true },
        configuracoes: { view: true, create: true, edit: true, delete: true },
        relatorios: { view: true, create: true, edit: true, delete: true }
      })
    };
    
    console.log('📤 Dados do novo usuário preparados');
    
    // Tentar criar via endpoint /create-admin
    try {
      console.log('🔧 Tentando criar via /create-admin...');
      const result = await makeRequest('/create-admin', 'POST', {
        email: 'admin@demandas.com',
        password: 'admin123',
        name: 'Administrador Sistema'
      });
      
      console.log('✅ Usuário criado via /create-admin!');
      console.log('   - Mensagem:', result.message);
      console.log('   - ID:', result.user?.id);
      console.log('   - Email:', result.user?.email);
      
      return true;
      
    } catch (error) {
      console.log('❌ /create-admin falhou:', error.message);
      
      // Tentar via /setup-admin
      try {
        console.log('🔧 Tentando criar via /setup-admin...');
        const result = await makeRequest('/setup-admin', 'POST', {
          email: 'admin@demandas.com',
          password: 'admin123',
          name: 'Administrador Sistema'
        });
        
        console.log('✅ Usuário criado via /setup-admin!');
        console.log('   - Mensagem:', result.message);
        console.log('   - Email:', result.user?.email);
        
        return true;
        
      } catch (error2) {
        console.log('❌ /setup-admin também falhou:', error2.message);
        
        // Tentar via endpoint direto de usuários
        try {
          console.log('🔧 Tentando criar via endpoint direto...');
          const result = await makeRequest('/usuarios', 'POST', newAdminData);
          
          console.log('✅ Usuário criado via endpoint direto!');
          console.log('   - ID:', result.id);
          console.log('   - Email:', result.email);
          
          return true;
          
        } catch (error3) {
          console.log('❌ Endpoint direto também falhou:', error3.message);
          console.log('💡 Todos os métodos falharam - pode ser problema de deploy');
          return false;
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Erro geral ao criar usuário:', error.message);
    return false;
  }
}

async function testLoginWithNewUser() {
  try {
    console.log('🔐 Testando login com novo usuário...');
    console.log('   - Email: admin@demandas.com');
    console.log('   - Senha: admin123');
    
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
    
    console.log('\n🎯 CREDENCIAIS PARA USO:');
    console.log('   - Email: admin@demandas.com');
    console.log('   - Senha: admin123');
    
    return true;
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.log('❌ LOGIN FALHOU - Credenciais inválidas');
      console.log('💡 Verifique se o usuário foi criado corretamente');
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

createNewAdminUser().catch(console.error);
