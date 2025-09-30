const https = require('https');

async function testUsersEndpoint() {
  console.log('🔍 Testando endpoint /users...');
  
  try {
    // 1. Fazer login para obter token
    console.log('🔐 Fazendo login...');
    const loginData = JSON.stringify({
      email: 'admin@demandas.com',
      password: 'admin123'
    });
    
    const loginResponse = await makeRequest('https://nigteste-production.up.railway.app/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log('✅ Login realizado com sucesso');
    const loginResult = JSON.parse(loginResponse);
    const token = loginResult.token;
    
    // 2. Testar endpoint /users com token
    console.log('👥 Testando endpoint /users...');
    const usersResponse = await makeRequest('https://nigteste-production.up.railway.app/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Endpoint /users funcionando!');
    const users = JSON.parse(usersResponse);
    console.log('📊 Usuários encontrados:', users.length);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testUsersEndpoint();
