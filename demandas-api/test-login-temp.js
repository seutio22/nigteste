// Script para testar o login temporário
const fetch = require('node-fetch');

const API_URL = 'https://nigteste-production.up.railway.app';

console.log('🧪 TESTANDO LOGIN TEMPORÁRIO');
console.log('============================');

async function testLoginTemp() {
  console.log('\n🔐 1. TESTANDO /auth/login-temp');
  console.log('--------------------------------');
  
  try {
    const response = await fetch(`${API_URL}/auth/login-temp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'qualquer123'
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status Text:', response.statusText);

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ LOGIN TEMPORÁRIO FUNCIONOU!');
      console.log('📋 Resposta:');
      console.log('   - Mensagem:', data.message);
      console.log('   - Token gerado:', data.token ? 'Sim' : 'Não');
      console.log('   - Usuário:', data.user.name);
      console.log('   - Email:', data.user.email);
      console.log('   - Role:', data.user.role);
      console.log('   - Permissões:', data.user.permissions ? 'Sim' : 'Não');
      
      if (data.token) {
        console.log('\n🎯 TOKEN JWT:');
        console.log(data.token.substring(0, 50) + '...');
      }
      
      return true;
    } else {
      console.error('❌ LOGIN TEMPORÁRIO FALHOU!');
      console.error('📋 Erro:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ ERRO NA REQUISIÇÃO:', error.message);
    return false;
  }
}

async function testHealth() {
  console.log('\n🏥 2. TESTANDO HEALTHCHECK');
  console.log('---------------------------');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Healthcheck OK:', data);
      return true;
    } else {
      console.error('❌ Healthcheck falhou:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro no healthcheck:', error.message);
    return false;
  }
}

async function main() {
  console.log(`🌐 Testando API em: ${API_URL}`);
  
  const health = await testHealth();
  const login = await testLoginTemp();
  
  console.log('\n📋 RESUMO DOS TESTES:');
  console.log('=====================');
  console.log(`✅ Healthcheck: ${health ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Login Temporário: ${login ? 'OK' : 'FALHOU'}`);
  
  if (health && login) {
    console.log('\n🎉 TUDO FUNCIONANDO!');
    console.log('🚀 Você pode usar o login temporário agora!');
  } else {
    console.log('\n⚠️ ALGUNS PROBLEMAS DETECTADOS');
    console.log('🔧 Verifique os itens que falharam acima');
  }
}

main().catch(console.error);
