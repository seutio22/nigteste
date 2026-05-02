/**
 * Executa a correção de estipulantes placeholder «Contrato (…)» na base PostgreSQL.
 *
 * Uso (na pasta portal-api, com DATABASE_URL no .env ou na env):
 *   npx tsx scripts/fix-contrato-estipulantes-run.ts
 *   npx tsx scripts/fix-contrato-estipulantes-run.ts --dry-run
 */
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { fixContratoPlaceholderEstipulantes } from '../src/lib/seguros-fix-contrato-estipulantes.js'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      'DATABASE_URL não definido. Crie portal-api/.env com a connection string do Railway (ou exporte no shell) e volte a correr.',
    )
    process.exit(1)
  }

  console.log(dryRun ? '[dry-run] Simulação apenas…' : 'A aplicar correção na base…')
  const r = await fixContratoPlaceholderEstipulantes({ dryRun })
  const { gruposIgnorados, ...rest } = r
  console.log(JSON.stringify(rest, null, 2))
  console.log(
    `gruposIgnorados: ${gruposIgnorados.length} (primeiros 20:`,
    JSON.stringify(gruposIgnorados.slice(0, 20), null, 2),
    gruposIgnorados.length > 20 ? '…)' : ')',
  )

  if (r.erros.length) {
    console.error('Concluído com erros parciais (ver JSON acima).')
    process.exit(1)
  }
  console.log(dryRun ? 'Simulação concluída.' : 'Base corrigida.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
