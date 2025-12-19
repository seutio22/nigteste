#!/usr/bin/env node

// Script de inicialização robusto para Railway
// Trata sinais SIGTERM e SIGINT adequadamente

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Iniciando servidor com script robusto...')
console.log('📦 Versão: 2.5.0 - Sistema atualizado com correções importantes')

// Configurar tratamento de sinais
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM recebido, encerrando graciosamente...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📡 SIGINT recebido, encerrando graciosamente...')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason)
  process.exit(1)
})

// Verificar se o diretório dist existe
const distPath = path.join(__dirname, 'dist')
const serverPath = path.join(distPath, 'server.js')

if (!fs.existsSync(distPath) || !fs.existsSync(serverPath)) {
  console.error('❌ Erro: Diretório dist ou arquivo server.js não encontrado!')
  console.error('💡 Execute "npm run build" antes de iniciar o servidor.')
  process.exit(1)
}

// Garantir que o Prisma Client está gerado
try {
  console.log('🔧 Verificando Prisma Client...')
  const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma', 'client')
  if (!fs.existsSync(prismaClientPath)) {
    console.log('⚠️ Prisma Client não encontrado, gerando...')
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname })
    console.log('✅ Prisma Client gerado com sucesso!')
  } else {
    console.log('✅ Prisma Client já está gerado.')
  }
} catch (error) {
  console.warn('⚠️ Aviso: Não foi possível verificar/gerar Prisma Client:', error.message)
  console.warn('💡 Continuando mesmo assim...')
}

// Aguardar um pouco antes de iniciar o servidor
setTimeout(() => {
  console.log('🚀 Carregando servidor principal...')
  try {
    require('./dist/server.js')
  } catch (error) {
    console.error('❌ Erro ao carregar servidor:', error)
    process.exit(1)
  }
}, 1000)
