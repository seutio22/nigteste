const { PrismaClient } = require('@prisma/client')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    await prisma.$connect()
    const [{ db }] = await prisma.$queryRaw`SELECT current_database()::text AS db`
    console.log(`Conectado ao banco: ${db}`)

    console.log('Executando REINDEX DATABASE...')
    await prisma.$executeRawUnsafe(`REINDEX DATABASE "${db}";`)
    console.log('REINDEX concluído.')

    console.log('Executando REFRESH COLLATION VERSION...')
    await prisma.$executeRawUnsafe(`ALTER DATABASE "${db}" REFRESH COLLATION VERSION;`)
    console.log('Collation atualizada.')

    const collation = await prisma.$queryRaw`
      SELECT datcollversion FROM pg_database WHERE datname = current_database()
    `
    console.log('Versão de collation:', collation)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
