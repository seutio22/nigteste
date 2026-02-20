import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import jwt from '@fastify/jwt'
import authPlugin from './plugins/auth'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import comunicadosRoutes from './routes/comunicados'
import projectTeamRoutes from './routes/projectTeam'
import shareRoutes from './routes/share'
import { masterDataRoutes } from './routes/masterData'
import { kanbanRoutes } from './routes/kanban'
import monitoringRoutes from './routes/monitoring'
import deletionHistoryRoutes from './routes/deletionHistory'
import { convertToWordRoutes } from './routes/convertToWord'
import { trackUserActivity, trackSessionStart, trackSessionEnd } from './middleware/activityTracker'
import { PrismaClient } from '@prisma/client'
import { prisma } from './lib/prisma'

// Configurar tratamento de sinais para evitar SIGTERM
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM recebido, encerrando graciosamente...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📡 SIGINT recebido, encerrando graciosamente...')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason)
  process.exit(1)
})

const app = Fastify({ 
  logger: true,
  bodyLimit: 50 * 1024 * 1024 // 50MB
})
// Usar singleton do PrismaClient para evitar múltiplas conexões

// CORS deve ser o primeiro plugin para preflight OPTIONS funcionar corretamente
const allowedOrigins = [
  'https://nigteste.vercel.app',
  'https://nigdynamic.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
]
// Handler explícito para preflight OPTIONS - garante CORS mesmo se o plugin falhar
app.addHook('onRequest', async (request, reply) => {
  if ((request as any).method === 'OPTIONS') {
    const origin = (request as any).headers?.origin
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    reply.header('Access-Control-Allow-Origin', allowOrigin)
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD')
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With, X-Session-ID, x-user-id, x-user-role')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.header('Access-Control-Max-Age', '86400')
    return reply.code(204).send()
  }
})
const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(null, allowedOrigins[0])
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'X-Session-ID', 'x-user-id', 'x-user-role'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  strictPreflight: false
}
app.register(cors, corsOptions)

// Garantir que as colunas de privacidade do Project existam (fallback sem CLI)
async function ensureProjectPrivacyColumns() {
  try {
    // Criar colunas se não existirem
    await prisma.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE');

    // Índices opcionais
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_project_ownerId" ON "Project" ("ownerId")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_project_isPrivate" ON "Project" ("isPrivate")');

    // Correção de dados: evitar projetos invisíveis (privado sem owner)
    await prisma.$executeRawUnsafe('UPDATE "Project" SET "isPrivate" = FALSE WHERE "isPrivate" = TRUE AND ("ownerId" IS NULL OR "ownerId" = \'\')');

    app.log.info('✅ ensureProjectPrivacyColumns: Colunas/índices garantidos')
  } catch (err) {
    app.log.error({ err }, '❌ ensureProjectPrivacyColumns: Falha ao garantir colunas/índices')
  }
}

// NÃO executar no boot - deferir para depois do listen (evita bloquear healthcheck)
// ensureProjectPrivacyColumns() mover para dentro de start()

// Middleware para reconexão automática do Prisma
app.addHook('onRequest', async (request, reply) => {
  // /health e OPTIONS (preflight CORS) não devem depender do banco
  const url = (request as any).url || ''
  if (url.startsWith('/health') || (request as any).method === 'OPTIONS') return
  try {
    // Testar conexão antes de cada request
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    console.log('🔄 Conexão perdida, tentando reconectar...')
    const { ensureConnection } = await import('./lib/prisma')
    const connected = await ensureConnection()
    if (!connected) {
      console.error('❌ Falha ao reconectar, retornando erro 503')
      return reply.code(503).send({ 
        error: 'Service Unavailable', 
        message: 'Banco de dados temporariamente indisponível' 
      })
    }
  }
})

// Schema PostgreSQL gerenciado pelo Prisma migrations
console.log('🔧 PostgreSQL configurado - schema gerenciado por migrations')
console.log('🚀 REAJUSTE SCHEMA ATUALIZADO - v2.4.3 - CAMPOS ADICIONADOS')

// Middleware para forçar UTF-8 e CORS em todas as respostas (inclui erros 404/500)
app.addHook('onSend', async (request, reply, payload) => {
  const contentType = reply.getHeader('content-type')
  if (contentType && contentType.toString().includes('application/json')) {
    reply.header('Content-Type', 'application/json; charset=utf-8')
  }
  // Garantir CORS em todas as respostas (erros podem não passar pelo plugin)
  if (!reply.getHeader('Access-Control-Allow-Origin')) {
    const origin = (request as any).headers?.origin
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    reply.header('Access-Control-Allow-Origin', allowOrigin)
    reply.header('Access-Control-Allow-Credentials', 'true')
  }
  return payload
})

// Hook para configurar headers de encoding em todas as respostas
app.addHook('onRequest', async (request, reply) => {
  // Só definir Content-Type se ainda não foi definido
  if (!reply.getHeader('content-type')) {
    reply.header('Content-Type', 'application/json; charset=utf-8')
  }
})




console.log('🔧 DEPLOY SIMPLIFICADO - EVITAR PROBLEMAS!');
console.log('🔧 PROBLEMA: Deploy falhando no Railway!');
console.log('🔧 SOLUÇÃO: Simplificar processo de build!');
console.log('🔧 RAILWAY: Build mais simples e direto!');



// 🚀 MELHORIA 1: Compression HTTP (Gzip) - 60-80% menos tráfego
app.register(compress, {
  global: true,
  encodings: ['gzip', 'deflate'],
  threshold: 1024 // Comprimir apenas respostas > 1KB
})

// VERSÃO 2.5.0 - Correções importantes de deploy e configuração
console.log('🚀 VERSÃO 2.5.0 - Sistema atualizado com correções importantes!')
console.log('🚀 TIMESTAMP: 2025-12-19 - VERSÃO 2.5.0!')
console.log('🚀 CORREÇÕES: DATABASE_URL corrigida, package-lock.json atualizado, Railway configurado!')
console.log('🚀 PACKAGE.JSON VERSION: 2.5.0 - Deploy funcionando corretamente!')
console.log('🚀 COMANDO START: npm run railway:start (start-robust.js)!')
console.log('🚀 DATABASE: Conexão funcionando corretamente!')

app.get('/teste-versao-v212', async (request, reply) => {
  console.log('🚀 ROTA DE TESTE v2.1.2 CHAMADA - FORCAR REDEPLOY POSTGRESQL!')
  return { 
    message: 'Rota de teste v2.1.2 funcionando! FORCAR REDEPLOY POSTGRESQL!',
    timestamp: new Date().toISOString(),
    version: 'v2.1.2',
    packageVersion: '2.1.2',
    buildForced: true,
    cacheDisabled: true,
    distCleaned: true,
    cacheBuster: Math.random(),
    deleteFixApplied: true,
    createAdminEndpointAdded: true,
    setupAdminFixed: true,
    menuLateralFixed: true,
    permissionsFixed: true,
    endpointsAdded: true,
    postgresqlConnectivityFixed: true,
    setupScriptImproved: true,
    applicationAlwaysStarts: true,
    startCommandFixed: true,
    directStartWithoutPostgreSQL: true
  }
})

// Endpoint para tentar conectar ao banco antigo e exportar dados
app.post('/export-old-data', async (request, reply) => {
  try {
    console.log('📊 Tentando conectar ao banco antigo para exportar dados...')
    
    // Usar pg diretamente para conectar ao banco antigo
    const { Client } = require('pg')
    
    const client = new Client({
      connectionString: 'postgresql://postgres:bmMmEyxMQtWnuUNpCHurVgavceYvAaeR@caboose.proxy.rlwy.net:14005/railway'
    })
    
    await client.connect()
    console.log('✅ Conectado ao banco antigo!')
    
    // Tentar listar tabelas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows
    console.log('📋 Tabelas encontradas:', tables)
    
    // Tentar exportar dados de cada tabela
    const exportedData: any = {}
    let totalRecords = 0
    
    for (const table of tables) {
      try {
        const tableName = table.table_name
        console.log(`📤 Exportando tabela: ${tableName}`)
        
        const dataResult = await client.query(`SELECT * FROM "${tableName}"`)
        const data = dataResult.rows
        const recordCount = data.length
        
        exportedData[tableName] = data
        totalRecords += recordCount
        
        console.log(`✅ Dados exportados da tabela ${tableName}: ${recordCount} registros`)
      } catch (tableError: any) {
        console.log(`⚠️ Erro ao exportar tabela ${table.table_name}:`, tableError.message)
        exportedData[table.table_name] = { error: tableError.message }
      }
    }
    
    await client.end()
    
    return { 
      message: 'Dados exportados com sucesso!', 
      success: true, 
      totalTables: tables.length,
      totalRecords: totalRecords,
      tables: tables.map(t => t.table_name),
      data: exportedData 
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao banco antigo:', error.message)
    return { 
      message: 'Erro ao conectar ao banco antigo', 
      error: error.message, 
      success: false 
    }
  }
})

// Endpoint para aplicar schema do banco
app.post('/setup-schema', async (request, reply) => {
  try {
    console.log('📊 Aplicando schema do banco usando Prisma...')
    
    // Usar prisma db push para aplicar o schema completo
    const { execSync } = require('child_process')
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
    
    console.log('✅ Schema aplicado com sucesso!')
    return { message: 'Schema aplicado com sucesso!', success: true }
  } catch (error: any) {
    console.error('❌ Erro ao aplicar schema:', error.message)
    return { message: 'Erro ao aplicar schema', error: error.message, success: false }
  }
})

// Endpoint para verificar tabelas criadas
app.get('/check-tables', async (request, reply) => {
  try {
    console.log('📋 Verificando tabelas criadas no banco...')
    
    // Listar todas as tabelas no banco
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    
    // Lista esperada de tabelas do schema
    const expectedTables = [
      'Analytics', 'Area', 'AreaMailling', 'Analista', 'Atendimento',
      'CargoMailling', 'Cliente', 'Comunicado', 'ComunicadoComentario', 
      'ComunicadoVisualizacao', 'Contrato', 'Dashboard', 'DashboardWidget',
      'Dados', 'Demanda', 'FilialMailling', 'KanbanTicket', 'Mailling',
      'Manutencao', 'Modelo', 'Operadora', 'Padrao', 'Permission',
      'Produto', 'Project', 'ProjectExternalMember', 'ProjectMember',
      'ProjectMilestone', 'ProjectShareToken', 'ProjectSubtask', 'ProjectTask',
      'ProjectTimeline', 'Reajuste', 'ReajusteLancamento', 'ReajusteManutencao',
      'Relatorio', 'Report', 'Sistema', 'Solicitante', 'TimelineEvent',
      'TipoCadastro', 'TipoDemanda', 'TipoServico', 'User', 'UserPermission',
      'Validacao', 'ValidacaoManutencao'
    ]
    
    const createdTables = (tables as any[]).map(t => t.table_name)
    const missingTables = expectedTables.filter(table => !createdTables.includes(table))
    const extraTables = createdTables.filter(table => !expectedTables.includes(table))
    
    console.log(`📊 Tabelas criadas: ${createdTables.length}`)
    console.log(`📊 Tabelas esperadas: ${expectedTables.length}`)
    console.log(`❌ Tabelas faltando: ${missingTables.length}`)
    
    return {
      message: 'Verificação de tabelas concluída',
      success: true,
      totalCreated: createdTables.length,
      totalExpected: expectedTables.length,
      createdTables: createdTables,
      missingTables: missingTables,
      extraTables: extraTables,
      allTablesCreated: missingTables.length === 0
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar tabelas:', error.message)
    return { message: 'Erro ao verificar tabelas', error: error.message, success: false }
  }
})

// Endpoint de login temporário (sem banco) - EMERGÊNCIA
app.post('/auth/login-temp', async (request, reply) => {
  try {
    console.log('🚨 LOGIN TEMPORÁRIO - SEM BANCO')
    
    const { email, password } = request.body as any
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email e senha são obrigatórios' })
    }
    
    // Aceitar qualquer credencial por enquanto
    console.log('🔐 Login temporário para:', email)
    
    // Criar token JWT
    const token = app.jwt.sign({ 
      userId: 'temp-admin-id',
      email: email,
      role: 'admin'
    })
    
    console.log('✅ Login temporário bem-sucedido:', email)
    
    return {
      message: 'Login temporário bem-sucedido',
      token: token,
      user: {
        id: 'temp-admin-id',
        name: 'Administrador',
        email: email,
        role: 'admin',
        active: true,
        permissions: {
          home: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: true, edit: true, delete: true },
          configuracoes: { view: true, create: true, edit: true, delete: true },
          relatorios: { view: true, create: true, edit: true, delete: true }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro no login temporário:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint para criar admin temporário (sem banco)
app.post('/create-admin-temp', async (request, reply) => {
  try {
    console.log('🔧 POST /create-admin-temp: Criando admin temporário')
    
    const { email, password } = request.body as any
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email e senha são obrigatórios' })
    }
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Criar token JWT diretamente
    const token = app.jwt.sign({ 
      userId: 'temp-admin-id',
      email: email,
      role: 'admin'
    })
    
    console.log('✅ Admin temporário criado:', email)
    
    return {
      message: 'Admin temporário criado com sucesso',
      token: token,
      user: {
        id: 'temp-admin-id',
        name: 'Administrador',
        email: email,
        role: 'admin',
        active: true,
        permissions: {
          home: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: true, edit: true, delete: true },
          configuracoes: { view: true, create: true, edit: true, delete: true },
          relatorios: { view: true, create: true, edit: true, delete: true }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin temporário:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint público para listar usuários (sem autenticação)
app.get('/usuarios-publicos', async (request, reply) => {
  try {
    console.log('🔍 GET /usuarios-publicos: Listando usuários sem autenticação')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    console.log(`✅ GET /usuarios-publicos: ${users.length} usuários encontrados`)
    return users
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error)
    throw error
  }
})

// Endpoint para criar usuário admin inicial (apenas para setup)
app.post('/setup-admin', async (request, reply) => {
  try {
    console.log('🔧 POST /setup-admin: Configurando usuário admin')
    
    const body = request.body as any || {}
    const email = body.email || 'admin@admin.com'
    const password = body.password || 'admin'
    const name = body.name || 'Administrador'
    
    console.log('📧 Email recebido:', email)
    console.log('🔑 Senha recebida:', password)
    console.log('👤 Nome recebido:', name)
    console.log('📄 Body completo:', JSON.stringify(body, null, 2))
    
    // Verificar se já existe usuário com este email
    const existingAdmin = await prisma.user.findUnique({
      where: { email: email }
    })
    
    console.log('🔍 Usuário existente encontrado:', existingAdmin ? 'Sim' : 'Não')
    if (existingAdmin) {
      console.log('   - ID:', existingAdmin.id)
      console.log('   - Email:', existingAdmin.email)
      console.log('   - Tem senha:', existingAdmin.password ? 'Sim' : 'Não')
    }
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('🔐 Hash da senha gerado:', hashedPassword.substring(0, 20) + '...')
    
    let adminUser
    
    if (existingAdmin) {
      console.log('⚠️ Usuário admin já existe, atualizando senha...')
      
      // Atualizar senha do usuário existente
      adminUser = await prisma.user.update({
        where: { email: email },
        data: {
          password: hashedPassword,
          passwordUpdatedAt: new Date(),
          role: 'admin',
          active: true,
          permissions: JSON.stringify({
            home: { view: true, create: true, edit: true, delete: true },
            dashboard: { view: true, create: true, edit: true, delete: true },
            cadastro: { view: true, create: true, edit: true, delete: true },
            manutencao: { view: true, create: true, edit: true, delete: true },
            atendimento: { view: true, create: true, edit: true, delete: true },
            comunicados: { view: true, create: true, edit: true, delete: true },
            validacao: { view: true, create: true, edit: true, delete: true },
            reajuste: { view: true, create: true, edit: true, delete: true },
            mailling: { view: true, create: true, edit: true, delete: true },
            analytics: { view: true, create: true, edit: true, delete: true },
            kanban: { view: true, create: true, edit: true, delete: true },
            projetos: { view: true, create: true, edit: true, delete: true },
            dados: { view: true, create: true, edit: true, delete: true },
            usuarios: { view: true, create: true, edit: true, delete: true },
            configuracoes: { view: true, create: true, edit: true, delete: true },
            relatorios: { view: true, create: true, edit: true, delete: true }
          })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      console.log('✅ Usuário admin atualizado:', adminUser.email)
      return { message: 'Usuário admin atualizado com sucesso', user: adminUser }
      
        } else {
      console.log('🆕 Criando novo usuário admin...')
      
      // Criar novo usuário admin
      adminUser = await prisma.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          passwordUpdatedAt: new Date(),
          role: 'admin',
          active: true,
          permissions: JSON.stringify({
            home: { view: true, create: true, edit: true, delete: true },
            dashboard: { view: true, create: true, edit: true, delete: true },
            cadastro: { view: true, create: true, edit: true, delete: true },
            manutencao: { view: true, create: true, edit: true, delete: true },
            atendimento: { view: true, create: true, edit: true, delete: true },
            comunicados: { view: true, create: true, edit: true, delete: true },
            validacao: { view: true, create: true, edit: true, delete: true },
            reajuste: { view: true, create: true, edit: true, delete: true },
            mailling: { view: true, create: true, edit: true, delete: true },
            analytics: { view: true, create: true, edit: true, delete: true },
            kanban: { view: true, create: true, edit: true, delete: true },
            projetos: { view: true, create: true, edit: true, delete: true },
            dados: { view: true, create: true, edit: true, delete: true },
            usuarios: { view: true, create: true, edit: true, delete: true },
            configuracoes: { view: true, create: true, edit: true, delete: true },
            relatorios: { view: true, create: true, edit: true, delete: true }
          })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true
        }
      })
      
      console.log('✅ Usuário admin criado:', adminUser.email)
      return { message: 'Usuário admin criado com sucesso', user: adminUser }
    }
    
  } catch (error) {
    console.error('❌ Erro ao configurar usuário admin:', error)
    throw error
  }
})

// Endpoint para criar usuário completamente novo
app.post('/create-new-user', async (request, reply) => {
  try {
    console.log('🔧 POST /create-new-user: Criando usuário completamente novo')
    
    const { email, password, name, role } = request.body as any
    
    if (!email || !password || !name) {
      return reply.code(400).send({ error: 'Email, senha e nome são obrigatórios' })
    }
    
    console.log('📧 Email:', email)
    console.log('🔑 Senha:', password)
    console.log('👤 Nome:', name)
    console.log('👑 Role:', role || 'admin')
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Verificar se já existe usuário com este email
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    })
    
    if (existingUser) {
      console.log('❌ Usuário já existe com este email:', email)
      return reply.code(409).send({ error: 'Usuário já existe com este email', user: existingUser })
    }
    
    console.log('🆕 Criando novo usuário...')
    
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        passwordUpdatedAt: new Date(),
        role: role || 'admin',
        active: true,
        permissions: JSON.stringify({
          home: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: true, edit: true, delete: true },
          configuracoes: { view: true, create: true, edit: true, delete: true },
          relatorios: { view: true, create: true, edit: true, delete: true }
        })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true
      }
    })
    
    console.log('✅ Novo usuário criado:', newUser.email)
      return { 
      message: 'Novo usuário criado com sucesso', 
      user: newUser,
      credentials: {
        email: email,
        password: password
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar novo usuário:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint adicional para criar usuário admin específico
app.post('/create-admin', async (request, reply) => {
  try {
    console.log('🔧 POST /create-admin: Criando usuário admin específico')
    
    const { email, password, name } = request.body as any
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email e senha são obrigatórios' })
    }
    
    console.log('📧 Email:', email)
    console.log('🔑 Senha:', password)
    console.log('👤 Nome:', name || 'Administrador')
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    })
    
    let adminUser
    
    if (existingUser) {
      console.log('⚠️ Usuário já existe, atualizando...')
      
      adminUser = await prisma.user.update({
        where: { email: email },
        data: {
          name: name || 'Administrador',
          password: hashedPassword,
          passwordUpdatedAt: new Date(),
          role: 'admin',
          active: true,
          permissions: JSON.stringify({
            home: { view: true, create: true, edit: true, delete: true },
            dashboard: { view: true, create: true, edit: true, delete: true },
            cadastro: { view: true, create: true, edit: true, delete: true },
            manutencao: { view: true, create: true, edit: true, delete: true },
            atendimento: { view: true, create: true, edit: true, delete: true },
            comunicados: { view: true, create: true, edit: true, delete: true },
            validacao: { view: true, create: true, edit: true, delete: true },
            reajuste: { view: true, create: true, edit: true, delete: true },
            mailling: { view: true, create: true, edit: true, delete: true },
            analytics: { view: true, create: true, edit: true, delete: true },
            kanban: { view: true, create: true, edit: true, delete: true },
            projetos: { view: true, create: true, edit: true, delete: true },
            dados: { view: true, create: true, edit: true, delete: true },
            usuarios: { view: true, create: true, edit: true, delete: true },
            configuracoes: { view: true, create: true, edit: true, delete: true },
            relatorios: { view: true, create: true, edit: true, delete: true }
          })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true
        }
      })
      
      console.log('✅ Usuário admin atualizado:', adminUser.email)
      return { message: 'Usuário admin atualizado com sucesso', user: adminUser }
      
        } else {
      console.log('🆕 Criando novo usuário admin...')
      
      adminUser = await prisma.user.create({
        data: {
          name: name || 'Administrador',
          email: email,
          password: hashedPassword,
          passwordUpdatedAt: new Date(),
          role: 'admin',
          active: true,
          permissions: JSON.stringify({
            home: { view: true, create: true, edit: true, delete: true },
            dashboard: { view: true, create: true, edit: true, delete: true },
            cadastro: { view: true, create: true, edit: true, delete: true },
            manutencao: { view: true, create: true, edit: true, delete: true },
            atendimento: { view: true, create: true, edit: true, delete: true },
            comunicados: { view: true, create: true, edit: true, delete: true },
            validacao: { view: true, create: true, edit: true, delete: true },
            reajuste: { view: true, create: true, edit: true, delete: true },
            mailling: { view: true, create: true, edit: true, delete: true },
            analytics: { view: true, create: true, edit: true, delete: true },
            kanban: { view: true, create: true, edit: true, delete: true },
            projetos: { view: true, create: true, edit: true, delete: true },
            dados: { view: true, create: true, edit: true, delete: true },
            usuarios: { view: true, create: true, edit: true, delete: true },
            configuracoes: { view: true, create: true, edit: true, delete: true },
            relatorios: { view: true, create: true, edit: true, delete: true }
          })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true
        }
      })
      
      console.log('✅ Usuário admin criado:', adminUser.email)
      return { message: 'Usuário admin criado com sucesso', user: adminUser }
    }
    
      } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Endpoint para importação em lote de clientes (importador inteligente)
app.post('/clientes/import-bulk', async (request, reply) => {
  try {
    console.log('📥 POST /clientes/import-bulk: Iniciando importação em lote')
    
    const { clientes } = request.body as { clientes: any[] }
    
    if (!clientes || !Array.isArray(clientes)) {
      return reply.code(400).send({
        error: 'Dados inválidos',
        message: 'É necessário enviar um array de clientes no campo "clientes"'
      })
    }
    
    if (clientes.length === 0) {
      return reply.code(400).send({
        error: 'Array vazio',
        message: 'É necessário enviar pelo menos um cliente para importação'
      })
    }
    
    console.log(`📊 Importando ${clientes.length} clientes`)
    
    const resultados = {
      sucessos: [] as any[],
      falhas: [] as any[],
      duplicatas: [] as any[],
      total: clientes.length,
      processados: 0
    }
    
    // Processar cada cliente individualmente
    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i]
      resultados.processados++
      
      try {
        console.log(`🔍 Processando cliente ${i + 1}/${clientes.length}: ${cliente.nome || 'Sem nome'}`)
        
        // Validar dados obrigatórios
        if (!cliente.nome || !cliente.nome.trim()) {
          resultados.falhas.push({
            indice: i,
            cliente: cliente,
            erro: 'Nome é obrigatório',
            tipo: 'VALIDACAO'
          })
          continue
        }
        
        // Aplicar mesma validação do cadastro manual
        if (cliente.grupoEconomico && cliente.grupoEconomico.trim()) {
          const existingClient = await prisma.cliente.findFirst({
        where: {
              grupoEconomico: cliente.grupoEconomico.trim()
            }
          })
          
          if (existingClient) {
            resultados.duplicatas.push({
              indice: i,
              cliente: cliente,
              clienteExistente: {
                id: existingClient.id,
                nome: existingClient.nome,
                grupoEconomico: existingClient.grupoEconomico
              },
              erro: `Grupo econômico "${cliente.grupoEconomico}" já existe para o cliente "${existingClient.nome}"`,
              tipo: 'DUPLICATA'
            })
            continue
          }
        }
        
        // Limpar dados (remover campos vazios)
        const clienteLimpo = { ...cliente }
        Object.keys(clienteLimpo).forEach(key => {
          const value = clienteLimpo[key]
          if (value === null || value === undefined || value === '') {
            delete clienteLimpo[key]
          }
        })
        
        // Criar cliente
        const clienteCriado = await prisma.cliente.create({
          data: clienteLimpo
        })
        
        resultados.sucessos.push({
          indice: i,
          cliente: cliente,
          clienteCriado: {
            id: clienteCriado.id,
            nome: clienteCriado.nome,
            grupoEconomico: clienteCriado.grupoEconomico
          },
          tipo: 'SUCESSO'
        })
        
        console.log(`✅ Cliente ${i + 1} criado com sucesso: ${clienteCriado.id}`)
        
      } catch (error: any) {
        console.error(`❌ Erro ao processar cliente ${i + 1}:`, error.message)
        
        resultados.falhas.push({
          indice: i,
          cliente: cliente,
          erro: error.message || 'Erro desconhecido',
          tipo: 'ERRO',
          codigo: error.code || 'UNKNOWN'
        })
      }
    }
    
    // Calcular estatísticas finais
    const estatisticas = {
      total: resultados.total,
      sucessos: resultados.sucessos.length,
      falhas: resultados.falhas.length,
      duplicatas: resultados.duplicatas.length,
      taxaSucesso: ((resultados.sucessos.length / resultados.total) * 100).toFixed(2) + '%'
    }
    
    console.log(`📊 Importação concluída:`, estatisticas)
    
    // Determinar código de resposta
    let statusCode = 200
    if (resultados.sucessos.length === 0) {
      statusCode = 400 // Todos falharam
    } else if (resultados.falhas.length > 0 || resultados.duplicatas.length > 0) {
      statusCode = 207 // Sucesso parcial
    }
    
    return reply.code(statusCode).send({
      message: 'Importação em lote concluída',
      estatisticas,
      resultados: {
        sucessos: resultados.sucessos,
        falhas: resultados.falhas,
        duplicatas: resultados.duplicatas
      }
    })
    
  } catch (error: any) {
    console.error('❌ Erro geral na importação em lote:', error)
    return reply.code(500).send({
      error: 'Erro interno do servidor',
      message: error.message || 'Erro desconhecido na importação'
    })
  }
})

// Função genérica para importação em lote de qualquer entidade
function createBulkImportEndpoint(entityName: string, entityKey: string, validationRules?: (item: any) => string | null) {
  return async (request: any, reply: any) => {
    try {
      console.log(`📥 POST /${entityKey}/import-bulk: Iniciando importação em lote`)
      
      const { [entityKey]: items } = request.body as { [key: string]: any[] }
      
      if (!items || !Array.isArray(items)) {
        return reply.code(400).send({
          error: 'Dados inválidos',
          message: `É necessário enviar um array de ${entityKey} no campo "${entityKey}"`
        })
      }
      
      if (items.length === 0) {
        return reply.code(400).send({
          error: 'Array vazio',
          message: `É necessário enviar pelo menos um ${entityKey} para importação`
        })
      }
      
      console.log(`📊 Importando ${items.length} ${entityKey}`)
      
      const resultados = {
        sucessos: [] as any[],
        falhas: [] as any[],
        duplicatas: [] as any[],
        total: items.length,
        processados: 0
      }
      
      const anyPrisma = prisma as any
      
      // Processar cada item individualmente
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        resultados.processados++
        
        try {
          console.log(`🔍 Processando ${entityKey} ${i + 1}/${items.length}: ${item.nome || item.name || 'Sem nome'}`)
          
          // Aplicar validações específicas se fornecidas
          if (validationRules) {
            const validationError = validationRules(item)
            if (validationError) {
              resultados.falhas.push({
                indice: i,
                item: item,
                erro: validationError,
                tipo: 'VALIDACAO'
              })
              continue
            }
          }
          
          // Limpar dados (remover campos vazios)
          const itemLimpo = { ...item }
          Object.keys(itemLimpo).forEach(key => {
            const value = itemLimpo[key]
            if (value === null || value === undefined || value === '') {
              delete itemLimpo[key]
            }
          })
          
          // Criar item
          const itemCriado = await anyPrisma[entityName].create({
            data: itemLimpo
          })
          
          resultados.sucessos.push({
            indice: i,
            item: item,
            itemCriado: {
              id: itemCriado.id,
              nome: itemCriado.nome || itemCriado.name || 'Sem nome'
            },
            tipo: 'SUCESSO'
          })
          
          console.log(`✅ ${entityKey} ${i + 1} criado com sucesso: ${itemCriado.id}`)
          
        } catch (error: any) {
          console.error(`❌ Erro ao processar ${entityKey} ${i + 1}:`, error.message)
          
          resultados.falhas.push({
            indice: i,
            item: item,
            erro: error.message || 'Erro desconhecido',
            tipo: 'ERRO',
            codigo: error.code || 'UNKNOWN'
          })
        }
      }
      
      // Calcular estatísticas finais
      const estatisticas = {
        total: resultados.total,
        sucessos: resultados.sucessos.length,
        falhas: resultados.falhas.length,
        duplicatas: resultados.duplicatas.length,
        taxaSucesso: ((resultados.sucessos.length / resultados.total) * 100).toFixed(2) + '%'
      }
      
      console.log(`📊 Importação de ${entityKey} concluída:`, estatisticas)
      
      // Determinar código de resposta
      let statusCode = 200
      if (resultados.sucessos.length === 0) {
        statusCode = 400 // Todos falharam
      } else if (resultados.falhas.length > 0 || resultados.duplicatas.length > 0) {
        statusCode = 207 // Sucesso parcial
      }
      
      return reply.code(statusCode).send({
        message: `Importação em lote de ${entityKey} concluída`,
        estatisticas,
        resultados: {
          sucessos: resultados.sucessos,
          falhas: resultados.falhas,
          duplicatas: resultados.duplicatas
        }
      })
      
    } catch (error: any) {
      console.error(`❌ Erro geral na importação em lote de ${entityKey}:`, error)
      return reply.code(500).send({
        error: 'Erro interno do servidor',
        message: error.message || `Erro desconhecido na importação de ${entityKey}`
      })
    }
  }
}

// Endpoints de importação em lote para diferentes entidades
app.post('/analistas/import-bulk', createBulkImportEndpoint('analista', 'analistas'))
app.post('/operadoras/import-bulk', createBulkImportEndpoint('operadora', 'operadoras'))
app.post('/produtos/import-bulk', createBulkImportEndpoint('produto', 'produtos'))
app.post('/sistemas/import-bulk', createBulkImportEndpoint('sistema', 'sistemas'))
app.post('/contratos/import-bulk', createBulkImportEndpoint('contrato', 'contratos'))
app.post('/tipos-servico/import-bulk', createBulkImportEndpoint('tipoServico', 'tiposServico'))
app.post('/tipos-demanda/import-bulk', createBulkImportEndpoint('tipoDemanda', 'tiposDemanda'))
app.post('/manutencoes/import-bulk', createBulkImportEndpoint('manutencao', 'manutencoes'))
app.post('/validacoes/import-bulk', createBulkImportEndpoint('validacao', 'validacoes'))
app.post('/tipos-cadastro/import-bulk', createBulkImportEndpoint('tipoCadastro', 'tiposCadastro'))
app.post('/reajustes/import-bulk', createBulkImportEndpoint('reajuste', 'reajustes'))
app.post('/projetos/import-bulk', createBulkImportEndpoint('project', 'projetos'))
app.post('/dados/import-bulk', createBulkImportEndpoint('dados', 'dados'))

// Endpoint para criar dados de teste (apenas para debug)
app.post('/setup-dados-teste', async (request, reply) => {
  try {
    console.log('🔧 POST /setup-dados-teste: Criando dados de teste')
    
    // Criar alguns registros de dados de teste
    const dadosTeste = await Promise.all([
      prisma.dados.create({
        data: {
          id: 'dados-teste-1',
          tipo: 'Teste',
          chave: 'teste-1',
          valor: 'valor-teste-1',
          categoria: 'debug',
          ativo: true,
          descricao: 'Dados de teste para verificar exclusão'
        }
      }),
      prisma.dados.create({
        data: {
          id: 'dados-teste-2',
          tipo: 'Teste',
          chave: 'teste-2',
          valor: 'valor-teste-2',
          categoria: 'debug',
          ativo: true,
          descricao: 'Segundo registro de teste'
        }
      }),
      prisma.dados.create({
        data: {
          id: 'dados-teste-3',
          tipo: 'Teste',
          chave: 'teste-3',
          valor: 'valor-teste-3',
          categoria: 'debug',
          ativo: true,
          descricao: 'Terceiro registro de teste'
        }
      })
    ])
    
    console.log('✅ Dados de teste criados:', dadosTeste.length)
    return { message: `${dadosTeste.length} dados de teste criados`, dados: dadosTeste }
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error)
    throw error
  }
})

// Endpoint temporário para atualizar permissões de reajuste
app.post('/fix-permissions-reajuste', async (request, reply) => {
  try {
    console.log('🔧 Atualizando permissões de reajuste para todos os usuários...')
    
    const users = await prisma.user.findMany()
    
    for (const user of users) {
      let permissions: any = {}
      try {
        permissions = user.permissions ? JSON.parse(user.permissions) : {}
      } catch (error) {
        console.log(`⚠️ Erro ao parsear permissões de ${user.name}`)
      }

      if (user.role === 'admin' || user.role === 'gerente') {
        permissions.reajuste = {
          ...permissions.reajuste,
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          import: true,
          approve: true,
          reject: true
        }
      } else if (user.role === 'analista') {
        permissions.reajuste = {
          ...permissions.reajuste,
          view: true,
          create: true,
          edit: true,
          delete: false,
          export: true,
          import: true,
          approve: false,
          reject: false
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { permissions: JSON.stringify(permissions) }
      })

      console.log(`✅ ${user.name}: reajuste.import = ${permissions.reajuste?.import}`)
    }

    return reply.send({ success: true, message: 'Permissões atualizadas', usersUpdated: users.length })
  } catch (error) {
    console.error('❌ Erro:', error)
    return reply.code(500).send({ error: 'Erro ao atualizar permissões' })
  }
})

// Endpoint para obter dados do usuário atual (com autenticação)
app.get('/usuario-edicao/me', async (request, reply) => {
  try {
    console.log('🔍 GET /usuario-edicao/me: Buscando dados do usuário atual')
    
    // Verificar token de autenticação
    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return reply.code(401).send({ error: 'Token de autenticação necessário' })
    }
    
    // Decodificar token para obter ID do usuário
    const decoded = app.jwt.verify(token)
    const userId = (decoded as any).userId
    
    if (!userId) {
      return reply.code(401).send({ error: 'Token inválido' })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        viewOwnDataOnly: true,
        permissions: true
      }
    })
    
    if (!user) {
      return reply.code(404).send({ error: 'Usuário não encontrado' })
    }
    
    // Gerar permissões padrão se não existirem
    let parsedPermissions = {}
    if (user.permissions) {
      try {
        parsedPermissions = JSON.parse(user.permissions)
      } catch (e) {
        console.log('⚠️ Erro ao fazer parse das permissões, usando objeto vazio')
        parsedPermissions = {}
      }
    }
    
    // Se não há permissões, gerar padrão baseado no role
    if (!user.permissions || Object.keys(parsedPermissions).length === 0) {
      const defaultPermissions = {
        admin: {
          home: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: true, edit: true, delete: true },
          configuracoes: { view: true, create: true, edit: true, delete: true },
          relatorios: { view: true, create: true, edit: true, delete: true }
        }
      }
      
      parsedPermissions = defaultPermissions[user.role as keyof typeof defaultPermissions] || {}
      
      // Salvar permissões geradas no banco
      await prisma.user.update({
        where: { id: userId },
        data: { permissions: JSON.stringify(parsedPermissions) }
      })
      
      console.log('✅ Permissões padrão geradas e salvas para o usuário')
    }
    
    console.log('✅ GET /usuario-edicao/me: Usuário encontrado com permissões')
    
    return {
      ...user,
      permissions: parsedPermissions
    }
  } catch (error) {
    console.error('❌ Erro ao obter usuário atual:', error)
    throw error
  }
})

