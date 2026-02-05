/**
 * Corrige status antigos na tabela Report (Analytics) para o padrão do Cadastro.
 * Padrão: Pendente, Em andamento, Transf. Analista, Concluída, Entregue, Cancelada
 *
 * Execute na pasta demandas-api (com DATABASE_URL no .env ou ambiente):
 *   node normalize-report-status.js
 *
 * No Railway:
 *   railway run node normalize-report-status.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Padrão do sistema (igual à página Cadastro)
const PADROES = ['Pendente', 'Em andamento', 'Transf. Analista', 'Concluída', 'Entregue', 'Cancelada']

// Mapeamento: variações no banco → valor padrão Cadastro
const MAPEAMENTO = {
  pendente: 'Pendente',
  PENDENTE: 'Pendente',
  Pendente: 'Pendente',
  aberta: 'Pendente',
  'em andamento': 'Em andamento',
  em_andamento: 'Em andamento',
  'EM ANDAMENTO': 'Em andamento',
  'Em Andamento': 'Em andamento',
  emandamento: 'Em andamento',
  'Em andamento': 'Em andamento',
  'transf. analista': 'Transf. Analista',
  transf_analista: 'Transf. Analista',
  'Transf. Analista': 'Transf. Analista',
  transfanalista: 'Transf. Analista',
  'TRANSF. ANALISTA': 'Transf. Analista',
  concluída: 'Concluída',
  concluida: 'Concluída',
  concluido: 'Concluída',
  concluído: 'Concluída',
  CONCLUIDO: 'Concluída',
  CONCLUÍDO: 'Concluída',
  CONCLUÍDA: 'Concluída',
  CONCLUIDA: 'Concluída',
  Concluído: 'Concluída',
  Concluida: 'Concluída',
  Concluída: 'Concluída',
  entregue: 'Entregue',
  ENTREGUE: 'Entregue',
  Entregue: 'Entregue',
  cancelada: 'Cancelada',
  cancelado: 'Cancelada',
  CANCELADO: 'Cancelada',
  Cancelado: 'Cancelada',
  Cancelada: 'Cancelada'
}

function normalizarStatus(valor) {
  if (valor == null || valor === '') return 'Pendente'
  const s = String(valor).trim()
  if (PADROES.includes(s)) return s
  const padrao = MAPEAMENTO[s]
  if (padrao) return padrao
  const lower = s.toLowerCase()
  if (/concluíd?a?o?/i.test(s)) return 'Concluída'
  if (/em\s*andamento|andamento/i.test(s)) return 'Em andamento'
  if (/transf|analista/i.test(s)) return 'Transf. Analista'
  if (/entregue/i.test(s)) return 'Entregue'
  if (/cancelad/i.test(s)) return 'Cancelada'
  if (/pendente|aberta/i.test(s)) return 'Pendente'
  return 'Pendente'
}

async function main() {
  console.log('🔍 Corrigindo status antigos na tabela Report (Analytics)...\n')
  console.log('   Padrão Cadastro: Pendente | Em andamento | Transf. Analista | Concluída | Entregue | Cancelada\n')

  const reports = await prisma.report.findMany({
    select: { id: true, status: true, titulo: true }
  })

  console.log(`📊 Total de registros: ${reports.length}\n`)

  const statusAntes = [...new Set(reports.map(r => r.status))]
  console.log('📋 Status no banco (antes):')
  statusAntes.forEach(s => {
    const count = reports.filter(r => r.status === s).length
    console.log(`   "${s}" → ${count} registro(s)`)
  })

  const atualizacoes = []
  for (const report of reports) {
    const padrao = normalizarStatus(report.status)
    if (padrao !== report.status) {
      atualizacoes.push({ id: report.id, de: report.status, para: padrao, titulo: report.titulo })
    }
  }

  if (atualizacoes.length === 0) {
    console.log('\n✅ Nenhum registro precisou ser alterado. Status já estão no padrão.')
    await prisma.$disconnect()
    return
  }

  console.log(`\n✨ Atualizando ${atualizacoes.length} registro(s):\n`)
  atualizacoes.slice(0, 25).forEach((u, i) => {
    console.log(`   ${i + 1}. "${u.de}" → "${u.para}" (${(u.titulo || '').substring(0, 45)}...)`)
  })
  if (atualizacoes.length > 25) {
    console.log(`   ... e mais ${atualizacoes.length - 25} registro(s)`)
  }

  // Atualizar em lote por status de origem (muito mais rápido)
  const porLote = {}
  for (const u of atualizacoes) {
    if (!porLote[u.de]) porLote[u.de] = { para: u.para, count: 0 }
    porLote[u.de].count++
  }
  let alterados = 0
  for (const [de, { para, count }] of Object.entries(porLote)) {
    const result = await prisma.report.updateMany({
      where: { status: de },
      data: { status: para, updatedAt: new Date() }
    })
    alterados += result.count
    console.log(`   "${de}" → "${para}": ${result.count} registro(s)`)
  }

  console.log(`\n✅ ${alterados} registro(s) corrigido(s) no banco.`)

  const statusDepois = await prisma.report.findMany({
    select: { status: true },
    distinct: ['status']
  })
  console.log('\n📋 Status no banco (depois):')
  for (const s of statusDepois) {
    const count = await prisma.report.count({ where: { status: s.status } })
    console.log(`   "${s.status}" → ${count} registro(s)`)
  }

  await prisma.$disconnect()
}

main()
  .then(() => {
    console.log('\n✅ Processo concluído.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Erro:', err)
    process.exit(1)
  })
