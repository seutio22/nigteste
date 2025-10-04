// Script para configurar usuários no banco de dados
const https = require('https');

async function setupUsers() {
  console.log('🔧 Configurando usuários no banco de dados...');
  
  const users = [
    {
      name: 'Administrador',
      email: 'admin@admin.com',
      password: '123456',
      role: 'admin'
    },
    {
      name: 'Gerente Teste',
      email: 'gerente@teste.com',
      password: '123456',
      role: 'gerente'
    },
    {
      name: 'Analista Teste',
      email: 'analista@teste.com',
      password: '123456',
      role: 'analista'
    },
    {
      name: 'Solicitante Teste',
      email: 'solicitante@teste.com',
      password: '123456',
      role: 'solicitante'
    }
  ];
  
  for (const user of users) {
    try {
      console.log(`📝 Criando usuário: ${user.name} (${user.role})`);
      const result = await createUser(user);
      console.log(`✅ Usuário criado: ${result.user.name} (ID: ${result.user.id})`);
    } catch (error) {
      console.log(`❌ Erro ao criar usuário ${user.name}: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Verificando usuários criados...');
  try {
    const users = await getUsers();
    console.log(`📊 Total de usuários: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
    });
  } catch (error) {
    console.log(`❌ Erro ao listar usuários: ${error.message}`);
  }
}

function createUser(userData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(userData);
    
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: '/setup-admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getUsers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nigteste-production.up.railway.app',
      port: 443,
      path: '/usuarios-publicos',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

setupUsers().catch(console.error);
