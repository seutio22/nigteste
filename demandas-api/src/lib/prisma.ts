import { PrismaClient, Prisma } from '@prisma/client'

// Railway: variável interna às vezes vazia no serviço da API; URL pública vem em DATABASE_PUBLIC_URL
const publicDbUrl =
  process.env.DATABASE_PUBLIC_URL?.trim() ||
  process.env.database_public_url?.trim()
if (!process.env.DATABASE_URL?.trim() && publicDbUrl) {
  process.env.DATABASE_URL = publicDbUrl
}

// Singleton do PrismaClient com pool de conexões otimizado
// Evita "Connection reset by peer" ao usar uma única instância compartilhada
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Usar DATABASE_URL diretamente - Prisma gerencia o pool automaticamente
// Não modificar a URL para evitar problemas com proxies do Railway
const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl) {
  console.warn('⚠️ DATABASE_URL não configurada!')
}

function withPrismaPoolParams(url: string): string {
  if (!url) return url
  if (process.env.PRISMA_SKIP_POOL_PARAMS === '1') return url
  if (/connection_limit=/i.test(url) || /pgbouncer=/i.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  const limit = String(process.env.PRISMA_CONNECTION_LIMIT || '10').replace(/[^\d]/g, '') || '10'
  const poolTimeout = String(process.env.PRISMA_POOL_TIMEOUT || '20').replace(/[^\d]/g, '') || '20'
  return `${url}${sep}connection_limit=${limit}&pool_timeout=${poolTimeout}&connect_timeout=10`
}

const pooledDatabaseUrl = withPrismaPoolParams(databaseUrl)

// Log da URL (sem senha) para debug
if (pooledDatabaseUrl) {
  const maskedUrl = pooledDatabaseUrl.replace(/:[^:@]+@/, ':***@')
  console.log('🔗 DATABASE_URL configurada:', maskedUrl)
}

// Configuração do PrismaClient
const prismaConfig: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? (['query', 'error', 'warn'] as Prisma.LogLevel[])
    : (['error'] as Prisma.LogLevel[]),
  errorFormat: 'pretty',
  ...(pooledDatabaseUrl
    ? { datasources: { db: { url: pooledDatabaseUrl } } }
    : {}),
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

