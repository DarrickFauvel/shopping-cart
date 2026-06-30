import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import express from 'express'
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/node'

config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS cart (
    product_id INTEGER PRIMARY KEY,
    qty INTEGER NOT NULL
  )
`)

const app = express()
app.use(express.static('public'))

const cartTotalHtml = (ids) => {
  const expr = ids.map(id => `($inCart${id} ? $price${id} * $qty${id} : 0)`).join(' + ')
  return `<span class="cart-total" data-show="$cartCount" data-text="'Total: $' + (${expr}).toFixed(2)"></span>`
}

const cartItemHtml = (id) =>
  `<li id="cart-item-${id}" class="cart-item" data-show="$inCart${id}">
    <span class="cart-item-name" data-text="$name${id}"></span>
    <span class="cart-item-unit" data-text="'$' + $price${id}.toFixed(2)"></span>
    <span class="cart-item-qty" data-text="'× ' + $qty${id}"></span>
    <span class="cart-item-total" data-text="'$' + ($price${id} * $qty${id}).toFixed(2)"></span>
  </li>`

app.get('/products', async (req, res) => {
  const [{ rows: products }, { rows: cartRows }] = await Promise.all([
    db.execute('SELECT id, name, description, price FROM products ORDER BY id'),
    db.execute('SELECT product_id, qty FROM cart'),
  ])
  const savedCart = Object.fromEntries(cartRows.map(r => [r.product_id, r.qty]))

  await ServerSentEventGenerator.stream(req, res, (stream) => {
    if (!products.length) return
    const cards = products.map(p => `<product-card card-id="${p.id}"></product-card>`).join('')
    stream.patchElements(cards, { selector: '#product-list', mode: 'inner' })
    const signals = {}
    let cartCount = 0
    for (const p of products) {
      signals[`name${p.id}`] = p.name
      signals[`description${p.id}`] = p.description
      signals[`price${p.id}`] = p.price
      if (savedCart[p.id] !== undefined) {
        signals[`inCart${p.id}`] = true
        signals[`qty${p.id}`] = savedCart[p.id]
        cartCount++
      }
    }
    signals.cartCount = cartCount
    stream.patchSignals(JSON.stringify(signals))
    const cartItems = products.map(p => cartItemHtml(p.id)).join('')
    stream.patchElements(cartItems, { selector: '#cart-list', mode: 'inner' })
    stream.patchElements(cartTotalHtml(products.map(p => p.id)), { selector: '#cart-total', mode: 'inner' })
  })
})

app.post('/products/add', async (req, res) => {
  const { success, signals, error } = await ServerSentEventGenerator.readSignals(req)
  if (!success) return res.status(400).send(error)

  const { newName, newDescription, newPrice } = signals
  const result = await db.execute({
    sql: 'INSERT INTO products (name, description, price) VALUES (?, ?, ?) RETURNING id',
    args: [newName, newDescription, Number(newPrice)],
  })
  const id = result.rows[0].id

  const { rows: allProducts } = await db.execute('SELECT id FROM products')

  await ServerSentEventGenerator.stream(req, res, (stream) => {
    stream.patchElements(`<product-card card-id="${id}"></product-card>`, {
      selector: '#product-list',
      mode: 'prepend',
    })
    stream.patchSignals(JSON.stringify({
      [`name${id}`]: newName,
      [`description${id}`]: newDescription,
      [`price${id}`]: Number(newPrice),
      newName: '',
      newDescription: '',
      newPrice: 0,
    }))
    stream.patchElements(cartItemHtml(id), { selector: '#cart-list', mode: 'prepend' })
    stream.patchElements(cartTotalHtml(allProducts.map(p => p.id)), { selector: '#cart-total', mode: 'inner' })
  })
})

app.post('/cart/add/:id', async (req, res) => {
  const { id } = req.params
  const { success, signals, error } = await ServerSentEventGenerator.readSignals(req)
  if (!success) return res.status(400).send(error)
  const qty = signals[`qty${id}`] ?? 1
  await db.execute({
    sql: 'INSERT OR REPLACE INTO cart (product_id, qty) VALUES (?, ?)',
    args: [id, qty],
  })
  await ServerSentEventGenerator.stream(req, res, () => {})
})

app.delete('/cart/:id', async (req, res) => {
  const { id } = req.params
  await db.execute({ sql: 'DELETE FROM cart WHERE product_id = ?', args: [id] })
  await ServerSentEventGenerator.stream(req, res, () => {})
})

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params
  await Promise.all([
    db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] }),
    db.execute({ sql: 'DELETE FROM cart WHERE product_id = ?', args: [id] }),
  ])
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    stream.patchElements('', { selector: `product-card[card-id="${id}"]`, mode: 'remove' })
    stream.patchElements('', { selector: `#cart-item-${id}`, mode: 'remove' })
  })
})

const SEED_PRODUCTS = [
  { id: 1, name: 'Mechanical Keyboard', description: 'Clicky tactile switches, TKL layout', price: 89.99 },
  { id: 2, name: 'Wireless Mouse', description: 'Ergonomic design, 3-month battery life', price: 49.99 },
  { id: 3, name: 'USB-C Monitor', description: '27-inch 4K display, 60Hz refresh rate', price: 349.99 },
]

app.post('/db/reseed', async (req, res) => {
  await db.executeMultiple(`
    DELETE FROM cart;
    DELETE FROM products;
    INSERT INTO products (id, name, description, price) VALUES
      (1, 'Mechanical Keyboard', 'Clicky tactile switches, TKL layout', 89.99),
      (2, 'Wireless Mouse', 'Ergonomic design, 3-month battery life', 49.99),
      (3, 'USB-C Monitor', '27-inch 4K display, 60Hz refresh rate', 349.99);
  `)
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    const cards = SEED_PRODUCTS.map(p => `<product-card card-id="${p.id}"></product-card>`).join('')
    stream.patchElements(cards, { selector: '#product-list', mode: 'inner' })
    const signals = { reseedConfirming: false, cartCount: 0 }
    for (const p of SEED_PRODUCTS) {
      signals[`name${p.id}`] = p.name
      signals[`description${p.id}`] = p.description
      signals[`price${p.id}`] = p.price
      signals[`inCart${p.id}`] = false
      signals[`qty${p.id}`] = 1
      signals[`countdown${p.id}`] = 300
      signals[`confirming${p.id}`] = false
    }
    stream.patchSignals(JSON.stringify(signals))
    const cartItems = SEED_PRODUCTS.map(p => cartItemHtml(p.id)).join('')
    stream.patchElements(cartItems, { selector: '#cart-list', mode: 'inner' })
    stream.patchElements(cartTotalHtml(SEED_PRODUCTS.map(p => p.id)), { selector: '#cart-total', mode: 'inner' })
  })
})


app.listen(3000, () => console.log('Server running at http://localhost:3000'))
