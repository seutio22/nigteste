/**
 * Remove todas as regras SLA e recria só esqueleto: página + tipo1 + tipo2 (sem tempos).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.slaRegra.deleteMany()
  console.log(`🗑️  Removidas ${deleted.count} regra(s) SLA`)

  const prodRules = await prisma.produtividadeRegra.findMany({
    select: { pageKey: true, tipo1Id: true, tipo2Id: true },
  })

  const seen = new Set<string>()
  let created = 0

  for (const p of prodRules) {
    const comboKey = `${p.pageKey}\0${p.tipo1Id ?? ''}\0${p.tipo2Id ?? ''}`
    if (seen.has(comboKey)) continue
    seen.add(comboKey)

    await prisma.slaRegra.create({
      data: {
        pageKey: p.pageKey,
        tipo1Id: p.tipo1Id ?? null,
        tipo2Id: p.tipo2Id ?? null,
        impacto: 'media',
        ativo: true,
      },
    })
    created++
  }

  console.log(`✅ Criadas ${created} regra(s) SLA (só página + tipos, tempos vazios)`)
  console.log(`📋 ${prodRules.length} regra(s) na Produtividade (${prodRules.length - created} duplicadas por combo)`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
