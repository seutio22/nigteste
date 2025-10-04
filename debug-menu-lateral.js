// Script para debugar o problema do menu lateral
const https = require('https');

async function debugMenuLateral() {
  console.log('🔍 DEBUGANDO PROBLEMA DO MENU LATERAL');
  console.log('=====================================');
  
  try {
    // 1. Fazer login e obter token
    console.log('\n🔐 1. FAZENDO LOGIN');
    console.log('-------------------');
    const token = await loginAndGetToken();
    
    if (!token) {
      console.log('❌ Não foi possível obter token - parando debug');
      return;
    }
    
    // 2. Verificar dados do usuário logado
    console.log('\n👤 2. VERIFICANDO DADOS DO USUÁRIO');
    console.log('----------------------------------');
    await checkUserData(token);
    
    // 3. Verificar permissões
    console.log('\n🔑 3. VERIFICANDO PERMISSÕES');
    console.log('----------------------------');
    await checkUserPermissions(token);
    
    // 4. Verificar endpoints necessários para o menu
    console.log('\n🔗 4. VERIFICANDO ENDPOINTS DO MENU');
    console.log('-----------------------------------');
    await checkMenuEndpoints(token);
    
    // 5. Verificar se há problemas de CORS ou autenticação
    console.log('\n🌐 5. VERIFICANDO CONFIGURAÇÕES');
    console.log('-------------------------------');
    await checkConfigurations();
    
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
      console.log('   - Ativo:', result.user?.active);
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

async function checkUserData(token) {
  try {
    console.log('👤 Verificando dados do usuário logado...');
    
    // Tentar acessar endpoint protegido
    const userData = await makeRequestWithToken('/usuarios', 'GET', null, token);
    
    console.log('📊 Dados do usuário:');
    console.log('   - Resposta recebida:', userData ? 'Sim' : 'Não');
    
    if (userData && Array.isArray(userData)) {
      console.log('   - Total de usuários:', userData.length);
      
      const adminUser = userData.find(u => u.email === 'admin@admin.com');
      if (adminUser) {
        console.log('   - Usuário admin encontrado:');
        console.log('     * ID:', adminUser.id);
        console.log('     * Nome:', adminUser.name);
        console.log('     * Email:', adminUser.email);
        console.log('     * Role:', adminUser.role);
        console.log('     * Permissões:', adminUser.permissions ? 'Sim' : 'Não');
        
        if (adminUser.permissions) {
          try {
            const permissions = typeof adminUser.permissions === 'string' 
              ? JSON.parse(adminUser.permissions) 
              : adminUser.permissions;
            
            console.log('     * Permissões detalhadas:');
            Object.keys(permissions).forEach(key => {
              console.log(`       - ${key}:`, permissions[key]);
            });
          } catch (e) {
            console.log('     * Erro ao parsear permissões:', e.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar dados do usuário:', error.message);
  }
}

async function checkUserPermissions(token) {
  try {
    console.log('🔑 Verificando permissões do usuário...');
    
    // Verificar se o usuário tem permissões válidas
    const permissions = await makeRequestWithToken('/usuario-edicao/me', 'GET', null, token);
    
    if (permissions) {
      console.log('✅ Permissões obtidas:');
      console.log('   - Permissões:', permissions.permissions ? 'Sim' : 'Não');
      
      if (permissions.permissions) {
        try {
          const perms = typeof permissions.permissions === 'string' 
            ? JSON.parse(permissions.permissions) 
            : permissions.permissions;
          
          console.log('   - Permissões disponíveis:');
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

async function checkMenuEndpoints(token) {
  try {
    console.log('🔗 Verificando endpoints necessários para o menu...');
    
    const endpoints = [
      '/tipos-demanda',
      '/tipos-servico',
      '/operadoras',
      '/produtos',
      '/sistemas',
      '/contratos',
      '/analistas',
      '/areas',
      '/clientes'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const result = await makeRequestWithToken(endpoint, 'GET', null, token);
        results[endpoint] = {
          status: 'success',
          count: Array.isArray(result) ? result.length : 'N/A'
        };
        console.log(`✅ ${endpoint}: ${Array.isArray(result) ? result.length : 'OK'} registros`);
      } catch (error) {
        results[endpoint] = {
          status: 'error',
          error: error.message
        };
        console.log(`❌ ${endpoint}: ${error.message.includes('404') ? 'Não encontrado' : 'Erro'}`);
      }
    }
    
    // Verificar se há muitos endpoints com erro
    const errorCount = Object.values(results).filter(r => r.status === 'error').length;
    const totalEndpoints = endpoints.length;
    
    console.log(`\n📊 Resumo dos endpoints:`);
    console.log(`   - Total: ${totalEndpoints}`);
    console.log(`   - Sucesso: ${totalEndpoints - errorCount}`);
    console.log(`   - Erro: ${errorCount}`);
    
    if (errorCount > totalEndpoints / 2) {
      console.log('⚠️ Muitos endpoints com erro - pode afetar o menu lateral');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar endpoints:', error.message);
  }
}

async function checkConfigurations() {
  try {
    console.log('🌐 Verificando configurações...');
    
    // Verificar CORS
    console.log('🔧 Verificando CORS...');
    try {
      const corsTest = await makeRequest('/health');
      console.log('✅ CORS funcionando');
    } catch (error) {
      console.log('❌ Problema com CORS:', error.message);
    }
    
    // Verificar se há problemas de autenticação
    console.log('🔐 Verificando autenticação...');
    try {
      const authTest = await makeRequest('/usuarios-publicos');
      console.log('✅ Endpoint público funcionando');
    } catch (error) {
      console.log('❌ Problema com endpoint público:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar configurações:', error.message);
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

debugMenuLateral().catch(console.error);
