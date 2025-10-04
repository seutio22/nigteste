const https = require('https');

async function testAllEndpoints() {
  console.log('🧪 Testando todos os endpoints conhecidos...\n');
  
  const baseUrl = 'https://nigteste-production.up.railway.app';
  
  const endpoints = [
    '/health',
    '/analistas', 
    '/operadoras',
    '/produtos',
    '/sistemas',
    '/clientes',
    '/tipos-demanda',
    '/tipos-cadastro'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(baseUrl + endpoint);
      const data = await response.json();
      
      console.log(`${endpoint}: ${response.status} (${Array.isArray(data) ? data.length : 'N/A'} registros)`);
      
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Teste concluído!');
}

testAllEndpoints();
