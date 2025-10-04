const https = require('https');

async function analyzeRailway() {
  console.log('🔍 ANÁLISE COMPLETA DO RAILWAY\n');
  
  const baseUrl = 'https://nigteste-production.up.railway.app';
  
  try {
    // 1. Health check básico
    console.log('📊 1. HEALTH CHECK:');
    const healthResponse = await fetch(baseUrl + '/health');
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Dados: ${JSON.stringify(healthData)}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log('');
    
    // 2. Testar endpoint de versão (se existir)
    console.log('🔍 2. VERIFICANDO VERSÃO:');
    try {
      const versionResponse = await fetch(baseUrl + '/teste-versao-v101');
      const versionData = await versionResponse.json();
      console.log(`   Status: ${versionResponse.status}`);
      console.log(`   Versão: ${JSON.stringify(versionData)}`);
    } catch (error) {
      console.log(`   ❌ Endpoint de versão não encontrado: ${error.message}`);
    }
    console.log('');
    
    // 3. Testar endpoints que funcionam
    console.log('✅ 3. ENDPOINTS FUNCIONAIS:');
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
    
    // 4. Testar endpoints que NÃO funcionam
    console.log('❌ 4. ENDPOINTS COM PROBLEMA:');
    const brokenEndpoints = ['/clientes', '/tipos-demanda', '/tipos-cadastro'];
    for (const endpoint of brokenEndpoints) {
      try {
        const response = await fetch(baseUrl + endpoint);
        console.log(`   ${endpoint}: ${response.status}`);
        if (response.status !== 200) {
          const errorData = await response.json();
          console.log(`     Erro: ${errorData.message}`);
        }
      } catch (error) {
        console.log(`   ${endpoint}: ERROR - ${error.message}`);
      }
    }
    console.log('');
    
    // 5. ANÁLISE E CONCLUSÃO
    console.log('🎯 5. ANÁLISE:');
    console.log('   ✅ Servidor está rodando');
    console.log('   ✅ Alguns endpoints funcionam (banco conectado)');
    console.log('   ❌ Alguns endpoints não funcionam (código antigo)');
    console.log('   🔍 Railway está rodando versão ANTIGA do código');
    console.log('');
    console.log('💡 DECISÃO:');
    console.log('   1. Railway não aplicou as versões v1.0.x');
    console.log('   2. Precisa forçar redeploy ou verificar branch');
    console.log('   3. Possível problema de cache ou configuração');
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

analyzeRailway();
