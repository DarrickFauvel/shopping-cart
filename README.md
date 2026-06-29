# Shopping Cart

A reactive shopping cart built with [Datastar](https://data-star.dev) v1.0.2 and a Node.js backend.

## Setup

```bash
npm install
```

Create a `.env` file with your Turso credentials:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

Seed the database:

```bash
node scripts/seed.js
```

Start the server:

```bash
npm start
```

Open http://localhost:3000.

## Stack

- **Frontend** — `public/index.html` + `public/style.css`. No build step. Datastar loaded from CDN.
- **Backend** — `server.js`. Express server using `@starfederation/datastar-sdk` to stream SSE responses.
- **Database** — [Turso](https://turso.tech) (libSQL). Products stored in a `products` table.

## Features

- Products loaded from Turso on page init via SSE signal patch
- Add items to cart with quantity controls
- Line totals and cart count update reactively
- Scroll-reveal animation on product cards (`data-on-intersect`)
- Sale countdown timer with color transitions (`data-on-interval`, `data-style`)
- Save Cart button posts state to the server and shows live feedback (`data-indicator`, `@post`)
