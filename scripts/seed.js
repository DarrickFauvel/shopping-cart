import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const now = Math.floor(Date.now() / 1000)
const kbEndsAt = now + 60       // 1 min
const mouseEndsAt = now + 90    // 1.5 min
const milkEndsAt = now + 75     // 1.25 min
const breadEndsAt = now + 105   // 1.75 min

await db.executeMultiple(`
  DROP TABLE IF EXISTS products;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    sale_price REAL,
    sale_ends_at INTEGER,
    type TEXT NOT NULL DEFAULT 'tech'
  );

  DELETE FROM products;
`)

await db.execute({
  sql: `INSERT INTO products (id, name, description, price, sale_price, sale_ends_at, type) VALUES
    (1, 'Mechanical Keyboard', 'Clicky tactile switches, TKL layout',       89.99, 69.99, ?, 'tech'),
    (2, 'Wireless Mouse',      'Ergonomic design, 3-month battery life',    49.99, 34.99, ?, 'tech'),
    (3, 'USB-C Monitor',       '27-inch 4K display, 60Hz refresh rate',    349.99, NULL,  NULL, 'tech'),
    (4, 'Whole Milk',          'Organic, 1 gallon, grass-fed',               5.49, 3.99, ?, 'groceries'),
    (5, 'Free-Range Eggs',     'One dozen, cage-free, Grade A',              6.99, NULL, NULL, 'groceries'),
    (6, 'Sourdough Bread',     'Artisan loaf, stone-baked',                  7.49, 5.49, ?, 'groceries')`,
  args: [kbEndsAt, mouseEndsAt, milkEndsAt, breadEndsAt],
})

// Reset carts and cart items for a clean demo
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS carts (
    cart_id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'tech',
    shopper_id TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  DELETE FROM carts;

  CREATE TABLE IF NOT EXISTS cart (
    product_id INTEGER PRIMARY KEY,
    qty INTEGER NOT NULL,
    cart_price REAL NOT NULL DEFAULT 0,
    cart_id TEXT NOT NULL DEFAULT 'default'
  );

  DELETE FROM cart;
`)

console.log('Done — products, carts, and cart tables seeded.')
db.close()
