/**
 * Dados iniciais: áreas, tipos de exemplo e usuário administrador do portal.
 * Rode: npx prisma db seed
 *
 * Admin (sobrescreva em produção via env):
 *   PORTAL_ADMIN_EMAIL
 *   PORTAL_ADMIN_PASSWORD
 *   PORTAL_ADMIN_NAME
 */
import { PrismaClient, PortalUserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = (process.env.PORTAL_ADMIN_EMAIL || 'admin@portal.local').toLowerCase()
  const adminPassword = process.env.PORTAL_ADMIN_PASSWORD || 'AdminPortal@Trocar2026'
  const adminName = process.env.PORTAL_ADMIN_NAME || 'Administrador do portal'

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await prisma.portalUser.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: PortalUserRole.PORTAL_ADMIN,
      active: true,
    },
    update: {
      passwordHash,
      name: adminName,
      role: PortalUserRole.PORTAL_ADMIN,
      active: true,
    },
  })
  console.log(`Seed portal: administrador garantido (${adminEmail}).`)

  const a1 = await prisma.portalArea.upsert({
    where: { slug: 'geral' },
    create: { slug: 'geral', name: 'Solicitações gerais', sortOrder: 0, active: true },
    update: { name: 'Solicitações gerais', active: true },
  })

  const exemploFormulario = {
    fields: [
      {
        key: 'assunto',
        label: 'Assunto',
        type: 'text',
        required: true,
        placeholder: 'Resumo do pedido',
      },
      { key: 'detalhes', label: 'Detalhes', type: 'textarea', required: false },
    ],
  }

  await prisma.portalRequestType.upsert({
    where: { areaId_slug: { areaId: a1.id, slug: 'duvida' } },
    create: {
      areaId: a1.id,
      slug: 'duvida',
      name: 'Dúvida / orientação',
      active: true,
      formSchema: exemploFormulario,
    },
    update: { name: 'Dúvida / orientação', active: true, formSchema: exemploFormulario },
  })

  console.log('Seed portal: área e tipo de exemplo criados.')
  if (!process.env.PORTAL_ADMIN_PASSWORD) {
    console.warn(
      '⚠️  Usando senha padrão do admin. Defina PORTAL_ADMIN_PASSWORD no .env e rode o seed de novo em produção.'
    )
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
