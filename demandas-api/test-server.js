const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Servidor funcionando!' }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Servidor de Teste Funcionando!</h1>');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 4000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('❌ Erro no servidor:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('⚠️  Porta 4000 já está em uso!');
  }
});
