# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

This is a static site with no build step. Serve the `public/` directory with any HTTP server:

```bash
npx serve public
```

The app runs at `http://localhost:3000` (or whatever port `serve` picks).

## Architecture

Two files make up the entire app:

- `public/index.html` — all markup and reactive logic
- `public/style.css` — all styles (uses CSS nesting)

There is no backend, no bundler, and no npm dependencies. Datastar is loaded from CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"></script>
```

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

Signals are referenced in expressions with a `$` prefix (e.g., `$cartCount`, `$price1`).

## Signal scope and naming

- The global `cartCount` signal is declared on `<body>` and shared across all product cards.
- Each product card uses per-product suffixed signals (`name1`, `price1`, `qty1`, `inCart1`, etc.) to avoid collisions — there is no looping/templating, each card is hand-written.
- Computed signals use kebab-case in the attribute (`data-computed:line-total1`) and camelCase in expressions (`$lineTotal1`).

## Custom slash commands

- `/ship` — creates a feature branch, commits, pushes, opens a PR, and squash-merges it. Defined in `.claude/commands/ship.md`.
