const https = require('https');

async function checkDeployStatus() {
  console.log('🔍 Verificando status do deploy...\n');
  
  const baseUrl = 'https://nigteste-production.up.railway.app';
  
  try {
    console.log('📡 Testando endpoint /health...');
    const healthResponse = await fetch(baseUrl + '/health');
    const healthData = await healthResponse.json();
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Dados: ${JSON.stringify(healthData)}`);
    console.log(`   ⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('');
    
    if (healthResponse.status === 200) {
      console.log('✅ Servidor funcionando!');
      
      // Testar endpoint de teste
      console.log('\n🧪 Testando endpoint /teste-route-v23...');
      try {
        const testResponse = await fetch(baseUrl + '/teste-route-v23');
        console.log(`   Status: ${testResponse.status}`);
        
        if (testResponse.status === 200) {
          console.log('   ✅ Endpoint de teste funcionando!');
        } else {
          console.log('   ⚠️ Endpoint de teste não encontrado');
        }
      } catch (error) {
        console.log(`   ❌ Erro no teste: ${error.message}`);
      }
      
    } else {
      console.log('❌ Servidor com problemas!');
    }
    
  } catch (error) {
    console.log(`❌ Erro ao verificar servidor: ${error.message}`);
  }
}

checkDeployStatus();
