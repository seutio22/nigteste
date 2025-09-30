const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

async function applyChanges() {
  try {
    console.log('🔄 Aplicando mudanças no banco de dados...')
    
    // Gerar o cliente Prisma
    console.log('📦 Gerando cliente Prisma...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Aplicar mudanças no banco
    console.log('💾 Aplicando mudanças no banco de dados...')
    execSync('npx prisma db push', { stdio: 'inherit' })
    
    console.log('✅ Mudanças aplicadas com sucesso!')
    
    // Verificar se a tabela Report foi criada
    const prisma = new PrismaClient()
    const reports = await prisma.report.findMany()
    console.log(`📊 Tabela Report criada com ${reports.length} registros`)
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Erro ao aplicar mudanças:', error)
    process.exit(1)
  }
}

applyChanges()
