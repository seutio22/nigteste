const https = require('https');

async function testAnalistasDirect() {
  console.log('🔍 Testando endpoint /analistas diretamente...');
  
  try {
    // 1. Fazer login
    console.log('1️⃣ Fazendo login...');
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
    
    // 2. Testar endpoint de analistas
    console.log('2️⃣ Testando endpoint /analistas...');
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
      console.log(`  ${index + 1}. ${analista.nome} (${analista.id})`);
    });
    
    console.log('🎉 TESTE DOS ANALISTAS PASSOU!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.message.includes('Analista.email')) {
      console.log('🔍 O erro confirma que o Railway ainda está usando código antigo');
      console.log('💡 Solução: Aguardar mais tempo para o redeploy ou forçar um novo deploy');
    }
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

testAnalistasDirect();
