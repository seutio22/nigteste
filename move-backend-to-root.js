// Script para mover o backend para o diretório raiz
const fs = require('fs');
const path = require('path');

console.log('🔧 Movendo backend para diretório raiz...');

const sourceDir = './demandas-api';
const targetFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'prisma/',
  'src/',
  'dist/',
  'node_modules/'
];

try {
  // Mover arquivos principais
  targetFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = file;
    
    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        // Copiar diretório
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
        fs.cpSync(sourcePath, targetPath, { recursive: true });
        console.log(`✅ Copiado diretório: ${file}`);
      } else {
        // Copiar arquivo
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ Copiado arquivo: ${file}`);
      }
    }
  });

  // Atualizar railway.json para não precisar de cd
  const railwayConfig = {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "NIXPACKS",
      "buildCommand": "npm install && npm run build"
    },
    "deploy": {
      "startCommand": "npm start",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 300,
      "restartPolicyType": "ON_FAILURE"
    }
  };

  fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2));
  console.log('✅ railway.json atualizado para diretório raiz');

  console.log('🎉 Backend movido para diretório raiz com sucesso!');
  console.log('📁 Agora o Railway fará deploy apenas do backend');

} catch (error) {
  console.error('❌ Erro ao mover backend:', error.message);
}
