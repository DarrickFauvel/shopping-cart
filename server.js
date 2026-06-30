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
    qty INTEGER NOT NULL,
    cart_price REAL NOT NULL DEFAULT 0
  )
`)
try { await db.execute('ALTER TABLE cart ADD COLUMN cart_price REAL NOT NULL DEFAULT 0') } catch {}
try { await db.execute('ALTER TABLE products ADD COLUMN sale_price REAL') } catch {}
try { await db.execute('ALTER TABLE products ADD COLUMN sale_ends_at INTEGER') } catch {}

await db.execute(`
  CREATE TABLE IF NOT EXISTS carts (
    cart_id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'tech',
    created_at INTEGER NOT NULL
  )
`)
try { await db.execute("ALTER TABLE carts ADD COLUMN shopper_id TEXT NOT NULL DEFAULT ''") } catch {}
try { await db.execute(`ALTER TABLE cart ADD COLUMN cart_id TEXT NOT NULL DEFAULT 'default'`) } catch {}
try { await db.execute(`ALTER TABLE products ADD COLUMN type TEXT NOT NULL DEFAULT 'tech'`) } catch {}

const ADJECTIVES = ['iron', 'golden', 'swift', 'bright', 'misty', 'wild', 'fuzzy', 'cozy', 'neon', 'dusty', 'crisp', 'bold', 'silver', 'lucky', 'quirky', 'sunny', 'gentle', 'frozen', 'spicy', 'tangy', 'rusty', 'mossy', 'cloudy', 'lemon', 'toasty']
const NOUNS = ['otter', 'falcon', 'river', 'stone', 'berry', 'maple', 'cedar', 'anchor', 'ember', 'lantern', 'walnut', 'canyon', 'cobalt', 'pebble', 'goblin', 'clover', 'turnip', 'muffin', 'kettle', 'badger', 'pickle', 'satchel', 'biscuit', 'rambler', 'drifter']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

async function uniqueCartId() {
  while (true) {
    const id = `${pick(ADJECTIVES)}-${pick(NOUNS)}`
    const { rows } = await db.execute({ sql: 'SELECT 1 FROM carts WHERE cart_id = ?', args: [id] })
    if (!rows.length) return id
  }
}

const ANIMALS = ['koala', 'panda', 'gecko', 'lemur', 'moose', 'quokka', 'wombat', 'ferret', 'newt', 'sloth', 'tapir', 'capybara', 'iguana', 'manatee', 'walrus', 'narwhal', 'platypus', 'axolotl', 'numbat', 'quoll']

async function uniqueShopperId() {
  while (true) {
    const id = `${pick(ADJECTIVES)}-${pick(ANIMALS)}`
    const { rows } = await db.execute({ sql: 'SELECT 1 FROM carts WHERE cart_id = ?', args: [id] })
    if (!rows.length) return id
  }
}

const app = express()
app.use(express.static('public'))

const cartTotalHtml = (ids) => {
  const expr = ids.map(id => `($inCart${id} ? $cartPrice${id} * $qty${id} : 0)`).join(' + ')
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
      <span class="cart-item-unit" data-text="'$' + $cartPrice${id}.toFixed(2)"></span>
      <span class="cart-item-was" data-show="$originalPrice${id} > 0" data-text="'was $' + $originalPrice${id}.toFixed(2)"></span>
      <div class="cart-item-qty-control">
        <button data-on:click="$qty${id} > 1 && ($qty${id}--, @post('/cart/add/${id}'))">-</button>
        <input type="number" data-bind:qty${id} data-on:change="@post('/cart/add/${id}')" />
        <button data-on:click="$qty${id} < 10 && ($qty${id}++, @post('/cart/add/${id}'))">+</button>
      </div>
      <span class="cart-item-total" data-text="'$' + ($cartPrice${id} * $qty${id}).toFixed(2)"></span>
    </div>
  </li>`

