import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL
  );

  DELETE FROM products;

  INSERT INTO products (id, name, description, price) VALUES
    (1, 'Mechanical Keyboard', 'Clicky tactile switches, TKL layout', 89.99),
    (2, 'Wireless Mouse', 'Ergonomic design, 3-month battery life', 49.99),
    (3, 'USB-C Monitor', '27-inch 4K display, 60Hz refresh rate', 349.99);
`)

console.log('Done — products table created and seeded.')
db.close()
