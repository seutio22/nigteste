const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertValidacoes() {
  try {
    console.log('🔍 Inserindo dados de exemplo para validações...');
    
    // Primeiro, verificar se há analistas e demandas
    const analistas = await prisma.analista.findMany();
    const demandas = await prisma.demanda.findMany();
    const clientes = await prisma.cliente.findMany();
    const operadoras = await prisma.operadora.findMany();
    const contratos = await prisma.contrato.findMany();
    
    console.log('Analistas encontrados:', analistas.length);
    console.log('Demandas encontradas:', demandas.length);
    console.log('Clientes encontrados:', clientes.length);
    console.log('Operadoras encontradas:', operadoras.length);
    console.log('Contratos encontrados:', contratos.length);
    
    let clienteId, operadoraId, produtoId, contratoId;
    
    if (clientes.length === 0) {
      console.log('❌ Nenhum cliente encontrado. Criando cliente de exemplo...');
      
      const cliente = await prisma.cliente.create({
        data: {
          nome: 'Empresa XYZ Ltda',
          cnpj: '11.222.333/0001-44',
          telefone: '(11) 3333-3333',
          email: 'contato@xyz.com'
        }
      });
      clienteId = cliente.id;
      console.log('✅ Cliente criado:', cliente.nome);
    } else {
      clienteId = clientes[0].id;
      console.log('✅ Usando cliente existente:', clientes[0].nome);
    }
    
    if (contratos.length === 0) {
      console.log('❌ Nenhum contrato encontrado. Criando contrato de exemplo...');
      
      const contrato = await prisma.contrato.create({
        data: {
          numero: 'CT-001',
          clienteId: clienteId,
          valor: 5000.00,
          dataInicio: new Date('2024-01-01'),
          dataFim: new Date('2024-12-31'),
          status: 'Ativo'
        }
      });
      contratoId = contrato.id;
      console.log('✅ Contrato criado:', contrato.numero);
    } else {
      contratoId = contratos[0].id;
      console.log('✅ Usando contrato existente:', contratos[0].numero);
    }
    
    if (operadoras.length === 0) {
      console.log('❌ Nenhuma operadora encontrada. Criando operadora de exemplo...');
      
      const operadora = await prisma.operadora.create({
        data: {
          nome: 'Claro',
          cnpj: '22.333.444/0001-55',
          telefone: '(11) 4444-4444'
        }
      });
      operadoraId = operadora.id;
      console.log('✅ Operadora criada:', operadora.nome);
    } else {
      operadoraId = operadoras[0].id;
      console.log('✅ Usando operadora existente:', operadoras[0].nome);
    }
    
    // Verificar se há produtos
    const produtos = await prisma.produto.findMany();
    if (produtos.length === 0) {
      console.log('❌ Nenhum produto encontrado. Criando produto de exemplo...');
      
      const produto = await prisma.produto.create({
        data: {
          nome: 'Telefonia Empresarial',
          descricao: 'Solução de telefonia para empresas',
          operadoraId: operadoraId
        }
      });
      produtoId = produto.id;
      console.log('✅ Produto criado:', produto.nome);
    } else {
      produtoId = produtos[0].id;
      console.log('✅ Usando produto existente:', produtos[0].nome);
    }
    
    if (demandas.length === 0) {
      console.log('❌ Nenhuma demanda encontrada. Criando demanda de exemplo...');
      
      // Verificar se há áreas
      const areas = await prisma.area.findMany();
      let areaId;
      
      if (areas.length === 0) {
        console.log('❌ Nenhuma área encontrada. Criando área de exemplo...');
        const area = await prisma.area.create({
          data: {
            nome: 'TI',
            descricao: 'Tecnologia da Informação'
          }
        });
        areaId = area.id;
      } else {
        areaId = areas[0].id;
      }
      
      // Criar demanda
      const demanda = await prisma.demanda.create({
        data: {
          ticket: 'DEM-001',
          descricao: 'Implementação de sistema de monitoramento',
          status: 'Em Andamento',
          analistaId: analistas[0].id,
          areaId: areaId,
          clienteId: clienteId,
          contratoId: contratoId,
          operadoraId: operadoraId,
          produtoId: produtoId,
          tipoServicoId: null // Pode ser null se não existir
        }
      });
      
      console.log('✅ Demanda criada:', demanda.ticket);
    }
    
    // Agora inserir validações
    const analistasAtualizados = await prisma.analista.findMany();
    const demandasAtualizadas = await prisma.demanda.findMany();
    
    if (analistasAtualizados.length > 0 && demandasAtualizadas.length > 0) {
      console.log('✅ Inserindo validações de exemplo...');
      
      const validacoes = [
        {
          demandaId: demandasAtualizadas[0].id,
          analistaId: analistasAtualizados[0].id,
          status: 'Pendente',
          dataInicio: new Date('2024-01-15'),
          dataFim: new Date('2024-01-30'),
          observacoes: 'Validação inicial do sistema de monitoramento'
        },
        {
          demandaId: demandasAtualizadas[0].id,
          analistaId: analistasAtualizados[0].id,
          status: 'Em Andamento',
          dataInicio: new Date('2024-02-01'),
          dataFim: new Date('2024-02-15'),
          observacoes: 'Validação da implementação das funcionalidades'
        }
      ];
      
      for (const validacaoData of validacoes) {
        const validacao = await prisma.validacao.create({
          data: validacaoData
        });
        console.log('✅ Validação criada:', validacao.id);
      }
      
      console.log('✅ Todas as validações foram criadas com sucesso!');
    } else {
      console.log('❌ Não foi possível criar validações. Faltam analistas ou demandas.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao inserir validações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertValidacoes();