app.get('/products', async (req, res) => {
  const { success, signals } = await ServerSentEventGenerator.readSignals(req)
  let shopperId = (success && signals?.shopperId) || ''
  const now = Math.floor(Date.now() / 1000)

  if (!shopperId) {
    shopperId = await uniqueShopperId()
    await db.execute({
      sql: `INSERT INTO carts (cart_id, type, shopper_id, created_at) VALUES (?, 'tech', ?, ?)`,
      args: [shopperId, shopperId, now],
    })
  } else {
    const { rows } = await db.execute({
      sql: `SELECT 1 FROM carts WHERE shopper_id = ? AND type = 'tech'`,
      args: [shopperId],
    })
    if (!rows.length) {
      await db.execute({
        sql: `INSERT INTO carts (cart_id, type, shopper_id, created_at) VALUES (?, 'tech', ?, ?)`,
        args: [shopperId, shopperId, now],
      })
    }
  }

  const { rows: shopperCarts } = await db.execute({
    sql: 'SELECT cart_id, type FROM carts WHERE shopper_id = ? ORDER BY created_at',
    args: [shopperId],
  })

  const incomingCartId = (success && signals?.cartId) || ''
  const activeCart = shopperCarts.find(c => c.cart_id === incomingCartId) ?? shopperCarts.find(c => c.type === 'tech')
  const cartId = activeCart?.cart_id ?? shopperId
  const cartType = activeCart?.type ?? 'tech'
  const groceriesCart = shopperCarts.find(c => c.type === 'groceries')

  const { rows: cartRows } = await db.execute({
    sql: 'SELECT product_id, qty, cart_price FROM cart WHERE cart_id = ?',
    args: [cartId],
  })

  const { rows: products } = await db.execute({
    sql: 'SELECT id, name, description, price, sale_price, sale_ends_at FROM products WHERE type = ? ORDER BY id',
    args: [cartType],
  })

  const savedCart = Object.fromEntries(cartRows.map(r => [r.product_id, { qty: r.qty, cartPrice: r.cart_price }]))

  const REINSTATE_SECS = 20
  for (const p of products) {
    if (p.sale_price != null && (p.sale_ends_at == null || p.sale_ends_at <= now)) {
      p.sale_ends_at = now + REINSTATE_SECS
      await db.execute({ sql: 'UPDATE products SET sale_ends_at = ? WHERE id = ?', args: [p.sale_ends_at, p.id] })
    }
  }

  await ServerSentEventGenerator.stream(req, res, (stream) => {
    if (!products.length) return
    const cards = products.map(p => `<product-card id="pc-${p.id}" card-id="${p.id}"></product-card>`).join('')
    stream.patchElements(cards, { selector: '#product-list', mode: 'inner' })
    const patchedSignals = { shopperId, cartId }
    if (groceriesCart) patchedSignals.groceryCartId = groceriesCart.cart_id
    let cartCount = 0
    for (const p of products) {
      const saleActive = p.sale_price != null && p.sale_ends_at != null && p.sale_ends_at > now
      patchedSignals[`name${p.id}`] = p.name
      patchedSignals[`description${p.id}`] = p.description
      patchedSignals[`price${p.id}`] = saleActive ? p.sale_price : p.price
      patchedSignals[`originalPrice${p.id}`] = saleActive ? p.price : 0
      patchedSignals[`countdown${p.id}`] = saleActive ? p.sale_ends_at - now : 0
      if (savedCart[p.id] !== undefined) {
        patchedSignals[`inCart${p.id}`] = true
        patchedSignals[`qty${p.id}`] = savedCart[p.id].qty
        patchedSignals[`cartPrice${p.id}`] = savedCart[p.id].cartPrice
        cartCount++
      } else {
        patchedSignals[`inCart${p.id}`] = false
      }
    }
    patchedSignals.cartCount = cartCount
    stream.patchSignals(JSON.stringify(patchedSignals))
    const cartItems = products.map(p => cartItemHtml(p.id)).join('')
    stream.patchElements(cartItems, { selector: '#cart-list', mode: 'inner' })
    stream.patchElements(cartTotalHtml(products.map(p => p.id)), { selector: '#cart-total', mode: 'inner' })
  })
})

