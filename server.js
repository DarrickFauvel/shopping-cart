import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import express from 'express'
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/node'

config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const app = express()
app.use(express.json())
app.use(express.static('public'))

app.get('/products', async (req, res) => {
  const { rows } = await db.execute('SELECT id, name, description, price FROM products ORDER BY id')
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    const signals = {}
    for (const row of rows) {
      const i = row.id
      signals[`name${i}`] = row.name
      signals[`description${i}`] = row.description
      signals[`price${i}`] = row.price
    }
    stream.patchSignals(JSON.stringify(signals))
  })
})

app.post('/cart/save', async (req, res) => {
  const { success, signals, error } = await ServerSentEventGenerator.readSignals(req)
  if (!success) return res.status(400).send(error)
  console.log('Cart saved:', JSON.stringify(signals))
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    stream.patchSignals(JSON.stringify({ saved: true }))
  })
})

app.listen(3000, () => console.log('Server running at http://localhost:3000'))
