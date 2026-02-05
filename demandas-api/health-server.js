/**
 * Servidor mínimo APENAS para passar o healthcheck do Railway.
 * Se este funcionar, o problema está no server.ts principal.
 */
const http = require('http')
const port = Number(process.env.PORT) || 3333
const server = http.createServer((req, res) => {
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
