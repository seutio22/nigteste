const fetch = require('node-fetch');

async function testMonitoringData() {
  try {
    console.log('🔍 Testando endpoint de monitoramento...');
    
    // Testar endpoint sem autenticação primeiro
    const response = await fetch('https://nigteste-production.up.railway.app/monitoring/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📈 Dados recebidos:', JSON.stringify(data, null, 2));
      console.log('👥 Total de usuários:', data.length);
      
      if (data.length > 0) {
        console.log('🔍 Primeiro usuário:', JSON.stringify(data[0], null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testMonitoringData();
