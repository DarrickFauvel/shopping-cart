class PortfolioDrawer extends HTMLElement {
  #open = false
  #populated = false

  connectedCallback() {
    const scriptEl = this.querySelector('script[type="application/json"]')
    this._configItems = scriptEl ? JSON.parse(scriptEl.textContent) : []

    this._onKeyDown = (e) => { if (e.key === 'Escape' && this.#open) this._close() }
    this._onOutsideClick = (e) => { if (this.#open && !e.composedPath().includes(this)) this._close() }

    const shadow = this.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; }

        :host {
          all: initial;
          display: block;
          font-family: system-ui, sans-serif;
        }

        .handle {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.5rem 1.25rem;
          border-radius: 10px 10px 0 0;
          background: #13121f;
          border: 1px solid #3730a3;
          border-bottom: none;
          color: #c4b5fd;
          font-size: 0.8rem;
          font-family: system-ui, sans-serif;
          cursor: pointer;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          box-shadow: 0 -4px 20px rgba(99, 102, 241, 0.2);
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .handle:hover {
          background: #1c1b2e;
          border-color: #6366f1;
          box-shadow: 0 -4px 24px rgba(99, 102, 241, 0.35);
        }
        .handle-icon {
          color: #6366f1;
          font-size: 0.75rem;
        }
        .chevron {
          width: 7px;
          height: 7px;
          border-right: 2px solid #6366f1;
          border-bottom: 2px solid #6366f1;
          transform: rotate(45deg);
          transition: transform 0.3s ease;
          margin-bottom: 3px;
          flex-shrink: 0;
        }
        .handle.open .chevron {
          transform: rotate(-135deg);
          margin-bottom: -2px;
        }

        .drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          background: rgba(10, 9, 18, 0.97);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 2px solid #6366f1;
          border-radius: 16px 16px 0 0;
          padding: 1.25rem 1.5rem 3rem;
          max-height: 360px;
          overflow-y: auto;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: system-ui, sans-serif;
        }
        .drawer.open {
          transform: translateY(0);
        }
        .drawer::-webkit-scrollbar { width: 4px; }
        .drawer::-webkit-scrollbar-track { background: transparent; }
        .drawer::-webkit-scrollbar-thumb { background: #2e2b4a; border-radius: 2px; }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #1e1b4b;
        }
        .drawer-title {
          color: #e8e6f0;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .drawer-title-icon {
          color: #6366f1;
        }
        .close-btn {
          background: transparent;
          border: 1px solid #2e2b4a;
          color: #8b87a8;
          font-size: 0.9rem;
          cursor: pointer;
          line-height: 1;
          padding: 0.2rem 0.45rem;
          border-radius: 6px;
          font-family: system-ui, sans-serif;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .close-btn:hover {
          color: #e8e6f0;
          background: #1c1b2e;
          border-color: #4f46e5;
        }

        .chips {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          gap: 0.55rem;
        }
        .chip {
          background: linear-gradient(135deg, #1c1b2e, #16152a);
          border: 1px solid #2e2b4a;
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .chip:hover {
          border-color: #4f46e5;
          box-shadow: 0 0 0 1px #4f46e530;
        }
        .chip-label {
          color: #e8e6f0;
          font-size: 0.79rem;
          font-weight: 600;
        }
        .chip-note {
          color: #8b87a8;
          font-size: 0.71rem;
          margin-top: 0.2rem;
          line-height: 1.3;
        }
      </style>

      <button class="handle" aria-expanded="false" aria-controls="pd-drawer">
        <span class="handle-icon">✦</span>
        <span>Built with</span>
        <span class="chevron"></span>
      </button>

      <div class="drawer" id="pd-drawer" role="region" aria-label="Tech stack">
        <div class="drawer-header">
          <span class="drawer-title">
            <span class="drawer-title-icon">✦</span>
            Built with
          </span>
          <button class="close-btn" aria-label="Close">✕</button>
        </div>
        <div class="chips"></div>
      </div>
    `

    const handle = shadow.querySelector('.handle')
    const closeBtn = shadow.querySelector('.close-btn')

    handle.addEventListener('click', () => this._toggle())
    closeBtn.addEventListener('click', () => this._close())

    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('click', this._onOutsideClick)
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('click', this._onOutsideClick)
  }

  _toggle() {
    this.#open ? this._close() : this._open()
  }

  _open() {
    if (!this.#populated) {
      this._populate()
      this.#populated = true
    }
    const s = this.shadowRoot
    const handle = s.querySelector('.handle')
    handle.classList.add('open')
    handle.setAttribute('aria-expanded', 'true')
    s.querySelector('.drawer').classList.add('open')
    this.#open = true
  }

  _close() {
    const s = this.shadowRoot
    const handle = s.querySelector('.handle')
    handle.classList.remove('open')
    handle.setAttribute('aria-expanded', 'false')
    s.querySelector('.drawer').classList.remove('open')
    this.#open = false
  }

  _populate() {
    const detected = this._detectTech()
    const detectedLabels = new Set(detected.map(i => i.label.toLowerCase()))
    const all = [
      ...detected,
      ...this._configItems.filter(i => !detectedLabels.has(i.label.toLowerCase())),
    ]

    this.shadowRoot.querySelector('.chips').innerHTML = all
      .map(({ label, note }) => `
        <div class="chip">
          <div class="chip-label">${this._esc(label)}</div>
          ${note ? `<div class="chip-note">${this._esc(note)}</div>` : ''}
        </div>`)
      .join('')
  }

  _detectTech() {
    const items = []
    const srcs = [...document.querySelectorAll('script[src]')].map(s => s.src.toLowerCase())

    const cdnMap = [
      { match: 'datastar',   label: 'Datastar',       note: 'Reactive UI via SSE'     },
      { match: 'react',      label: 'React',           note: 'UI component library'    },
      { match: 'vue',        label: 'Vue',             note: 'Progressive framework'   },
      { match: 'alpine',     label: 'Alpine.js',       note: 'Lightweight reactivity'  },
      { match: 'htmx',       label: 'HTMX',            note: 'HTML hypermedia'         },
      { match: 'tailwind',   label: 'Tailwind CSS',    note: 'Utility-first CSS'       },
      { match: 'bootstrap',  label: 'Bootstrap',       note: 'CSS framework'           },
      { match: 'three',      label: 'Three.js',        note: '3D rendering'            },
      { match: 'gsap',       label: 'GSAP',            note: 'Animation library'       },
      { match: 'svelte',     label: 'Svelte',          note: 'Compiled UI framework'   },
      { match: 'solid-js',   label: 'Solid.js',        note: 'Fine-grained reactivity' },
      { match: '/lit',       label: 'Lit',             note: 'Web component library'   },
    ]
    for (const { match, label, note } of cdnMap) {
      if (srcs.some(s => s.includes(match))) items.push({ label, note })
    }

    // Web components in use
    const customTags = [...new Set(
      [...document.querySelectorAll('*')]
        .map(el => el.tagName.toLowerCase())
        .filter(t => t.includes('-') && t !== 'portfolio-drawer'),
    )]
    if (customTags.length) {
      items.push({ label: 'Web Components', note: customTags.join(', ') })
    }

    // CSS custom properties (:root rule present)
    try {
      const hasCSSVars = [...document.styleSheets].some(ss => {
        try { return [...ss.cssRules].some(r => r.selectorText === ':root') }
        catch { return false }
      })
      if (hasCSSVars) items.push({ label: 'CSS Custom Properties', note: 'Design tokens + theming' })
    } catch {}

    // SSE / Datastar usage (data-init attribute)
    if (document.querySelector('[data-init]')) {
      items.push({ label: 'Server-Sent Events', note: 'Real-time server push' })
    }

    return items
  }

  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
}

customElements.define('portfolio-drawer', PortfolioDrawer)