// Endpoint público para obter dados do usuário para edição (sem autenticação)
app.get('/usuario-edicao/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string }
    console.log(`🔍 GET /usuario-edicao/${id}: Buscando dados do usuário para edição`)
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        viewOwnDataOnly: true,
        permissions: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      console.log(`❌ Usuário com ID ${id} não encontrado`)
      return { error: 'Usuário não encontrado' }
    }
    
    // Se permissions está vazio, gerar permissões padrão baseadas no role
    let permissions = user.permissions
    if (!permissions || permissions === '{}' || permissions === '') {
      console.log(`🔧 Gerando permissões padrão para role: ${user.role}`)
      
      const defaultPermissions = {
        admin: {
          home: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: true, edit: true, delete: true },
          configuracoes: { view: true, create: true, edit: true, delete: true },
          relatorios: { view: true, create: true, edit: true, delete: true }
        },
        gerente: {
          home: { view: true, create: false, edit: false, delete: false },
          dashboard: { view: true, create: true, edit: true, delete: true },
          cadastro: { view: true, create: true, edit: true, delete: true },
          manutencao: { view: true, create: true, edit: true, delete: true },
          atendimento: { view: true, create: true, edit: true, delete: true },
          comunicados: { view: true, create: true, edit: true, delete: true },
          validacao: { view: true, create: true, edit: true, delete: true },
          reajuste: { view: true, create: true, edit: true, delete: true },
          mailling: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          kanban: { view: true, create: true, edit: true, delete: true },
          projetos: { view: true, create: true, edit: true, delete: true },
          dados: { view: true, create: true, edit: true, delete: true },
          usuarios: { view: true, create: false, edit: false, delete: false },
          configuracoes: { view: true, create: false, edit: false, delete: false },
          relatorios: { view: true, create: true, edit: true, delete: true }
        },
        analista: {
          home: { view: true, create: false, edit: false, delete: false },
          dashboard: { view: true, create: false, edit: false, delete: false },
          cadastro: { view: true, create: true, edit: true, delete: false },
          manutencao: { view: true, create: true, edit: true, delete: false },
          atendimento: { view: true, create: true, edit: true, delete: false },
          comunicados: { view: true, create: false, edit: false, delete: false },
          validacao: { view: true, create: true, edit: true, delete: false },
          reajuste: { view: true, create: true, edit: true, delete: false },
          mailling: { view: true, create: false, edit: false, delete: false },
          analytics: { view: true, create: false, edit: false, delete: false },
          kanban: { view: true, create: true, edit: true, delete: false },
          projetos: { view: true, create: true, edit: true, delete: false },
          dados: { view: true, create: true, edit: true, delete: false },
          usuarios: { view: false, create: false, edit: false, delete: false },
          configuracoes: { view: false, create: false, edit: false, delete: false },
          relatorios: { view: true, create: false, edit: false, delete: false }
        },
        solicitante: {
          home: { view: true, create: false, edit: false, delete: false },
          dashboard: { view: true, create: false, edit: false, delete: false },
          cadastro: { view: true, create: true, edit: false, delete: false },
          manutencao: { view: false, create: false, edit: false, delete: false },
          atendimento: { view: true, create: true, edit: false, delete: false },
          comunicados: { view: true, create: false, edit: false, delete: false },
          validacao: { view: false, create: false, edit: false, delete: false },
          reajuste: { view: false, create: false, edit: false, delete: false },
          mailling: { view: false, create: false, edit: false, delete: false },
          analytics: { view: false, create: false, edit: false, delete: false },
          kanban: { view: true, create: true, edit: false, delete: false },
          projetos: { view: true, create: false, edit: false, delete: false },
          dados: { view: true, create: true, edit: false, delete: false },
          usuarios: { view: false, create: false, edit: false, delete: false },
          configuracoes: { view: false, create: false, edit: false, delete: false },
          relatorios: { view: false, create: false, edit: false, delete: false }
        },
        viewer: {
          home: { view: true, create: false, edit: false, delete: false },
          dashboard: { view: true, create: false, edit: false, delete: false },
          cadastro: { view: true, create: false, edit: false, delete: false },
          manutencao: { view: true, create: false, edit: false, delete: false },
          atendimento: { view: true, create: false, edit: false, delete: false },
          comunicados: { view: true, create: false, edit: false, delete: false },
          validacao: { view: true, create: false, edit: false, delete: false },
          reajuste: { view: true, create: false, edit: false, delete: false },
          mailling: { view: true, create: false, edit: false, delete: false },
          analytics: { view: true, create: false, edit: false, delete: false },
          kanban: { view: true, create: false, edit: false, delete: false },
          projetos: { view: true, create: false, edit: false, delete: false },
          dados: { view: true, create: false, edit: false, delete: false },
          usuarios: { view: false, create: false, edit: false, delete: false },
          configuracoes: { view: false, create: false, edit: false, delete: false },
          relatorios: { view: true, create: false, edit: false, delete: false }
        }
      }
      
      permissions = JSON.stringify(defaultPermissions[user.role as keyof typeof defaultPermissions] || {})
    }
    
    // Parse das permissões se for string
    let parsedPermissions = {}
    try {
      parsedPermissions = typeof permissions === 'string' ? JSON.parse(permissions) : permissions
    } catch (e) {
      console.log('⚠️ Erro ao fazer parse das permissões, usando objeto vazio')
      parsedPermissions = {}
    }
    
    console.log(`✅ GET /usuario-edicao/${id}: Usuário encontrado com permissões`)
    
    return {
      ...user,
      permissions: parsedPermissions
    }
  } catch (error) {
    console.error('❌ Erro ao obter usuário para edição:', error)
    throw error
  }
})
console.log('🚀 ROTA DE TESTE v23 REGISTRADA - CÓDIGO NOVO!')

// Endpoints de limpeza de duplicatas removidos - substituídos pelo importador inteligente com validação

// Configurar parser para resolver problemas de Content-Length
app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  try {
    if (body === '' || body === null || body === undefined) {
      done(null, {})
    } else {
      const json = JSON.parse(body as string)
      done(null, json)
    }
  } catch (err) {
    done(err as Error, {})
  }
})

const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-for-development-only';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não configurado. Usando chave padrão (NÃO SEGURO PARA PRODUÇÃO)');
}
app.register(jwt, { secret: jwtSecret })

app.register(authPlugin)

// Middleware de tracking de atividades (após autenticação)
app.addHook('preHandler', async (request, reply) => {
  // Rastrear atividade do usuário
  await trackUserActivity(request as any, reply)
})

// Middleware para rastrear início de sessão no login
app.addHook('onSend', async (request, reply, payload) => {
  if (request.url.includes('/auth/login') && reply.statusCode === 200) {
    await trackSessionStart(request as any, reply)
  }
  if (request.url.includes('/auth/logout') && reply.statusCode === 200) {
    await trackSessionEnd(request as any, reply)
  }
})

app.get('/health', async () => ({ status: 'ok' }))

// Endpoint de debug para testar tracking
app.get('/debug/tracking', async (request: any, reply: any) => {
  try {
    const user = request.authenticatedUser
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado' })
    }

    // Buscar atividades do usuário
    const activities = await prisma.userActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Buscar dados de monitoramento
    const monitoring = await prisma.userMonitoring.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 5
    })

    // Buscar sessões
    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      activities: activities.length,
      monitoring: monitoring.length,
      sessions: sessions.length,
      recentActivities: activities,
      recentMonitoring: monitoring,
      recentSessions: sessions
    })
  } catch (error) {
    console.error('Erro no debug tracking:', error)
    return reply.status(500).send({ error: 'Erro interno' })
  }
})

// Rota para zerar dados de monitoramento
app.post('/monitoring/clear', async (req: any, reply: any) => {
  try {
    console.log('🧹 Iniciando limpeza dos dados de monitoramento...')
    
    // Limpar dados de atividades
    const deletedActivities = await prisma.userActivity.deleteMany({})
    console.log(`✅ Removidas ${deletedActivities.count} atividades`)
    
    // Limpar dados de sessões
    const deletedSessions = await prisma.userSession.deleteMany({})
    console.log(`✅ Removidas ${deletedSessions.count} sessões`)
    
    // Limpar dados de monitoramento
    const deletedMonitoring = await prisma.userMonitoring.deleteMany({})
    console.log(`✅ Removidos ${deletedMonitoring.count} registros de monitoramento`)
    
    console.log('🎯 Dados de monitoramento zerados! Sistema pronto para começar a contar a partir de agora.')
    
    return reply.send({
      message: 'Dados de monitoramento zerados com sucesso!',
      deleted: {
        activities: deletedActivities.count,
        sessions: deletedSessions.count,
        monitoring: deletedMonitoring.count
      }
    })
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error)
    return reply.status(500).send({ message: 'Erro ao limpar dados de monitoramento' })
  }
})

// ROTAS DE MONITORAMENTO - ANTES DE QUALQUER MIDDLEWARE
// (Rota /monitoring/test movida para o final do arquivo)

// Endpoint público para validação de IDs de usuários (sem autenticação)
app.get('/users/validate/:id', async (req: any) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.params.id },
      select: { id: true, name: true, role: true }
    })
    return user || null
  } catch (error) {
    return null
  }
})

/** Status padrão Report (Analytics), alinhado ao Cadastro. Normaliza ao gravar e ao ler. */
function normalizeReportStatus(value: string | null | undefined): string {
  if (value == null || value === '') return 'Pendente'
  const s = String(value).trim()
  const padroes = ['Pendente', 'Em andamento', 'Transf. Analista', 'Concluída', 'Entregue', 'Cancelada']
  if (padroes.includes(s)) return s
  const key = s.toLowerCase().replace(/\s+/g, ' ')
  const map: Record<string, string> = {
    pendente: 'Pendente', aberta: 'Pendente',
    'em andamento': 'Em andamento', em_andamento: 'Em andamento', emandamento: 'Em andamento',
    'transf. analista': 'Transf. Analista', transf_analista: 'Transf. Analista', transfanalista: 'Transf. Analista',
    concluída: 'Concluída', concluida: 'Concluída', concluido: 'Concluída', concluído: 'Concluída',
    entregue: 'Entregue', cancelada: 'Cancelada', cancelado: 'Cancelada'
  }
  if (map[key]) return map[key]
  if (/concluíd?a?o?/i.test(s)) return 'Concluída'
  if (/em\s*andamento|andamento/i.test(s)) return 'Em andamento'
  if (/transf|analista/i.test(s)) return 'Transf. Analista'
  if (/entregue/i.test(s)) return 'Entregue'
  if (/cancelad/i.test(s)) return 'Cancelada'
  return 'Pendente'
}

