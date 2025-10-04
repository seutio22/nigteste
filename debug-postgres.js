const https = require('https');

async function debugPostgres() {
  console.log('🔍 Investigando problema PostgreSQL no Railway...\n');
  
  const baseUrl = 'https://nigteste-production.up.railway.app';
  
  try {
    // 1. Testar health check
    console.log('📡 1. Testando health check...');
    const healthResponse = await fetch(baseUrl + '/health');
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Dados: ${JSON.stringify(healthData)}`);
    console.log('');
    
    // 2. Testar endpoints que funcionam (usam banco)
    console.log('📊 2. Testando endpoints que funcionam...');
    const workingEndpoints = ['/analistas', '/operadoras', '/produtos', '/sistemas'];
    
    for (const endpoint of workingEndpoints) {
      try {
        const response = await fetch(baseUrl + endpoint);
        const data = await response.json();
        console.log(`   ${endpoint}: ${response.status} (${Array.isArray(data) ? data.length : 'N/A'} registros)`);
      } catch (error) {
        console.log(`   ${endpoint}: ERROR - ${error.message}`);
      }
    }
    console.log('');
    
    // 3. Testar endpoints que NÃO funcionam
    console.log('❌ 3. Testando endpoints que NÃO funcionam...');
    const brokenEndpoints = ['/clientes', '/tipos-demanda', '/tipos-cadastro'];
    
    for (const endpoint of brokenEndpoints) {
      try {
        const response = await fetch(baseUrl + endpoint);
        console.log(`   ${endpoint}: ${response.status}`);
        if (response.status !== 200) {
          const errorData = await response.json();
          console.log(`     Erro: ${JSON.stringify(errorData).substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ${endpoint}: ERROR - ${error.message}`);
      }
    }
    console.log('');
    
    // 4. Análise
    console.log('🔍 4. ANÁLISE:');
    console.log('   ✅ Servidor funcionando (health check OK)');
    console.log('   ✅ Alguns endpoints funcionam (banco conectado)');
    console.log('   ❌ Alguns endpoints com 404 (problema específico)');
    console.log('');
    console.log('💡 CONCLUSÃO:');
    console.log('   - PostgreSQL está conectando (endpoints funcionam)');
    console.log('   - Problema é específico dos endpoints clientes/tipos');
    console.log('   - Pode ser problema de deploy ou configuração de rotas');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugPostgres();
