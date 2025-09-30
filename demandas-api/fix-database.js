const { execSync } = require('child_process')

console.log('🔄 Aplicando mudanças no banco de dados...')

try {
  console.log('📦 Gerando cliente Prisma...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  
  console.log('💾 Aplicando mudanças no banco...')
  execSync('npx prisma db push', { stdio: 'inherit' })
  
  console.log('✅ Banco de dados atualizado com sucesso!')
} catch (error) {
  console.error('❌ Erro:', error.message)
  process.exit(1)
}
