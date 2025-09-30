// Script para forçar redeploy do backend no Railway
// Este script faz uma pequena mudança no package.json para forçar o redeploy

const fs = require('fs');
const path = require('path');

console.log('🔄 Forçando redeploy do backend...');

// Ler package.json do backend
const packageJsonPath = path.join(__dirname, 'demandas-api', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Adicionar um comentário de cache bust
packageJson.description = `Backend API - Cache bust ${new Date().toISOString()}`;

// Salvar o arquivo modificado
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ package.json modificado para forçar redeploy');
console.log('📝 Agora faça commit e push para triggerar o redeploy no Railway');
