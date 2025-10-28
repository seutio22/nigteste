#!/usr/bin/env node

// Script de inicialização robusto para Railway
// Trata sinais SIGTERM e SIGINT adequadamente

console.log('🚀 Iniciando servidor com script robusto...')

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

// Aguardar um pouco antes de iniciar o servidor
setTimeout(() => {
  console.log('🚀 Carregando servidor principal...')
  require('./dist/server.js')
}, 1000)
