import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/node'

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/cart/save') {
    const { success, signals, error } = await ServerSentEventGenerator.readSignals(req)
    if (!success) {
      res.writeHead(400)
      res.end(error)
      return
    }
    console.log('Cart saved:', JSON.stringify(signals))
    await ServerSentEventGenerator.stream(req, res, (stream) => {
      stream.patchSignals(JSON.stringify({ saved: true }))
    })
    return
  }

  const filePath = join('public', req.url === '/' ? 'index.html' : req.url)
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(3000, () => console.log('Server running at http://localhost:3000'))