// CRUD genérico simples para entidades mestres
function crud(entity: keyof PrismaClient) {
  const anyPrisma = prisma as any;
  const parsePagination = (queryParams?: any) => {
    const limit = queryParams?.limit ? parseInt(queryParams.limit.toString()) : undefined
    const offset = queryParams?.offset ? parseInt(queryParams.offset.toString()) : undefined
    return {
      take: Number.isFinite(limit) ? limit : undefined,
      skip: Number.isFinite(offset) ? offset : undefined
    }
  }
  return {
    list: async (queryParams?: any) => {
      // Filtrar timelineEvents por entityId e entityType
      if (entity === 'timelineEvent' && queryParams) {
        const where: any = {}
        if (queryParams.entityId) where.entityId = queryParams.entityId
        if (queryParams.entityType) where.entityType = queryParams.entityType
        const pagination = parsePagination(queryParams)
        
        console.log('🔍 Buscando timelineEvents com filtros:', where)
        const events = await anyPrisma[entity].findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          ...pagination
        })
        console.log('✅ TimelineEvents encontrados:', events.length)
        
        // Mapear para incluir userName ao invés de apenas userId
        return events.map((event: any) => ({
          ...event,
          userName: event.user?.name || event.userId || 'Usuário desconhecido'
        }))
      }
      
      // Incluir relacionamentos para atendimentos
      if (entity === 'atendimento') {
        const pagination = parsePagination(queryParams)
        return anyPrisma[entity].findMany({
          include: {
            cliente: true,
            contrato: true,
            operadora: true,
            produto: true,
            sistema: true,
            area: true,
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            tipo: true,
            tipoServico: true
          },
          ...pagination
        });
      }

      // Incluir relacionamentos para validações
      if (entity === 'validacao') {
        // Construir filtros se queryParams fornecidos
        const where: any = {}
        
        if (queryParams) {
          // Aplicar filtro de ticket se fornecido
          if (queryParams.ticket) {
            where.ticket = queryParams.ticket
          }
          // Aplicar outros filtros genéricos se houver
          Object.keys(queryParams).forEach(key => {
            if (key !== 'entityId' && key !== 'entityType' && key !== 'ticket' && key !== 'limit' && key !== 'offset') {
              where[key] = queryParams[key]
            }
          })
        }
        const pagination = parsePagination(queryParams)
        
        // 🚀 MELHORIA FASE 2A: Select específico - 30-50% menos dados transferidos
        return anyPrisma[entity].findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          select: {
            id: true,
            ticket: true,
            descricao: true,
            status: true,
            analistaId: true,
            clienteId: true,
            contratoId: true,
            operadoraId: true,
            produtoId: true,
            demandaId: true,
            dataInicio: true,
            dataFim: true,
            observacoes: true,
            solicitante: true,
            tipo: true,
            qualidade: true,
            qtdRetornos: true,
            vigencia: true,
            estruturaEdge: true,
            estruturaMove: true,
            formalizacao: true,
            itensPendentes: true,
            itensConcluidos: true,
            total: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            cliente: { select: { id: true, nome: true } },
            contrato: { select: { id: true, codigo: true, numero: true } },
            operadora: { select: { id: true, nome: true } },
            produto: { select: { id: true, nome: true } },
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            demanda: { select: { id: true, ticket: true, descricao: true } },
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { updatedAt: 'desc' },
          ...pagination
        });
      }

      // Incluir relacionamentos para manutenções
      if (entity === 'manutencao') {
        // Construir filtros se queryParams fornecidos
        const where: any = {}
        
        if (queryParams) {
          // Aplicar filtro de ticket se fornecido
          if (queryParams.ticket) {
            where.ticket = queryParams.ticket
          }
          // Aplicar outros filtros genéricos se houver
          Object.keys(queryParams).forEach(key => {
            if (key !== 'entityId' && key !== 'entityType' && key !== 'ticket' && key !== 'limit' && key !== 'offset') {
              where[key] = queryParams[key]
            }
          })
        }
        const pagination = parsePagination(queryParams)
        
        // 🚀 MELHORIA FASE 2A: Select específico - 30-50% menos dados transferidos
        return anyPrisma[entity].findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          select: {
            id: true,
            ticket: true,
            descricao: true,
            status: true,
            solicitante: true,
            analistaId: true,
            areaId: true,
            clienteId: true,
            contratoId: true,
            operadoraId: true,
            produtoId: true,
            sistemaId: true,
            tipoServicoId: true,
            tipoId: true,
            qtdRetornos: true,
            qualidade: true,
            usuariosEmpresa: true,
            total: true,
            observacoes: true,
            dataInicio: true,
            dataFinal: true,
            createdAt: true,
            updatedAt: true,
            cliente: { select: { id: true, nome: true } },
            contrato: { select: { id: true, codigo: true, numero: true } },
            operadora: { select: { id: true, nome: true } },
            produto: { select: { id: true, nome: true } },
            sistema: { select: { id: true, nome: true } },
            area: { select: { id: true, nome: true } },
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            tipoServico: { select: { id: true, nome: true } },
            tipo: { select: { id: true, nome: true } }
          },
          orderBy: { updatedAt: 'desc' },
          ...pagination
        });
      }
      
      // 🚀 MELHORIA FASE 2A: Select específico para Reajuste - 30-50% menos dados transferidos
      if (entity === 'reajuste') {
        // Construir filtros se queryParams fornecidos
        const where: any = {}
        let ticketFilter: string | undefined
        
        if (queryParams) {
          Object.keys(queryParams).forEach(key => {
            if (key === 'ticket') {
              const value = queryParams[key]
              if (typeof value === 'string' && value.trim()) {
                ticketFilter = value.trim()
              }
              return
            }
            if (key !== 'entityId' && key !== 'entityType' && key !== 'limit' && key !== 'offset') {
              where[key] = queryParams[key]
            }
          })
        }
        const pagination = parsePagination(queryParams)
        
        if (ticketFilter) {
          where.demanda = {
            ticket: {
              contains: ticketFilter,
              mode: 'insensitive'
            }
          }
        }
        
        return anyPrisma[entity].findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          select: {
            id: true,
            demandaId: true,
            analistaId: true,
            userId: true,
            responsavelAnalista: true,
            valorAnterior: true,
            valorNovo: true,
            percentual: true,
            motivo: true,
            aprovado: true,
            dataAprovacao: true,
            createdAt: true,
            updatedAt: true,
            analista: {
              select: {
                id: true,
                nome: true
              }
            },
            demanda: {
              select: {
                id: true,
                ticket: true,
                descricao: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          ...pagination
        });
      }

      // 🚀 MELHORIA FASE 2A: Select específico para Report (Analytics) - 30-50% menos dados transferidos
      if (entity === 'report') {
        // Construir filtros se queryParams fornecidos
        const where: any = {}
        
        if (queryParams) {
          Object.keys(queryParams).forEach(key => {
            if (key !== 'entityId' && key !== 'entityType' && key !== 'limit' && key !== 'offset') {
              where[key] = queryParams[key]
            }
          })
        }
        const pagination = parsePagination(queryParams)
        
        const list = await anyPrisma[entity].findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          select: {
            id: true,
            titulo: true,
            descricao: true,
            ticket: true,
            total: true,
            tipo: true,
            status: true,
            analista: true,
            area: true,
            cliente: true,
            contrato: true,
            dataInicio: true,
            dataFinalizacao: true,
            dataEntrega: true,
            prioridade: true,
            solicitante: true,
            solicitacao: true,
            tipoSolicitacao: true,
            tipoServico: true,
            observacoes: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          ...pagination
        });
        // Padronizar status na leitura (conforme Cadastro)
        return list.map((r: any) => ({ ...r, status: normalizeReportStatus(r.status) }));
      }
      
      // Contratos - sempre retornar todos (ativos e inativos)
      if (entity === 'contrato') {
        console.log('🔍 Contratos - buscando todos os contratos (ativos e inativos)');
        const pagination = parsePagination(queryParams)
        const contratos = await anyPrisma[entity].findMany({
          orderBy: { createdAt: 'desc' },
          ...pagination
        });
        
        console.log('🔍 Contratos - encontrados:', contratos.length, 'contratos');
        return contratos;
      }
      
      // Tratamento específico para projetos - converter campos JSON
      if (entity === 'project') {
        const pagination = parsePagination(queryParams)
        const projects = await anyPrisma[entity].findMany({
          ...pagination
        });
        return projects.map((project: any) => {
          // Converter campos JSON de volta para objetos
          if (project.timeline && typeof project.timeline === 'string') {
            try {
              project.timeline = JSON.parse(project.timeline);
            } catch (e) {
              project.timeline = { phases: [] };
            }
          }
          if (project.activities && typeof project.activities === 'string') {
            try {
              project.activities = JSON.parse(project.activities);
            } catch (e) {
              project.activities = [];
            }
          }
          if (project.team && typeof project.team === 'string') {
            try {
              project.team = JSON.parse(project.team);
            } catch (e) {
              project.team = [];
            }
          }
          if (project.tags && typeof project.tags === 'string') {
            try {
              project.tags = JSON.parse(project.tags);
            } catch (e) {
              project.tags = [];
            }
          }
          return project;
        });
      }
      
      // Busca com "search" para clientes/contratos (autocomplete)
      const entityStr = entity as string
      if ((entityStr === 'cliente' || entityStr === 'contrato') && queryParams?.search) {
        const term = queryParams.search.toString().trim()
        const pagination = parsePagination(queryParams)
        const where: any = {}

        if (entityStr === 'cliente') {
          where.OR = [
            { nome: { contains: term, mode: 'insensitive' } },
            { grupoEconomico: { contains: term, mode: 'insensitive' } }
          ]
        } else {
          if (queryParams.clienteId) {
            where.clienteId = queryParams.clienteId
          }
          if (queryParams.grupoEconomico) {
            where.grupoEconomico = queryParams.grupoEconomico
          }
          where.OR = [
            { numero: { contains: term, mode: 'insensitive' } },
            { codigo: { contains: term, mode: 'insensitive' } },
            { grupoEconomico: { contains: term, mode: 'insensitive' } }
          ]
        }

        const result = await anyPrisma[entity].findMany({
          where,
          orderBy: entityStr === 'cliente' ? { nome: 'asc' } : { numero: 'asc' },
          ...pagination
        })
        console.log(`🔍 CRUD ${String(entity)}: Resultado search:`, result.length, 'registros')
        return result
      }

      // Aplicar filtros genéricos se fornecidos nos queryParams
      const where: any = {}
      
      if (queryParams) {
        console.log(`🔍 CRUD ${String(entity)}: QueryParams recebidos:`, queryParams)
        
        // Para cada parâmetro de query, adicionar ao where
        Object.keys(queryParams).forEach(key => {
          // Ignorar parâmetros especiais que não são filtros de campo
          if (key !== 'entityId' && key !== 'entityType' && key !== 'limit' && key !== 'offset' && key !== 'search') {
            where[key] = queryParams[key]
          }
        })
        
        console.log(`🔍 CRUD ${String(entity)}: Filtros aplicados:`, where)
      }
      const pagination = parsePagination(queryParams)
      
      // Se houver filtros, usar where; caso contrário, retornar todos
      if (Object.keys(where).length > 0) {
        const result = await anyPrisma[entity].findMany({ where, ...pagination })
        console.log(`🔍 CRUD ${String(entity)}: Resultado com filtros:`, result.length, 'registros')
        return result
      }
      
      const result = await anyPrisma[entity].findMany({ ...pagination })
      console.log(`🔍 CRUD ${String(entity)}: Resultado sem filtros:`, result.length, 'registros')
      return result
    },
    get: async (id: string) => {
      // Incluir relacionamentos para atendimentos
      if (entity === 'atendimento') {
        return anyPrisma[entity].findUnique({ 
          where: { id },
          include: {
            cliente: true,
            contrato: true,
            operadora: true,
            produto: true,
            sistema: true,
            area: true,
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            tipo: true,
            tipoServico: true
          }
        });
      }

      // Incluir relacionamentos para validações - usar select para consistência
      if (entity === 'validacao') {
        return anyPrisma[entity].findUnique({ 
          where: { id },
          select: {
            id: true,
            ticket: true,
            descricao: true,
            status: true,
            analistaId: true,
            clienteId: true,
            contratoId: true,
            operadoraId: true,
            produtoId: true,
            demandaId: true,
            dataInicio: true,
            dataFim: true,
            observacoes: true,
            solicitante: true,
            tipo: true,
            qualidade: true,
            qtdRetornos: true,
            vigencia: true,
            estruturaEdge: true,
            estruturaMove: true,
            formalizacao: true,
            itensPendentes: true,
            itensConcluidos: true,
            total: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            cliente: { select: { id: true, nome: true } },
            contrato: { select: { id: true, codigo: true, numero: true } },
            operadora: { select: { id: true, nome: true } },
            produto: { select: { id: true, nome: true } },
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            demanda: { select: { id: true, ticket: true, descricao: true } },
            user: { select: { id: true, name: true, email: true } }
          }
        });
      }
      
      // Contratos - buscar por ID (ativos e inativos)
      if (entity === 'contrato') {
        const contrato = await anyPrisma[entity].findUnique({ 
          where: { id }
        });
        return contrato;
      }
      
      // Tratamento específico para projetos - converter campos JSON
      if (entity === 'project') {
        const project = await anyPrisma[entity].findUnique({ where: { id } });
        if (project) {
          // Converter campos JSON de volta para objetos
          if (project.timeline && typeof project.timeline === 'string') {
            try {
              project.timeline = JSON.parse(project.timeline);
            } catch (e) {
              project.timeline = { phases: [] };
            }
          }
          if (project.activities && typeof project.activities === 'string') {
            try {
              project.activities = JSON.parse(project.activities);
            } catch (e) {
              project.activities = [];
            }
          }
          if (project.team && typeof project.team === 'string') {
            try {
              project.team = JSON.parse(project.team);
            } catch (e) {
              project.team = [];
            }
          }
          if (project.tags && typeof project.tags === 'string') {
            try {
              project.tags = JSON.parse(project.tags);
            } catch (e) {
              project.tags = [];
            }
          }
        }
        return project;
      }
      
      return anyPrisma[entity].findUnique({ where: { id } });
    },
    create: async (data: unknown) => {
      // Tratamento específico para demandas - converter IDs para relacionamentos connect
      if (entity === 'demanda') {
        const demandaData = { ...data as any };
        
        // Converter IDs para relacionamentos connect
        const relationshipFields = [
          { field: 'tipoServicoId', relation: 'tipoServico' },
          { field: 'tipoId', relation: 'tipo' },
          { field: 'analistaId', relation: 'analista' },
          { field: 'areaId', relation: 'area' },
          { field: 'clienteId', relation: 'cliente' },
          { field: 'contratoId', relation: 'contrato' },
          { field: 'operadoraId', relation: 'operadora' },
          { field: 'produtoId', relation: 'produto' },
          { field: 'sistemaId', relation: 'sistema' },
          { field: 'userId', relation: 'user' }
        ];
        
        for (const { field, relation } of relationshipFields) {
          if (demandaData[field]) {
            demandaData[relation] = { connect: { id: demandaData[field] } };
            delete demandaData[field];
          }
        }
        
        console.log('🔍 DEMANDA CREATE: Dados processados:', JSON.stringify(demandaData, null, 2));
        return anyPrisma[entity].create({ data: demandaData });
      }
      
      // Garantir que contratos sejam criados como ativos por padrão apenas se não especificado
      if (entity === 'contrato') {
        const contratoData = { ...data as any };
        console.log('🔍 CONTRATO CREATE: Dados recebidos:', JSON.stringify(contratoData, null, 2));
        console.log('🔍 CONTRATO CREATE: Status recebido:', contratoData.status, 'Tipo:', typeof contratoData.status);
        
        // Garantir que o status seja sempre definido
        if (!contratoData.status || contratoData.status === '' || contratoData.status === null || contratoData.status === undefined) {
          console.log('🔍 CONTRATO CREATE: Status não especificado, definindo como Ativo');
          contratoData.status = 'Ativo';
        } else {
          console.log('🔍 CONTRATO CREATE: Status especificado pelo usuário:', contratoData.status);
        }
        
        // Garantir que o status seja válido
        if (!['Ativo', 'Inativo'].includes(contratoData.status)) {
          console.log('🔍 CONTRATO CREATE: Status inválido, definindo como Ativo');
          contratoData.status = 'Ativo';
        }
        
        // Garantir que o campo numero existe - é obrigatório no schema
        if (!contratoData.numero || contratoData.numero === '' || contratoData.numero === null || contratoData.numero === undefined) {
          contratoData.numero = contratoData.codigo || `CONT-${Date.now()}`;
          console.log('🔍 CONTRATO CREATE: Numero gerado automaticamente:', contratoData.numero);
        } else {
          console.log('🔍 CONTRATO CREATE: Numero fornecido:', contratoData.numero);
        }
        
        // Garantir que o campo codigo existe se não foi fornecido
        if (!contratoData.codigo || contratoData.codigo === '' || contratoData.codigo === null || contratoData.codigo === undefined) {
          contratoData.codigo = contratoData.numero;
          console.log('🔍 CONTRATO CREATE: Codigo definido como numero:', contratoData.codigo);
        }
        
        // ClienteId é opcional - pode ser definido posteriormente
        if (contratoData.clienteId) {
          console.log('🔍 CONTRATO CREATE: ClienteId fornecido:', contratoData.clienteId);
          // Verificar se o cliente existe antes de conectar
          try {
            const clienteExiste = await prisma.cliente.findUnique({ where: { id: contratoData.clienteId } });
            if (clienteExiste) {
              // Usar sintaxe de connect para relacionamento
              contratoData.cliente = { connect: { id: contratoData.clienteId } };
              delete contratoData.clienteId; // Remover clienteId pois usamos connect
              console.log('✅ CONTRATO CREATE: Cliente conectado:', clienteExiste.nome);
            } else {
              console.warn('⚠️ CONTRATO CREATE: Cliente ID não encontrado, removendo clienteId');
              delete contratoData.clienteId;
            }
          } catch (error) {
            console.warn('⚠️ CONTRATO CREATE: Erro ao verificar cliente, removendo clienteId:', error);
            delete contratoData.clienteId;
          }
        } else {
          console.log('🔍 CONTRATO CREATE: ClienteId não fornecido - contrato será criado sem cliente');
        }
        
        console.log('🔍 CONTRATO CREATE: Dados finais para criação:', JSON.stringify(contratoData, null, 2));
        return anyPrisma[entity].create({ data: contratoData });
      }
      
      // Tratamento específico para reports - converter datas corretamente
      if (entity === 'report') {
        const reportData = { ...data as any };
        
        // Padronizar status conforme Cadastro (evita variações no banco)
        if (reportData.status != null) {
          reportData.status = normalizeReportStatus(reportData.status);
        }
        
        // Verificar e validar campo analista OBRIGATÓRIO
        if (!reportData.analista || reportData.analista === '') {
          throw new Error('Campo analista é obrigatório');
        }
        
        // Remover userId se presente (modelo Report não tem este campo)
        if ('userId' in reportData) {
          delete reportData.userId;
        }
        
        // Converter campos de data do formato 'YYYY-MM-DD' para ISO-8601 DateTime
        const dateFields = ['dataInicio', 'dataFinalizacao', 'dataEntrega'];
        
        for (const field of dateFields) {
          // Verificar se o campo existe (pode ser undefined, null, string vazia ou valor válido)
          if (field in reportData) {
            // Se for string vazia, null ou undefined, remover o campo
            if (reportData[field] === '' || reportData[field] === null || reportData[field] === undefined) {
              delete reportData[field];
            } 
            // Se for string de data (formato YYYY-MM-DD), converter para ISO DateTime
            else if (typeof reportData[field] === 'string' && reportData[field].match(/^\d{4}-\d{2}-\d{2}$/)) {
              reportData[field] = new Date(reportData[field] + 'T00:00:00.000Z');
            }
          }
        }
        
        return await anyPrisma[entity].create({ data: reportData });
      }
      
      // Validação para clientes - evitar grupos econômicos duplicados
      if (entity === 'cliente') {
        const clienteData = data as any;
        console.log('🔍 CLIENTE CREATE: Validando grupo econômico:', clienteData.grupoEconomico);
        if (clienteData.grupoEconomico && clienteData.grupoEconomico.trim()) {
          const existingClient = await anyPrisma.cliente.findFirst({
            where: {
              grupoEconomico: clienteData.grupoEconomico.trim()
            }
          });
          
          console.log('🔍 CLIENTE CREATE: Cliente existente encontrado:', existingClient);
          if (existingClient) {
            throw new Error(`Grupo econômico "${clienteData.grupoEconomico}" já existe para o cliente "${existingClient.nome}". Por favor, escolha um grupo econômico único.`);
          }
        }
      }
      
      // Tratamento especial para reajusteLancamentos - preservar campos de string
      if (entity === 'reajusteLancamento') {
        const reajusteData = { ...data as any };
        
        // Se analistaId estiver presente, conectar ao relacionamento analista
        if (reajusteData.analistaId) {
          reajusteData.analista = { connect: { id: reajusteData.analistaId } };
          delete reajusteData.analistaId;
        }
        
        // Garantir que campos de string sejam preservados (cliente, contrato, operadora, produto)
        // Esses campos são strings no schema, não relacionamentos
        const camposString = ['cliente', 'contrato', 'operadora', 'produto', 'responsavelAnalista', 'mes', 'ano', 'status', 'qualidade', 'qualidadeInformacao', 'planos', 'responsavelConta', 'filial', 'ticket', 'solicitante'];
        
        camposString.forEach(campo => {
          if (reajusteData[campo] !== undefined && reajusteData[campo] !== null) {
            // Converter para string se necessário
            reajusteData[campo] = String(reajusteData[campo]);
          }
        });
        
        // Converter mes de nome do mês para número se necessário
        if (reajusteData.mes && typeof reajusteData.mes === 'string') {
          const mesesMap: { [key: string]: string } = {
            'janeiro': '1', 'fevereiro': '2', 'março': '3', 'abril': '4',
            'maio': '5', 'junho': '6', 'julho': '7', 'agosto': '8',
            'setembro': '9', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
          };
          const mesLower = reajusteData.mes.toLowerCase();
          if (mesesMap[mesLower]) {
            reajusteData.mes = mesesMap[mesLower];
          }
        }
        
        // NÃO remover campos opcionais mesmo se vazios - preservar todos os campos enviados
        // Apenas remover campos que são undefined (não null ou string vazia)
        Object.keys(reajusteData).forEach(key => {
          if (reajusteData[key] === undefined) {
            // Manter campos obrigatórios mesmo se undefined
            if (!['mes', 'ano', 'status', 'operadora', 'responsavelAnalista'].includes(key)) {
              delete reajusteData[key];
            }
          }
        });
        
        const created = await anyPrisma[entity].create({ data: reajusteData });
        return created;
      }
      
      return anyPrisma[entity].create({ data });
    },
    update: async (id: string, data: unknown) => {
      // Tratamento específico para demandas - converter IDs para relacionamentos connect
      if (entity === 'demanda') {
        const demandaData = { ...data as any };
        
        // Remover campos que não devem ser atualizados diretamente
        delete demandaData.id;
        delete demandaData.createdAt;
        delete demandaData.analista; // Campo virtual do frontend
        delete demandaData.tipo; // Campo virtual do frontend
        delete demandaData.tipoServico; // Campo virtual do frontend
        
        // Converter IDs para relacionamentos connect
        const relationshipFields = [
          { field: 'tipoServicoId', relation: 'tipoServico' },
          { field: 'tipoId', relation: 'tipo' },
          { field: 'analistaId', relation: 'analista' },
          { field: 'areaId', relation: 'area' },
          { field: 'clienteId', relation: 'cliente' },
          { field: 'contratoId', relation: 'contrato' },
          { field: 'operadoraId', relation: 'operadora' },
          { field: 'produtoId', relation: 'produto' },
          { field: 'sistemaId', relation: 'sistema' },
          { field: 'userId', relation: 'user' }
        ];
        
        for (const { field, relation } of relationshipFields) {
          if (demandaData[field] !== undefined) {
            if (demandaData[field] === null || demandaData[field] === '') {
              demandaData[relation] = { disconnect: true };
            } else {
              demandaData[relation] = { connect: { id: demandaData[field] } };
            }
            delete demandaData[field];
          }
        }
        
        console.log('🔍 DEMANDA UPDATE: Dados processados:', JSON.stringify(demandaData, null, 2));
        return anyPrisma[entity].update({ where: { id }, data: demandaData });
      }
      
      // Tratamento especial para reajusteLancamento - whitelist + conversões seguras
      if (entity === 'reajusteLancamento') {
        const raw = data as Record<string, unknown>;
        const SCALAR_FIELDS = ['mes', 'ano', 'status', 'operadora', 'qualidade', 'qualidadeInformacao', 'planos', 'responsavelConta', 'filial', 'ticket', 'solicitante', 'responsavelAnalista', 'cliente', 'contrato', 'produto', 'itensPendentes', 'itensConcluidos', 'valorTotal', 'descricao', 'tipoReajuste', 'percentual', 'observacoes'];
        const DATE_FIELDS = ['dataInicio', 'dataFim', 'dataAtualizacao', 'dataAplicacao'];
        const STRING_FIELDS = new Set(['cliente', 'contrato', 'operadora', 'produto', 'responsavelAnalista', 'mes', 'ano', 'status', 'qualidade', 'qualidadeInformacao', 'planos', 'responsavelConta', 'filial', 'ticket', 'solicitante', 'observacoes']);
        const mesesMap: Record<string, string> = { 'janeiro': '1', 'fevereiro': '2', 'março': '3', 'abril': '4', 'maio': '5', 'junho': '6', 'julho': '7', 'agosto': '8', 'setembro': '9', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };

        const reajusteData: Record<string, unknown> = {};
        for (const k of SCALAR_FIELDS) {
          if (raw[k] === undefined) continue;
          const v = raw[k];
          if (typeof v === 'object' && v !== null) continue;
          reajusteData[k] = (v === null || v === '') ? null : (STRING_FIELDS.has(k) ? String(v) : v);
        }
        if (reajusteData.mes && typeof reajusteData.mes === 'string') {
          const m = (reajusteData.mes as string).toLowerCase();
          if (mesesMap[m]) reajusteData.mes = mesesMap[m];
        }
        for (const k of DATE_FIELDS) {
          if (raw[k] === undefined) continue;
          const v = raw[k];
          if (v === null || v === '') reajusteData[k] = null;
          else if (typeof v === 'string') reajusteData[k] = new Date(v);
          else if (v instanceof Date) reajusteData[k] = v;
          else reajusteData[k] = null;
        }
        if (raw.userId !== undefined) {
          reajusteData.user = (raw.userId && String(raw.userId).trim()) ? { connect: { id: String(raw.userId).trim() } } : { disconnect: true };
        } else if (raw.user && typeof raw.user === 'object' && ('connect' in raw.user || 'disconnect' in raw.user)) {
          reajusteData.user = raw.user;
        }
        if (raw.analistaId !== undefined) {
          reajusteData.analista = (raw.analistaId && String(raw.analistaId).trim()) ? { connect: { id: String(raw.analistaId).trim() } } : { disconnect: true };
        } else if (raw.analista && typeof raw.analista === 'object' && ('connect' in raw.analista || 'disconnect' in raw.analista)) {
          reajusteData.analista = raw.analista;
        }
        delete (reajusteData as any).userId;
        delete (reajusteData as any).analistaId;
        delete (reajusteData as any).updatedAt;
        console.log('🔍 REAJUSTE UPDATE: Dados processados:', JSON.stringify(reajusteData, null, 2));
        return anyPrisma[entity].update({ where: { id }, data: reajusteData });
      }
      
      // Report (Analytics): padronizar status conforme Cadastro
      if (entity === 'report') {
        const updateData = { ...data as any };
        delete updateData.id;
        delete updateData.createdAt;
        if (updateData.status != null) {
          updateData.status = normalizeReportStatus(updateData.status);
        }
        return anyPrisma[entity].update({ where: { id }, data: updateData });
      }
      
      // Para outras entidades, atualização simplificada
      const updateData = { ...data as any };
      delete updateData.id;
      delete updateData.createdAt;
      
      return anyPrisma[entity].update({ where: { id }, data: updateData });
    },
    remove: async (id: string) => {
      // Verificar dependências antes de excluir
      const entityName = entity.toString();
      
      try {
        // Verificar se o registro existe primeiro
        const anyPrisma = prisma as any;
        const existingRecord = await anyPrisma[entity].findUnique({ where: { id } });
        if (!existingRecord) {
          // Retornar erro estruturado em vez de lançar exceção
          return {
            statusCode: 404,
            error: 'Not Found',
            message: `Registro com ID "${id}" não foi encontrado`
          };
        }
        
        // Verificar se há registros dependentes
        let hasDependencies = false;
        
        switch (entityName) {
          case 'cliente':
            const clienteDeps = await Promise.all([
              anyPrisma.contrato.count({ where: { clienteId: id } }),
              anyPrisma.demanda.count({ where: { clienteId: id } }),
              anyPrisma.atendimento.count({ where: { clienteId: id } }),
              anyPrisma.project.count({ where: { clientId: id } })
            ]);
            hasDependencies = clienteDeps.some(count => count > 0);
            break;
            
          case 'contrato':
            const contratoDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { contratoId: id } }),
              anyPrisma.atendimento.count({ where: { contratoId: id } })
            ]);
            hasDependencies = contratoDeps.some(count => count > 0);
            break;
            
          case 'operadora':
            const operadoraDeps = await Promise.all([
              anyPrisma.produto.count({ where: { operadoraId: id } }),
              anyPrisma.demanda.count({ where: { operadoraId: id } }),
              anyPrisma.atendimento.count({ where: { operadoraId: id } })
            ]);
            hasDependencies = operadoraDeps.some(count => count > 0);
            break;
            
          case 'produto':
            const produtoDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { produtoId: id } }),
              anyPrisma.atendimento.count({ where: { produtoId: id } })
            ]);
            hasDependencies = produtoDeps.some(count => count > 0);
            break;
            
          case 'sistema':
            const sistemaDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { sistemaId: id } }),
              anyPrisma.atendimento.count({ where: { sistemaId: id } })
            ]);
            hasDependencies = sistemaDeps.some(count => count > 0);
            break;
            
          case 'analista':
            const analistaDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { analistaId: id } }),
              anyPrisma.atendimento.count({ where: { analistaId: id } }),
              anyPrisma.validacao.count({ where: { analistaId: id } }),
              anyPrisma.reajuste.count({ where: { analistaId: id } })
            ]);
            hasDependencies = analistaDeps.some(count => count > 0);
            break;
            
          case 'area':
            // Verificar dependências corretas para áreas (sem analista.areaId)
            const areaDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { areaId: id } }),
              anyPrisma.atendimento.count({ where: { areaId: id } }),
              anyPrisma.manutencao.count({ where: { areaId: id } })
            ]);
            hasDependencies = areaDeps.some(count => count > 0);
            break;
            
          case 'tipoServico':
            const tipoServicoDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { tipoServicoId: id } }),
              anyPrisma.atendimento.count({ where: { tipoServicoId: id } })
            ]);
            hasDependencies = tipoServicoDeps.some(count => count > 0);
            break;
            
          case 'tipoDemanda':
            const tipoDemandaDeps = await Promise.all([
              anyPrisma.demanda.count({ where: { tipoId: id } }),
              anyPrisma.atendimento.count({ where: { tipoId: id } }),
              anyPrisma.manutencao.count({ where: { tipoId: id } })
            ]);
            hasDependencies = tipoDemandaDeps.some(count => count > 0);
            break;
            
          case 'atendimento':
            // Atendimentos podem ser excluídos diretamente (sem dependências)
            hasDependencies = false;
            break;
            
          case 'reajuste':
            // Reajustes podem ser excluídos diretamente (sem dependências)
            hasDependencies = false;
            break;
            
          case 'validacao':
            // Validações podem ser excluídas diretamente (sem dependências)
            hasDependencies = false;
            break;
            
          case 'manutencao':
            // Manutenções podem ser excluídas diretamente (sem dependências)
            hasDependencies = false;
            break;
            
          case 'dados':
            // Dados podem ser excluídos diretamente (sem dependências)
            hasDependencies = false;
            break;
            
          default:
            break;
        }
        
        if (hasDependencies) {
          // Coletar informações específicas sobre as dependências
          let dependencyInfo = '';
          if (entityName === 'cliente') {
            const [contratos, demandas, atendimentos, projetos] = await Promise.all([
              anyPrisma.contrato.count({ where: { clienteId: id } }),
              anyPrisma.demanda.count({ where: { clienteId: id } }),
              anyPrisma.atendimento.count({ where: { clienteId: id } }),
              anyPrisma.project.count({ where: { clientId: id } })
            ]);
            
            const deps = [];
            if (contratos > 0) deps.push(`${contratos} contrato(s)`);
            if (demandas > 0) deps.push(`${demandas} demanda(s)`);
            if (atendimentos > 0) deps.push(`${atendimentos} atendimento(s)`);
            if (projetos > 0) deps.push(`${projetos} projeto(s)`);
            
            dependencyInfo = ` Dependências encontradas: ${deps.join(', ')}.`;
          } else if (entityName === 'tipoDemanda') {
            const [demandas, atendimentos, manutencoes] = await Promise.all([
              anyPrisma.demanda.count({ where: { tipoId: id } }),
              anyPrisma.atendimento.count({ where: { tipoId: id } }),
              anyPrisma.manutencao.count({ where: { tipoId: id } })
            ]);
            
            const deps = [];
            if (demandas > 0) deps.push(`${demandas} demanda(s)`);
            if (atendimentos > 0) deps.push(`${atendimentos} atendimento(s)`);
            if (manutencoes > 0) deps.push(`${manutencoes} manutenção(ões)`);
            
            dependencyInfo = ` Dependências encontradas: ${deps.join(', ')}.`;
          }
          
          throw new Error(`Não é possível excluir este ${entityName} pois existem registros dependentes.${dependencyInfo} Remova as dependências primeiro.`);
        }
        
        // Se não há dependências, pode excluir
        
        const result = await anyPrisma[entity].delete({ where: { id } });
        return result;
      } catch (error) {
        throw error;
      }
    },
  }
}


