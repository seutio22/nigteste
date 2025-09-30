// Usando fetch nativo do Node.js

async function testAnalytics() {
  try {
    console.log('🔍 Testando endpoint /analytics...');
    
    const response = await fetch('http://localhost:3333/analytics');
    console.log('📡 Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados recebidos:');
      console.log('- Analytics:', data.analytics?.length || 0, 'itens');
      console.log('- Reports:', data.reports?.length || 0, 'itens');
      
      if (data.reports && data.reports.length > 0) {
        console.log('📋 Primeiro relatório:', data.reports[0]);
      }
    } else {
      const error = await response.text();
      console.log('❌ Erro:', error);
    }
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
  }
}

testAnalytics();
