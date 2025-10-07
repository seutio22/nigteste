// Script para verificar e adicionar dados mestres necessários
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAndAddMasterData() {
  console.log('🔍 Verificando dados mestres...')

  try {
    // Verificar tipos de serviço
    console.log('\n📋 TIPOS DE SERVIÇO:')
    const tiposServico = await prisma.tipoServico.findMany()
    console.log(`Existentes: ${tiposServico.length}`)
    tiposServico.forEach(ts => console.log(`  - ${ts.nome}`))

    // Adicionar tipos de serviço se não existirem
    const tiposServicoNecessarios = [
      'CADASTRO - INCLUSAO',
      'CADASTRO - ALTERACAO',
      'CADASTRO',
      'MANUTENCAO',
      'MAN'
    ]

    for (const tipoNome of tiposServicoNecessarios) {
      const existe = tiposServico.some(ts => ts.nome === tipoNome)
      if (!existe) {
        console.log(`➕ Adicionando tipo de serviço: ${tipoNome}`)
        await prisma.tipoServico.create({
          data: { nome: tipoNome, descricao: `Tipo de serviço: ${tipoNome}` }
        })
      }
    }

    // Verificar tipos de demanda
    console.log('\n📋 TIPOS DE DEMANDA:')
    const tiposDemanda = await prisma.tipoDemanda.findMany()
    console.log(`Existentes: ${tiposDemanda.length}`)
    tiposDemanda.forEach(td => console.log(`  - ${td.nome}`))

    // Adicionar tipos de demanda se não existirem
    const tiposDemandaNecessarios = [
      'USUARIO',
      'INCLUSAO',
      'ALTERACAO',
      'EXCLUSAO'
    ]

    for (const tipoNome of tiposDemandaNecessarios) {
      const existe = tiposDemanda.some(td => td.nome === tipoNome)
      if (!existe) {
        console.log(`➕ Adicionando tipo de demanda: ${tipoNome}`)
        await prisma.tipoDemanda.create({
          data: { nome: tipoNome, descricao: `Tipo de demanda: ${tipoNome}` }
        })
      }
    }

    // Verificar solicitantes
    console.log('\n📋 SOLICITANTES:')
    const solicitantes = await prisma.solicitante.findMany()
    console.log(`Existentes: ${solicitantes.length}`)
    solicitantes.forEach(s => console.log(`  - ${s.nome}`))

    // Adicionar solicitantes se não existirem
    const solicitantesNecessarios = [
      'MARIANA CLARCK',
      'KAROLINE BERTOLDI',
      'NICOLE FANTATO'
    ]

    for (const solicitanteNome of solicitantesNecessarios) {
      const existe = solicitantes.some(s => s.nome === solicitanteNome)
      if (!existe) {
        console.log(`➕ Adicionando solicitante: ${solicitanteNome}`)
        await prisma.solicitante.create({
          data: { nome: solicitanteNome }
        })
      }
    }

    // Verificar analistas
    console.log('\n📋 ANALISTAS:')
    const analistas = await prisma.analista.findMany()
    console.log(`Existentes: ${analistas.length}`)
    analistas.forEach(a => console.log(`  - ${a.nome}`))

    // Adicionar analista se não existir
    const analistaNecessario = 'EMYLI'
    const existeAnalista = analistas.some(a => a.nome === analistaNecessario)
    if (!existeAnalista) {
      console.log(`➕ Adicionando analista: ${analistaNecessario}`)
      await prisma.analista.create({
        data: { 
          nome: analistaNecessario, 
          email: `${analistaNecessario.toLowerCase()}@empresa.com` 
        }
      })
    }

    // Verificar áreas
    console.log('\n📋 ÁREAS:')
    const areas = await prisma.area.findMany()
    console.log(`Existentes: ${areas.length}`)
    areas.forEach(a => console.log(`  - ${a.nome}`))

    // Adicionar áreas se não existirem
    const areasNecessarias = [
      'RELACIONAMENTO',
      'GESTÃO DE SAÚDE',
      'RELACIONAMENTO PETZ'
    ]

    for (const areaNome of areasNecessarias) {
      const existe = areas.some(a => a.nome === areaNome)
      if (!existe) {
        console.log(`➕ Adicionando área: ${areaNome}`)
        await prisma.area.create({
          data: { nome: areaNome }
        })
      }
    }

    // Verificar sistemas
    console.log('\n📋 SISTEMAS:')
    const sistemas = await prisma.sistema.findMany()
    console.log(`Existentes: ${sistemas.length}`)
    sistemas.forEach(s => console.log(`  - ${s.nome}`))

    // Adicionar sistemas se não existirem
    const sistemasNecessarios = [
      'EDGE',
      'ROTINAS'
    ]

    for (const sistemaNome of sistemasNecessarios) {
      const existe = sistemas.some(s => s.nome === sistemaNome)
      if (!existe) {
        console.log(`➕ Adicionando sistema: ${sistemaNome}`)
        await prisma.sistema.create({
          data: { nome: sistemaNome }
        })
      }
    }

    console.log('\n✅ Verificação e adição de dados mestres concluída!')

  } catch (error) {
    console.error('❌ Erro ao verificar/adicionar dados mestres:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndAddMasterData()
