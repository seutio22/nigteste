const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 Testando API de compartilhamento...');
    
    // Testar se o servidor está rodando
    console.log('1️⃣ Testando health check...');
    const healthResponse = await fetch('http://localhost:3333/health');
    if (healthResponse.ok) {
      console.log('✅ Servidor rodando');
    } else {
      console.log('❌ Servidor não responde');
      return;
    }
    
    // Testar se conseguimos listar projetos
    console.log('2️⃣ Testando listagem de projetos...');
    const projectsResponse = await fetch('http://localhost:3333/projects');
    if (projectsResponse.ok) {
      const projects = await projectsResponse.json();
      console.log(`✅ Projetos encontrados: ${projects.length}`);
      
      if (projects.length > 0) {
        const project = projects[0];
        console.log(`📋 Projeto: ${project.name} (ID: ${project.id})`);
        
        // Testar rota de compartilhamento
        console.log('3️⃣ Testando rota de compartilhamento...');
        const shareResponse = await fetch(`http://localhost:3333/projects/${project.id}/share`);
        
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          console.log('✅ Rota de compartilhamento funcionando:', shareData);
        } else {
          const errorData = await shareResponse.text();
          console.log(`❌ Erro na rota de compartilhamento: ${shareResponse.status} - ${errorData}`);
        }
        
        // Testar criação de token
        console.log('4️⃣ Testando criação de token...');
        const createResponse = await fetch(`http://localhost:3333/projects/${project.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Teste API',
            description: 'Teste via API'
          })
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Token criado com sucesso:', createData);
        } else {
          const errorData = await createResponse.text();
          console.log(`❌ Erro ao criar token: ${createResponse.status} - ${errorData}`);
        }
      }
    } else {
      console.log('❌ Erro ao listar projetos:', projectsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAPI();
