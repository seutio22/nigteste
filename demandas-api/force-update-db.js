const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔄 Forçando atualização do banco de dados...')

try {
  // 1. Limpar cache do Prisma
  console.log('🧹 Limpando cache do Prisma...')
  try {
    execSync('npx prisma generate --force', { stdio: 'inherit' })
  } catch (e) {
    console.log('⚠️ Erro ao limpar cache, continuando...')
  }
  
  // 2. Verificar se o schema existe
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma')
  if (!fs.existsSync(schemaPath)) {
    throw new Error('Schema não encontrado em: ' + schemaPath)
  }
  console.log('✅ Schema encontrado')
  
  // 3. Gerar cliente Prisma
  console.log('📦 Gerando cliente Prisma...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  
  // 4. Aplicar mudanças no banco
  console.log('💾 Aplicando mudanças no banco...')
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' })
  
  // 5. Verificar se funcionou
  console.log('🔍 Verificando se a tabela Report foi criada...')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  
  try {
    const reports = await prisma.report.findMany()
    console.log(`✅ Tabela Report criada com sucesso! (${reports.length} registros)`)
    
    // Teste de criação
    const testReport = await prisma.report.create({
      data: {
        titulo: 'Teste de Conexão',
        analista: 'test'
      }
    })
    console.log('✅ Teste de criação bem-sucedido:', testReport.id)
    
    // Limpar teste
    await prisma.report.delete({
      where: { id: testReport.id }
    })
    console.log('✅ Teste removido')
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
  
  console.log('🎉 Banco de dados atualizado com sucesso!')
  
} catch (error) {
  console.error('❌ Erro ao atualizar banco:', error.message)
  console.log('\n💡 Tente executar manualmente:')
  console.log('   npx prisma generate')
  console.log('   npx prisma db push')
  process.exit(1)
}
