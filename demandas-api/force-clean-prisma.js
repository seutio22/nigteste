const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Forçando limpeza completa do Prisma...');

try {
  // 1. Remover node_modules/.prisma
  console.log('1️⃣ Removendo node_modules/.prisma...');
  if (fs.existsSync('node_modules/.prisma')) {
    fs.rmSync('node_modules/.prisma', { recursive: true, force: true });
    console.log('✅ node_modules/.prisma removido');
  } else {
    console.log('ℹ️ node_modules/.prisma não existe');
  }

  // 2. Remover node_modules/@prisma
  console.log('2️⃣ Removendo node_modules/@prisma...');
  if (fs.existsSync('node_modules/@prisma')) {
    fs.rmSync('node_modules/@prisma', { recursive: true, force: true });
    console.log('✅ node_modules/@prisma removido');
  } else {
    console.log('ℹ️ node_modules/@prisma não existe');
  }

  // 3. Remover dist
  console.log('3️⃣ Removendo dist...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('✅ dist removido');
  } else {
    console.log('ℹ️ dist não existe');
  }

  // 4. Reinstalar @prisma/client
  console.log('4️⃣ Reinstalando @prisma/client...');
  execSync('npm install @prisma/client', { stdio: 'inherit' });
  console.log('✅ @prisma/client reinstalado');

  // 5. Gerar Prisma Client
  console.log('5️⃣ Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client gerado');

  // 6. Fazer build
  console.log('6️⃣ Fazendo build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build concluído');

  console.log('🎉 Limpeza completa do Prisma concluída!');

} catch (error) {
  console.error('❌ Erro durante a limpeza:', error.message);
  process.exit(1);
}
