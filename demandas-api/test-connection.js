const https = require('https');

async function testConnection() {
  console.log('🔍 Testando conexão completa...');
  
  try {
    // 1. Testar health check
    console.log('1️⃣ Testando health check...');
    const healthResponse = await makeRequest('https://nigteste-production.up.railway.app/health');
    console.log('✅ Health check OK:', JSON.parse(healthResponse));
    
    // 2. Fazer login
    console.log('2️⃣ Fazendo login...');
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
    
    const loginResult = JSON.parse(loginResponse);
    console.log('✅ Login OK:', loginResult.user?.email);
    const token = loginResult.token;
    
    // 3. Testar endpoint de usuários
    console.log('3️⃣ Testando endpoint /users...');
    const usersResponse = await makeRequest('https://nigteste-production.up.railway.app/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = JSON.parse(usersResponse);
    console.log('✅ Usuários OK:', users.length, 'usuários encontrados');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`);
    });
    
    // 4. Testar endpoint de analistas
    console.log('4️⃣ Testando endpoint /analistas...');
    const analistasResponse = await makeRequest('https://nigteste-production.up.railway.app/analistas', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const analistas = JSON.parse(analistasResponse);
    console.log('✅ Analistas OK:', analistas.length, 'analistas encontrados');
    analistas.forEach((analista, index) => {
      console.log(`  ${index + 1}. ${analista.nome}`);
    });
    
    console.log('🎉 TODOS OS TESTES PASSARAM! Backend está funcionando perfeitamente!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

function makeRequest(url, options = {}, data = null) {
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

testConnection();
