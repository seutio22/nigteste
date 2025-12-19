/**
 * Script para normalizar status "concluido" -> "Concluída" na tabela Analytics
 * Execute: npx @railway/cli run --service nigteste node normalize-analytics-concluida.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando status na tabela Analytics...\n')
  
  try {
    // Verificar todos os status na tabela Analytics
    // Nota: Analytics pode não ter campo status diretamente, vamos verificar a estrutura
    const todasAnalytics = await prisma.analytics.findMany({
      select: {
        id: true,
        tipo: true,
        categoria: true,
        periodo: true
      },
      take: 10
    })
    
    console.log('📊 Estrutura da tabela Analytics (primeiros 10 registros):')
    todasAnalytics.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Tipo: ${reg.tipo}`)
      console.log(`     Categoria: ${reg.categoria}`)
      console.log(`     Período: ${reg.periodo}`)
      console.log('')
    })
    
    // Verificar se há algum campo que contenha status ou informações sobre conclusão
    // Vou buscar todos os registros e verificar se há algum padrão relacionado a "concluido"
    const total = await prisma.analytics.count()
    console.log(`📊 Total de registros na tabela Analytics: ${total}\n`)
    
    // Verificar se há algum campo de métricas que contenha informações sobre status
    const todasComMetricas = await prisma.analytics.findMany({
      select: {
        id: true,
        metricas: true,
        tipo: true,
        categoria: true
      }
    })
    
    // Procurar por "concluido" ou variações nas métricas
    console.log('🔍 Procurando por variações de "concluido" nos dados...\n')
    
    const variacoes = ['concluido', 'CONCLUIDO', 'Concluido', 'concluída', 'Concluída', 'CONCLUÍDA']
    let encontrados = 0
    
    todasComMetricas.forEach(reg => {
      if (reg.metricas) {
        const metricasLower = reg.metricas.toLowerCase()
        variacoes.forEach(variacao => {
          if (metricasLower.includes(variacao.toLowerCase())) {
            encontrados++
            console.log(`  Encontrado em ID: ${reg.id}`)
            console.log(`    Tipo: ${reg.tipo}, Categoria: ${reg.categoria}`)
            console.log(`    Métricas: ${reg.metricas.substring(0, 100)}...`)
            console.log('')
          }
        })
      }
    })
    
    if (encontrados === 0) {
      console.log('ℹ️  A tabela Analytics não parece ter um campo "status" direto.')
      console.log('ℹ️  Os dados podem estar armazenados no campo "metricas" ou em outros campos.')
      console.log('ℹ️  Verificando se há necessidade de normalização em outros campos...\n')
    }
    
    // Verificar se há algum padrão nos dados que precise ser normalizado
    // Como Analytics pode ter estrutura diferente, vamos verificar todos os campos possíveis
    console.log('📋 Verificando se há campos que contenham status...\n')
    
    // Listar todos os campos únicos de tipo e categoria para entender a estrutura
    const tipos = await prisma.analytics.findMany({
      select: {
        tipo: true
      },
      distinct: ['tipo']
    })
    
    const categorias = await prisma.analytics.findMany({
      select: {
        categoria: true
      },
      distinct: ['categoria']
    })
    
    console.log('📊 Tipos encontrados:')
    tipos.forEach(t => console.log(`  - ${t.tipo}`))
    
    console.log('\n📊 Categorias encontradas:')
    categorias.forEach(c => console.log(`  - ${c.categoria}`))
    
    console.log('\n⚠️  Nota: A tabela Analytics pode não ter um campo "status" direto.')
    console.log('⚠️  Se você quiser normalizar dados específicos, por favor indique:')
    console.log('    - Qual campo contém o status?')
    console.log('    - Ou quais registros específicos precisam ser alterados?')
    
  } catch (error) {
    console.error('❌ Erro ao verificar Analytics:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
normalizeStatus()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error)
    process.exit(1)
  })

