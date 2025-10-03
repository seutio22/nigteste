import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authPlugin from './plugins/auth'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import comunicadosRoutes from './routes/comunicados'
import projectTeamRoutes from './routes/projectTeam'
import shareRoutes from './routes/share'
import { masterDataRoutes } from './routes/masterData'
import { PrismaClient } from '@prisma/client'

const app = Fastify({ 
  logger: true,
  bodyLimit: 50 * 1024 * 1024 // 50MB
})
const prisma = new PrismaClient()

// Aplicar schema automaticamente na inicialização
async function applySchema() {
  try {
    console.log('🔧 Verificando schema do banco...')
    // SQLite não suporta ADD COLUMN IF NOT EXISTS, então vamos tentar e ignorar erros
    try {
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "email" TEXT`
    } catch (e: any) {
      if (e.message.includes('duplicate column name')) {
        console.log('✅ Coluna email já existe')
      }
    }
    try {
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "telefone" TEXT`
    } catch (e: any) {
      if (e.message.includes('duplicate column name')) {
        console.log('✅ Coluna telefone já existe')
      }
    }
    try {
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "cargo" TEXT`
    } catch (e: any) {
      if (e.message.includes('duplicate column name')) {
        console.log('✅ Coluna cargo já existe')
      }
    }
    console.log('✅ Schema verificado!')
  } catch (error: any) {
    console.log('ℹ️ Schema check:', error.message)
  }
}

applySchema().catch(console.error)

// Configuração de CORS mais permissiva para desenvolvimento
const corsOptions = {
  origin: true, // Aceitar qualquer origem em desenvolvimento
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}

app.register(cors, corsOptions)

// ROTA ESPECÍFICA PARA LIMPEZA DE DUPLICATAS - DEVE VIR ANTES DE TODAS AS OUTRAS ROTAS
app.delete('/clientes/cleanup-duplicatas', async (request, reply) => {
  try {
    console.log('🧹 [DEBUG] Endpoint limpar-duplicatas chamado - EARLY ROUTE')
    console.log('🧹 Iniciando limpeza de grupos econômicos duplicados...')
    
    // Buscar todos os clientes com grupos econômicos
    const clientes = await prisma.cliente.findMany({
      where: {
        grupoEconomico: { not: null }
      },
      orderBy: { createdAt: 'asc' } // Manter os mais antigos
    })
    
    console.log(`🔍 Encontrados ${clientes.length} clientes com grupos econômicos`)
    
    // Agrupar por grupo econômico
    const gruposMap = new Map()
    const duplicatas = []
    
    for (const cliente of clientes) {
      const grupoKey = cliente.grupoEconomico?.toLowerCase().trim()
      
      if (grupoKey && grupoKey !== '') {
        if (gruposMap.has(grupoKey)) {
          // Cliente duplicado - adicionar à lista de duplicatas
          duplicatas.push({
            id: cliente.id,
            nome: cliente.nome,
            grupoEconomico: cliente.grupoEconomico,
            createdAt: cliente.createdAt
          })
        } else {
          // Primeiro cliente com este grupo - manter
          gruposMap.set(grupoKey, cliente)
        }
      }
    }
    
    console.log(`🔍 Encontradas ${duplicatas.length} duplicatas de grupos econômicos`)
    
    if (duplicatas.length === 0) {
      return { 
        message: 'Nenhuma duplicata de grupo econômico encontrada',
        duplicatasRemovidas: []
      }
    }
    
    // Verificar se há dependências antes de excluir
    const duplicatasComDependencias = []
    const duplicatasParaRemover = []
    
    for (const duplicata of duplicatas) {
      // Verificar dependências
      const [contratos, demandas, atendimentos, projetos] = await Promise.all([
        prisma.contrato.count({ where: { clienteId: duplicata.id } }),
        prisma.demanda.count({ where: { clienteId: duplicata.id } }),
        prisma.atendimento.count({ where: { clienteId: duplicata.id } }),
        prisma.project.count({ where: { clientId: duplicata.id } })
      ])
      
      const totalDependencias = contratos + demandas + atendimentos + projetos
      
      if (totalDependencias > 0) {
        duplicatasComDependencias.push({
          ...duplicata,
          dependencias: {
            contratos,
            demandas,
            atendimentos,
            projetos,
            total: totalDependencias
          }
        })
      } else {
        duplicatasParaRemover.push(duplicata)
      }
    }
    
    console.log(`🔍 ${duplicatasParaRemover.length} duplicatas podem ser removidas (sem dependências)`)
    console.log(`🔍 ${duplicatasComDependencias.length} duplicatas têm dependências e não podem ser removidas`)
    
    // Remover apenas as duplicatas sem dependências
    let removedCount = 0
    const removedIds = []
    
    if (duplicatasParaRemover.length > 0) {
      const idsParaRemover = duplicatasParaRemover.map(d => d.id)
      
      // Excluir em lote
      const deleteResult = await prisma.cliente.deleteMany({
        where: {
          id: { in: idsParaRemover }
        }
      })
      
      removedCount = deleteResult.count
      removedIds.push(...idsParaRemover)
      
      console.log(`✅ ${removedCount} duplicatas removidas com sucesso`)
    }
    
    return {
      message: `Limpeza concluída: ${removedCount} duplicatas removidas`,
      duplicatasRemovidas: removedCount,
      duplicatasComDependencias: duplicatasComDependencias.length,
      detalhes: {
        removidas: duplicatasParaRemover.map(d => ({
          id: d.id,
          nome: d.nome,
          grupoEconomico: d.grupoEconomico
        })),
        comDependencias: duplicatasComDependencias.map(d => ({
          id: d.id,
          nome: d.nome,
          grupoEconomico: d.grupoEconomico,
          dependencias: d.dependencias
        }))
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar grupos econômicos duplicados:', error)
    return {
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      duplicatasRemovidas: 0,
      duplicatasComDependencias: 0
    }
  }
})

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

app.get('/health', async () => ({ status: 'ok' }))

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


// CRUD genérico simples para entidades mestres
function crud(entity: keyof PrismaClient) {
  const anyPrisma = prisma as any;
  return {
    list: async (queryParams?: any) => {
      // Incluir relacionamentos para atendimentos
      if (entity === 'atendimento') {
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
          }
        });
      }

      // Incluir relacionamentos para validações
      if (entity === 'validacao') {
        return anyPrisma[entity].findMany({
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
        });
      }
      
      // Contratos - sempre retornar todos (ativos e inativos)
      if (entity === 'contrato') {
        console.log('🔍 Contratos - buscando todos os contratos (ativos e inativos)');
        
        const contratos = await anyPrisma[entity].findMany({
          orderBy: { createdAt: 'desc' }
        });
        
        console.log('🔍 Contratos - encontrados:', contratos.length, 'contratos');
        return contratos;
      }
      
      // Tratamento específico para projetos - converter campos JSON
      if (entity === 'project') {
        const projects = await anyPrisma[entity].findMany();
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
      
      return anyPrisma[entity].findMany();
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

      // Incluir relacionamentos para validações
      if (entity === 'validacao') {
        return anyPrisma[entity].findUnique({ 
          where: { id },
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
      
      return anyPrisma[entity].create({ data });
    },
    update: async (id: string, data: unknown) => {
      // Tratamento específico para contratos
      if (entity === 'contrato') {
        const contratoData = { ...data as any };
        console.log('🔍 CONTRATO UPDATE: Dados recebidos:', JSON.stringify(contratoData, null, 2));
        console.log('🔍 CONTRATO UPDATE: Status recebido:', contratoData.status, 'Tipo:', typeof contratoData.status);
        
        // Garantir que o status seja sempre definido
        if (!contratoData.status || contratoData.status === '' || contratoData.status === null || contratoData.status === undefined) {
          console.log('🔍 CONTRATO UPDATE: Status não especificado, mantendo existente');
          // Não alterar o status se não foi especificado
        } else {
          console.log('🔍 CONTRATO UPDATE: Status especificado pelo usuário:', contratoData.status);
          
          // Garantir que o status seja válido
          if (!['Ativo', 'Inativo'].includes(contratoData.status)) {
            console.log('🔍 CONTRATO UPDATE: Status inválido, mantendo existente');
            delete contratoData.status; // Remover status inválido
          }
        }
        
        console.log('🔍 CONTRATO UPDATE: Dados finais para atualização:', JSON.stringify(contratoData, null, 2));
        return anyPrisma[entity].update({ where: { id }, data: contratoData });
      }
      
      // Tratamento específico para projetos
      if (entity === 'project') {
        const projectData = data as any;
        
        // Remover campos que não existem no schema ou não devem ser atualizados
        const { 
          id: _, 
          createdAt, 
          updatedAt, 
          managerId, 
          clientId, 
          activities,
          ...updateData 
        } = projectData;
        
        // Remover campos null/undefined para evitar erros do Prisma
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === null || updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        // Converter datas para o formato correto
        if (updateData.startDate) {
          updateData.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
          updateData.endDate = new Date(updateData.endDate);
        }
        
        // Converter campos String que vêm como Array do frontend
        if (updateData.team && Array.isArray(updateData.team)) {
          updateData.team = JSON.stringify(updateData.team);
        }
        if (updateData.tags && Array.isArray(updateData.tags)) {
          updateData.tags = JSON.stringify(updateData.tags);
        }
        
        // Converter campos JSON
        if (updateData.timeline) {
          if (typeof updateData.timeline === 'object') {
            updateData.timeline = JSON.stringify(updateData.timeline);
          }
        } else {
          // Se timeline não existe, criar um objeto vazio
          updateData.timeline = JSON.stringify({ phases: [] });
        }
        
        if (updateData.activities) {
          if (Array.isArray(updateData.activities)) {
            updateData.activities = JSON.stringify(updateData.activities);
          }
        } else {
          // Se activities não existe, criar um array vazio
          updateData.activities = JSON.stringify([]);
        }
        
        // Adicionar campos de relacionamento se existirem
        if (managerId) {
          updateData.manager = { connect: { id: managerId } };
        }
        if (clientId) {
          updateData.client = { connect: { id: clientId } };
        }
        
        return anyPrisma[entity].update({ where: { id }, data: updateData });
      }
      
      // Validação para clientes - evitar grupos econômicos duplicados
      if (entity === 'cliente') {
        const clienteData = data as any;
        if (clienteData.grupoEconomico && clienteData.grupoEconomico.trim()) {
          const existingClient = await anyPrisma.cliente.findFirst({
            where: {
              id: { not: id }, // Excluir o próprio cliente
              grupoEconomico: clienteData.grupoEconomico.trim()
            }
          });
          
          if (existingClient) {
            throw new Error(`Grupo econômico "${clienteData.grupoEconomico}" já existe para o cliente "${existingClient.nome}". Por favor, escolha um grupo econômico único.`);
          }
        }
      }
      
      return anyPrisma[entity].update({ where: { id }, data });
    },
    remove: async (id: string) => {
      // Verificar dependências antes de excluir
      const entityName = entity.toString();
      
      try {
        // Verificar se o registro existe primeiro
        const anyPrisma = prisma as any;
        const existingRecord = await anyPrisma[entity].findUnique({ where: { id } });
        if (!existingRecord) {
          throw new Error(`Registro com ID "${id}" não foi encontrado`);
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
              anyPrisma.atendimento.count({ where: { tipoId: id } })
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
  areas: crud('area'),
  analistas: crud('analista'),
  operadoras: crud('operadora'),
  produtos: crud('produto'),
  sistemas: crud('sistema'),
  clientes: crud('cliente'),
  contratos: crud('contrato'),
  tiposServico: crud('tipoServico'),
  tiposDemanda: crud('tipoDemanda'),
  mailling: crud('mailling'), // v2 - endpoint principal
  areasMailling: crud('areaMailling'), // v2
  cargosMailling: crud('cargoMailling'), // v2
  filiaisMailling: crud('filialMailling'), // v2
  demandas: {
    ...crud('demanda'),
    list: async () => {
      const anyPrisma = prisma as any;
      return anyPrisma.demanda.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          contrato: {
            where: { status: 'Ativo' }
          }
        }
      });
    },
    get: async (id: string) => {
      const anyPrisma = prisma as any;
      return anyPrisma.demanda.findUnique({ 
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          contrato: {
            where: { status: 'Ativo' }
          }
        }
      });
    }
  },
  atendimentos: {
    ...crud('atendimento'),
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
  validacoes: crud('validacao'),
  tiposCadastro: crud('tipoCadastro'),
  validacoesManutencao: crud('validacaoManutencao'),
  reajustes: crud('reajuste'),
  reajustesManutencao: crud('reajusteManutencao'),
  reajusteLancamentos: crud('reajusteLancamento'),
  projetos: crud('project'),
  dados: crud('dados'),
}


for (const [path, repo] of Object.entries(resources)) {
  app.get(`/${path}`, async (req: any) => repo.list(req.query))
  app.get(`/${path}/:id`, async (req: any) => repo.get(req.params.id))
  app.post(`/${path}`, async (req: any, res) => {
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
      } else if (path === 'mailling') {
        // Tratamento especial para mailling - evitar duplicatas de email
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /mailling: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Verificar se email já existe
        if (cleanedData.email) {
          try {
            const emailExiste = await prisma.mailling.findFirst({ 
              where: { email: cleanedData.email } 
            });
            if (emailExiste) {
              console.warn(`⚠️ POST /mailling: Email "${cleanedData.email}" já existe, atualizando registro existente`);
              const updated = await prisma.mailling.update({
                where: { id: emailExiste.id },
                data: cleanedData
              });
              console.log(`✅ POST /mailling: Registro atualizado:`, updated.id);
              res.code(200);
              return updated;
            }
          } catch (error) {
            console.error(`❌ POST /mailling: Erro ao verificar email:`, error);
          }
        }
        
        const created = await repo.create(cleanedData)
        console.log(`✅ POST /${path}: Criado com sucesso:`, created.id)
        res.code(201)
        return created
      } else if (path === 'contratos') {
        // Tratamento especial para contratos - evitar duplicatas de número
        const cleanedData = { ...req.body }
        
        console.log(`🔍 POST /contratos: Dados originais recebidos:`, JSON.stringify(req.body, null, 2))
        
        // Verificar se número já existe
        if (cleanedData.numero) {
          try {
            const numeroExiste = await prisma.contrato.findFirst({ 
              where: { numero: cleanedData.numero } 
            });
            if (numeroExiste) {
              console.warn(`⚠️ POST /contratos: Número "${cleanedData.numero}" já existe, atualizando registro existente`);
              const updated = await prisma.contrato.update({
                where: { id: numeroExiste.id },
                data: cleanedData
              });
              console.log(`✅ POST /contratos: Registro atualizado:`, updated.id);
              res.code(200);
              return updated;
            }
          } catch (error) {
            console.error(`❌ POST /contratos: Erro ao verificar número:`, error);
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
        const camposParaRemover = ['analista', 'tipo', 'tipoServico', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 'area']
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
        
        if (cleanedData.tipoServicoId) {
          try {
            const tipoServicoExiste = await prisma.tipoServico.findUnique({ where: { id: cleanedData.tipoServicoId } })
            if (!tipoServicoExiste) {
              console.error(`❌ POST /atendimentos: Tipo de Serviço ID "${cleanedData.tipoServicoId}" NÃO EXISTE no banco!`)
              res.code(400)
              return { 
                error: 'Tipo de Serviço inválido', 
                message: `Tipo de Serviço com ID "${cleanedData.tipoServicoId}" não foi encontrado no banco de dados.`,
                code: 'TIPO_SERVICO_NAO_ENCONTRADO'
              }
            } else {
              console.log(`✅ POST /atendimentos: Tipo de Serviço ID "${cleanedData.tipoServicoId}" encontrado: ${tipoServicoExiste.nome}`)
            }
          } catch (error) {
            console.error(`❌ POST /atendimentos: Erro ao verificar tipo de serviço:`, error)
          }
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
        
        // Criar dados de atualização com relacionamentos corretos
        const updateData: any = { ...filteredData }
        
        // Adicionar relacionamentos se os IDs existirem
        if (filteredData.clienteId) {
          updateData.cliente = { connect: { id: filteredData.clienteId } }
          delete updateData.clienteId
        }
        if (filteredData.contratoId) {
          updateData.contrato = { connect: { id: filteredData.contratoId } }
          delete updateData.contratoId
        }
        if (filteredData.operadoraId) {
          updateData.operadora = { connect: { id: filteredData.operadoraId } }
          delete updateData.operadoraId
        }
        if (filteredData.produtoId) {
          updateData.produto = { connect: { id: filteredData.produtoId } }
          delete updateData.produtoId
        }
        if (filteredData.analistaId) {
          updateData.analista = { connect: { id: filteredData.analistaId } }
          delete updateData.analistaId
        }
        if (filteredData.demandaId) {
          updateData.demanda = { connect: { id: filteredData.demandaId } }
          delete updateData.demandaId
        }
        if (filteredData.userId) {
          updateData.user = { connect: { id: filteredData.userId } }
          delete updateData.userId
        }
        
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
      
      // Tratamento especial para atendimentos - similar ao POST
      if (path === 'atendimentos') {
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
        
        if (cleanedData.tipoServicoId) {
          const tipoServicoExiste = await prisma.tipoServico.findUnique({ where: { id: cleanedData.tipoServicoId } })
          if (!tipoServicoExiste) {
            console.error(`❌ PUT /atendimentos: Tipo Serviço ID "${cleanedData.tipoServicoId}" NÃO EXISTE no banco!`)
            res.code(400)
            return { 
              error: 'Tipo de Serviço inválido', 
              message: `Tipo de Serviço com ID "${cleanedData.tipoServicoId}" não foi encontrado no banco de dados.`,
              code: 'TIPO_SERVICO_NAO_ENCONTRADO'
            }
          }
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
      
      throw error
    }
  })
  app.delete(`/${path}/:id`, async (req: any) => {
    console.log(`🔍 DELETE /${path}/${req.params.id}: Endpoint chamado`);
    console.log(`🔍 DELETE /${path}/${req.params.id}: Repo:`, typeof repo.remove);
    const result = await repo.remove(req.params.id);
    console.log(`🔍 DELETE /${path}/${req.params.id}: Resultado:`, result);
    return result;
  })
}



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
app.register(authRoutes)
app.register(userRoutes, { prisma })

// Rotas de comunicados
app.register(comunicadosRoutes, { prefix: '/comunicados' })

// Rotas de equipe de projetos
app.register(projectTeamRoutes, { prisma })

// Rotas de compartilhamento (DEVEM vir ANTES das rotas genéricas)
app.register(shareRoutes, { prisma })

// Rotas de dados mestres
app.register(masterDataRoutes, { prisma })

// Rotas do Kanban
app.get('/kanban/tickets', async () => {
  try {
    console.log('🔍 Buscando tickets do kanban...')
    
    const kanbanTickets = await prisma.kanbanTicket.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('🔍 Tickets do kanban encontrados:', kanbanTickets.length)
    
    const tickets = kanbanTickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignee || 'unassigned',
      startDate: ticket.startDate,
      dueDate: ticket.dueDate,
      tags: ticket.tags ? JSON.parse(ticket.tags) : [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    }))
    
    console.log('🔍 Total de tickets retornados:', tickets.length)
    
    return tickets
    
  } catch (error) {
    console.error('❌ Erro ao buscar tickets do kanban:', error)
    return []
  }
})

app.post('/kanban/tickets', async (req: any) => {
  try {
    const ticketData = req.body
    
    // Validar se o usuário assignee existe
    if (ticketData.assignee && ticketData.assignee !== 'unassigned') {
      await validateForeignKeys.validateUser(ticketData.assignee);
    }
    
    const kanbanTicket = await prisma.kanbanTicket.create({
      data: {
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priority: ticketData.priority,
        assignee: ticketData.assignee !== 'unassigned' ? ticketData.assignee : null,
        startDate: ticketData.startDate ? new Date(ticketData.startDate) : null,
        dueDate: ticketData.dueDate ? new Date(ticketData.dueDate) : null,
        tags: JSON.stringify(ticketData.tags || [])
      }
    })
    
    return {
      id: kanbanTicket.id,
      title: kanbanTicket.title,
      description: kanbanTicket.description,
      status: kanbanTicket.status,
      priority: kanbanTicket.priority,
      assignee: kanbanTicket.assignee || 'unassigned',
      startDate: kanbanTicket.startDate,
      dueDate: kanbanTicket.dueDate,
      tags: kanbanTicket.tags ? JSON.parse(kanbanTicket.tags) : [],
      createdAt: kanbanTicket.createdAt,
      updatedAt: kanbanTicket.updatedAt
    }
  } catch (error) {
    console.error('❌ Erro ao criar ticket do kanban:', error)
    throw error
  }
})

app.put('/kanban/tickets/:id', async (req: any) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    // Validar se o usuário assignee existe
    if (updates.assignee && updates.assignee !== 'unassigned') {
      await validateForeignKeys.validateUser(updates.assignee);
    }
    
    const kanbanTicket = await prisma.kanbanTicket.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        assignee: updates.assignee !== 'unassigned' ? updates.assignee : null,
        startDate: updates.startDate ? new Date(updates.startDate) : null,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : null,
        tags: JSON.stringify(updates.tags || [])
      }
    })
    
    return {
      id: kanbanTicket.id,
      title: kanbanTicket.title,
      description: kanbanTicket.description,
      status: kanbanTicket.status,
      priority: kanbanTicket.priority,
      assignee: kanbanTicket.assignee || 'unassigned',
      startDate: kanbanTicket.startDate,
      dueDate: kanbanTicket.dueDate,
      tags: kanbanTicket.tags ? JSON.parse(kanbanTicket.tags) : [],
      createdAt: kanbanTicket.createdAt,
      updatedAt: kanbanTicket.updatedAt
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar ticket do kanban:', error)
    throw error
  }
})

app.delete('/kanban/tickets/:id', async (req: any) => {
  try {
    const { id } = req.params
    await prisma.kanbanTicket.delete({ where: { id } })
    return { message: 'Ticket deletado com sucesso' }
  } catch (error) {
    console.error('❌ Erro ao deletar ticket do kanban:', error)
    throw error
  }
})

// Rota para limpar todos os tickets do kanban (apenas para desenvolvimento)
app.delete('/kanban/tickets', async () => {
  try {
    console.log('🧹 Limpando todos os tickets do kanban...')
    const deletedCount = await prisma.kanbanTicket.deleteMany({})
    console.log(`✅ ${deletedCount.count} tickets deletados`)
    return { message: `${deletedCount.count} tickets deletados com sucesso` }
  } catch (error) {
    console.error('❌ Erro ao limpar tickets do kanban:', error)
    throw error
  }
})

// Endpoints para Analytics
app.get('/analytics', async () => {
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

// Rota de exclusão para relatórios
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

// Endpoint para buscar relatórios já está definido acima

// Endpoint especial para criar usuário administrador (apenas para setup inicial)
app.get('/setup-admin', async (req: any, reply: any) => {
  try {
    console.log('🔧 POST /setup-admin - Criando usuário administrador...')
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // Verificar se já existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    })
    
    if (existingAdmin) {
      console.log('ℹ️ Usuário administrador já existe')
      return { message: 'Usuário administrador já existe', user: existingAdmin }
    }
    
    // Criar usuário administrador
    const admin = await prisma.user.create({
      data: {
        email: 'admin@demandas.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'admin',
        permissions: JSON.stringify({
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canManageUsers: true,
          canManageProjects: true,
          canManageDemands: true,
          canManageValidations: true,
          canManageMaintenance: true,
          canViewReports: true,
          canManageMasterData: true
        })
      }
    })
    
    console.log('✅ Usuário administrador criado:', admin.email)
    return { 
      message: 'Usuário administrador criado com sucesso',
      user: { email: admin.email, name: admin.name, role: admin.role },
      credentials: {
        email: 'admin@demandas.com',
        password: 'admin123'
      }
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error)
    return reply.code(500).send({ error: 'Erro interno do servidor', details: error.message })
  }
})

// Iniciar servidor
const start = async () => {
  try {
    console.log('🔄 Iniciando servidor...')
    console.log('📊 Variáveis de ambiente:')
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    console.log('- PORT:', process.env.PORT)
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ Definido' : '❌ Não definido')
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definido' : '❌ Não definido')
    
    // Testar conexão com o banco
    try {
      console.log('🔌 Testando conexão com o banco...')
      await prisma.$connect()
      console.log('✅ Conexão com banco estabelecida')
    } catch (dbError) {
      console.error('❌ Erro ao conectar com o banco:', dbError)
      console.log('⚠️ Continuando sem banco por enquanto...')
    }
    
    const port = process.env.PORT || 3333
    console.log(`🌐 Tentando iniciar na porta: ${port}`)
    
    await app.listen({ port: Number(port), host: '0.0.0.0' })
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`)
    console.log('✅ Healthcheck disponível em /health')
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
