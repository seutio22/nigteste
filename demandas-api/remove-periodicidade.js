const { PrismaClient } = require('@prisma/client')

async function removePeriodicidade() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Removendo coluna periodicidade da tabela Manutencao...')
    
    // SQLite não suporta DROP COLUMN diretamente, então vamos:
    // 1. Criar uma nova tabela sem a coluna periodicidade
    // 2. Copiar os dados
    // 3. Remover a tabela antiga
    // 4. Renomear a nova tabela
    
    await prisma.$executeRaw`
      CREATE TABLE Manutencao_new (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'Pendente',
        ticket TEXT UNIQUE,
        analistaId TEXT,
        userId TEXT,
        solicitante TEXT,
        areaId TEXT,
        tipoId TEXT,
        descricao TEXT,
        clienteId TEXT,
        contratoId TEXT,
        operadoraId TEXT,
        produtoId TEXT,
        tipoServicoId TEXT,
        sistemaId TEXT,
        dataInicio DATETIME,
        dataFinal DATETIME,
        qtdRetornos INTEGER,
        qualidade TEXT,
        qtdClientesVinculados INTEGER,
        usuariosEmpresa INTEGER,
        observacoes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analistaId) REFERENCES Analista(id),
        FOREIGN KEY (userId) REFERENCES User(id),
        FOREIGN KEY (areaId) REFERENCES Area(id),
        FOREIGN KEY (tipoId) REFERENCES Padrao(id),
        FOREIGN KEY (clienteId) REFERENCES Cliente(id),
        FOREIGN KEY (contratoId) REFERENCES Contrato(id),
        FOREIGN KEY (operadoraId) REFERENCES Operadora(id),
        FOREIGN KEY (produtoId) REFERENCES Produto(id),
        FOREIGN KEY (tipoServicoId) REFERENCES TipoServico(id),
        FOREIGN KEY (sistemaId) REFERENCES Sistema(id)
      )
    `
    
    console.log('✅ Nova tabela criada')
    
    // Copiar dados da tabela antiga para a nova (excluindo periodicidade)
    await prisma.$executeRaw`
      INSERT INTO Manutencao_new (
        id, status, ticket, analistaId, userId, solicitante, areaId, tipoId, 
        descricao, clienteId, contratoId, operadoraId, produtoId, tipoServicoId, 
        sistemaId, dataInicio, dataFinal, qtdRetornos, qualidade, 
        qtdClientesVinculados, usuariosEmpresa, observacoes, createdAt, updatedAt
      )
      SELECT 
        id, status, ticket, analistaId, userId, solicitante, areaId, tipoId, 
        descricao, clienteId, contratoId, operadoraId, produtoId, tipoServicoId, 
        sistemaId, dataInicio, dataFinal, qtdRetornos, qualidade, 
        qtdClientesVinculados, usuariosEmpresa, observacoes, createdAt, updatedAt
      FROM Manutencao
    `
    
    console.log('✅ Dados copiados')
    
    // Remover a tabela antiga
    await prisma.$executeRaw`DROP TABLE Manutencao`
    
    console.log('✅ Tabela antiga removida')
    
    // Renomear a nova tabela
    await prisma.$executeRaw`ALTER TABLE Manutencao_new RENAME TO Manutencao`
    
    console.log('✅ Tabela renomeada')
    
    // Recriar índices
    await prisma.$executeRaw`CREATE UNIQUE INDEX Manutencao_ticket_key ON Manutencao(ticket)`
    
    console.log('✅ Índices recriados')
    
    console.log('🎉 Coluna periodicidade removida com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao remover coluna periodicidade:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removePeriodicidade()
