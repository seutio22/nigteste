const fetch = require('node-fetch');

async function testValidacoes() {
  try {
    console.log('🔍 Testando rota /validacoes...');
    
    const response = await fetch('http://localhost:3333/validacoes');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados recebidos:', data);
      console.log('Total de validações:', data.length);
      
      if (data.length > 0) {
        console.log('Primeira validação:', data[0]);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testValidacoes();
