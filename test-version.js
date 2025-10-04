const https = require('https');

async function testVersion() {
  console.log('🔍 Verificando se nova versão foi aplicada...\n');
  
  try {
    const response = await fetch('https://nigteste-production.up.railway.app/health');
    const data = await response.json();
    
    console.log('✅ Health check:', data);
    console.log('⏰ Timestamp atual:', new Date().toISOString());
    console.log('📊 Status code:', response.status);
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

testVersion();