app.post('/carts/new', async (req, res) => {
  const { success, signals } = await ServerSentEventGenerator.readSignals(req)
  const shopperId = (success && signals?.shopperId) || ''
  const cartId = await uniqueCartId()
  const now = Math.floor(Date.now() / 1000)
  await db.execute({
    sql: `INSERT INTO carts (cart_id, type, shopper_id, created_at) VALUES (?, 'groceries', ?, ?)`,
    args: [cartId, shopperId, now],
  })

  const { rows: products } = await db.execute(
    `SELECT id, name, description, price FROM products WHERE type = 'groceries' ORDER BY id`
  )

  await ServerSentEventGenerator.stream(req, res, (stream) => {
    stream.patchSignals(JSON.stringify({ groceryCartId: cartId, cartId }))
    const cards = products.map(p => `<product-card id="pc-${p.id}" card-id="${p.id}"></product-card>`).join('')
    stream.patchElements(cards, { selector: '#product-list', mode: 'inner' })
    const patchedSignals = { cartCount: 0 }
    for (const p of products) {
      patchedSignals[`name${p.id}`] = p.name
      patchedSignals[`description${p.id}`] = p.description
      patchedSignals[`price${p.id}`] = p.price
      patchedSignals[`originalPrice${p.id}`] = 0
      patchedSignals[`countdown${p.id}`] = 0
      patchedSignals[`inCart${p.id}`] = false
    }
    stream.patchSignals(JSON.stringify(patchedSignals))
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
    const patchedSignals = {}
    for (const p of products) {
      const saleActive = p.sale_price != null && p.sale_ends_at != null && p.sale_ends_at > now
      patchedSignals[`price${p.id}`] = saleActive ? p.sale_price : p.price
      patchedSignals[`originalPrice${p.id}`] = saleActive ? p.price : 0
      patchedSignals[`countdown${p.id}`] = saleActive ? p.sale_ends_at - now : 0
      patchedSignals[`saleRestart${p.id}`] = 0
    }
    stream.patchSignals(JSON.stringify(patchedSignals))
  })
})

app.post('/cart/add/:id', async (req, res) => {
  const { id } = req.params
  const { success, signals, error } = await ServerSentEventGenerator.readSignals(req)
  if (!success) return res.status(400).send(error)
  const qty = signals[`qty${id}`] ?? 1
  const cartPrice = signals[`cartPrice${id}`] ?? signals[`price${id}`] ?? 0
  const cartId = signals.cartId ?? 'default'
  await db.execute({
    sql: 'INSERT OR REPLACE INTO cart (product_id, qty, cart_price, cart_id) VALUES (?, ?, ?, ?)',
    args: [id, qty, cartPrice, cartId],
  })
  await ServerSentEventGenerator.stream(req, res, () => {})
})

app.delete('/cart/:id', async (req, res) => {
  const { id } = req.params
  const { success, signals } = await ServerSentEventGenerator.readSignals(req)
  const cartId = (success && signals?.cartId) ? signals.cartId : 'default'
  await db.execute({ sql: 'DELETE FROM cart WHERE product_id = ? AND cart_id = ?', args: [id, cartId] })
  await ServerSentEventGenerator.stream(req, res, () => {})
})

app.delete('/cart', async (req, res) => {
  const { success, signals } = await ServerSentEventGenerator.readSignals(req)
  const cartId = (success && signals?.cartId) ? signals.cartId : 'default'
  const { rows: cartRows } = await db.execute({
    sql: 'SELECT product_id FROM cart WHERE cart_id = ?',
    args: [cartId],
  })
  await db.execute({ sql: 'DELETE FROM cart WHERE cart_id = ?', args: [cartId] })
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    const patchedSignals = { cartCount: 0 }
    for (const r of cartRows) patchedSignals[`cartHiding${r.product_id}`] = true
    stream.patchSignals(JSON.stringify(patchedSignals))
  })
})

app.listen(3000, () => console.log('Server running at http://localhost:3000'))
