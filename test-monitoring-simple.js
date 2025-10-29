// Script simples para testar o endpoint de monitoramento
async function testMonitoring() {
  try {
    console.log('🔍 Testando endpoint de monitoramento...');
    
    const response = await fetch('https://nigteste-production.up.railway.app/monitoring/users');
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Dados recebidos:', data.length, 'usuários');
      
      if (data.length > 0) {
        console.log('👤 Primeiro usuário:', {
          name: data[0].userName,
          email: data[0].userEmail,
          isOnline: data[0].isOnline,
          lastAccess: data[0].lastAccess,
          totalTimeToday: data[0].totalTimeToday,
          sessionCount: data[0].sessionCount,
          hasRealActivity: data[0].hasRealActivity
        });
      }
    } else {
      console.log('❌ Erro:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testMonitoring();
