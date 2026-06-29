# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
node server.js
```

The app runs at `http://localhost:3000`.

## Architecture

Three files make up the app:

- `public/index.html` — all markup and reactive logic
- `public/style.css` — all styles (uses CSS nesting)
- `server.js` — Node.js HTTP server (serves static files + backend endpoints)

Datastar is loaded from CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"></script>
```

## Backend

`server.js` uses `@starfederation/datastar-sdk` (Node.js adapter) to handle SSE responses.

- `POST /cart/save` — reads signal state from the request body via `ServerSentEventGenerator.readSignals()`, then streams a `datastar-patch-signals` SSE event back patching `saved: true`
- All other requests are served as static files from `public/`

SSE responses must use `ServerSentEventGenerator.stream()` and `stream.patchSignals(JSON.stringify({...}))` — the SDK expects a JSON string, not an object.

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
