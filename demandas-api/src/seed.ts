import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const emailOld = 'admin@local'
  const email = 'admin@local.com'
  const existingNew = await prisma.user.findUnique({ where: { email } })
  const existingOld = await prisma.user.findUnique({ where: { email: emailOld } })
  const hash = await bcrypt.hash('admin123', 10)
  if (existingNew) {
    console.log('Usuário admin já existe:', email)
  } else if (existingOld) {
    await prisma.user.update({ where: { email: emailOld }, data: { email, password: hash, role: 'admin', name: 'Administrador' } })
    console.log('Usuário admin atualizado para:', email, 'senha: admin123')
  } else {
    await prisma.user.create({ data: { email, name: 'Administrador', password: hash, role: 'admin' } })
    console.log('Usuário admin criado:', email, 'senha: admin123')
  }

  // ===== Seed de dados mestres =====
  const newId = () => {
    try {
      return (require('crypto').randomUUID() as string)
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
  }

  // Tipos de Serviço padrão
  await prisma.tipoServico.upsert({ where: { id: 'CAD' }, update: {}, create: { id: 'CAD', nome: 'Cadastro' } })
  await prisma.tipoServico.upsert({ where: { id: 'MAN' }, update: {}, create: { id: 'MAN', nome: 'Manutenção' } })

  // Criar apenas se vazio
  const [areasCount, analistasCount, operadorasCount, produtosCount, sistemasCount, clientesCount, contratosCount, tiposCount] = await Promise.all([
    prisma.area.count(),
    prisma.analista.count(),
    prisma.operadora.count(),
    prisma.produto.count(),
    prisma.sistema.count(),
    prisma.cliente.count(),
    prisma.contrato.count(),
    prisma.tipoDemanda.count(),
  ])

  if (areasCount === 0) {
    await prisma.area.createMany({ data: [
      { id: newId(), nome: 'Comercial' },
      { id: newId(), nome: 'Operações' },
      { id: newId(), nome: 'Financeiro' },
    ] })
  }

  if (analistasCount === 0) {
    await prisma.analista.createMany({ data: [
      { id: newId(), nome: 'Ana Souza' },
      { id: newId(), nome: 'Carlos Lima' },
      { id: newId(), nome: 'Marina Rocha' },
    ] })
  }

  if (operadorasCount === 0) {
    await prisma.operadora.createMany({ data: [
      { id: newId(), nome: 'Operadora X' },
      { id: newId(), nome: 'Operadora Y' },
    ] })
  }

  if (produtosCount === 0) {
    await prisma.produto.createMany({ data: [
      { id: newId(), nome: 'Produto A' },
      { id: newId(), nome: 'Produto B' },
    ] })
  }

  if (sistemasCount === 0) {
    await prisma.sistema.createMany({ data: [
      { id: newId(), nome: 'ERP' },
      { id: newId(), nome: 'CRM' },
    ] })
  }

  if (clientesCount === 0) {
    await prisma.cliente.createMany({ data: [
      { id: newId(), nome: 'Cliente Alpha', grupoEconomico: 'Grupo A' },
      { id: newId(), nome: 'Cliente Beta', grupoEconomico: 'Grupo B' },
    ] })
  }

  if (contratosCount === 0) {
    await prisma.contrato.createMany({ data: [
      { id: newId(), codigo: 'C-1001', grupoEconomico: 'Grupo A' },
      { id: newId(), codigo: 'C-1002', grupoEconomico: 'Grupo B' },
    ] })
  }

  if (tiposCount === 0) {
    await prisma.tipoDemanda.createMany({ data: [
      { id: newId(), nome: 'Abertura de contrato', tipoServicoId: 'CAD' },
      { id: newId(), nome: 'Atualização cadastral', tipoServicoId: 'MAN' },
      { id: newId(), nome: 'Cancelamento', tipoServicoId: 'MAN' },
    ] })
  }
  console.log('Seed de dados mestres concluído.')
}

main().finally(async () => prisma.$disconnect())