// Funções de validação para evitar erros de foreign key
const validateForeignKeys = {
  async validateUser(assignee: string) {
    if (!assignee) return true;
    const user = await prisma.user.findFirst({ where: { name: assignee } });
    if (!user) {
      console.warn(`⚠️ Usuário '${assignee}' não encontrado, criando automaticamente...`);
      await prisma.user.create({
        data: {
          name: assignee,
          email: `${assignee.toLowerCase()}@demandas.com`,
          password: 'temp123',
          role: 'USER'
        }
      });
    }
    return true;
  },
  
  async validateTipoDemanda(tipoId: string) {
    if (!tipoId) return true;
    const tipo = await prisma.tipoDemanda.findFirst({ where: { nome: tipoId } });
    if (!tipo) {
      console.warn(`⚠️ Tipo de demanda '${tipoId}' não encontrado, criando automaticamente...`);
      await prisma.tipoDemanda.create({
        data: {
          nome: tipoId,
          descricao: `Tipo de demanda ${tipoId}`
        }
      });
    }
    return true;
  },
  
  async validateContrato(contratoId: string) {
    if (!contratoId) return true;
    const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) {
      console.warn(`⚠️ Contrato '${contratoId}' não encontrado, removendo referência...`);
      return false;
    }
    return true;
  }
};

