const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkContratosStatus() {
  try {
    console.log('🔍 Verificando status dos contratos no banco de dados...')
    console.log('')
    
    // Buscar todos os contratos com seus status
    const contratos = await prisma.contrato.findMany({
      select: {
        id: true,
        numero: true,
        codigo: true,
        status: true,
        grupoEconomico: true,
        createdAt: true,
        cliente: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`📊 Total de contratos encontrados: ${contratos.length}`)
    console.log('')
    
    // Agrupar por status
    const statusCount = contratos.reduce((acc, contrato) => {
      const status = contrato.status || 'Sem status'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    
    console.log('📈 Contratos por status:')
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} contrato(s)`)
    })
    console.log('')
    
    // Mostrar detalhes dos contratos
    console.log('📋 Detalhes dos contratos:')
    contratos.forEach((contrato, index) => {
      console.log(`${index + 1}. ${contrato.numero || contrato.codigo || 'Sem número'}`)
      console.log(`   Status: ${contrato.status || 'Sem status'}`)
      console.log(`   Grupo: ${contrato.grupoEconomico || 'Não informado'}`)
      console.log(`   Cliente: ${contrato.cliente?.nome || 'Não vinculado'}`)
      console.log(`   Criado em: ${contrato.createdAt.toLocaleDateString('pt-BR')}`)
      console.log('')
    })
    
    // Verificar se há contratos inativos
    const contratosInativos = contratos.filter(c => c.status && c.status.toLowerCase() !== 'ativo')
    const contratosAtivos = contratos.filter(c => c.status && c.status.toLowerCase() === 'ativo')
    
    console.log('🎯 Resumo:')
    console.log(`   ✅ Contratos Ativos: ${contratosAtivos.length}`)
    console.log(`   ❌ Contratos Inativos: ${contratosInativos.length}`)
    console.log(`   ❓ Contratos sem status: ${contratos.length - contratosAtivos.length - contratosInativos.length}`)
    
    if (contratosInativos.length > 0) {
      console.log('')
      console.log('🔍 Contratos inativos encontrados:')
      contratosInativos.forEach((contrato, index) => {
        console.log(`   ${index + 1}. ${contrato.numero || contrato.codigo || 'Sem número'} - Status: ${contrato.status}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar contratos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContratosStatus()
