// Configurações de Desenvolvimento Local
module.exports = {
  NODE_ENV: 'development',
  PORT: 3333,
  JWT_SECRET: 'dev-secret-key-change-in-production',
  DATABASE_URL: 'file:./prisma/dev.db',
  CORS_ORIGIN: true, // Permitir todas as origens em desenvolvimento
  LOG_LEVEL: 'debug'
}
