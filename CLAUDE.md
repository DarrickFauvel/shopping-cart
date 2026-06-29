# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
npm install
node scripts/seed.js   # first time only
npm start
```

The app runs at `http://localhost:3000`. Requires a `.env` file with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Architecture

- `public/index.html` — all markup and reactive logic
- `public/style.css` — all styles (uses CSS nesting)
- `server.js` — Express server (static files + SSE endpoints)
- `scripts/seed.js` — creates and seeds the `products` table in Turso

Datastar is loaded from CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"></script>
```

## Backend

`server.js` uses Express + `@starfederation/datastar-sdk` (Node.js adapter) + `@libsql/client` for Turso.

| Route | Method | What it does |
|---|---|---|
| `/products` | GET | Queries Turso, patches `name/description/price` signals for all cards via SSE |
| `/products/add` | POST | Reads form signals, inserts into Turso, patches new signals + prepends `<product-card>` via `patchElements` |
| `/cart/save` | POST | Reads signal state, logs it, patches `saved: true` via SSE |

**Key SDK gotcha:** `stream.patchSignals()` expects a JSON string, not an object:
```js
stream.patchSignals(JSON.stringify({ key: value }))
```

**Key HTML gotcha:** Use `data-init="@get('/products')"` on `<body>` to fetch on load — `data-on:load` misses the event because Datastar's module script defers past it.

## Web component

`public/product-card.js` defines a `<product-card card-id="N">` light DOM custom element. It must be loaded **before** Datastar's script so `connectedCallback` renders the card's HTML before Datastar initializes.

`data-signals` in the component declares all per-card state including `name/description/price` (as empty/zero defaults). The server populates them via `patchSignals`.

When `patchElements` prepends a new `<product-card>`, the browser fires `connectedCallback`, which sets `innerHTML`. Datastar picks up the new reactive attributes via MutationObserver. The `/products/add` endpoint sends `patchElements` first (so `connectedCallback` sets safe defaults), then `patchSignals` overrides with the real values.

**Key gotcha:** `express.json()` middleware consumes the request body stream before `readSignals` can read it, causing the handler to hang. Do not use `express.json()` on routes that call `readSignals`.

## Datastar patterns used

Datastar drives all interactivity via HTML attributes:

| Attribute | Purpose |
|---|---|
| `data-signals="{key: value}"` | Declares reactive state on an element (scoped to that element and its descendants) |
| `data-computed:signal-name="expr"` | Derived value that recomputes when dependencies change (kebab-case attribute → camelCase signal) |
| `data-text="expr"` | Sets element text content from an expression |
| `data-bind:signalName` | Two-way binding between a signal and an `<input>` value |
| `data-on:click="expr"` | Inline event handler expression |
| `data-attr:attrName="expr"` | Sets an HTML attribute dynamically |
| `data-json-signals=""` | Debug attribute that renders all current signal state as JSON |
| `data-show="expr"` | Toggles element visibility based on a boolean expression |
| `data-class="{cls: expr}"` | Conditionally applies CSS classes (object form toggles multiple classes) |
| `data-init="expr"` | Runs once when the element initializes |
| `data-effect="expr"` | Runs on load and re-runs whenever referenced signals change |
| `data-ref:name` | Stores a DOM element reference in a signal (pre-declare as `null` in `data-signals`) |
| `data-on-intersect__once="expr"` | Fires when element enters viewport (once); modifiers: `__half`, `__full`, `__exit` |
| `data-on-interval="expr"` | Runs on a 1s repeating timer; use `__duration.2s` / `__duration.500ms` to change interval |
| `data-style:prop="expr"` | Sets an inline CSS property dynamically |
| `data-indicator:name` | Creates a signal that is `true` while an SSE request is in flight |
| `@post('/url')` | Action used in `data-on` expressions to POST signals to a backend SSE endpoint |

Signals are referenced in expressions with a `$` prefix (e.g., `$cartCount`, `$price1`).

## Signal scope and naming

- The global `cartCount` signal is declared on `<body>` and shared across all product cards.
- Each product card uses per-product suffixed signals (`name1`, `price1`, `qty1`, `inCart1`, etc.) to avoid collisions — there is no looping/templating, each card is hand-written.
- Computed signals use kebab-case in the attribute (`data-computed:line-total1`) and camelCase in expressions (`$lineTotal1`).

## Custom slash commands

- `/ship` — creates a feature branch, commits, pushes, opens a PR, and squash-merges it. Defined in `.claude/commands/ship.md`.
