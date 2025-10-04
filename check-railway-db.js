// Script para verificar status do banco PostgreSQL no Railway
const https = require('https');

console.log('🔍 Verificando status do Railway...');

// Função para fazer requisição HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkRailwayStatus() {
  try {
    console.log('🌐 Testando endpoints do Railway...');
    
    // Teste 1: Health check
    console.log('1️⃣ Testando /health...');
    const health = await makeRequest('https://nigteste-production.up.railway.app/health');
    console.log(`   Status: ${health.statusCode}`);
    console.log(`   Response: ${health.body}`);
    
    // Teste 2: Endpoint que deveria funcionar (sem banco)
    console.log('2️⃣ Testando endpoint sem banco...');
    try {
      const test = await makeRequest('https://nigteste-production.up.railway.app/teste-versao-v200');
      console.log(`   Status: ${test.statusCode}`);
      console.log(`   Response: ${test.body}`);
    } catch (error) {
      console.log(`   Erro: ${error.message}`);
    }
    
    // Teste 3: Endpoint com banco (deve falhar)
    console.log('3️⃣ Testando endpoint com banco (/clientes)...');
    try {
      const clientes = await makeRequest('https://nigteste-production.up.railway.app/clientes');
      console.log(`   Status: ${clientes.statusCode}`);
      console.log(`   Response: ${clientes.body.substring(0, 200)}...`);
    } catch (error) {
      console.log(`   Erro: ${error.message}`);
    }
    
    console.log('✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

checkRailwayStatus();
