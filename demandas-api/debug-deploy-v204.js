// Script para debugar o deploy v2.0.4
const fetch = require('node-fetch');

const API_URL = process.env.RAILWAY_STATIC_URL || 'https://nigteste-production.up.railway.app';

console.log('🔍 DEBUGANDO DEPLOY v2.0.4');
console.log('==========================');

async function checkHealth() {
  console.log('\n🏥 1. VERIFICANDO HEALTHCHECK');
  console.log('------------------------------');
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Healthcheck OK:', data);
      return true;
    } else {
      console.error('❌ Healthcheck falhou:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro no healthcheck:', error.message);
    return false;
  }
}

async function checkVersion() {
  console.log('\n📊 2. VERIFICANDO VERSÃO');
  console.log('-------------------------');
  try {
    const response = await fetch(`${API_URL}/teste-versao-v204`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Versão v2.0.4 detectada:');
      console.log(`   - Versão: ${data.version}`);
      console.log(`   - Package: ${data.packageVersion}`);
      console.log(`   - PostgreSQL Fix: ${data.postgresqlConnectivityFixed}`);
      return true;
    } else {
      console.error('❌ Versão não encontrada:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar versão:', error.message);
    return false;
  }
}

async function checkEndpoints() {
  console.log('\n🔗 3. VERIFICANDO ENDPOINTS CRÍTICOS');
  console.log('------------------------------------');
  const endpoints = [
    '/usuarios-publicos',
    '/tipos-demanda',
    '/tipos-servico',
    '/operadoras'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}: ${Array.isArray(data) ? data.length : 'OK'} registros`);
        successCount++;
      } else {
        console.error(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Endpoints funcionando: ${successCount}/${endpoints.length}`);
  return successCount === endpoints.length;
}

async function checkAuth() {
  console.log('\n🔐 4. VERIFICANDO AUTENTICAÇÃO');
  console.log('------------------------------');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@admin.com', password: 'admin123' })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login funcionando:');
      console.log(`   - Usuário: ${data.user.name}`);
      console.log(`   - Email: ${data.user.email}`);
      console.log(`   - Role: ${data.user.role}`);
      console.log(`   - Token: ${data.token ? 'Sim' : 'Não'}`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Login falhou:', response.status, error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    return false;
  }
}

async function main() {
  const health = await checkHealth();
  if (!health) {
    console.log('\n🚨 APLICAÇÃO NÃO ESTÁ RODANDO!');
    console.log('💡 Verifique os logs do Railway para erros de inicialização');
    return;
  }
  
  const version = await checkVersion();
  const endpoints = await checkEndpoints();
  const auth = await checkAuth();
  
  console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
  console.log('==========================');
  console.log(`✅ Healthcheck: ${health ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Versão v2.0.4: ${version ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Endpoints: ${endpoints ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Autenticação: ${auth ? 'OK' : 'FALHOU'}`);
  
  if (health && version && endpoints && auth) {
    console.log('\n🎉 APLICAÇÃO FUNCIONANDO PERFEITAMENTE!');
    console.log('🚀 Pode testar o menu lateral agora!');
  } else {
    console.log('\n⚠️ ALGUNS PROBLEMAS DETECTADOS');
    console.log('🔧 Verifique os itens que falharam acima');
  }
}

main().catch(console.error);
