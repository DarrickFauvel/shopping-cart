# Shopping Cart

A reactive shopping cart built with [Datastar](https://data-star.dev) v1.0.2 and a Node.js backend.

## Running

```bash
npm install
node server.js
```

Open http://localhost:3000.

## Stack

- **Frontend** — `public/index.html` + `public/style.css`. No build step. Datastar loaded from CDN.
- **Backend** — `server.js`. Node.js HTTP server using `@starfederation/datastar-sdk` to stream SSE responses.

## Features

- Add items to cart with quantity controls
- Line totals and cart count update reactively
- Scroll-reveal animation on product cards (`data-on-intersect`)
- Sale countdown timer with color transitions (`data-on-interval`, `data-style`)
- Save Cart button posts state to the server and shows live feedback (`data-indicator`, `@post`)
