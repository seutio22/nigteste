import { PrismaClient, Prisma } from '@prisma/client'

// Singleton do PrismaClient com pool de conexões otimizado
// Evita "Connection reset by peer" ao usar uma única instância compartilhada
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Preparar DATABASE_URL com parâmetros de pool otimizados se necessário
let databaseUrl = process.env.DATABASE_URL || ''
if (databaseUrl && !databaseUrl.includes('connection_limit') && !databaseUrl.includes('pool_timeout')) {
  // Adicionar parâmetros de pool se não estiverem presentes
  // Prisma gerencia o pool automaticamente, mas podemos otimizar via URL
  const separator = databaseUrl.includes('?') ? '&' : '?'
  // connection_limit: limita conexões simultâneas (ajustar conforme necessário)
  // pool_timeout: timeout para obter conexão do pool (em segundos)
  // connect_timeout: timeout para estabelecer conexão inicial
  databaseUrl = `${databaseUrl}${separator}connection_limit=5&pool_timeout=20&connect_timeout=30`
}

// Configuração do PrismaClient
// Prisma gerencia o pool automaticamente via DATABASE_URL
const prismaConfig: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? (['query', 'error', 'warn'] as Prisma.LogLevel[])
    : (['error'] as Prisma.LogLevel[]),
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  // Configurações adicionais para estabilidade de conexão
  errorFormat: 'pretty',
  rejectOnNotFound: false
}

// Criar instância única - esta é a chave para evitar múltiplas conexões
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaConfig)

// Adicionar tratamento de erro de conexão
prisma.$on('error' as never, (e: any) => {
  console.error('❌ Prisma Client Error:', e)
})

// Tratamento de shutdown gracioso
const gracefulShutdown = async () => {
  console.log('🔄 Iniciando shutdown gracioso do Prisma...')
  try {
    await prisma.$disconnect()
    console.log('✅ Prisma desconectado com sucesso')
  } catch (error) {
    console.error('❌ Erro ao desconectar Prisma:', error)
  }
}

// Registrar handlers de shutdown
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // Em produção, garantir desconexão ao encerrar
  process.on('beforeExit', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

// Função auxiliar para reconectar automaticamente
export async function ensureConnection() {
  try {
    // Verificar se já está conectado
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Conexão perdida, tentando reconectar:', error)
    
    // Tentar reconectar com retry exponencial
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$connect()
        console.log(`✅ Reconectado com sucesso (tentativa ${attempt})`)
        return true
      } catch (retryError) {
        console.error(`❌ Falha na tentativa ${attempt}:`, retryError)
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    console.error('❌ Falha ao reconectar após 3 tentativas')
    return false
  }
}

// Testar conexão na inicialização
if (process.env.NODE_ENV === 'production') {
  ensureConnection().catch(console.error)
}

export default prisma

