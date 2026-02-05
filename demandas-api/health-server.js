/**
 * Servidor mínimo APENAS para passar o healthcheck do Railway.
 * Inclui CORS para evitar erro caso este servidor rode em vez da API completa.
 */
const http = require('http')
const port = Number(process.env.PORT) || 3333

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, Accept, X-Requested-With',
  'Access-Control-Max-Age': '86400'
}

const server = http.createServer((req, res) => {
  // CORS preflight - responder sempre com headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.url === '/health' || req.url?.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }
  res.writeHead(404)
  res.end()
})
server.listen(port, '0.0.0.0', () => {
  console.log('Health server listening on', port)
})
server.on('error', (err) => {
  console.error('Health server error:', err)
  process.exit(1)
})
