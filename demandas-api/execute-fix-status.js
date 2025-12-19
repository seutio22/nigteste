/**
 * Script para executar correção de status via Railway CLI
 * 
 * INSTRUÇÕES:
 * 1. Execute primeiro: npx @railway/cli login
 * 2. Depois execute: node execute-fix-status.js
 */

const { execSync } = require('child_process')

console.log('🔍 Executando correção de status via Railway CLI...\n')

async function executeFix() {
  try {
  // PASSO 1: Verificar antes de alterar
  console.log('📋 PASSO 1: Verificando registros que serão alterados...\n')
  
  const selectQuery = `SELECT id, status, ticket, descricao, "createdAt", "updatedAt" FROM "Demanda" WHERE status = 'EM ANDAMENT';`
  
  console.log('Executando query de verificação...')
  try {
    const result = execSync(
      `npx @railway/cli run --service api psql "$DATABASE_URL" -c "${selectQuery.replace(/"/g, '\\"')}"`,
      { 
        encoding: 'utf-8',
        stdio: 'inherit',
        shell: true
      }
    )
    console.log(result)
  } catch (error) {
    console.log('Resultado da verificação:', error.stdout || error.message)
  }
  
  console.log('\n⚠️  Por favor, confirme que o registro acima é o correto antes de continuar.')
  console.log('Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n')
  
  // Aguardar 5 segundos
  await new Promise((resolve) => {
    setTimeout(() => resolve(), 5000)
  })
  
  // PASSO 2: Executar UPDATE
  console.log('✨ PASSO 2: Executando correção...\n')
  
  const updateQuery = `UPDATE "Demanda" SET status = 'Em Andamento', "updatedAt" = NOW() WHERE status = 'EM ANDAMENT';`
  
  try {
    const result = execSync(
      `npx @railway/cli run --service api psql "$DATABASE_URL" -c "${updateQuery.replace(/"/g, '\\"')}"`,
      { 
        encoding: 'utf-8',
        stdio: 'inherit',
        shell: true
      }
    )
    console.log(result)
  } catch (error) {
    console.log('Resultado do UPDATE:', error.stdout || error.message)
  }
  
  // PASSO 3: Verificar resultado
  console.log('\n✅ PASSO 3: Verificando resultado...\n')
  
  const verifyQuery = `SELECT id, status, ticket, "updatedAt" FROM "Demanda" WHERE status = 'Em Andamento' ORDER BY "updatedAt" DESC LIMIT 5;`
  
  try {
    const result = execSync(
      `npx @railway/cli run --service api psql "$DATABASE_URL" -c "${verifyQuery.replace(/"/g, '\\"')}"`,
      { 
        encoding: 'utf-8',
        stdio: 'inherit',
        shell: true
      }
    )
    console.log(result)
  } catch (error) {
    console.log('Resultado da verificação final:', error.stdout || error.message)
  }
  
  console.log('\n✅ Correção concluída!')
  
} catch (error) {
  console.error('\n❌ Erro ao executar:', error.message)
  console.error('\n💡 Dica: Certifique-se de que:')
  console.error('   1. Você está logado no Railway: npx @railway/cli login')
  console.error('   2. Você está no diretório correto do projeto')
  console.error('   3. O serviço "api" existe no seu projeto Railway')
  process.exit(1)
  }
}

// Executar
executeFix().catch(error => {
  console.error('❌ Erro:', error)
  process.exit(1)
})

