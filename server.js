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

try { await db.execute('ALTER TABLE products ADD COLUMN sale_price REAL') } catch {}
try { await db.execute('ALTER TABLE products ADD COLUMN sale_ends_at INTEGER') } catch {}

const app = express()
app.use(express.static('public'))

const cartTotalHtml = (ids) => {
  const expr = ids.map(id => `($inCart${id} ? $price${id} * $qty${id} : 0)`).join(' + ')
  return `<span class="cart-total" data-class="{shown: $cartCount}" data-text="'Total: $' + (${expr}).toFixed(2)"></span>`
}

const cartItemHtml = (id) =>
  `<li id="cart-item-${id}" class="cart-item"
    data-signals__ifmissing="{cartHiding${id}: false}"
    data-class="{hidden: !$inCart${id} || $cartHiding${id}}"
    data-on:transitionend="$cartHiding${id} && ($inCart${id} = false, $cartHiding${id} = false)"
  >
    <div class="cart-item-header">
      <span class="cart-item-name" data-text="$name${id}"></span>
      <button class="cart-item-remove" data-on:click="$cartCount--, $inCart${id} = false, @delete('/cart/${id}')" aria-label="Remove from cart"><svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg><span class="cart-item-tooltip">Remove from cart</span></button>
    </div>
    <div class="cart-item-controls">
      <span class="sale-chip" data-show="$originalPrice${id} > 0">SALE</span>
      <span class="cart-item-unit" data-text="'$' + $price${id}.toFixed(2)"></span>
      <span class="cart-item-was" data-show="$originalPrice${id} > 0" data-text="'was $' + $originalPrice${id}.toFixed(2)"></span>
      <div class="cart-item-qty-control">
        <button data-on:click="$qty${id} > 1 && ($qty${id}--, @post('/cart/add/${id}'))">-</button>
        <input type="number" data-bind:qty${id} data-on:change="@post('/cart/add/${id}')" />
        <button data-on:click="$qty${id} < 10 && ($qty${id}++, @post('/cart/add/${id}'))">+</button>
      </div>
      <span class="cart-item-total" data-text="'$' + ($price${id} * $qty${id}).toFixed(2)"></span>
    </div>
  </li>`

app.get('/products', async (req, res) => {
  const [{ rows: products }, { rows: cartRows }] = await Promise.all([
    db.execute('SELECT id, name, description, price, sale_price, sale_ends_at FROM products ORDER BY id'),
    db.execute('SELECT product_id, qty FROM cart'),
  ])
  const savedCart = Object.fromEntries(cartRows.map(r => [r.product_id, r.qty]))

  // Auto-reinstate expired sales for demo (2-min countdown)
  const now = Math.floor(Date.now() / 1000)
  const REINSTATE_SECS = 20
  for (const p of products) {
    if (p.sale_price != null && (p.sale_ends_at == null || p.sale_ends_at <= now)) {
      p.sale_ends_at = now + REINSTATE_SECS
      await db.execute({ sql: 'UPDATE products SET sale_ends_at = ? WHERE id = ?', args: [p.sale_ends_at, p.id] })
    }
  }

  await ServerSentEventGenerator.stream(req, res, (stream) => {
    if (!products.length) return
    const cards = products.map(p => `<product-card card-id="${p.id}"></product-card>`).join('')
    stream.patchElements(cards, { selector: '#product-list', mode: 'inner' })
    const signals = {}
    let cartCount = 0
    for (const p of products) {
      const saleActive = p.sale_price != null && p.sale_ends_at != null && p.sale_ends_at > now
      signals[`name${p.id}`] = p.name
      signals[`description${p.id}`] = p.description
      signals[`price${p.id}`] = saleActive ? p.sale_price : p.price
      signals[`originalPrice${p.id}`] = saleActive ? p.price : 0
      signals[`countdown${p.id}`] = saleActive ? p.sale_ends_at - now : 0
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


app.get('/products/refresh', async (req, res) => {
  const { rows: products } = await db.execute('SELECT id, price, sale_price, sale_ends_at FROM products ORDER BY id')
  const now = Math.floor(Date.now() / 1000)
  const REINSTATE_SECS = 20
  for (const p of products) {
    if (p.sale_price != null && (p.sale_ends_at == null || p.sale_ends_at <= now)) {
      p.sale_ends_at = now + REINSTATE_SECS
      await db.execute({ sql: 'UPDATE products SET sale_ends_at = ? WHERE id = ?', args: [p.sale_ends_at, p.id] })
    }
  }
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    const signals = {}
    for (const p of products) {
      const saleActive = p.sale_price != null && p.sale_ends_at != null && p.sale_ends_at > now
      signals[`price${p.id}`] = saleActive ? p.sale_price : p.price
      signals[`originalPrice${p.id}`] = saleActive ? p.price : 0
      signals[`countdown${p.id}`] = saleActive ? p.sale_ends_at - now : 0
      signals[`saleRestart${p.id}`] = 0
    }
    stream.patchSignals(JSON.stringify(signals))
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

app.delete('/cart', async (req, res) => {
  const { rows: cartRows } = await db.execute('SELECT product_id FROM cart')
  await db.execute('DELETE FROM cart')
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    const signals = { cartCount: 0 }
    for (const r of cartRows) signals[`cartHiding${r.product_id}`] = true
    stream.patchSignals(JSON.stringify(signals))
  })
})


app.listen(3000, () => console.log('Server running at http://localhost:3000'))
