const fetch = require('node-fetch');

async function testRelatorios() {
  try {
    console.log('🔍 Testando endpoints de relatórios...');
    
    // Testar GET /relatorios
    console.log('\n1. Testando GET /relatorios...');
    const getResponse = await fetch('http://localhost:3333/relatorios');
    const relatorios = await getResponse.json();
    console.log('✅ Relatórios encontrados:', relatorios.length);
    console.log('Dados:', relatorios);
    
    // Se não há relatórios, criar alguns para teste
    if (relatorios.length === 0) {
      console.log('\n2. Criando relatórios de teste...');
      
      const relatoriosTeste = [
        { nome: 'Relatório Mensal' },
        { nome: 'Relatório Trimestral' },
        { nome: 'Relatório Anual' },
        { nome: 'Relatório de Performance' },
        { nome: 'Relatório de Qualidade' }
      ];
      
      for (const relatorio of relatoriosTeste) {
        const postResponse = await fetch('http://localhost:3333/relatorios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(relatorio)
        });
        
        if (postResponse.ok) {
          const novoRelatorio = await postResponse.json();
          console.log('✅ Relatório criado:', novoRelatorio.nome);
        } else {
          console.error('❌ Erro ao criar relatório:', relatorio.nome);
        }
      }
      
      // Testar novamente
      console.log('\n3. Testando GET /relatorios novamente...');
      const getResponse2 = await fetch('http://localhost:3333/relatorios');
      const relatorios2 = await getResponse2.json();
      console.log('✅ Relatórios encontrados:', relatorios2.length);
      console.log('Dados:', relatorios2);
    }
    
    // Testar solicitantes
    console.log('\n4. Testando GET /solicitantes...');
    const solicitantesResponse = await fetch('http://localhost:3333/solicitantes');
    const solicitantes = await solicitantesResponse.json();
    console.log('✅ Solicitantes encontrados:', solicitantes.length);
    console.log('Dados:', solicitantes);
    
    // Testar modelos
    console.log('\n5. Testando GET /modelos...');
    const modelosResponse = await fetch('http://localhost:3333/modelos');
    const modelos = await modelosResponse.json();
    console.log('✅ Modelos encontrados:', modelos.length);
    console.log('Dados:', modelos);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testRelatorios();
