// Script para debugar o problema das permissões do menu lateral
const https = require('https');

async function debugMenuPermissions() {
  console.log('🔍 DEBUGANDO PERMISSÕES DO MENU LATERAL');
  console.log('=======================================');
  
  try {
    // 1. Fazer login e obter token
    console.log('\n🔐 1. FAZENDO LOGIN');
    console.log('-------------------');
    const token = await loginAndGetToken();
    
    if (!token) {
      console.log('❌ Não foi possível obter token - parando debug');
      return;
    }
    
    // 2. Verificar permissões do usuário
    console.log('\n🔑 2. VERIFICANDO PERMISSÕES DO USUÁRIO');
    console.log('--------------------------------------');
    await checkUserPermissions(token);
    
    // 3. Verificar dados do usuário no banco
    console.log('\n👤 3. VERIFICANDO DADOS DO USUÁRIO NO BANCO');
    console.log('-------------------------------------------');
    await checkUserInDatabase();
    
    // 4. Verificar endpoints necessários para o menu
    console.log('\n🔗 4. VERIFICANDO ENDPOINTS DO MENU');
    console.log('-----------------------------------');
    await checkMenuEndpoints(token);
    
    // 5. Tentar corrigir as permissões
    console.log('\n🔧 5. TENTANDO CORRIGIR PERMISSÕES');
    console.log('----------------------------------');
    await fixUserPermissions();
    
  } catch (error) {
    console.error('\n❌ ERRO NO DEBUG:', error.message);
  }
}

async function loginAndGetToken() {
  try {
    console.log('🔐 Fazendo login com admin@admin.com...');
    
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin123'
    };
    
    const result = await makeRequest('/auth/login', 'POST', loginData);
    
    if (result.token) {
      console.log('✅ Login bem-sucedido!');
      console.log('   - Token gerado:', result.token.substring(0, 20) + '...');
      console.log('   - Usuário:', result.user?.name);
      console.log('   - Email:', result.user?.email);
      console.log('   - Role:', result.user?.role);
      console.log('   - Permissões no login:', result.user?.permissions ? 'Sim' : 'Não');
      return result.token;
    } else {
      console.log('❌ Token não foi gerado');
      return null;
    }
    
  } catch (error) {
    console.log('❌ Erro no login:', error.message);
    return null;
  }
}

async function checkUserPermissions(token) {
  try {
    console.log('🔑 Verificando permissões do usuário...');
    
    // Tentar acessar endpoint de permissões
    const permissions = await makeRequestWithToken('/usuario-edicao/me', 'GET', null, token);
    
    if (permissions) {
      console.log('✅ Permissões obtidas:');
      console.log('   - Usuário:', permissions.name);
      console.log('   - Email:', permissions.email);
      console.log('   - Role:', permissions.role);
      console.log('   - Permissões:', permissions.permissions ? 'Sim' : 'Não');
      
      if (permissions.permissions) {
        try {
          const perms = typeof permissions.permissions === 'string' 
            ? JSON.parse(permissions.permissions) 
            : permissions.permissions;
          
          console.log('   - Permissões detalhadas:');
          Object.keys(perms).forEach(key => {
            console.log(`     * ${key}:`, perms[key]);
          });
        } catch (e) {
          console.log('   - Erro ao parsear permissões:', e.message);
        }
      }
    } else {
      console.log('❌ Não foi possível obter permissões');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar permissões:', error.message);
  }
}

async function checkUserInDatabase() {
  try {
    console.log('👤 Verificando dados do usuário no banco...');
    
    const users = await makeRequest('/usuarios-publicos');
    const adminUser = users.find(u => u.email === 'admin@admin.com');
    
    if (adminUser) {
      console.log('✅ Usuário admin encontrado no banco:');
      console.log('   - ID:', adminUser.id);
      console.log('   - Nome:', adminUser.name);
      console.log('   - Email:', adminUser.email);
      console.log('   - Role:', adminUser.role);
      console.log('   - Ativo:', adminUser.active);
      console.log('   - Permissões:', adminUser.permissions ? 'Sim' : 'Não');
      
      if (adminUser.permissions) {
        try {
          const perms = JSON.parse(adminUser.permissions);
          console.log('   - Permissões no banco:');
          Object.keys(perms).forEach(key => {
            console.log(`     * ${key}`);
          });
        } catch (e) {
          console.log('   - Erro ao parsear permissões do banco:', e.message);
        }
      } else {
        console.log('   - ❌ NENHUMAS PERMISSÕES NO BANCO!');
      }
    } else {
      console.log('❌ Usuário admin não encontrado no banco');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar usuário no banco:', error.message);
  }
}

async function checkMenuEndpoints(token) {
  try {
    console.log('🔗 Verificando endpoints necessários para o menu...');
    
    const endpoints = [
      '/tipos-demanda',
      '/tipos-servico',
      '/usuarios'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await makeRequestWithToken(endpoint, 'GET', null, token);
        console.log(`✅ ${endpoint}: ${Array.isArray(result) ? result.length : 'OK'} registros`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message.includes('404') ? 'Não encontrado' : 'Erro'}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar endpoints:', error.message);
  }
}

async function fixUserPermissions() {
  try {
    console.log('🔧 Tentando corrigir permissões do usuário...');
    
    // Criar permissões padrão para admin
    const defaultPermissions = {
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
    };
    
    console.log('📤 Permissões padrão preparadas');
    
    // Tentar atualizar via /setup-admin
    try {
      console.log('🔧 Tentando atualizar permissões via /setup-admin...');
      
      const updateData = {
        email: 'admin@admin.com',
        password: 'admin123',
        name: 'Administrador'
      };
      
      const result = await makeRequest('/setup-admin', 'POST', updateData);
      
      console.log('✅ Permissões atualizadas via /setup-admin');
      console.log('   - Mensagem:', result.message);
      
    } catch (error) {
      console.log('❌ Erro ao atualizar permissões:', error.message);
    }
    
    // Verificar se as permissões foram aplicadas
    console.log('\n🔍 Verificando se as permissões foram aplicadas...');
    await checkUserInDatabase();
    
  } catch (error) {
    console.log('❌ Erro ao corrigir permissões:', error.message);
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

debugMenuPermissions().catch(console.error);
