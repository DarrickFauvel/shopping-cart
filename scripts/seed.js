import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const now = Math.floor(Date.now() / 1000)
const kbEndsAt = now + 300   // 5 min
const mouseEndsAt = now + 600 // 10 min

await db.executeMultiple(`
  DROP TABLE IF EXISTS products;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    sale_price REAL,
    sale_ends_at INTEGER
  );

  DELETE FROM products;
`)

await db.execute({
  sql: `INSERT INTO products (id, name, description, price, sale_price, sale_ends_at) VALUES
    (1, 'Mechanical Keyboard', 'Clicky tactile switches, TKL layout', 89.99, 69.99, ?),
    (2, 'Wireless Mouse', 'Ergonomic design, 3-month battery life', 49.99, 34.99, ?),
    (3, 'USB-C Monitor', '27-inch 4K display, 60Hz refresh rate', 349.99, NULL, NULL)`,
  args: [kbEndsAt, mouseEndsAt],
})

console.log('Done — products table created and seeded.')
db.close()
