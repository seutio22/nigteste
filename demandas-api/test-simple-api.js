const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3333,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAPI() {
  try {
    console.log('🔍 Testando API de compartilhamento...');
    
    // Testar health check
    console.log('1️⃣ Testando health check...');
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('✅ Servidor rodando');
    } else {
      console.log('❌ Servidor não responde');
      return;
    }
    
    // Testar listagem de projetos
    console.log('2️⃣ Testando listagem de projetos...');
    const projects = await makeRequest('/projects');
    if (projects.status === 200) {
      console.log(`✅ Projetos encontrados: ${projects.data.length}`);
      
      if (projects.data.length > 0) {
        const project = projects.data[0];
        console.log(`📋 Projeto: ${project.name} (ID: ${project.id})`);
        
        // Testar rota de compartilhamento
        console.log('3️⃣ Testando rota de compartilhamento...');
        const share = await makeRequest(`/projects/${project.id}/share`);
        
        if (share.status === 200) {
          console.log('✅ Rota de compartilhamento funcionando:', share.data);
        } else {
          console.log(`❌ Erro na rota de compartilhamento: ${share.status} - ${share.data}`);
        }
        
        // Testar criação de token
        console.log('4️⃣ Testando criação de token...');
        const create = await makeRequest(`/projects/${project.id}/share`, 'POST', {
          name: 'Teste API',
          description: 'Teste via API'
        });
        
        if (create.status === 200) {
          console.log('✅ Token criado com sucesso:', create.data);
        } else {
          console.log(`❌ Erro ao criar token: ${create.status} - ${create.data}`);
        }
      }
    } else {
      console.log('❌ Erro ao listar projetos:', projects.status);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAPI();
