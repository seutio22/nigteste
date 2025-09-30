// Teste simples para verificar endpoints
console.log('🔍 Testando endpoints...');

async function testEndpoint(url, name) {
  try {
    console.log(`\nTestando ${name}: ${url}`);
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: ${data.length} itens encontrados`);
      console.log('Dados:', data);
      return data;
    } else {
      console.log(`❌ ${name}: Erro ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return [];
  }
}

async function runTests() {
  // Testar endpoints
  await testEndpoint('http://localhost:3333/relatorios', 'Relatórios');
  await testEndpoint('http://localhost:3333/solicitantes', 'Solicitantes');
  await testEndpoint('http://localhost:3333/modelos', 'Modelos');
  
  console.log('\n✅ Testes concluídos!');
}

runTests();