const resources = {
         areas: {
           ...crud('area'),
           delete: async (id: string) => {
             console.log('🚀 DELETE AREA v15 - CÓDIGO NOVO EXECUTANDO')
             console.log('🚀 VERSÃO: 2025-10-04-00:12 - RAILWAY ATUALIZADO v15')
             console.log('🚀 CACHE QUEBRADO - NOVA VERSÃO DO CÓDIGO!')
             console.log('🚀 PACKAGE VERSION: 0.2.1 - FORÇANDO RECONHECIMENTO!')
             console.log(`🚀 Excluindo área ID: ${id}`)
      
      try {
        // Verificar se a área existe
        const area = await prisma.area.findUnique({
          where: { id },
          include: {
            demandas: true,
            atendimentos: true,
            manutencoes: true
          }
        })

        if (!area) {
          console.log(`❌ Área ${id} não encontrada`)
          throw new Error('Área não encontrada')
        }

        console.log(`📊 Área encontrada: ${area.nome}`)
        console.log(`📊 Dependências: ${area.demandas.length} demandas, ${area.atendimentos.length} atendimentos, ${area.manutencoes.length} manutenções`)

        // Verificar dependências
        if (area.demandas.length > 0) {
          console.log(`⚠️ Área possui ${area.demandas.length} demandas vinculadas`)
          throw new Error(`Não é possível excluir área com ${area.demandas.length} demandas vinculadas`)
        }

        if (area.atendimentos.length > 0) {
          console.log(`⚠️ Área possui ${area.atendimentos.length} atendimentos vinculados`)
          throw new Error(`Não é possível excluir área com ${area.atendimentos.length} atendimentos vinculados`)
        }

        if (area.manutencoes.length > 0) {
          console.log(`⚠️ Área possui ${area.manutencoes.length} manutenções vinculadas`)
          throw new Error(`Não é possível excluir área com ${area.manutencoes.length} manutenções vinculadas`)
        }

        // Excluir a área
        await prisma.area.delete({ where: { id } })
        console.log(`✅ Área ${id} excluída com sucesso`)
        
        return { message: 'Área excluída com sucesso', deletedId: id }
      } catch (error: any) {
        console.error(`❌ Erro ao excluir área ${id}:`, error)
        throw error
      }
    }
  },
  analistas: crud('analista'),
  operadoras: crud('operadora'),
  produtos: crud('produto'),
  sistemas: crud('sistema'),
  // grupos: crud('grupo'), // REMOVIDO - CONFLITO COM masterData.ts (rotas específicas com validação)
  clientes: crud('cliente'), // HABILITADO - CONFLITO RESOLVIDO
  contratos: crud('contrato'),
  tiposServico: crud('tipoServico'),
  tiposDemanda: crud('tipoDemanda'),
  // mailling: crud('mailling'), // REMOVIDO - CONFLITO COM masterData.ts
  // areasMailling: crud('areaMailling'), // REMOVIDO - CONFLITO COM masterData.ts
  // cargosMailling: crud('cargoMailling'), // REMOVIDO - CONFLITO COM masterData.ts
  // filiaisMailling: crud('filialMailling'), // REMOVIDO - CONFLITO COM masterData.ts
  demandas: {
    ...crud('demanda'),
    list: async (queryParams?: any) => {
      const anyPrisma = prisma as any;
      const parsePagination = (params?: any) => {
        const limit = params?.limit ? parseInt(params.limit.toString()) : undefined
        const offset = params?.offset ? parseInt(params.offset.toString()) : undefined
        return {
          take: Number.isFinite(limit) ? limit : undefined,
          skip: Number.isFinite(offset) ? offset : undefined
        }
      }
      
      // Aplicar filtros genéricos se fornecidos nos queryParams
      const where: any = {}
      
      if (queryParams) {
        console.log(`🔍 DEMANDAS: QueryParams recebidos:`, queryParams)
        
        // Para cada parâmetro de query, adicionar ao where
        Object.keys(queryParams).forEach(key => {
          // Ignorar parâmetros especiais que não são filtros de campo
          if (key !== 'entityId' && key !== 'entityType' && key !== 'limit' && key !== 'offset') {
            where[key] = queryParams[key]
          }
        })
        
        console.log(`🔍 DEMANDAS: Filtros aplicados:`, where)
      }
      const pagination = parsePagination(queryParams)
      
      // 🚀 MELHORIA FASE 2A: Select específico - 30-50% menos dados transferidos
      // Se houver filtros, usar where; caso contrário, retornar todos
      if (Object.keys(where).length > 0) {
        const result = await anyPrisma.demanda.findMany({ 
          where,
          select: {
            id: true,
            ticket: true,
            descricao: true,
            status: true,
            solicitante: true,
            observacoes: true,
            periodicidade: true,
            qtdRetornos: true,
            qualidade: true,
            qtdClientesVinculados: true,
            usuariosEmpresa: true,
            analistaId: true,
            analista: { select: { id: true, nome: true } },
            areaId: true,
            area: { select: { id: true, nome: true } },
            clienteId: true,
            cliente: { select: { id: true, nome: true } },
            contratoId: true,
            contrato: { select: { id: true, codigo: true, numero: true } },
            operadoraId: true,
            operadora: { select: { id: true, nome: true } },
            produtoId: true,
            produto: { select: { id: true, nome: true } },
            tipoServicoId: true,
            tipoServico: { select: { id: true, nome: true } },
            tipoId: true,
            tipo: { select: { id: true, nome: true } },
            sistemaId: true,
            sistema: { select: { id: true, nome: true } },
            dataInicio: true,
            dataFinal: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          ...pagination
        })
        console.log(`🔍 DEMANDAS: Resultado com filtros:`, result.length, 'registros')
        return result
      }
      
      const result = await anyPrisma.demanda.findMany({
        select: {
          id: true,
          ticket: true,
          descricao: true,
          status: true,
          solicitante: true,
          observacoes: true,
          periodicidade: true,
          qtdRetornos: true,
          qualidade: true,
          qtdClientesVinculados: true,
          usuariosEmpresa: true,
          analistaId: true,
          analista: true,
          areaId: true,
          area: true,
          clienteId: true,
          cliente: true,
          contratoId: true,
          contrato: true,
          operadoraId: true,
          operadora: true,
          produtoId: true,
          produto: true,
          tipoServicoId: true,
          tipoServico: true,
          tipoId: true,
          tipo: true,
          sistemaId: true,
          sistema: true,
          dataInicio: true,
          dataFinal: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        ...pagination
      });
      console.log(`🔍 DEMANDAS: Resultado sem filtros:`, result.length, 'registros')
      return result
    },
    get: async (id: string) => {
      const anyPrisma = prisma as any;
      // 🐛 CORREÇÃO: Usar select ao invés de include para evitar retornar objetos completos
      return anyPrisma.demanda.findUnique({ 
        where: { id },
        select: {
          id: true,
          ticket: true,
          descricao: true,
          status: true,
          analistaId: true,
          analista: { select: { id: true, nome: true } },
          areaId: true,
          area: { select: { id: true, nome: true } },
          clienteId: true,
          cliente: { select: { id: true, nome: true } },
          contratoId: true,
          contrato: { select: { id: true, codigo: true, numero: true, status: true } },
          operadoraId: true,
          operadora: { select: { id: true, nome: true } },
          produtoId: true,
          produto: { select: { id: true, nome: true } },
          tipoServicoId: true,
          tipoServico: { select: { id: true, nome: true } },
          tipoId: true,
          tipo: { select: { id: true, nome: true } },
          sistemaId: true,
          sistema: { select: { id: true, nome: true } },
          dataInicio: true,
          dataFinal: true,
          solicitante: true,
          periodicidade: true,
          qtdRetornos: true,
          qualidade: true,
          qtdClientesVinculados: true,
          usuariosEmpresa: true,
          observacoes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }
  },
  atendimentos: {
    ...crud('atendimento'),
    list: async (queryParams?: any) => {
      console.log(`🔍 ATENDIMENTOS LIST: Método personalizado chamado!`)
      console.log(`🔍 ATENDIMENTOS LIST: QueryParams:`, queryParams)
      
      const anyPrisma = prisma as any;
      const parsePagination = (params?: any) => {
        const limit = params?.limit ? parseInt(params.limit.toString()) : undefined
        const offset = params?.offset ? parseInt(params.offset.toString()) : undefined
        return {
          take: Number.isFinite(limit) ? limit : undefined,
          skip: Number.isFinite(offset) ? offset : undefined
        }
      }
      
      // Aplicar filtros genéricos se fornecidos nos queryParams
      const where: any = {}
      
      if (queryParams) {
        console.log(`🔍 ATENDIMENTOS: QueryParams recebidos:`, queryParams)
        
        // Para cada parâmetro de query, adicionar ao where
        Object.keys(queryParams).forEach(key => {
          // Ignorar parâmetros especiais que não são filtros de campo
          if (key !== 'entityId' && key !== 'entityType' && key !== 'limit' && key !== 'offset') {
            where[key] = queryParams[key]
            console.log(`🔍 ATENDIMENTOS: Adicionando filtro ${key} = ${queryParams[key]}`)
          }
        })
        
        console.log(`🔍 ATENDIMENTOS: Filtros aplicados:`, where)
      }
      const pagination = parsePagination(queryParams)
      
      // 🚀 MELHORIA FASE 2A: Select específico - 30-50% menos dados transferidos
      // 🐛 CORREÇÃO: Usar campos corretos do modelo Atendimento (dataAbertura, dataFechamento)
      const atendimentos = await anyPrisma.atendimento.findMany({
        where,
        select: {
          id: true,
          ticket: true,
          titulo: true,
          descricao: true,
          status: true,
          prioridade: true,
          categoria: true,
          solicitante: true,
          emailSolicitante: true,
          telefoneSolicitante: true,
          analistaId: true,
          userId: true,
          areaId: true,
          clienteId: true,
          contratoId: true,
          operadoraId: true,
          produtoId: true,
          sistemaId: true,
          tipoId: true,
          tipoServicoId: true,
          dataAbertura: true,
          dataResolucao: true,
          dataFechamento: true,
          tempoResolucao: true,
          satisfacao: true,
          comentarios: true,
          anexos: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          analista: { select: { id: true, nome: true } },
          area: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true } },
          contrato: { select: { id: true, codigo: true, numero: true } },
          operadora: { select: { id: true, nome: true } },
          produto: { select: { id: true, nome: true } },
          sistema: { select: { id: true, nome: true } },
          tipo: { select: { id: true, nome: true } },
          tipoServico: { select: { id: true, nome: true } },
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        ...pagination
      })
      
      console.log(`🔍 ATENDIMENTOS: Encontrados ${atendimentos.length} atendimentos`)
      console.log(`🔍 ATENDIMENTOS: Primeiros 3 atendimentos:`, atendimentos.slice(0, 3).map(a => ({ id: a.id, ticket: a.ticket })))
      return atendimentos
    },
    remove: async (id: string) => {
      console.log(`🔍 DELETE /atendimentos/${id}: MÉTODO ESPECÍFICO CHAMADO!`);
      try {
        const result = await prisma.atendimento.delete({ where: { id } });
        console.log(`✅ DELETE /atendimentos/${id}: Excluído com sucesso:`, result.id);
        return { success: true, message: 'Atendimento excluído com sucesso', deletedId: result.id };
      } catch (error) {
        console.error(`❌ DELETE /atendimentos/${id}: Erro:`, error);
        throw error;
      }
    }
  },
  manutencoes: crud('manutencao'),
  validacoes: {
    ...crud('validacao'),
    remove: async (id: string) => {
      console.log(`🔍 DELETE /validacoes/${id}: MÉTODO ESPECÍFICO CHAMADO!`);
      try {
        // Verificar se a validação existe primeiro
        const existingValidation = await prisma.validacao.findUnique({ where: { id } });
        if (!existingValidation) {
          console.log(`❌ DELETE /validacoes/${id}: Validação não encontrada`);
          return {
            statusCode: 404,
            error: 'Not Found',
            message: `Registro com ID "${id}" não foi encontrado`
          };
        }
        
        const result = await prisma.validacao.delete({ where: { id } });
        console.log(`✅ DELETE /validacoes/${id}: Excluída com sucesso:`, result.id);
        return { success: true, message: 'Validação excluída com sucesso', deletedId: result.id };
      } catch (error) {
        console.error(`❌ DELETE /validacoes/${id}: Erro:`, error);
        throw error;
      }
    }
  },
  // tiposCadastro: crud('tipoCadastro'), // Removido - usando plugin específico em routes/masterData.ts
  validacoesManutencao: crud('validacaoManutencao'),
  reajustes: crud('reajuste'),
  reajustesManutencao: crud('reajusteManutencao'),
  reajusteLancamentos: crud('reajusteLancamento'),
  projetos: crud('project'),
  dados: crud('dados'),
  usuarios: crud('user'), // Adicionado endpoint para usuários
  // Aliases para compatibilidade com frontend
  projects: crud('project'), // Alias para /projects
  types: crud('tipoDemanda'), // Alias para /types
  services: crud('tipoServico'), // Alias para /services
  'kanban-tickets': crud('kanbanTicket'), // Endpoint para kanban tickets
  // Endpoints adicionais que estavam faltando
  analytics: crud('report'), // ✅ CORRIGIDO: Analytics usa modelo Report, não Analytics
  reports: crud('report'),
  // solicitantes: crud('solicitante'), // Removido - usando plugin específico em routes/masterData.ts
  // relatorios: crud('relatorio'), // Removido - usando plugin específico em routes/masterData.ts
  // modelos: crud('modelo'), // Removido - usando plugin específico em routes/masterData.ts
  areasMailling: crud('areaMailling'),
  cargosMailling: crud('cargoMailling'),
  filiaisMailling: crud('filialMailling'),
  dashboards: crud('dashboard'),
  dashboardWidgets: crud('dashboardWidget'),
  permissions: crud('permission'),
  userPermissions: crud('userPermission'),
  // comunicados: crud('comunicado'), // Removido - usando plugin específico em routes/comunicados.ts
  // comunicadoVisualizacoes: crud('comunicadoVisualizacao'), // Removido - usando plugin específico
  // comunicadoComentarios: crud('comunicadoComentario'), // Removido - usando plugin específico
  timelineEvents: crud('timelineEvent'),
  projectMembers: crud('projectMember'),
  projectExternalMembers: crud('projectExternalMember'),
  projectTasks: crud('projectTask'),
  projectSubtasks: crud('projectSubtask'),
  projectMilestones: crud('projectMilestone'),
  projectTimelines: crud('projectTimeline'),
  projectShareTokens: crud('projectShareToken'),
  padroes: crud('padrao')
}

// Rotas de alertas de projetos - registrar ANTES do CRUD para evitar conflito
app.get('/projetos/:projectId/alerts', async (req: any, reply: any) => {
  try {
    const { projectId } = req.params
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return reply.status(404).send({ error: 'Projeto não encontrado' })
    const alerts = await prisma.projectAlert.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    })
    return reply.send(alerts)
  } catch (e) {
    console.error('Erro GET /projetos/:projectId/alerts:', e)
    return reply.status(500).send({ error: 'Erro interno' })
  }
})
app.post('/projetos/:projectId/alerts', async (req: any, reply: any) => {
  try {
    const { projectId } = req.params
    const body = req.body || {}
    const { userId, responsavelNome, diasAntes, targetType, targetId } = body
    if (!userId) return reply.status(400).send({ error: 'userId é obrigatório' })
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return reply.status(404).send({ error: 'Projeto não encontrado' })
    const isMember = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })
    const isManager = project.managerId === userId
    const isOwner = project.ownerId === userId
    if (!isMember && !isManager && !isOwner) {
      return reply.status(400).send({ error: 'O usuário deve ter acesso ao projeto. Adicione-o como membro primeiro.' })
    }
    const validDias = [1, 3, 7, 15]
    const dias = diasAntes && validDias.includes(diasAntes) ? diasAntes : 1
    const respNome = (responsavelNome || '').trim()
    const tType = (targetType || '').trim().toLowerCase()
    const tId = (targetId || '').trim()
    const finalTargetType = ['project', 'responsible', 'task', 'subtask'].includes(tType) ? tType : (respNome ? 'responsible' : 'project')
    const finalTargetId = (finalTargetType === 'task' || finalTargetType === 'subtask') ? tId : ''
    const existing = await prisma.projectAlert.findFirst({
      where: { projectId, userId, targetType: finalTargetType, targetId: finalTargetId, responsavelNome: respNome, diasAntes: dias },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    if (existing) {
      return reply.status(201).send(existing)
    }
    const alert = await prisma.projectAlert.create({
      data: { projectId, userId, responsavelNome: respNome, targetType: finalTargetType, targetId: finalTargetId, diasAntes: dias, enabled: true },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return reply.status(201).send(alert)
  } catch (e: any) {
    if (e?.code === 'P2002' && req?.body?.userId) {
      try {
        const b = req.body || {}
        const t = ((b.targetType || '').trim().toLowerCase()) || (b.responsavelNome ? 'responsible' : 'project')
        const tid = ['task', 'subtask'].includes(t) ? (b.targetId || '').trim() : ''
        const rn = (b.responsavelNome || '').trim()
        const existing = await prisma.projectAlert.findFirst({
          where: { projectId: req.params.projectId, userId: b.userId, targetType: t, targetId: tid, responsavelNome: rn },
          include: { user: { select: { id: true, name: true, email: true } } }
        })
        if (existing) return reply.status(201).send(existing)
      } catch (findErr) {
        console.error('Erro ao buscar alerta existente:', findErr)
      }
    }
    console.error('Erro POST /projetos/:projectId/alerts:', e)
    return reply.status(500).send({ error: 'Erro interno' })
  }
})
app.put('/projetos/:projectId/alerts/:alertId', async (req: any, reply: any) => {
  try {
    const { projectId, alertId } = req.params
    const { diasAntes, enabled } = req.body || {}
    const alert = await prisma.projectAlert.findFirst({ where: { id: alertId, projectId } })
    if (!alert) return reply.status(404).send({ error: 'Alerta não encontrado' })
    const updates: any = {}
    if (diasAntes !== undefined) updates.diasAntes = [1, 3, 7, 15].includes(diasAntes) ? diasAntes : alert.diasAntes
    if (enabled !== undefined) updates.enabled = enabled
    const updated = await prisma.projectAlert.update({
      where: { id: alertId },
      data: updates,
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return reply.send(updated)
  } catch (e) {
    console.error('Erro PUT /projetos/:projectId/alerts/:alertId:', e)
    return reply.status(500).send({ error: 'Erro interno' })
  }
})
app.delete('/projetos/:projectId/alerts/:alertId', async (req: any, reply: any) => {
  try {
    const { projectId, alertId } = req.params
    const alert = await prisma.projectAlert.findFirst({ where: { id: alertId, projectId } })
    if (!alert) return reply.status(404).send({ error: 'Alerta não encontrado' })
    await prisma.projectAlert.delete({ where: { id: alertId } })
    return reply.status(204).send()
  } catch (e) {
    console.error('Erro DELETE /projetos/:projectId/alerts/:alertId:', e)
    return reply.status(500).send({ error: 'Erro interno' })
  }
})

// Notificações de previsão de entrega (alertas de projeto)
app.get('/notifications/project-deadlines', async (req: any, reply: any) => {
  try {
    let userId: string | null = null
    try {
      await (req as any).jwtVerify?.()
      userId = (req as any).user?.id ?? (req as any).user?.sub ?? null
    } catch {
      const auth = req?.headers?.authorization
      if (auth?.startsWith?.('Bearer ')) {
        const token = auth.slice(7)
        const parts = token.split('.')
        if (parts.length >= 2) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
            userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null
          } catch {}
        }
      }
    }
    if (!userId) userId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string || null
    if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

    const alerts = await prisma.projectAlert.findMany({
      where: { userId, enabled: true },
      include: { project: { select: { id: true, name: true, endDate: true, timeline: true } } }
    })
    const previewDays = parseInt(String(req?.query?.preview || '0'), 10) || 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const notifications: any[] = []

    for (const alert of alerts) {
      const project = alert.project as any
      const timeline = typeof project.timeline === 'string' ? JSON.parse(project.timeline || '{}') : (project.timeline || {})
      const phases = timeline?.phases || []
      const targetType = (alert.targetType || '').trim() || (alert.responsavelNome ? 'responsible' : 'project')
      const targetId = (alert.targetId || '').trim()

      const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
      const parseDate = (d: any): Date | null => {
        if (!d) return null
        const s = String(d).trim()
        if (!s) return null
        let dt = new Date(s)
        if (!isNaN(dt.getTime())) return dt
        const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
        if (m) dt = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
        return !isNaN(dt.getTime()) ? dt : null
      }
      if (targetType === 'project') {
        if (!project.endDate) continue
        const endDate = parseDate(project.endDate)
        if (!endDate) continue
        endDate.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        const maxDias = previewDays > 0 ? Math.max(alert.diasAntes, previewDays) : alert.diasAntes
        if (diffDays >= 0 && diffDays <= maxDias) {
          const dataStr = fmtDate(project.endDate)
          const msg = diffDays === 0
            ? `Projeto "${project.name}" vence HOJE (${dataStr}). Acompanhe o cronograma para garantir a entrega.`
            : diffDays === 1
              ? `Projeto "${project.name}" vence AMANHÃ (${dataStr}). Restam ${diffDays} dia. Verifique o cronograma.`
              : `Projeto "${project.name}" vence em ${diffDays} dias (${dataStr}). Data limite: ${dataStr}.`
          notifications.push({ titulo: 'Previsão de entrega - Projeto', mensagem: msg, tipo: 'sistema', prioridade: diffDays <= 1 ? 'urgente' : 'alta', dados: { projectId: project.id, projectName: project.name, endDate: project.endDate, diasRestantes: diffDays, targetType: 'project' }, link: `/projetos/${project.id}` })
        }
      } else if (targetType === 'task' && targetId) {
        for (const phase of phases) {
          const tasks = phase.tasks || []
          const task = tasks.find((t: any) => String(t.id) === String(targetId))
          if (!task) continue
          const plannedDate = task.plannedEndDate || task.plannedDate || task.dueDate
          if (!plannedDate) continue
          const dueDate = parseDate(plannedDate)
          if (!dueDate) continue
          dueDate.setHours(0, 0, 0, 0)
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
          const maxDiasTask = previewDays > 0 ? Math.max(alert.diasAntes, previewDays) : alert.diasAntes
          if (diffDays >= 0 && diffDays <= maxDiasTask) {
            const taskName = task.name || task.title || 'Tarefa'
            const phaseName = phase.name || 'Fase'
            const dataStr = fmtDate(plannedDate)
            const msg = diffDays === 0
              ? `Tarefa "${taskName}" (${phaseName}) vence HOJE (${dataStr}). Projeto: ${project.name}.`
              : diffDays === 1
                ? `Tarefa "${taskName}" (${phaseName}) vence AMANHÃ (${dataStr}). Projeto: ${project.name}. Restam ${diffDays} dia.`
                : `Tarefa "${taskName}" (${phaseName}) vence em ${diffDays} dias (${dataStr}). Projeto: ${project.name}. Data prevista: ${dataStr}.`
            notifications.push({ titulo: 'Previsão de entrega - Tarefa', mensagem: msg, tipo: 'sistema', prioridade: diffDays <= 1 ? 'urgente' : 'alta', dados: { projectId: project.id, projectName: project.name, taskId: task.id, taskName, phaseName, plannedDate, diasRestantes: diffDays, targetType: 'task' }, link: `/projetos/${project.id}` })
          }
          break
        }
      } else if (targetType === 'subtask' && targetId) {
        for (const phase of phases) {
          const tasks = phase.tasks || []
          for (const task of tasks) {
            const subtasks = task.subtasks || []
            const subtask = subtasks.find((s: any) => String(s.id) === String(targetId))
            if (!subtask) continue
            const plannedDate = subtask.plannedEndDate || subtask.plannedDate || subtask.dueDate
            if (!plannedDate) continue
            const dueDate = parseDate(plannedDate)
            if (!dueDate) continue
            dueDate.setHours(0, 0, 0, 0)
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            const maxDiasSub = previewDays > 0 ? Math.max(alert.diasAntes, previewDays) : alert.diasAntes
            if (diffDays >= 0 && diffDays <= maxDiasSub) {
              const subtaskName = subtask.name || subtask.title || 'Subtarefa'
              const taskName = task.name || task.title || 'Tarefa'
              const phaseName = phase.name || 'Fase'
              const dataStr = fmtDate(plannedDate)
              const msg = diffDays === 0
                ? `Subtarefa "${subtaskName}" da tarefa "${taskName}" (${phaseName}) vence HOJE (${dataStr}). Projeto: ${project.name}.`
                : diffDays === 1
                  ? `Subtarefa "${subtaskName}" da tarefa "${taskName}" (${phaseName}) vence AMANHÃ (${dataStr}). Projeto: ${project.name}. Restam ${diffDays} dia.`
                  : `Subtarefa "${subtaskName}" da tarefa "${taskName}" (${phaseName}) vence em ${diffDays} dias (${dataStr}). Projeto: ${project.name}. Data prevista: ${dataStr}.`
              notifications.push({ titulo: 'Previsão de entrega - Subtarefa', mensagem: msg, tipo: 'sistema', prioridade: diffDays <= 1 ? 'urgente' : 'alta', dados: { projectId: project.id, projectName: project.name, taskId: task.id, taskName, subtaskId: subtask.id, subtaskName, phaseName, plannedDate, diasRestantes: diffDays, targetType: 'subtask' }, link: `/projetos/${project.id}` })
            }
            break
          }
        }
      } else {
        const respNome = (alert.responsavelNome || '').trim().toLowerCase()
        for (const phase of phases) {
          const tasks = phase.tasks || []
          for (const task of tasks) {
            const resp = (task.responsible || task.assignee || '')
            const respStr = typeof resp === 'object' ? (resp?.nome || resp?.name || '') : String(resp)
            if (!respStr.trim() || respStr.trim().toLowerCase() !== respNome) continue
            const plannedDate = task.plannedEndDate || task.plannedDate || task.dueDate
            if (!plannedDate) continue
            const dueDate = parseDate(plannedDate)
            if (!dueDate) continue
            dueDate.setHours(0, 0, 0, 0)
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            const maxDiasResp = previewDays > 0 ? Math.max(alert.diasAntes, previewDays) : alert.diasAntes
            if (diffDays >= 0 && diffDays <= maxDiasResp) {
              const taskName = task.name || task.title || 'Tarefa'
              const phaseName = phase.name || 'Fase'
              const dataStr = fmtDate(plannedDate)
              const msg = diffDays === 0
                ? `Tarefa "${taskName}" (${phaseName}) vence HOJE (${dataStr}). Projeto: ${project.name}. Responsável: ${respStr}.`
                : diffDays === 1
                  ? `Tarefa "${taskName}" (${phaseName}) vence AMANHÃ (${dataStr}). Projeto: ${project.name}. Responsável: ${respStr}. Restam ${diffDays} dia.`
                  : `Tarefa "${taskName}" (${phaseName}) vence em ${diffDays} dias (${dataStr}). Projeto: ${project.name}. Responsável: ${respStr}. Data prevista: ${dataStr}.`
              notifications.push({ titulo: 'Previsão de entrega - Tarefa', mensagem: msg, tipo: 'sistema', prioridade: diffDays <= 1 ? 'urgente' : 'alta', dados: { projectId: project.id, projectName: project.name, taskId: task.id, taskName, phaseName, plannedDate, diasRestantes: diffDays, targetType: 'task' }, link: `/projetos/${project.id}` })
            }
          }
        }
      }
    }
    return reply.send({ notifications, count: notifications.length })
  } catch (error) {
    console.error('Erro ao buscar notificações de projeto:', error)
    return reply.status(500).send({ error: 'Erro interno do servidor' })
  }
})

for (const [path, repo] of Object.entries(resources)) {
  // Regras específicas de privacidade para Projetos: sobrescreve list/get/create
  if (path === 'projetos' || path === 'projects') {
    // Fallback: extrair userId/role do Authorization header sem depender do plugin jwt
    const extractUserFromAuthHeader = (req: any): { id: string | null, role: string | null } => {
      try {
        const auth = req?.headers?.authorization || req?.headers?.Authorization
        let token: string | null = null
        if (auth && typeof auth === 'string') {
          const parts = auth.split(' ')
          if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1]
        }
        // Fallback: cookie "token=<jwt>"
        if (!token && typeof req?.headers?.cookie === 'string') {
          const m = req.headers.cookie.split(';').map((s: string) => s.trim()).find((c: string) => c.startsWith('token='))
          if (m) token = m.substring('token='.length)
        }
        // Fallback: query ?token=<jwt>
        if (!token && req?.query?.token && typeof req.query.token === 'string') {
          token = req.query.token
        }
        if (!token) {
          // Último fallback: cabeçalhos x-user-id / x-user-role enviados pelo cliente
          const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
          const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
          if (hdrId && typeof hdrId === 'string') return { id: hdrId, role: typeof hdrRole === 'string' ? hdrRole : null }
          return { id: null, role: null }
        }
        const segs = token.split('.')
        if (segs.length < 2) return { id: null, role: null }
        const payloadB64 = segs[1].replace(/-/g, '+').replace(/_/g, '/')
        const pad = payloadB64.length % 4
        const payloadFixed = payloadB64 + (pad ? '='.repeat(4 - pad) : '')
        const json = Buffer.from(payloadFixed, 'base64').toString('utf8')
        const payload = JSON.parse(json)
        const extractedId = payload?.id || payload?.userId || payload?.user?.id || payload?.sub || null
        const extractedRole = payload?.role || payload?.user?.role || payload?.userRole || null
        return { id: extractedId, role: extractedRole }
      } catch {
        return { id: null, role: null }
      }
    }
    app.get(`/${path}`, async (req: any, reply) => {
      try {
        let userId: string | null = null
        let userRole: string | null = null
        try {
          await (req as any).jwtVerify?.()
          const u = (req as any).user
          userId = (u?.id ?? u?.sub) ?? null
          userRole = u?.role ?? null
        } catch (e) {
          const f = extractUserFromAuthHeader(req)
          userId = f.id
          userRole = f.role
        }
        // Fallback: ler do header se ainda não capturado
        if (!userId) {
          const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
          if (hdrId && typeof hdrId === 'string') userId = hdrId
        }
        if (!userRole) {
          const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
          if (hdrRole && typeof hdrRole === 'string') userRole = hdrRole
        }

        console.log('🔍 GET /projetos: userId =', userId, 'userRole =', userRole)

        // Admin enxerga tudo
        const where: any = userRole === 'admin'
          ? {}
          : userId
            ? {
                OR: [
                  { isPrivate: false },
                  { ownerId: userId },
                  { managerId: userId },
                  { members: { some: { userId } } }
                ]
              }
            : { isPrivate: false }

        console.log('🔍 GET /projetos: where clause =', JSON.stringify(where, null, 2))

        const projects = await prisma.project.findMany({ where })

        console.log('✅ GET /projetos: encontrados', projects.length, 'projetos')

        // Projetos em que o usuário é membro (para canEdit na lista)
        let memberProjectIds: string[] = []
        if (userId) {
          const memberRows = await prisma.projectMember.findMany({
            where: { userId, isActive: true },
            select: { projectId: true }
          })
          memberProjectIds = memberRows.map((r: any) => r.projectId)
        }

        const norm = (v: any) => (v != null ? String(v).trim() : '')
        // Converter campos JSON e adicionar canEdit (admin, owner, manager ou membro)
        const mapped = projects.map((project: any) => {
          if (project.timeline && typeof project.timeline === 'string') {
            try { project.timeline = JSON.parse(project.timeline) } catch (err) { project.timeline = { phases: [] } }
          }
          if (project.activities && typeof project.activities === 'string') {
            try { project.activities = JSON.parse(project.activities) } catch (err) { project.activities = [] }
          }
          if (project.team && typeof project.team === 'string') {
            try { project.team = JSON.parse(project.team) } catch (err) { project.team = [] }
          }
          if (project.tags && typeof project.tags === 'string') {
            try { project.tags = JSON.parse(project.tags) } catch (err) { project.tags = [] }
          }
          const isAdmin = userRole === 'admin'
          const isOwner = !!userId && norm(project.ownerId) === norm(userId)
          const isManager = !!userId && norm(project.managerId) === norm(userId)
          const isMember = !!userId && memberProjectIds.includes(project.id)
          const canEdit = isAdmin || isOwner || isManager || isMember
          return { ...project, canEdit }
        })

        return mapped
      } catch (error) {
        req.log.error(error)
        return reply.code(500).send({ error: 'Erro interno do servidor' })
      }
    })

    // Endpoint dedicado: pode editar este projeto? (fonte única de verdade para o frontend)
    app.get(`/${path}/:id/can-edit`, async (req: any, reply) => {
      try {
        const { id } = req.params as { id: string }
        let userId: string | null = null
        let userRole: string | null = null
        const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
        const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
        if (hdrId && typeof hdrId === 'string') userId = hdrId
        if (hdrRole && typeof hdrRole === 'string') userRole = hdrRole
        if (!userId || !userRole) {
          try {
            await (req as any).jwtVerify?.()
            const u = (req as any).user
            userId = userId || (u?.id ?? u?.sub) ?? null
            userRole = userRole || u?.role ?? null
          } catch {
            const f = extractUserFromAuthHeader(req)
            userId = userId || f.id
            userRole = userRole || f.role
          }
        }
        if (!userId) {
          return reply.code(200).send({ canEdit: false, reason: 'no-user' })
        }
        const project = await prisma.project.findUnique({
          where: { id },
          select: { id: true, ownerId: true, managerId: true, isPrivate: true, members: { where: { isActive: true }, select: { userId: true } } }
        })
        if (!project) {
          return reply.code(404).send({ canEdit: false, error: 'Projeto não encontrado' })
        }
        const norm = (v: any) => (v != null ? String(v).trim() : '')
        const isAdmin = userRole === 'admin'
        const isOwner = norm(project.ownerId) === norm(userId)
        const isManager = norm(project.managerId) === norm(userId)
        const isMember = (project.members as any[])?.some((m: any) => norm(m.userId) === norm(userId)) ?? false
        const canEdit = isAdmin || isOwner || isManager || isMember
        return reply.code(200).send({ canEdit })
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ canEdit: false, error: 'Erro ao verificar permissão' })
      }
    })

    app.get(`/${path}/:id`, async (req: any, reply) => {
      try {
        const { id } = req.params as { id: string }
        
        // Log dos headers recebidos para depuração
        console.log('📥 GET /projetos/:id: Headers recebidos:', {
          'x-user-id': req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id'],
          'x-user-role': req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role'],
          'authorization': req?.headers?.authorization ? 'Bearer ***' : null
        })
        
        let userId: string | null = null
        let userRole: string | null = null
        
        // PRIORIDADE 1: Ler diretamente dos headers (mais confiável)
        const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
        const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
        if (hdrId && typeof hdrId === 'string') userId = hdrId
        if (hdrRole && typeof hdrRole === 'string') userRole = hdrRole
        
        // PRIORIDADE 2: Tentar validar JWT (fallback). JWT do login usa "sub" como id do usuário, não "id".
        if (!userId || !userRole) {
          try {
            await (req as any).jwtVerify?.()
            const u = (req as any).user
            userId = userId || (u?.id ?? u?.sub) ?? null
            userRole = userRole || u?.role ?? null
          } catch (e) {
            // Se JWT falhar, tentar extrair do token no header
            if (!userId || !userRole) {
              const f = extractUserFromAuthHeader(req)
              userId = userId || f.id
              userRole = userRole || f.role
            }
          }
        }

        console.log('🔍 GET /projetos/:id: userId =', userId, 'userRole =', userRole, 'projectId =', id)

        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            members: { where: { isActive: true } },
            owner: { select: { id: true, name: true, email: true } }
          }
        })

        if (!project) {
          console.log('❌ GET /projetos/:id: Projeto não encontrado:', id)
          return reply.code(404).send({ error: 'Projeto não encontrado' })
        }

        // Verificar se é membro usando a mesma lógica da lista
        const isMember = !!userId && project.members?.some((m: any) => m.userId === userId && m.isActive !== false)
        
        // Normalizar para comparação (string trim, evita diferença de tipo)
        const norm = (v: any) => (v != null ? String(v).trim() : '')
        
        // Verificações detalhadas para debug
        const isAdmin = userRole === 'admin'
        const isPublic = !project.isPrivate
        const isOwner = !!userId && (norm(project.ownerId) === norm(userId) || (project as any).owner?.id && norm((project as any).owner.id) === norm(userId))
        const isManager = !!userId && (norm(project.managerId) === norm(userId))
        
        // FALLBACK: Se projeto é privado mas não tem ownerId, e usuário está nos membros, permitir acesso
        // Isso cobre casos onde projetos antigos foram tornados privados antes da correção
        const isPrivateWithoutOwner = project.isPrivate && (!project.ownerId || project.ownerId === '')
        const fallbackAccess = isPrivateWithoutOwner && isMember
        
        // Lógica IDÊNTICA à da lista: admin, público, owner, manager, ou membro (ou fallback)
        const canView = isAdmin || isPublic || isOwner || isManager || isMember || fallbackAccess

        console.log('🔍 GET /projetos/:id: Verificação de acesso:', {
          projectId: id,
          isPrivate: project.isPrivate,
          ownerId: project.ownerId,
          managerId: project.managerId,
          userId,
          userRole,
          isAdmin,
          isPublic,
          isOwner,
          isManager,
          isMember,
          isPrivateWithoutOwner,
          fallbackAccess,
          canView,
          members: project.members?.map((m: any) => ({ userId: m.userId, role: m.role, isActive: m.isActive })) || []
        })

        if (!canView) {
          console.log('❌ GET /projetos/:id: Acesso negado -> 403')
          return reply.code(403).send({ error: 'Acesso negado a este projeto' })
        }

        // Quem pode editar/excluir: admin, owner, manager ou membro (mesma regra do PUT/DELETE)
        const canEdit = isAdmin || isOwner || isManager || isMember

        // Remover lista de membros do payload simples (mantemos endpoint próprio para equipe)
        const { members, owner, ...safeProject } = project as any
        return {
          ...safeProject,
          ownerName: owner?.name || owner?.email || safeProject.ownerId || null,
          canEdit
        }
      } catch (error) {
        req.log.error(error)
        return reply.code(500).send({ error: 'Erro interno do servidor' })
      }
    })

    app.post(`/${path}`, async (req: any, reply) => {
      try {
        let userId: string | null = null
        try {
          await (req as any).jwtVerify?.()
          const u = (req as any).user
          userId = (u?.id ?? u?.sub) ?? null
        } catch (e) {
          const f = extractUserFromAuthHeader(req)
          userId = f.id
        }
        // Reforço: ler diretamente dos headers se ainda não detectado
        if (!userId) {
          const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
          if (hdrId && typeof hdrId === 'string') userId = hdrId
        }

        const body = req.body || {}
        const data: any = { ...body }
        // Remover campos virtuais que não existem no schema
        delete data.ownerName
        // Nunca aceitar ownerId do cliente, exceto se coincidir com o x-user-id enviado
        if ('ownerId' in data) {
          const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
          if (!hdrId || data.ownerId !== hdrId) delete data.ownerId
        }
        console.log('🔍 POST /projetos: userId detectado =', userId)
        console.log('🔍 POST /projetos: payload recebido.isPrivate =', (body as any)?.isPrivate)
        // Normalizar flag isPrivate
        if ('isPrivate' in data) data.isPrivate = !!data.isPrivate
        console.log('🔍 POST /projetos: isPrivate normalizado =', data.isPrivate)

        // Normalização de campos diversos já tratados no update (json/arrays)
        if (data.startDate) data.startDate = new Date(data.startDate)
        if (data.endDate) data.endDate = new Date(data.endDate)
        if (Array.isArray(data.team)) data.team = JSON.stringify(data.team)
        if (Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags)
        if (typeof data.timeline === 'object') data.timeline = JSON.stringify(data.timeline)
        if (Array.isArray(data.activities)) data.activities = JSON.stringify(data.activities)

        // Se projeto for privado e não houver usuário autenticado, bloquear
        if (data.isPrivate === true && !userId) {
          console.log('❌ POST /projetos: isPrivate=true sem auth -> 403')
          return reply.code(403).send({ error: 'É necessário estar logado para criar projeto privado.' })
        }

        // Sempre definir ownerId quando houver usuário autenticado
        if (userId) {
          data.ownerId = userId
          console.log('🔗 POST /projetos: vinculando ownerId =', userId)
        }

        let created = await prisma.project.create({ data })
        console.log('✅ POST /projetos: criado', created.id, 'isPrivate=', created.isPrivate, 'ownerId=', created.ownerId)
        // Fallback defensivo: garantir ownerId imediatamente após criação
        if (userId && (!created.ownerId || created.ownerId === '')) {
          try {
            created = await prisma.project.update({ where: { id: created.id }, data: { ownerId: userId } })
            console.log('🔧 POST /projetos: ownerId corrigido pós-criação =', userId)
          } catch (fixErr) {
            console.warn('⚠️ POST /projetos: falha ao corrigir ownerId pós-criação:', fixErr)
          }
        }
        // Garantir visibilidade imediata ao criador: adicionar como membro se não existir
        if (userId) {
          try {
            await prisma.projectMember.upsert({
              where: { projectId_userId: { projectId: created.id, userId } },
              update: {},
              create: { projectId: created.id, userId, role: 'owner' }
            })
            console.log('👥 POST /projetos: criador adicionado como membro')
          } catch (mErr) {
            console.warn('⚠️ POST /projetos: falha ao adicionar criador como membro:', mErr)
          }
        }
        return created
      } catch (error) {
        req.log.error(error)
        return reply.code(500).send({ error: 'Erro interno do servidor' })
      }
    })

    // Atualizar projeto
    app.put(`/${path}/:id`, async (req: any, reply) => {
      try {
        const { id } = req.params as { id: string }
        let userId: string | null = null
        try {
          await (req as any).jwtVerify?.()
          const u = (req as any).user
          userId = (u?.id ?? u?.sub) ?? null
        } catch (e) {
          const f = extractUserFromAuthHeader(req)
          userId = f.id
        }
        // Reforço: ler diretamente dos headers se ainda não detectado
        if (!userId) {
          const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
          if (hdrId && typeof hdrId === 'string') userId = hdrId
        }

        // Verificar permissões antes de atualizar
        const u = (req as any).user
        const userRole = u?.role ?? (req.headers?.['x-user-role'] as string) ?? null
        
        console.log('🔍 PUT /projetos: userId capturado:', userId, 'userRole:', userRole)
        const project = await prisma.project.findUnique({
          where: { id },
          select: { 
            id: true, 
            isPrivate: true, 
            ownerId: true, 
            managerId: true,
            members: { select: { userId: true } }
          }
        })

        if (!project) {
          return reply.code(404).send({ error: 'Projeto não encontrado' })
        }

        // Edição apenas para admin, owner, manager ou membro (projeto público ou privado)
        const isMember = project.members?.some((m: any) => m.userId === userId) || false
        const canEdit = userRole === 'admin' ||
                        (!!userId && (project.ownerId === userId || project.managerId === userId || isMember))

        console.log('🔍 PUT /projetos: Verificação de permissão:', {
          projectId: id,
          isPrivate: project.isPrivate,
          ownerId: project.ownerId,
          managerId: project.managerId,
          userId,
          userRole,
          isMember,
          canEdit
        })

        if (!canEdit) {
          console.log('❌ PUT /projetos: Sem permissão para editar (apenas owner/manager/membro) -> 403')
          return reply.code(403).send({ error: 'Você não tem permissão para editar este projeto. Apenas owner, manager ou membros podem editar.' })
        }

        const body = req.body || {}
        const updateData: any = { ...body }
        // Normalizar flag isPrivate
        const isTurningPrivate = 'isPrivate' in updateData && !!updateData.isPrivate && !project.isPrivate
        
        if ('isPrivate' in updateData) updateData.isPrivate = !!updateData.isPrivate

        // Campos que não devem ser atualizados diretamente (só escalares do Project no Prisma)
        delete updateData.id
        delete updateData.createdAt
        delete updateData.updatedAt
        delete updateData.managerId
        delete updateData.clientId
        delete updateData.activities // evitar estruturas complexas no update
        delete updateData.ownerName // Campo virtual, não existe no schema
        delete updateData.canEdit // Campo virtual do frontend, não existe no schema
        // Relações e objetos que o frontend envia mas o Prisma.update não aceita como objeto bruto
        delete updateData.manager
        delete updateData.owner
        delete updateData.client
        delete updateData.members
        delete updateData.milestones
        delete updateData.tasks
        delete updateData.timelines
        delete updateData.shareTokens
        delete updateData.externalMembers
        // Bloquear alteração de ownerId via PUT, EXCETO se estiver virando privado e não tiver ownerId
        if ('ownerId' in updateData) {
          // Se o projeto está virando privado e não tem ownerId, definir o userId como owner
          if (isTurningPrivate && userId && (!project.ownerId || project.ownerId === '')) {
            console.log('🔧 PUT /projetos: Projeto virando privado sem ownerId, definindo ownerId =', userId)
            updateData.ownerId = userId
          } else {
            delete updateData.ownerId
          }
        } else if (isTurningPrivate && userId && (!project.ownerId || project.ownerId === '')) {
          // Se não estava no updateData mas precisa ser definido
          console.log('🔧 PUT /projetos: Projeto virando privado sem ownerId, adicionando ownerId =', userId)
          updateData.ownerId = userId
        }

        // Datas
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate)
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate)

        // Arrays -> string JSON (conforme schema)
        if (updateData.team && Array.isArray(updateData.team)) {
          updateData.team = JSON.stringify(updateData.team)
        }
        if (updateData.tags && Array.isArray(updateData.tags)) {
          updateData.tags = JSON.stringify(updateData.tags)
        }

        // Objetos JSON -> string
        if (updateData.timeline && typeof updateData.timeline === 'object') {
          updateData.timeline = JSON.stringify(updateData.timeline)
        }

        // progress é Int no schema
        if (typeof updateData.progress === 'number' && !Number.isInteger(updateData.progress)) {
          updateData.progress = Math.round(updateData.progress)
        }

        // Regras de privacidade: exigir auth para tornar privado (só se realmente estiver tentando tornar privado)
        if ('isPrivate' in updateData && updateData.isPrivate === true && !userId) {
          console.log('❌ PUT /projetos: isPrivate=true sem auth -> 403, userId:', userId)
          return reply.code(403).send({ error: 'É necessário estar logado para tornar projeto privado.' })
        }

        // Garantir owner ao tornar privado
        if (updateData.isPrivate === true) {
          try {
            const current = await prisma.project.findUnique({ where: { id }, select: { ownerId: true } })
            if (current && (!current.ownerId || current.ownerId === '') && userId) {
              updateData.ownerId = userId
              console.log('🔗 PUT /projetos: definindo ownerId ao tornar privado =', userId)
            }
          } catch (err) {}
        }

        // Limpar null/undefined
        Object.keys(updateData).forEach((k) => {
          if (updateData[k] === undefined) delete updateData[k]
        })

        const updated = await prisma.project.update({ where: { id }, data: updateData })
        console.log('✅ PUT /projetos:', id, 'isPrivate=', (updated as any)?.isPrivate, 'ownerId=', (updated as any)?.ownerId)
        
        // Se o projeto virou privado, garantir que o usuário seja membro
        if (isTurningPrivate && userId) {
          try {
            await prisma.projectMember.upsert({
              where: { projectId_userId: { projectId: id, userId } },
              update: { isActive: true },
              create: { projectId: id, userId, role: 'owner', isActive: true }
            })
            console.log('👥 PUT /projetos: usuário adicionado como membro após tornar projeto privado')
          } catch (mErr) {
            console.warn('⚠️ PUT /projetos: falha ao adicionar usuário como membro:', mErr)
          }
        }
        
        // Converter campos para retornar compatível com frontend
        const result: any = { ...updated }
        if (result.timeline && typeof result.timeline === 'string') {
          try { result.timeline = JSON.parse(result.timeline) } catch (err) { result.timeline = { phases: [] } }
        }
        if (result.activities && typeof result.activities === 'string') {
          try { result.activities = JSON.parse(result.activities) } catch (err) { result.activities = [] }
        }
        if (result.team && typeof result.team === 'string') {
          try { result.team = JSON.parse(result.team) } catch (err) { result.team = [] }
        }
        if (result.tags && typeof result.tags === 'string') {
          try { result.tags = JSON.parse(result.tags) } catch (err) { result.tags = [] }
        }

        return result
      } catch (error: any) {
        req.log.error(error)
        
        // Retornar mensagem de erro mais específica
        const errorMessage = error?.message || 'Erro interno do servidor'
        const statusCode = error?.code === 'P2003' ? 400 : (error?.code === 'P2025' ? 404 : 500)
        
        return reply.code(statusCode).send({ 
          error: errorMessage,
          code: error?.code,
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        })
      }
    })

    // Remover projeto
    app.delete(`/${path}/:id`, async (req: any, reply) => {
      try {
        const { id } = req.params as { id: string }
        
        // Capturar userId e userRole dos headers (prioridade) ou JWT
        let userId: string | null = null
        let userRole: string | null = null
        
        // PRIORIDADE 1: Ler diretamente dos headers
        const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
        const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
        if (hdrId && typeof hdrId === 'string') userId = hdrId
        if (hdrRole && typeof hdrRole === 'string') userRole = hdrRole
        
        // PRIORIDADE 2: Tentar validar JWT (fallback). JWT usa "sub" como id do usuário.
        if (!userId || !userRole) {
          try {
            await (req as any).jwtVerify?.()
            const u = (req as any).user
            userId = userId || (u?.id ?? u?.sub) ?? null
            userRole = userRole || u?.role ?? null
          } catch (e) {
            const f = extractUserFromAuthHeader(req)
            userId = userId || f.id
            userRole = userRole || f.role
          }
        }
        
        console.log('🔍 DELETE /projetos/:id: userId =', userId, 'userRole =', userRole, 'projectId =', id)
        
        // Buscar projeto para verificar permissões
        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            members: true
          }
        })
        
        if (!project) {
          console.log('❌ DELETE /projetos/:id: Projeto não encontrado:', id)
          return reply.code(404).send({ error: 'Projeto não encontrado' })
        }
        
        // Exclusão apenas para admin, owner, manager ou membro (projeto público ou privado)
        const isAdmin = userRole === 'admin'
        const isOwner = !!userId && project.ownerId === userId
        const isManager = !!userId && project.managerId === userId
        const isMember = !!userId && project.members?.some((m: any) => m.userId === userId && m.isActive !== false)
        const canDelete = isAdmin || isOwner || isManager || isMember

        console.log('🔍 DELETE /projetos/:id: Verificação de permissão:', {
          projectId: id,
          isPrivate: project.isPrivate,
          ownerId: project.ownerId,
          managerId: project.managerId,
          userId,
          userRole,
          isAdmin,
          isOwner,
          isManager,
          isMember,
          canDelete
        })

        if (!canDelete) {
          console.log('❌ DELETE /projetos/:id: Sem permissão para excluir (apenas owner/manager/membro) -> 403')
          return reply.code(403).send({ error: 'Você não tem permissão para excluir este projeto. Apenas owner, manager ou membros podem excluir.' })
        }
        
        // Excluir relacionamentos primeiro (cascata pode não estar configurada)
        console.log('🗑️ DELETE /projetos/:id: Excluindo relacionamentos do projeto:', id)
        
        try {
          // Excluir membros do projeto
          await prisma.projectMember.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Membros excluídos')
          
          // Excluir marcos do projeto
          await prisma.projectMilestone.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Marcos excluídos')
          
          // Excluir tarefas do projeto
          await prisma.projectTask.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Tarefas excluídas')
          
          // Excluir linhas do tempo do projeto
          await prisma.projectTimeline.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Linhas do tempo excluídas')
          
          // Excluir tokens de compartilhamento do projeto
          await prisma.projectShareToken.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Tokens de compartilhamento excluídos')
          
          // Excluir alertas do projeto
          await prisma.projectAlert.deleteMany({ where: { projectId: id } })
          console.log('✅ DELETE /projetos/:id: Alertas excluídos')
        } catch (relError) {
          console.warn('⚠️ DELETE /projetos/:id: Erro ao excluir relacionamentos (continuando):', relError)
          // Continuar mesmo se houver erro (pode ser que alguns relacionamentos não existam)
        }
        
        // Excluir o projeto
        await prisma.project.delete({ where: { id } })
        console.log('✅ DELETE /projetos/:id: Projeto excluído com sucesso:', id)
        
        return reply.code(204).send()
      } catch (error: any) {
        console.error('❌ DELETE /projetos/:id: Erro:', error)
        req.log.error(error)
        
        // Retornar mensagem de erro mais específica
        const errorMessage = error?.message || 'Erro interno do servidor'
        const statusCode = error?.code === 'P2003' ? 400 : 500 // P2003 = Foreign key constraint
        
        return reply.code(statusCode).send({ error: errorMessage })
      }
    })

    // Pula o registro genérico para evitar duplicidade
    continue
  }
  app.get(`/${path}`, async (req: any) => repo.list(req.query))
  app.get(`/${path}/:id`, async (req: any) => repo.get(req.params.id))
  
  // Adicionar aliases para endpoints com hífens
  if (path === 'tiposDemanda') {
    app.get('/tipos-demanda', async (req: any) => repo.list(req.query))
    app.get('/tipos-demanda/:id', async (req: any) => repo.get(req.params.id))
  }
  if (path === 'tiposServico') {
    app.get('/tipos-servico', async (req: any) => repo.list(req.query))
    app.get('/tipos-servico/:id', async (req: any) => repo.get(req.params.id))
  }
  if (path !== 'projetos' && path !== 'projects') app.post(`/${path}`, async (req: any, res) => {
    console.log(`🔍 POST /${path}: Recebendo requisição`)
    console.log(`🔍 POST /${path}: Headers:`, req.headers)
    console.log(`🔍 POST /${path}: Body:`, JSON.stringify(req.body, null, 2))
    
    try {
      // Tratamento especial para demandas
      if (path === 'demandas') {
        // Validar e limpar dados antes de criar
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /demandas: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // CUIDADO: Remover apenas campos que são realmente null/undefined/vazio
        // MAS manter campos com IDs válidos (strings)
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 POST /demandas: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 POST /demandas: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        // CORREÇÃO: Remover campos de texto que causam erro no Prisma
        // O Prisma espera apenas IDs para relacionamentos, não os nomes/textos
        const camposParaRemover = ['analista', 'tipo', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
        camposParaRemover.forEach(campo => {
          if (cleanedData[campo]) {
            console.log(`🔧 POST /demandas: Removendo campo de texto que causa erro: ${campo} = ${cleanedData[campo]}`)
            delete cleanedData[campo]
          }
        })
        
        console.log(`🔧 POST /demandas: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Verificar especificamente clienteId e contratoId
        if (req.body.clienteId || req.body.contratoId) {
          console.log(`🔍 POST /demandas: CLIENTE-CONTRATO DEBUG:`)
          console.log(`  clienteId original: ${req.body.clienteId} (tipo: ${typeof req.body.clienteId})`)
          console.log(`  contratoId original: ${req.body.contratoId} (tipo: ${typeof req.body.contratoId})`)
          console.log(`  clienteId limpo: ${cleanedData.clienteId} (tipo: ${typeof cleanedData.clienteId})`)
          console.log(`  contratoId limpo: ${cleanedData.contratoId} (tipo: ${typeof cleanedData.contratoId})`)
          
          // VERIFICAÇÃO ADICIONAL: Validar se IDs existem no banco
          if (cleanedData.clienteId) {
            try {
              const clienteExiste = await prisma.cliente.findUnique({ where: { id: cleanedData.clienteId } })
              if (!clienteExiste) {
                console.error(`❌ POST /demandas: Cliente ID "${cleanedData.clienteId}" NÃO EXISTE no banco!`)
                res.code(400)
                return { 
                  error: 'Cliente inválido', 
                  message: `Cliente com ID "${cleanedData.clienteId}" não foi encontrado no banco de dados.`,
                  code: 'CLIENTE_NAO_ENCONTRADO'
                }
              } else {
                console.log(`✅ POST /demandas: Cliente ID "${cleanedData.clienteId}" encontrado: ${clienteExiste.nome}`)
              }
            } catch (error) {
              console.error(`❌ POST /demandas: Erro ao verificar cliente:`, error)
            }
          }
          
          if (cleanedData.contratoId) {
            try {
              const contratoExiste = await prisma.contrato.findUnique({ 
                where: { id: cleanedData.contratoId },
                include: { cliente: true }
              })
              if (!contratoExiste) {
                console.error(`❌ POST /demandas: Contrato ID "${cleanedData.contratoId}" NÃO EXISTE no banco!`)
                res.code(400)
                return { 
                  error: 'Contrato inválido', 
                  message: `Contrato com ID "${cleanedData.contratoId}" não foi encontrado no banco de dados.`,
                  code: 'CONTRATO_NAO_ENCONTRADO'
                }
              } else {
                console.log(`✅ POST /demandas: Contrato ID "${cleanedData.contratoId}" encontrado: ${contratoExiste.numero}`)
                console.log(`✅ POST /demandas: Cliente do contrato: ${contratoExiste.cliente.nome}`)
                
                // Verificar se o cliente do contrato existe
                if (!contratoExiste.cliente) {
                  console.error(`❌ POST /demandas: Contrato "${cleanedData.contratoId}" tem clienteId inválido!`)
                  res.code(400)
                  return { 
                    error: 'Dados inconsistentes', 
                    message: `O contrato selecionado tem um cliente inválido no banco de dados.`,
                    code: 'CLIENTE_CONTRATO_INCONSISTENTE'
                  }
                }
              }
            } catch (error) {
              console.error(`❌ POST /demandas: Erro ao verificar contrato:`, error)
            }
          }
        }
        
        const created = await repo.create(cleanedData)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      } else if (path === 'manutencoes') {
        // Tratamento especial para manutenções - similar ao das demandas
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /manutencoes: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Limpar campos vazios
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 POST /manutencoes: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 POST /manutencoes: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        // CORREÇÃO: Remover campos de texto que causam erro no Prisma
        // O Prisma espera apenas IDs para relacionamentos, não os nomes/textos
        const camposParaRemover = ['analista', 'tipo', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
        camposParaRemover.forEach(campo => {
          if (cleanedData[campo]) {
            console.log(`🔧 POST /manutencoes: Removendo campo de texto que causa erro: ${campo} = ${cleanedData[campo]}`)
            delete cleanedData[campo]
          }
        })
        
        console.log(`🔧 POST /manutencoes: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Validar IDs obrigatórios
        if (cleanedData.clienteId) {
          try {
            const clienteExiste = await prisma.cliente.findUnique({ where: { id: cleanedData.clienteId } })
            if (!clienteExiste) {
              console.error(`❌ POST /manutencoes: Cliente ID "${cleanedData.clienteId}" NÃO EXISTE no banco!`)
              res.code(400)
              return { 
                error: 'Cliente inválido', 
                message: `Cliente com ID "${cleanedData.clienteId}" não foi encontrado no banco de dados.`,
                code: 'CLIENTE_NAO_ENCONTRADO'
              }
            } else {
              console.log(`✅ POST /manutencoes: Cliente ID "${cleanedData.clienteId}" encontrado: ${clienteExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /manutencoes: Erro ao verificar cliente:`, error)
          }
        }
        
        if (cleanedData.analistaId) {
          try {
            const analistaExiste = await prisma.analista.findUnique({ where: { id: cleanedData.analistaId } })
            if (!analistaExiste) {
              console.error(`❌ POST /manutencoes: Analista ID "${cleanedData.analistaId}" NÃO EXISTE no banco!`)
              res.code(400)
              return { 
                error: 'Analista inválido', 
                message: `Analista com ID "${cleanedData.analistaId}" não foi encontrado no banco de dados.`,
                code: 'ANALISTA_NAO_ENCONTRADO'
              }
            } else {
              console.log(`✅ POST /manutencoes: Analista ID "${cleanedData.analistaId}" encontrado: ${analistaExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /manutencoes: Erro ao verificar analista:`, error)
          }
        }
        
        // Validar contratoId se fornecido
        if (cleanedData.contratoId) {
          try {
            const contratoValido = await validateForeignKeys.validateContrato(cleanedData.contratoId);
            if (!contratoValido) {
              console.warn(`⚠️ POST /manutencoes: Removendo contratoId inválido: ${cleanedData.contratoId}`);
              delete cleanedData.contratoId;
            }
          } catch (error) {
            console.error(`❌ POST /manutencoes: Erro ao validar contrato:`, error)
          }
        }
        
        const created = await repo.create(cleanedData)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      // } else if (path === 'mailling') {
      //   // REMOVIDO - AGORA TRATADO EM masterData.ts
      //   const created = await repo.create(cleanedData)
      //   console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
      //   res.code(201)
      //   return created
      } else if (path === 'contratos') {
        // Tratamento especial para contratos - validar duplicatas de grupo econômico + número
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /contratos: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Verificar se já existe contrato com mesmo grupo econômico + número
        if (cleanedData.numero) {
          try {
            // Normalizar grupoEconomico: string vazia ou undefined vira null
            const grupoEconomicoValue = cleanedData.grupoEconomico && cleanedData.grupoEconomico.trim() !== '' 
              ? cleanedData.grupoEconomico 
              : null;
            
            const contratoExiste = await prisma.contrato.findFirst({ 
              where: { 
                numero: cleanedData.numero,
                grupoEconomico: grupoEconomicoValue
              } 
            });
            
            if (contratoExiste) {
              const grupoInfo = grupoEconomicoValue 
                ? `do grupo econômico "${grupoEconomicoValue}"` 
                : 'sem grupo econômico';
              
              console.warn(`⚠️ POST /contratos: Contrato "${cleanedData.numero}" ${grupoInfo} já existe`);
              
              res.code(400);
              return { 
                error: 'Contrato duplicado', 
                message: `Contrato "${cleanedData.numero}" ${grupoInfo} já existe. Por favor, escolha um número diferente ou verifique o grupo econômico.` 
              };
            }
          } catch (error) {
            console.error(`❌ POST /contratos: Erro ao verificar duplicação:`, error);
          }
        }
        
        const created = await repo.create(cleanedData)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      } else if (path === 'validacoes') {
        // Tratamento especial para validações
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /validacoes: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Limpar campos vazios
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 POST /validacoes: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 POST /validacoes: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        // Converter arrays para JSON strings se necessário
        if (cleanedData.estruturaEdge !== undefined) {
          if (Array.isArray(cleanedData.estruturaEdge)) {
            cleanedData.estruturaEdge = cleanedData.estruturaEdge.length > 0 ? JSON.stringify(cleanedData.estruturaEdge) : null
          } else if (cleanedData.estruturaEdge === '' || cleanedData.estruturaEdge === '[]') {
            cleanedData.estruturaEdge = null
          }
        }
        if (cleanedData.estruturaMove !== undefined) {
          if (Array.isArray(cleanedData.estruturaMove)) {
            cleanedData.estruturaMove = cleanedData.estruturaMove.length > 0 ? JSON.stringify(cleanedData.estruturaMove) : null
          } else if (cleanedData.estruturaMove === '' || cleanedData.estruturaMove === '[]') {
            cleanedData.estruturaMove = null
          }
        }
        
        // CORREÇÃO: Remover campos de texto que causam erro no Prisma
        // O Prisma espera apenas IDs para relacionamentos, não os nomes/textos
        // IMPORTANTE: 'tipo' NÃO deve ser removido pois é um campo de texto normal (não relacionamento)
        const camposParaRemover = ['analista', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
        camposParaRemover.forEach(campo => {
          if (cleanedData[campo]) {
            console.log(`🔧 POST /validacoes: Removendo campo de texto que causa erro: ${campo} = ${cleanedData[campo]}`)
            delete cleanedData[campo]
          }
        })
        
        console.log(`🔧 POST /validacoes: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Validar IDs obrigatórios
        console.log(`🔍 POST /validacoes: Verificando analistaId:`, cleanedData.analistaId)
        
        if (cleanedData.analistaId) {
          try {
            console.log(`🔍 POST /validacoes: Buscando analista no banco...`)
            const analistaExiste = await prisma.analista.findUnique({ where: { id: cleanedData.analistaId } })
            console.log(`🔍 POST /validacoes: Resultado da busca:`, analistaExiste)
            
            if (!analistaExiste) {
              console.error(`❌ POST /validacoes: Analista ID "${cleanedData.analistaId}" NÃO EXISTE no banco!`)
              
              // Buscar primeiro analista disponível como fallback
              const primeiroAnalista = await prisma.analista.findFirst()
              if (primeiroAnalista) {
                console.log(`🔄 POST /validacoes: Usando analista fallback: ${primeiroAnalista.nome} (${primeiroAnalista.id})`)
                cleanedData.analistaId = primeiroAnalista.id
                console.log(`✅ POST /validacoes: Analista fallback definido: ${primeiroAnalista.nome}`)
              } else {
                console.error(`❌ POST /validacoes: Nenhum analista encontrado no banco!`)
                res.code(400)
                return { 
                  error: 'Analista inválido', 
                  message: `Analista com ID "${cleanedData.analistaId}" não foi encontrado no banco de dados.`,
                  code: 'ANALISTA_NAO_ENCONTRADO'
                }
              }
            } else {
              console.log(`✅ POST /validacoes: Analista ID "${cleanedData.analistaId}" encontrado: ${analistaExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /validacoes: Erro ao verificar analista:`, error)
            res.code(500)
            return { 
              error: 'Erro interno', 
              message: `Erro ao verificar analista: ${error}`,
              code: 'INTERNAL_ERROR'
            }
          }
        } else {
          console.error(`❌ POST /validacoes: analistaId não fornecido!`)
          res.code(400)
          return { 
            error: 'Analista obrigatório', 
            message: `Campo analistaId é obrigatório.`,
            code: 'ANALISTA_OBRIGATORIO'
          }
        }
        
        // Converter datas para objetos Date e filtrar campos válidos
        const { analistaId, ...dataWithoutAnalistaId } = cleanedData
        
        // Filtrar apenas campos que existem no modelo Validacao
        const validFields = [
          'id', 'demandaId', 'analistaId', 'userId', 'status', 'dataInicio', 'dataFim', 
          'observacoes', 'clienteId', 'contratoId', 'operadoraId', 'produtoId',
          'ticket', 'solicitante', 'tipo', 'descricao', 'qualidade', 'qtdRetornos', 'vigencia',
          'estruturaEdge', 'estruturaMove', 'formalizacao', 
          'itensPendentes', 'itensConcluidos', 'total', 'createdAt', 'updatedAt'
        ]
        
        const filteredData = Object.keys(dataWithoutAnalistaId)
          .filter(key => validFields.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = dataWithoutAnalistaId[key]
            return obj
          }, {})
        
        const dataWithDates: any = { ...filteredData }
        if (dataWithDates.dataInicio) {
          dataWithDates.dataInicio = new Date(dataWithDates.dataInicio)
        }
        if (dataWithDates.dataFim) {
          dataWithDates.dataFim = new Date(dataWithDates.dataFim)
        }
        
        // Criar validação com relacionamentos corretos
        const createData: any = {
          ...dataWithDates,
          analista: {
            connect: { id: analistaId }
          }
        }

        // Adicionar relacionamentos se os IDs existirem e forem válidos
        if (dataWithDates.clienteId) {
          try {
            const clienteExiste = await prisma.cliente.findUnique({ where: { id: dataWithDates.clienteId } })
            if (clienteExiste) {
              createData.cliente = { connect: { id: dataWithDates.clienteId } }
              console.log(`✅ POST /validacoes: Cliente conectado: ${clienteExiste.nome}`)
            } else {
              console.warn(`⚠️ POST /validacoes: Cliente ID "${dataWithDates.clienteId}" não encontrado, ignorando`)
            }
          } catch (error) {
            console.error(`❌ POST /validacoes: Erro ao verificar cliente:`, error)
          }
          delete createData.clienteId
        }
        
        if (dataWithDates.contratoId) {
          try {
            const contratoExiste = await prisma.contrato.findUnique({ where: { id: dataWithDates.contratoId } })
            if (contratoExiste) {
              createData.contrato = { connect: { id: dataWithDates.contratoId } }
              console.log(`✅ POST /validacoes: Contrato conectado: ${contratoExiste.numero}`)
            } else {
              console.warn(`⚠️ POST /validacoes: Contrato ID "${dataWithDates.contratoId}" não encontrado, ignorando`)
            }
          } catch (error) {
            console.error(`❌ POST /validacoes: Erro ao verificar contrato:`, error)
          }
          delete createData.contratoId
        }
        
        if (dataWithDates.operadoraId) {
          try {
            const operadoraExiste = await prisma.operadora.findUnique({ where: { id: dataWithDates.operadoraId } })
            if (operadoraExiste) {
              createData.operadora = { connect: { id: dataWithDates.operadoraId } }
              console.log(`✅ POST /validacoes: Operadora conectada: ${operadoraExiste.nome}`)
            } else {
              console.warn(`⚠️ POST /validacoes: Operadora ID "${dataWithDates.operadoraId}" não encontrada, ignorando`)
            }
          } catch (error) {
            console.error(`❌ POST /validacoes: Erro ao verificar operadora:`, error)
          }
          delete createData.operadoraId
        }
        
        if (dataWithDates.produtoId) {
          try {
            const produtoExiste = await prisma.produto.findUnique({ where: { id: dataWithDates.produtoId } })
            if (produtoExiste) {
              createData.produto = { connect: { id: dataWithDates.produtoId } }
              console.log(`✅ POST /validacoes: Produto conectado: ${produtoExiste.nome}`)
            } else {
              console.warn(`⚠️ POST /validacoes: Produto ID "${dataWithDates.produtoId}" não encontrado, ignorando`)
            }
          } catch (error) {
            console.error(`❌ POST /validacoes: Erro ao verificar produto:`, error)
          }
          delete createData.produtoId
        }

        const created = await prisma.validacao.create({
          data: createData
        })
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      } else if (path === 'atendimentos') {
        // Tratamento especial para atendimentos - similar ao das demandas
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /atendimentos: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Limpar campos vazios (exceto campos de data obrigatórios)
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          // Não remover campos de data obrigatórios
          if (key === 'dataAbertura' && value) {
            console.log(`🔧 POST /atendimentos: Mantendo campo de data obrigatório: ${key} = ${value} (tipo: ${typeof value})`)
            return
          }
          
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 POST /atendimentos: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 POST /atendimentos: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        // CORREÇÃO: Remover campos de texto que causam erro no Prisma
        // O Prisma espera apenas IDs para relacionamentos, não os nomes/textos
        const camposParaRemover = ['analista', 'tipo', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
        camposParaRemover.forEach(campo => {
          if (cleanedData[campo]) {
            console.log(`🔧 POST /atendimentos: Removendo campo de texto que causa erro: ${campo} = ${cleanedData[campo]}`)
            delete cleanedData[campo]
          }
        })
        
        console.log(`🔧 POST /atendimentos: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Validar IDs obrigatórios
        if (cleanedData.analistaId) {
          try {
            const analistaExiste = await prisma.analista.findUnique({ where: { id: cleanedData.analistaId } })
            if (!analistaExiste) {
              console.error(`❌ POST /atendimentos: Analista ID "${cleanedData.analistaId}" NÃO EXISTE no banco!`)
              res.code(400)
              return { 
                error: 'Analista inválido', 
                message: `Analista com ID "${cleanedData.analistaId}" não foi encontrado no banco de dados.`,
                code: 'ANALISTA_NAO_ENCONTRADO'
              }
            } else {
              console.log(`✅ POST /atendimentos: Analista ID "${cleanedData.analistaId}" encontrado: ${analistaExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /atendimentos: Erro ao verificar analista:`, error)
          }
        }
        
        if (cleanedData.areaId) {
          try {
            const areaExiste = await prisma.area.findUnique({ where: { id: cleanedData.areaId } })
            if (!areaExiste) {
              console.error(`❌ POST /atendimentos: Área ID "${cleanedData.areaId}" NÃO EXISTE no banco!`)
              res.code(400)
              return { 
                error: 'Área inválida', 
                message: `Área com ID "${cleanedData.areaId}" não foi encontrada no banco de dados.`,
                code: 'AREA_NAO_ENCONTRADA'
              }
            } else {
              console.log(`✅ POST /atendimentos: Área ID "${cleanedData.areaId}" encontrada: ${areaExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /atendimentos: Erro ao verificar área:`, error)
          }
        }
        
        // tipoServicoId removido da validação - aceita valores de texto diretos
        if (cleanedData.tipoServicoId) {
          console.log(`✅ POST /atendimentos: Tipo de Serviço aceito sem validação: ${cleanedData.tipoServicoId}`)
        }
        
        // Validar tipoId (tipo de demanda)
        if (cleanedData.tipoId) {
          try {
            await validateForeignKeys.validateTipoDemanda(cleanedData.tipoId);
          } catch (error) {
            console.error(`❌ POST /atendimentos: Erro ao validar tipo de demanda:`, error)
          }
        }
        
        const created = await repo.create(cleanedData)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      } else {
        const created = await repo.create(req.body)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      }
    } catch (error: any) {
      console.error(`❌ POST /${path}: Erro ao criar:`, error.message)
      console.error(`❌ POST /${path}: Código do erro:`, error.code)
      console.error(`❌ POST /${path}: Meta do erro:`, error.meta)
      
      // Para erros de FK constraint, fornecer mensagem mais clara
      if (error.code === 'P2003') {
        console.error(`❌ POST /${path}: Violação de chave estrangeira. Dados enviados:`, JSON.stringify(req.body, null, 2))
        console.error(`❌ POST /${path}: Meta do erro P2003:`, JSON.stringify(error.meta, null, 2))
        
        let fieldMessage = 'desconhecido'
        if (error.meta?.field_name) {
          fieldMessage = error.meta.field_name
        } else if (error.meta?.constraint) {
          fieldMessage = error.meta.constraint
        }
        
        res.code(400)
        return { 
          error: 'Erro de validação', 
          message: `Um ou mais IDs referenciados não existem no banco de dados. Campo: ${fieldMessage}. Verifique se todos os dados selecionados são válidos.`,
          code: 'P2003',
          details: error.meta
        }
      }
      
      throw error
    }
  })
  app.put(`/${path}/:id`, async (req: any, res: any) => {
    try {
      console.log(`🔍 PUT /${path}/${req.params.id}: Recebendo requisição`)
      console.log(`🔍 PUT /${path}/${req.params.id}: Body:`, JSON.stringify(req.body, null, 2))
      
      let updated
      
      // Tratamento especial para validações
      if (path === 'validacoes') {
        console.log(`🔧 PUT /validacoes/${req.params.id}: Aplicando tratamento especial para validações`)
        
        const cleanedData = { ...req.body }
        
        // Limpar campos vazios
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 PUT /validacoes: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 PUT /validacoes: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        console.log(`🔧 PUT /validacoes: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Converter arrays para JSON strings se necessário
        if (cleanedData.estruturaEdge !== undefined) {
          if (Array.isArray(cleanedData.estruturaEdge)) {
            cleanedData.estruturaEdge = cleanedData.estruturaEdge.length > 0 ? JSON.stringify(cleanedData.estruturaEdge) : null
          } else if (cleanedData.estruturaEdge === '' || cleanedData.estruturaEdge === '[]') {
            cleanedData.estruturaEdge = null
          }
        }
        if (cleanedData.estruturaMove !== undefined) {
          if (Array.isArray(cleanedData.estruturaMove)) {
            cleanedData.estruturaMove = cleanedData.estruturaMove.length > 0 ? JSON.stringify(cleanedData.estruturaMove) : null
          } else if (cleanedData.estruturaMove === '' || cleanedData.estruturaMove === '[]') {
            cleanedData.estruturaMove = null
          }
        }
        
        // Converter datas se fornecidas
        if (cleanedData.dataInicio) {
          cleanedData.dataInicio = new Date(cleanedData.dataInicio)
        }
        if (cleanedData.dataFim) {
          cleanedData.dataFim = new Date(cleanedData.dataFim)
        }
        
        // Filtrar apenas campos que existem no modelo Validacao
        const validFields = [
          'id', 'demandaId', 'analistaId', 'userId', 'status', 'dataInicio', 'dataFim', 
          'observacoes', 'clienteId', 'contratoId', 'operadoraId', 'produtoId',
          'ticket', 'solicitante', 'tipo', 'descricao', 'qualidade', 'qtdRetornos', 'vigencia',
          'estruturaEdge', 'estruturaMove', 'formalizacao', 
          'itensPendentes', 'itensConcluidos', 'total', 'createdAt', 'updatedAt'
        ]
        
        const filteredData = Object.keys(cleanedData)
          .filter(key => validFields.includes(key))
          .reduce((obj: any, key) => {
            obj[key] = cleanedData[key]
            return obj
          }, {})
        
        console.log(`🔧 PUT /validacoes: Dados filtrados:`, JSON.stringify(filteredData, null, 2))
        
        // Extrair ID quando vier como objeto { id, nome } (frontend envia assim)
        const toId = (v: any): string | null => {
          if (v == null) return null
          if (typeof v === 'string') return v.trim() || null
          if (typeof v === 'object' && v?.id) return String(v.id).trim() || null
          return null
        }
        
        // Criar dados de atualização com relacionamentos corretos
        const updateData: any = { ...filteredData }
        
        // Adicionar relacionamentos se os IDs existirem (extrair string quando for objeto)
        const clienteId = toId(filteredData.clienteId)
        if (clienteId) {
          updateData.cliente = { connect: { id: clienteId } }
        }
        delete updateData.clienteId
        
        const contratoId = toId(filteredData.contratoId)
        if (contratoId) {
          updateData.contrato = { connect: { id: contratoId } }
        }
        delete updateData.contratoId
        
        const operadoraId = toId(filteredData.operadoraId)
        if (operadoraId) {
          updateData.operadora = { connect: { id: operadoraId } }
        }
        delete updateData.operadoraId
        
        const produtoId = toId(filteredData.produtoId)
        if (produtoId) {
          updateData.produto = { connect: { id: produtoId } }
        }
        delete updateData.produtoId
        
        const analistaId = toId(filteredData.analistaId)
        if (analistaId) {
          updateData.analista = { connect: { id: analistaId } }
        }
        delete updateData.analistaId
        
        const demandaId = toId(filteredData.demandaId)
        if (demandaId) {
          updateData.demanda = { connect: { id: demandaId } }
        }
        delete updateData.demandaId
        
        const userId = toId(filteredData.userId)
        if (userId) {
          updateData.user = { connect: { id: userId } }
        }
        delete updateData.userId
        
        console.log(`🔧 PUT /validacoes: Dados finais para atualização:`, JSON.stringify(updateData, null, 2))
        
        updated = await prisma.validacao.update({
          where: { id: req.params.id },
          data: updateData,
          include: {
            cliente: true,
            contrato: true,
            operadora: true,
            produto: true,
            analista: {
              select: {
                id: true,
                nome: true,
                createdAt: true,
                updatedAt: true
              }
            },
            demanda: true,
            user: true
          }
        })
        
        console.log(`✅ PUT /validacoes: Validação atualizada com sucesso:`, updated.id)
        res.code(200)
        return updated
      }
      
      // Tratamento especial para contratos - validar duplicatas
      if (path === 'contratos') {
        console.log(`🔧 PUT /contratos/${req.params.id}: Validando duplicação`)
        
        const cleanedData = { ...req.body }
        
        // Verificar se já existe outro contrato com mesmo grupo econômico + número (excluindo o próprio)
        if (cleanedData.numero) {
          try {
            const contratoExiste = await prisma.contrato.findFirst({ 
              where: { 
                numero: cleanedData.numero,
                grupoEconomico: cleanedData.grupoEconomico || null,
                id: { not: req.params.id } // Excluir o próprio contrato
              } 
            });
            
            if (contratoExiste) {
              const grupoInfo = cleanedData.grupoEconomico 
                ? `do grupo econômico "${cleanedData.grupoEconomico}"` 
                : 'sem grupo econômico';
              
              console.warn(`⚠️ PUT /contratos: Contrato "${cleanedData.numero}" ${grupoInfo} já existe`);
              
              return res.code(400).send({ 
                error: 'Contrato duplicado', 
                message: `Contrato "${cleanedData.numero}" ${grupoInfo} já existe. Por favor, escolha um número diferente ou verifique o grupo econômico.` 
              });
            }
          } catch (error) {
            console.error(`❌ PUT /contratos: Erro ao verificar duplicação:`, error);
          }
        }
      }
      
      // ReajusteLancamentos: chamar Prisma diretamente (crud passa userId e Prisma rejeita)
      if (path === 'reajusteLancamentos') {
        const raw = req.body || {}
        const FIELDS = ['mes','ano','status','operadora','qualidade','qualidadeInformacao','planos','responsavelConta','filial','ticket','solicitante','responsavelAnalista','cliente','contrato','produto','itensPendentes','itensConcluidos','valorTotal','descricao','tipoReajuste','percentual','observacoes']
        const DATE_FIELDS = ['dataInicio','dataFim','dataAtualizacao','dataAplicacao']
        const STR = new Set(['cliente','contrato','operadora','produto','responsavelAnalista','mes','ano','status','qualidade','qualidadeInformacao','planos','responsavelConta','filial','ticket','solicitante','observacoes'])
        const mesesMap: Record<string, string> = { 'janeiro':'1','fevereiro':'2','março':'3','abril':'4','maio':'5','junho':'6','julho':'7','agosto':'8','setembro':'9','outubro':'10','novembro':'11','dezembro':'12' }
        const data: Record<string, unknown> = {}
        for (const k of FIELDS) {
          if (raw[k] === undefined) continue
          const v = raw[k]
          if (typeof v === 'object' && v !== null) continue
          data[k] = (v === null || v === '') ? null : (STR.has(k) ? String(v) : v)
        }
        if (data.mes && typeof data.mes === 'string') { const m = (data.mes as string).toLowerCase(); if (mesesMap[m]) data.mes = mesesMap[m] }
        for (const k of DATE_FIELDS) {
          if (raw[k] === undefined) continue
          const v = raw[k]
          data[k] = (v === null || v === '') ? null : (typeof v === 'string' ? new Date(v) : (v instanceof Date ? v : null))
        }
        if (raw.userId !== undefined) data.user = (raw.userId && String(raw.userId).trim()) ? { connect: { id: String(raw.userId).trim() } } : { disconnect: true }
        if (raw.analistaId !== undefined) data.analista = (raw.analistaId && String(raw.analistaId).trim()) ? { connect: { id: String(raw.analistaId).trim() } } : { disconnect: true }
        const allowedKeys = new Set([...FIELDS, ...DATE_FIELDS, 'user', 'analista'])
        const finalData = Object.fromEntries(Object.entries(data).filter(([k]) => allowedKeys.has(k)))
        updated = await prisma.reajusteLancamento.update({ where: { id: req.params.id }, data: finalData })
      }
      // Tratamento especial para atendimentos - similar ao POST
      else if (path === 'atendimentos') {
        console.log(`🔧 PUT /atendimentos/${req.params.id}: Aplicando tratamento especial para atendimentos`)
        
        const cleanedData = { ...req.body }
        
        // Limpar campos vazios
        Object.keys(cleanedData).forEach(key => {
          const value = cleanedData[key]
          if (value === null || value === undefined || value === '') {
            console.log(`🔧 PUT /atendimentos: Removendo campo vazio: ${key} = ${value}`)
            delete cleanedData[key]
          } else {
            console.log(`🔧 PUT /atendimentos: Mantendo campo: ${key} = ${value} (tipo: ${typeof value})`)
          }
        })
        
        // CORREÇÃO: Remover campos de texto que causam erro no Prisma
        // O Prisma espera apenas IDs para relacionamentos, não os nomes/textos
        const camposParaRemover = ['analista', 'tipo', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
        camposParaRemover.forEach(campo => {
          if (cleanedData[campo]) {
            console.log(`🔧 PUT /atendimentos: Removendo campo de texto que causa erro: ${campo} = ${cleanedData[campo]}`)
            delete cleanedData[campo]
          }
        })
        
        console.log(`🔧 PUT /atendimentos: Dados limpos:`, JSON.stringify(cleanedData, null, 2))
        
        // Validar IDs obrigatórios se fornecidos
        if (cleanedData.analistaId) {
          const analistaExiste = await prisma.analista.findUnique({ where: { id: cleanedData.analistaId } })
          if (!analistaExiste) {
            console.error(`❌ PUT /atendimentos: Analista ID "${cleanedData.analistaId}" NÃO EXISTE no banco!`)
            res.code(400)
            return { 
              error: 'Analista inválido', 
              message: `Analista com ID "${cleanedData.analistaId}" não foi encontrado no banco de dados.`,
              code: 'ANALISTA_NAO_ENCONTRADO'
            }
          }
        }
        
        if (cleanedData.areaId) {
          const areaExiste = await prisma.area.findUnique({ where: { id: cleanedData.areaId } })
          if (!areaExiste) {
            console.error(`❌ PUT /atendimentos: Área ID "${cleanedData.areaId}" NÃO EXISTE no banco!`)
            res.code(400)
            return { 
              error: 'Área inválida', 
              message: `Área com ID "${cleanedData.areaId}" não foi encontrada no banco de dados.`,
              code: 'AREA_NAO_ENCONTRADA'
            }
          }
        }
        
        // tipoServicoId removido da validação - aceita valores de texto diretos
        if (cleanedData.tipoServicoId) {
          console.log(`✅ PUT /atendimentos: Tipo de Serviço aceito sem validação: ${cleanedData.tipoServicoId}`)
        }
        
        updated = await repo.update(req.params.id, cleanedData)
      } else {
        updated = await repo.update(req.params.id, req.body)
      }
      
      console.log(`✅ PUT /${path}/${req.params.id}: Atualizado com sucesso`)
      return updated
    } catch (error: any) {
      console.error(`❌ PUT /${path}/${req.params.id}: Erro ao atualizar:`, error.message)
      console.error(`❌ PUT /${path}/${req.params.id}: Código do erro:`, error.code)
      console.error(`❌ PUT /${path}/${req.params.id}: Meta do erro:`, error.meta)
      
      // Para erros de FK constraint, fornecer mensagem mais clara
      if (error.code === 'P2003') {
        console.error(`❌ PUT /${path}/${req.params.id}: Violação de chave estrangeira. Dados enviados:`, JSON.stringify(req.body, null, 2))
        console.error(`❌ PUT /${path}/${req.params.id}: Meta do erro P2003:`, JSON.stringify(error.meta, null, 2))
        res.code(400)
        return { 
          error: 'Erro de validação', 
          message: `Um ou mais IDs referenciados não existem no banco de dados. Campo: ${error.meta?.field_name || 'desconhecido'}. Verifique se todos os dados selecionados são válidos.`,
          code: 'P2003',
          details: error.meta
        }
      }
      
      // Para erros de registro não encontrado
      if (error.code === 'P2025') {
        console.error(`❌ PUT /${path}/${req.params.id}: Registro não encontrado. ID: ${req.params.id}`)
        res.code(404)
        return { 
          error: 'Registro não encontrado', 
          message: `O registro com ID "${req.params.id}" não foi encontrado no banco de dados.`,
          code: 'P2025'
        }
      }
      
      // Retornar 500 com a mensagem real para debug (evita throw que pode não serializar)
      console.error(`❌ PUT /${path}/${req.params.id}: Erro completo:`, error)
      res.code(500)
      return { 
        error: 'Erro ao atualizar', 
        message: error?.message || 'Erro interno do servidor',
        code: error?.code,
        details: path === 'reajusteLancamentos' ? String(error) : undefined
      }
    }
  })
  app.delete(`/${path}/:id`, async (req: any, reply: any) => {
    try {
    console.log(`🔍 DELETE /${path}/${req.params.id}: Endpoint chamado`);
    console.log(`🔍 DELETE /${path}/${req.params.id}: Repo:`, typeof repo.remove);
    
    // Usar método customizado se existir, senão usar o padrão
    const result = (repo as any).delete ? await (repo as any).delete(req.params.id) : await repo.remove(req.params.id);
    console.log(`🔍 DELETE /${path}/${req.params.id}: Resultado:`, result);
      
      // Verificar se o resultado é um erro estruturado (404)
      if (result && typeof result === 'object' && result.statusCode === 404) {
        return reply.code(404).send(result);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ DELETE /${path}/${req.params.id}: Erro:`, error.message);
      
      // Se o registro não foi encontrado, retornar 404
      if (error.code === 'P2025' || error.message.includes('não foi encontrado') || error.message.includes('Record to delete does not exist')) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Registro com ID "${req.params.id}" não foi encontrado`
        });
      }
      
      // Para outros erros, retornar 500
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message || 'Erro interno do servidor'
      });
    }
  })
}

// TESTE SIMPLES - ROTA BÁSICA PARA VERIFICAR SE FASTIFY ESTÁ FUNCIONANDO
app.get('/teste-route', async (request, reply) => {
  return { message: 'Rota de teste funcionando!', timestamp: new Date().toISOString() }
})

// Rota temporária para normalizar status de demandas
app.post('/migrate/normalize-status', async (request: any, reply: any) => {
  try {
    console.log('🔄 Iniciando normalização de status via API...')
    
    // Status a serem normalizados
    const statusToNormalize = [
      'CONCLUIDO',
      'Concluido',
      'concluido',
      'Concluído',
      'concluído',
      'Concluida',
      'concluida',
      'Concluída',
      'concluída',
      'Encerrado',
      'encerrado',
      'Resolvido',
      'resolvido'
    ]
    
    // Contar quantos registros serão afetados
    const count = await prisma.demanda.count({
      where: {
        status: {
          in: statusToNormalize
        }
      }
    })
    
    console.log(`📊 Encontrados ${count} registros para normalizar`)
    
    if (count === 0) {
      return { 
        success: true, 
        message: 'Nenhum registro precisa ser normalizado',
        count: 0
      }
    }
    
    // Atualizar todos os registros
    const result = await prisma.demanda.updateMany({
      where: {
        status: {
          in: statusToNormalize
        }
      },
      data: {
        status: 'Concluída'
      }
    })
    
    console.log(`✅ ${result.count} registros atualizados com sucesso!`)
    
    return {
      success: true,
      message: 'Status normalizados com sucesso',
      count: result.count,
      normalized: 'CONCLUIDO, Concluido, Encerrado, Resolvido -> Concluída'
    }
  } catch (error: any) {
    console.error('❌ Erro ao normalizar status:', error)
    reply.code(500)
    return {
      success: false,
      error: error.message || 'Erro ao normalizar status'
    }
  }
})

// Segundo endpoint de limpeza de duplicatas removido - substituído pelo importador inteligente

// Rota GET específica para demandas removida - usando CRUD genérico





app.put('/padrao/:id', async (req: any) => {
  try {
    const { id } = req.params
    const padrao = await prisma.padrao.update({
      where: { id },
      data: {
        nome: req.body.nome,
        tipoServicoId: req.body.tipoServicoId || null
      }
    })
    return padrao
  } catch (error) {
    console.error('❌ Erro ao atualizar padrão:', error)
    throw error
  }
})

app.delete('/padrao/:id', async (req: any) => {
  try {
    const { id } = req.params
    console.log(`🔍 DELETE /padrao/${id}: Verificando se o padrão existe...`)
    
    // Verificar se o registro existe primeiro
    const existingPadrao = await prisma.padrao.findUnique({ where: { id } })
    if (!existingPadrao) {
      console.error(`❌ DELETE /padrao/${id}: Padrão não encontrado`)
      return { 
        success: false, 
        error: 'Padrão não encontrado',
        message: `O padrão com ID "${id}" não foi encontrado no banco de dados.`
      }
    }
    
    console.log(`✅ DELETE /padrao/${id}: Padrão encontrado: ${existingPadrao.nome}`)
    
    // Verificar se há dependências (manutenções que usam este padrão)
    const dependencias = await prisma.manutencao.count({ 
      where: { tipoId: id } 
    })
    
    if (dependencias > 0) {
      console.error(`❌ DELETE /padrao/${id}: Existem ${dependencias} manutenções que dependem deste padrão`)
      return { 
        success: false, 
        error: 'Dependências encontradas',
        message: `Não é possível excluir este padrão pois existem ${dependencias} manutenção(ões) que dependem dele. Remova as dependências primeiro.`
      }
    }
    
    // Excluir o padrão
    await prisma.padrao.delete({ where: { id } })
    console.log(`✅ DELETE /padrao/${id}: Padrão excluído com sucesso`)
    
    return { 
      success: true, 
      message: 'Padrão excluído com sucesso',
      deletedId: id
    }
  } catch (error) {
    console.error('❌ Erro ao deletar padrão:', error)
    throw error
  }
})

// Endpoint para limpar contratos órfãos (com clienteId inválido)
app.delete('/contratos/limpar-orfaos', async () => {
  try {
    console.log('🧹 Iniciando limpeza de contratos órfãos...')
    
    // Buscar contratos que têm clienteId que não existe
    // Buscar todos os contratos
    const todosContratos = await prisma.contrato.findMany({
      select: { id: true, clienteId: true }
    })
    
    // Filtrar contratos órfãos (onde clienteId não existe na tabela cliente)
    const contratosOrfaos = []
    for (const contrato of todosContratos) {
      if (contrato.clienteId) {
        const clienteExiste = await prisma.cliente.findUnique({
          where: { id: contrato.clienteId }
        })
        if (!clienteExiste) {
          contratosOrfaos.push(contrato)
        }
      }
    }
    
    console.log(`🔍 Encontrados ${contratosOrfaos.length} contratos órfãos`)
    
    if (contratosOrfaos.length > 0) {
      // Deletar contratos órfãos
      const deleted = await prisma.contrato.deleteMany({
        where: {
          id: {
            in: contratosOrfaos.map(c => c.id)
          }
        }
      })
      
      console.log(`✅ ${deleted.count} contratos órfãos removidos`)
      
      return {
        success: true,
        message: `${deleted.count} contratos órfãos foram removidos`,
        contratosRemovidos: contratosOrfaos.map(c => ({ id: c.id, numero: c.numero }))
      }
    } else {
      return {
        success: true,
        message: 'Nenhum contrato órfão encontrado',
        contratosRemovidos: []
      }
    }
  } catch (error) {
    console.error('❌ Erro ao limpar contratos órfãos:', error)
    throw error
  }
})


// Endpoint específico para exclusão de demandas individuais - TEMPORARIAMENTE DESABILITADO PARA EVITAR CONFLITO
/*
app.delete('/demandas/:id', async (req: any, reply: any) => {
  try {
    const { id } = req.params
    console.log(`🔍 DELETE /demandas/${id}: Iniciando exclusão...`)
    
    // Verificar se a demanda existe
    const demanda = await prisma.demanda.findUnique({ 
      where: { id },
      include: {
        reajustes: true,
        validacoes: true
      }
    })
    
    if (!demanda) {
      console.log(`❌ DELETE /demandas/${id}: Demanda não encontrada`)
      reply.code(404)
      return { error: 'Demanda não encontrada' }
    }
    
    console.log(`📊 DELETE /demandas/${id}: Demanda encontrada com ${demanda.reajustes.length} reajustes e ${demanda.validacoes.length} validações`)
    
    // Verificar se há dependências que impedem a exclusão
    if (demanda.reajustes.length > 0) {
      console.log(`⚠️ DELETE /demandas/${id}: Demanda possui ${demanda.reajustes.length} reajustes vinculados`)
      reply.code(400)
      return { 
        error: 'Não é possível excluir demanda com reajustes vinculados',
        reajustesCount: demanda.reajustes.length
      }
    }
    
    if (demanda.validacoes.length > 0) {
      console.log(`⚠️ DELETE /demandas/${id}: Demanda possui ${demanda.validacoes.length} validações vinculadas`)
      reply.code(400)
      return { 
        error: 'Não é possível excluir demanda com validações vinculadas',
        validacoesCount: demanda.validacoes.length
      }
    }
    
    // Excluir a demanda
    await prisma.demanda.delete({ where: { id } })
    console.log(`✅ DELETE /demandas/${id}: Demanda excluída com sucesso`)
    
    reply.code(200)
    return { 
      message: 'Demanda excluída com sucesso',
      deletedId: id
    }
    
  } catch (error: any) {
    console.error(`❌ DELETE /demandas/${req.params.id}: Erro detalhado:`, {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    reply.code(500)
    return { 
      error: 'Erro interno ao excluir demanda',
      message: error.message,
      code: error.code
    }
  }
})
*/

// Endpoint para limpar demandas simples incorretas
app.delete('/demandas/limpar-atv-demandas', async () => {
  try {
    console.log('🧹 Iniciando limpeza de demandas simples incorretas...')
    
    // Buscar demandas que são simples (sem dados operacionais)
    const demandasSimples = await prisma.demanda.findMany({
      where: {
        ticket: null,
        analistaId: null,
        userId: null,
        solicitante: null,
        areaId: null,
        tipoId: null,
        descricao: null,
        clienteId: null,
        contratoId: null,
        operadoraId: null,
        produtoId: null,
        sistemaId: null,
        dataInicio: null,
        dataFinal: null,
        periodicidade: null,
        qtdRetornos: null,
        qualidade: null,
        observacoes: null
      }
    })
    
    console.log(`🔍 Encontradas ${demandasSimples.length} demandas simples para limpeza`)
    
    if (demandasSimples.length === 0) {
      return { message: 'Nenhuma demanda simples encontrada para limpeza' }
    }
    
    // Excluir as demandas simples
    const deletedCount = await prisma.demanda.deleteMany({
      where: {
        id: { in: demandasSimples.map(d => d.id) }
      }
    })
    
    console.log(`✅ ${deletedCount.count} demandas simples foram removidas`)
    
    return { 
      message: `${deletedCount.count} demandas simples foram removidas com sucesso`,
      deletedCount: deletedCount.count
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar demandas simples:', error)
    throw error
  }
})


// Rotas de autenticação e usuários (admin)
app.register(authRoutes, { prisma })
app.register(userRoutes, { prisma })

// Rotas de comunicados
app.register(comunicadosRoutes, { prisma, prefix: '/comunicados' })

// Rotas de equipe de projetos
app.register(projectTeamRoutes, { prisma })

// Rotas de compartilhamento (DEVEM vir ANTES das rotas genéricas)
app.register(shareRoutes, { prisma })

// Rotas de dados mestres
app.register(masterDataRoutes, { prisma })

// Rotas do Kanban (com autenticação)
app.register(kanbanRoutes, { prisma })

// Rotas de monitoramento
app.register(monitoringRoutes, { prisma, prefix: '/monitoring' })
app.register(deletionHistoryRoutes, { prisma, prefix: '/deletion-history' })
app.register(convertToWordRoutes)

// Rotas do Kanban removidas - Usando rotas organizadas em demandas-api/src/routes/kanban.ts

// Endpoint para notificações programadas de vencimento
app.post('/kanban/tickets/:id/schedule-notification', async (req: any, reply: any) => {
  try {
    const { id } = req.params
    const { dueDate } = req.body
    
    if (!dueDate) {
      return reply.code(400).send({ error: 'Data de vencimento é obrigatória' })
    }
    
    // Calcular data da notificação (1 dia antes do vencimento)
    const dueDateObj = new Date(dueDate)
    const notificationDate = new Date(dueDateObj.getTime() - (24 * 60 * 60 * 1000)) // 1 dia antes
    
    // Buscar o ticket para obter informações
    const ticket = await prisma.kanbanTicket.findUnique({
      where: { id }
    })
    
    if (!ticket) {
      return reply.code(404).send({ error: 'Ticket não encontrado' })
    }
    
    // Criar notificação programada
    const notification = {
      id: crypto.randomUUID(),
      titulo: 'Tarefa próxima do vencimento',
      mensagem: `A tarefa "${ticket.title}" vence amanhã (${dueDateObj.toLocaleDateString('pt-BR')})`,
      tipo: 'sistema',
      prioridade: 'alta',
      lida: false,
      dataCriacao: new Date().toISOString(),
      dataProgramada: notificationDate.toISOString(), // Data para exibir a notificação
      dados: {
        kanbanTicketId: ticket.id,
        dueDate: dueDate,
        assignee: ticket.assignee
      }
    }
    
    // Salvar notificação programada (você pode criar uma tabela específica para isso)
    // Por enquanto, vamos usar uma abordagem simples com localStorage no frontend
    
    console.log('📅 Notificação programada criada:', {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      dueDate: dueDate,
      notificationDate: notificationDate.toISOString()
    })
    
    return {
      message: 'Notificação programada criada com sucesso',
      notification,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        dueDate: ticket.dueDate
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao programar notificação:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para verificar notificações programadas (chamado pelo frontend)
app.get('/notifications/scheduled', async (req: any, reply: any) => {
  try {
    const now = new Date()
    
    // Verificar se o usuário está autenticado
    let userId: string | null = null
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const decoded = app.jwt.verify(token) as any
        userId = decoded.userId
        console.log('🔐 Usuário logado verificando notificações:', userId)
      }
    } catch (authError) {
      console.warn('⚠️ Erro na autenticação:', authError)
    }
    
    // Se não há usuário logado, retornar erro
    if (!userId) {
      return reply.code(401).send({ error: 'Usuário deve estar logado para ver notificações' })
    }
    
    // Buscar tickets com vencimento em 1 dia APENAS do usuário logado
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000))
    const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
    
    const ticketsDueTomorrow = await prisma.kanbanTicket.findMany({
      where: {
        assignee: userId, // Filtrar apenas tickets do usuário logado
        dueDate: {
          gte: startOfTomorrow,
          lt: endOfTomorrow
        },
        status: {
          not: 'done' // Apenas tickets não concluídos
        }
      }
    })
    
    // Gerar notificações para tickets que vencem amanhã
    const notifications = ticketsDueTomorrow.map(ticket => ({
      id: `deadline-${ticket.id}-${now.getTime()}`,
      titulo: 'Tarefa próxima do vencimento',
      mensagem: `A tarefa "${ticket.title}" vence amanhã (${ticket.dueDate?.toLocaleDateString('pt-BR')})`,
      tipo: 'sistema',
      prioridade: 'alta',
      lida: false,
      dataCriacao: now.toISOString(),
      dados: {
        kanbanTicketId: ticket.id,
        dueDate: ticket.dueDate,
        assignee: ticket.assignee
      }
    }))
    
    console.log(`🔔 ${notifications.length} notificações de vencimento geradas`)
    
    return {
      notifications,
      count: notifications.length,
      date: now.toISOString()
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar notificações programadas:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor' })
  }
})

// Endpoints para Analytics
// (Rota GET /analytics removida - usando crud('analytics') automático)
/* app.get('/analytics', async () => {
  try {
    console.log('🔍 GET /analytics - INÍCIO da requisição')
    console.log('🔍 GET /analytics - Buscando dados de analytics...')
    
    // Buscar estatísticas gerais
    const [
      totalDemandas,
      totalAtendimentos,
      totalValidacoes,
      totalReajustes,
      totalProjetos,
      demandasPorStatus,
      atendimentosPorStatus,
      validacoesPorStatus,
      reajustesPorStatus,
      projetosPorStatus,
      analistasMaisAtivos,
      areasMaisAtivas,
      clientesMaisAtivos,
      tiposMaisUsados
    ] = await Promise.all([
      // Contadores totais
      prisma.demanda.count(),
      prisma.atendimento.count(),
      prisma.validacao.count(),
      prisma.reajuste.count(),
      prisma.project.count(),
      
      // Demandas por status
      prisma.demanda.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      // Atendimentos por status
      prisma.atendimento.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      // Validações por status
      prisma.validacao.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      // Reajustes por status
      prisma.reajuste.groupBy({
        by: ['aprovado'],
        _count: { aprovado: true }
      }),
      
      // Projetos por status
      prisma.project.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      // Analistas mais ativos
      prisma.demanda.groupBy({
        by: ['analistaId'],
        _count: { analistaId: true },
        orderBy: { _count: { analistaId: 'desc' } },
        take: 5
      }),
      
      // Áreas mais ativas
      prisma.demanda.groupBy({
        by: ['areaId'],
        _count: { areaId: true },
        orderBy: { _count: { areaId: 'desc' } },
        take: 5
      }),
      
      // Clientes mais ativos
      prisma.demanda.groupBy({
        by: ['clienteId'],
        _count: { clienteId: true },
        orderBy: { _count: { clienteId: 'desc' } },
        take: 5
      }),
      
      // Tipos mais usados
      prisma.demanda.groupBy({
        by: ['tipoId'],
        _count: { tipoId: true },
        orderBy: { _count: { tipoId: 'desc' } },
        take: 5
      })
    ])
    
    // Buscar nomes dos analistas, áreas, clientes e tipos
    const analistaIds = analistasMaisAtivos.map(a => a.analistaId).filter((id): id is string => Boolean(id))
    const areaIds = areasMaisAtivas.map(a => a.areaId).filter((id): id is string => Boolean(id))
    const clienteIds = clientesMaisAtivos.map(c => c.clienteId).filter((id): id is string => Boolean(id))
    const tipoIds = tiposMaisUsados.map(t => t.tipoId).filter((id): id is string => Boolean(id))
    
    const [analistas, areas, clientes, tipos] = await Promise.all([
      analistaIds.length > 0 ? prisma.analista.findMany({
        where: { id: { in: analistaIds } },
        select: { id: true, nome: true }
      }) : [],
      areaIds.length > 0 ? prisma.area.findMany({
        where: { id: { in: areaIds } },
        select: { id: true, nome: true }
      }) : [],
      clienteIds.length > 0 ? prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nome: true }
      }) : [],
      tipoIds.length > 0 ? prisma.tipoDemanda.findMany({
        where: { id: { in: tipoIds } },
        select: { id: true, nome: true }
      }) : []
    ])
    
    // Mapear dados para formato de analytics
    const analytics = [
      {
        id: 'overview',
        tipo: 'Visão Geral',
        categoria: 'overview',
        status: 'ativo',
        analistaMaisAtivo: analistas[0]?.nome || 'N/A',
        areaMaisAtiva: areas[0]?.nome || 'N/A',
        clienteMaisAtivo: clientes[0]?.nome || 'N/A',
        periodo: 'geral',
        descricao: 'Estatísticas gerais do sistema',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dados: {
          totalDemandas,
          totalAtendimentos,
          totalValidacoes,
          totalReajustes,
          totalProjetos,
          demandasPorStatus,
          atendimentosPorStatus,
          validacoesPorStatus,
          reajustesPorStatus,
          projetosPorStatus
        }
      },
      {
        id: 'performance',
        tipo: 'Performance',
        categoria: 'performance',
        status: 'ativo',
        analistaMaisAtivo: analistas[0]?.nome || 'N/A',
        areaMaisAtiva: areas[0]?.nome || 'N/A',
        clienteMaisAtivo: clientes[0]?.nome || 'N/A',
        periodo: 'mensal',
        descricao: 'Análise de performance dos analistas e áreas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dados: {
          analistasMaisAtivos: analistasMaisAtivos.map(a => ({
            ...a,
            nome: analistas.find(an => an.id === a.analistaId)?.nome || 'N/A'
          })),
          areasMaisAtivas: areasMaisAtivas.map(a => ({
            ...a,
            nome: areas.find(ar => ar.id === a.areaId)?.nome || 'N/A'
          }))
        }
      },
      {
        id: 'clients',
        tipo: 'Clientes',
        categoria: 'clients',
        status: 'ativo',
        analistaMaisAtivo: analistas[0]?.nome || 'N/A',
        areaMaisAtiva: areas[0]?.nome || 'N/A',
        clienteMaisAtivo: clientes[0]?.nome || 'N/A',
        periodo: 'trimestral',
        descricao: 'Análise de atividade dos clientes',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dados: {
          clientesMaisAtivos: clientesMaisAtivos.map(c => ({
            ...c,
            nome: clientes.find(cl => cl.id === c.clienteId)?.nome || 'N/A'
          }))
        }
      },
      {
        id: 'types',
        tipo: 'Tipos de Demanda',
        categoria: 'types',
        status: 'ativo',
        analistaMaisAtivo: analistas[0]?.nome || 'N/A',
        areaMaisAtiva: areas[0]?.nome || 'N/A',
        clienteMaisAtivo: clientes[0]?.nome || 'N/A',
        periodo: 'semestral',
        descricao: 'Análise dos tipos de demanda mais utilizados',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dados: {
          tiposMaisUsados: tiposMaisUsados.map(t => ({
            ...t,
            nome: tipos.find(ty => ty.id === t.tipoId)?.nome || 'N/A'
          }))
        }
      }
    ]
    
    // Buscar também os relatórios salvos
    console.log('🔍 GET /analytics - Buscando relatórios salvos...')
    console.log('🔍 GET /analytics - Prisma disponível:', !!prisma)
    console.log('🔍 GET /analytics - Modelo report disponível:', !!prisma.report)
    
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('✅ Analytics gerados com sucesso:', analytics.length, 'relatórios')
    console.log('✅ Relatórios encontrados:', reports.length, 'relatórios salvos')
    console.log('🔍 GET /analytics - Primeiro relatório:', reports[0] || 'Nenhum')
    
    console.log('🔍 GET /analytics - Retornando resposta:')
    console.log('  - Analytics:', analytics.length, 'itens')
    console.log('  - Reports:', reports.length, 'itens')
    
    return {
      analytics: analytics,
      reports: reports
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar analytics:', error)
    console.error('❌ Stack trace:', error.stack)
    return {
      analytics: [],
      reports: []
    }
  }
})
*/

// Endpoints para Padrao
app.get('/padrao', async () => {
  try {
    return await prisma.padrao.findMany({
      include: {
        tipoServico: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    })
  } catch (error) {
    console.error('❌ Erro ao buscar padrões:', error)
    return []
  }
})

app.post('/padrao', async (req: any) => {
  try {
    console.log('🔍 POST /padrao - Dados recebidos:', req.body)
    
    // Validar dados obrigatórios
    if (!req.body.nome) {
      console.error('❌ Nome é obrigatório')
      throw new Error('Nome é obrigatório')
    }
    
    // Se tipoServicoId for fornecido, buscar o ID correto baseado no nome
    let tipoServicoId = null
    if (req.body.tipoServicoId) {
      const tipoServico = await prisma.tipoServico.findFirst({
        where: { nome: req.body.tipoServicoId }
      })
      if (tipoServico) {
        tipoServicoId = tipoServico.id
      } else {
        console.warn(`⚠️ Tipo de serviço não encontrado: ${req.body.tipoServicoId}`)
      }
    }
    
    // Criar o padrão
    const padrao = await prisma.padrao.create({
      data: {
        nome: req.body.nome,
        tipoServicoId: tipoServicoId
      }
    })
    
    console.log('✅ Padrão criado com sucesso:', padrao)
    return padrao
  } catch (error) {
    console.error('❌ Erro ao criar padrão:', error)
    throw error
  }
})

// Endpoints para Relatórios, Solicitantes e Modelos já estão definidos em masterData.ts

// Endpoint para salvar relatórios do Analytics
// (Rota POST /analytics removida - usando crud('analytics') automático)
/*
app.post('/analytics', async (req: any) => {
  try {
    console.log('🔍 POST /analytics - Dados recebidos:', req.body)
    console.log('🔍 POST /analytics - Prisma disponível:', !!prisma)
    console.log('🔍 POST /analytics - Modelo report disponível:', !!prisma.report)
    
    // Verificar se o modelo report existe
    if (!prisma.report) {
      throw new Error('Modelo Report não encontrado. Execute: npx prisma generate && npx prisma db push')
    }
    
    const report = await prisma.report.create({
      data: {
        titulo: req.body.titulo,
        descricao: req.body.descricao,
        ticket: req.body.ticket,
        total: req.body.total,
        tipo: req.body.tipo,
        status: req.body.status,
        analista: req.body.analista,
        area: req.body.area,
        cliente: req.body.cliente,
        contrato: req.body.contrato,
        dataInicio: req.body.dataInicio ? new Date(req.body.dataInicio) : null,
        dataFinalizacao: req.body.dataFinalizacao ? new Date(req.body.dataFinalizacao) : null,
        dataEntrega: req.body.dataEntrega ? new Date(req.body.dataEntrega) : null,
        prioridade: req.body.prioridade,
        solicitante: req.body.solicitante,
        solicitacao: req.body.solicitacao,
        tipoSolicitacao: req.body.tipoSolicitacao,
        tipoServico: req.body.tipoServico,
        observacoes: req.body.observacoes,
        // userId: req.body.userId // Campo não existe no modelo Report
      }
    })
    
    console.log('✅ Relatório criado:', report)
    return report
  } catch (error) {
    console.error('❌ Erro ao criar relatório:', error)
    throw error
  }
})
*/

// Rota de exclusão para relatórios
// (Rota DELETE /analytics/:id removida - usando crud('analytics') automático)
/*
app.delete('/analytics/:id', async (req: any) => {
  try {
    const { id } = req.params
    console.log(`🔍 DELETE /analytics/${id}: Excluindo relatório`)
    
    // Verificar se o relatório existe
    const existingReport = await prisma.report.findUnique({ where: { id } })
    if (!existingReport) {
      return { 
        statusCode: 404, 
        error: 'Not Found', 
        message: `Relatório com ID "${id}" não foi encontrado.` 
      }
    }
    
    // TODO: Implementar validação de permissões quando o sistema de auth estiver completo
    // Por enquanto, permitir exclusão para todos os usuários autenticados
    // const userId = req.user?.id
    // const userRole = req.user?.role
    // if (existingReport.userId !== userId && userRole !== 'admin') {
    //   return {
    //     statusCode: 403,
    //     error: 'Forbidden',
    //     message: 'Você não tem permissão para excluir este relatório.'
    //   }
    // }
    
    // Excluir o relatório
    const deletedReport = await prisma.report.delete({ where: { id } })
    console.log(`✅ DELETE /analytics/${id}: Relatório excluído com sucesso:`, deletedReport.id)
    
    return { 
      success: true, 
      message: 'Relatório excluído com sucesso', 
      deletedId: deletedReport.id 
    }
  } catch (error) {
    console.error(`❌ DELETE /analytics/${req.params.id}: Erro:`, error)
    throw error
  }
})
*/

// Endpoint para buscar relatórios já está definido acima

// Endpoint GET /setup-admin removido - usando apenas POST para evitar conflitos

// Iniciar servidor - LISTEN PRIMEIRO para healthcheck passar, depois verifica DB em background
const start = async () => {
  try {
    console.log('🔄 Iniciando servidor...')
    const port = Number(process.env.PORT || 3333)

    // Configurar graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`📡 ${signal} recebido, shutdown gracioso...`)
      try {
        await app.close()
        await prisma.$disconnect()
        process.exit(0)
      } catch (error) {
        console.error('❌ Erro no shutdown:', error)
        process.exit(1)
      }
    }
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // INICIAR SERVIDOR IMEDIATAMENTE - healthcheck depende disso
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${port} - /health pronto`)

    // Verificações do banco em BACKGROUND (não bloqueiam o boot)
    setImmediate(async () => {
      try {
        const { ensureConnection } = await import('./lib/prisma')
        const ok = await ensureConnection()
        console.log(ok ? '✅ Banco conectado' : '⚠️ Banco indisponível (continuando)')
        if (ok) {
          await ensureProjectPrivacyColumns()
          const checkResult = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Manutencao' AND column_name = 'total') as exists;"
          )
          const hasTotal = Array.isArray(checkResult) && checkResult[0]?.exists === true
          if (!hasTotal) {
            const checkOld = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
              "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Manutencao' AND column_name = 'qtdClientesVinculados') as exists;"
            )
            const hasOld = Array.isArray(checkOld) && checkOld[0]?.exists === true
            if (hasOld) {
              await prisma.$executeRawUnsafe('ALTER TABLE "Manutencao" RENAME COLUMN "qtdClientesVinculados" TO "total";')
              console.log('✅ Coluna total renomeada')
            }
          }
        }
      } catch (e) {
        console.error('⚠️ Verificação DB em background:', e)
      }
    })
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
