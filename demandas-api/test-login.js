const http = require('http');

const postData = JSON.stringify({
  email: 'admin@admin.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3333,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta completa:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200) {
        console.log('✅ Login bem-sucedido!');
        console.log(`Token: ${response.token ? 'Sim' : 'Não'}`);
        console.log(`Usuário: ${response.user ? response.user.name : 'Não'}`);
      } else {
        console.log('❌ Login falhou!');
      }
    } catch (e) {
      console.log('Resposta não é JSON válido:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.write(postData);
req.end();

console.log('🔐 Testando login com admin@admin.com / admin123...');
