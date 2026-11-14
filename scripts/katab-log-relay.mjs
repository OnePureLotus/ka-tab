/**
 * Receives POST /log from KaTab extension → append `.logs/katab-favicon.log`
 * Run: npm run log:relay
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 39281
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const logDir = path.join(root, '.logs')
const logFile = path.join(logDir, 'katab-favicon.log')

fs.mkdirSync(logDir, { recursive: true })

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('ok\n')
    return
  }

  if (req.method === 'POST' && req.url === '/log') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      if (body) fs.appendFileSync(logFile, body, 'utf8')
      res.writeHead(204)
      res.end()
    })
    req.on('error', () => {
      res.writeHead(500)
      res.end()
    })
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, '127.0.0.1', () => {
  const stamp = new Date().toISOString()
  fs.appendFileSync(logFile, `${stamp} [RELAY] listening http://127.0.0.1:${PORT}/log\n`, 'utf8')
  console.log(`[katab-log-relay] http://127.0.0.1:${PORT}/log → ${logFile}`)
})