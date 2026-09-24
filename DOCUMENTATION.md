# CareBridge — Developer Documentation

AI-powered communication layer between patients and healthcare workers. React + Vite + TypeScript + Tailwind CSS, packaged as a Progressive Web App (PWA).

## Requirements

| Tool | Notes |
|------|--------|
| **[Bun](https://bun.sh)** ≥ 1.1 | Package manager and script runner. **Do not use npm, yarn, or pnpm.** |
| Node.js (optional) | Only if your editor/tools expect Node; Vite runs under Bun fine. |

Install Bun:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Getting started

```bash
bun install          # install dependencies (creates/updates bun.lock)
bun run dev          # start dev server → http://localhost:3000
```

There is **no** `package-lock.json`. Never commit npm/yarn/pnpm lockfiles.

## Scripts

All scripts run via Bun:

| Command | What it does |
|---------|----------------|
| `bun install` | Install/refresh dependencies from `bun.lock` |
| `bun run dev` | Vite dev server (port **3000**, host exposed) |
| `bun run build` | Typecheck (`tsc`) + production build → `dist/` (includes service worker + PWA manifest) |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | ESLint (see [Lint](#lint)) |
| `bun run pitch` | Render `pitch/carebridge-pitch.html` → `CareBridge-Pitch-Deck.pdf` (Puppeteer) |

### Pitch deck PDF

- Source: `pitch/carebridge-pitch.html` — 12 landscape slides using CareBridge hex tokens + `print-color-adjust: exact` so PDF export keeps colors.
- Renderer: `scripts/render-pitch.mjs` (Puppeteer, `printBackground: true`).
- Output: `CareBridge-Pitch-Deck.pdf` (1280×720 landscape, one page per slide, 12 pages).

## Project structure

```
CareBridge/
├── index.html              # Entry HTML (skip link, PWA meta, fonts)
├── public/                 # Static assets + PWA icons
│   ├── favicon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── maskable-icon-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── main.tsx
│   ├── App.tsx             # Root app, perspectives, a11y prefs
│   ├── index.css           # Global styles, skip-link, focus, reduced-motion
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PatientView/
│   │   ├── ClinicianView/
│   │   ├── SplitView.tsx
│   │   ├── DemoScriptModal.tsx
│   │   ├── AccessibilityModal.tsx
│   │   └── ui/             # Toast, Dialog, AudioWaveform
│   ├── services/           # aiEngine, speechEngine, languages
│   └── types/
├── theme.css               # Tailwind @theme tokens (source of truth for colors)
├── variables.css           # CSS custom properties (:root)
├── vite.config.ts          # Vite + PWA (vite-plugin-pwa) config
├── DESIGN.md               # Design system — color hierarchy, Don'ts
├── summary.md              # Executive summary (pitch material)
└── carebridge-pitch-draft.md
```

## Design system

Read **`DESIGN.md`** before changing UI colors or typography.

- **Cyan** (`#00b1ff`) — data/links only; never large fills.
- **Mint** (`#00ffaa`) — positive/success states only.
- **Iris Pulse** (`#5350cc`) — filled buttons / selected states only.
- **Lilac Mist** (`#b1a6f6`) — line-art only; never text or fills.
- No gradients between dark and light surfaces.
- Font weights: **500 / 600** only (avoid `font-bold` / 700 unless you intentionally change the design system).

Color tokens live in **`theme.css`** and **`variables.css`**. Prefer Tailwind theme classes (`bg-deep-iris`, `text-clinical-cyan`, …) over hard-coded hex values in components.

## PWA

Configured in `vite.config.ts` via `vite-plugin-pwa` (Workbox generateSW).

- Manifest name: **CareBridge**, theme/background `#16165c`, `display: standalone`.
- Icons in `public/` (192, 512, maskable 512, apple-touch).
- Service worker: precache of app shell + fonts; SPA navigation fallback to `index.html`.
- Meta tags in `index.html`: description, `theme-color`, Apple web-app meta, skip link.

After `bun run build`, output is in `dist/` including `sw.js` and `manifest.webmanifest`.

**Local PWA testing:** service workers need a secure context. Use `bun run preview` (or HTTPS), not always `file://`. In dev, SW registration is via `registerSW.js` injected by the plugin (`registerType: 'autoUpdate'`).

### Regenerating PWA icons

Icons are PNG files generated from `public/favicon.svg` with `sharp` (devDependency). To regenerate:

```bash
bunx --bun -e '
const sharp = require("sharp");
const fs = require("fs");
const svg = fs.readFileSync("public/favicon.svg");
await Promise.all([
  sharp(svg, { density: 300 }).resize(192, 192).png().toFile("public/pwa-192x192.png"),
  sharp(svg, { density: 300 }).resize(512, 512).png().toFile("public/pwa-512x512.png"),
  sharp(svg, { density: 300 }).resize(512, 512).png().toFile("public/apple-touch-icon.png"),
  sharp(svg, { density: 300 }).resize(512, 512).png().toFile("public/maskable-icon-512.png"),
]);
console.log("icons ok");
'
```

(Or run the equivalent snippet with `bun` if you prefer a one-off script.)

## Accessibility

Built-in controls live in `AccessibilityModal` / `App.tsx` prefs: text size, high contrast, speech rate, simplified mode.

Global CSS in `src/index.css`:

- `.skip-link` → “Skip to main content” (`#main-content` on `<main>`).
- `:focus-visible` cyan outline.
- `@media (prefers-reduced-motion: reduce)` disables animations/transitions.

Toasts use `aria-live` + `role="status"` / `alert`. Header perspective switcher is a `role="tablist"`.

When adding UI: keyboard operability, visible focus, labels on icon-only buttons, no color-only meaning.

## Lint

`bun run lint` runs `eslint .`. ESLint may not be installed yet:

```bash
bun add -d eslint @eslint/js typescript-eslint
# plus any React/Vite config plugins you need
```

Until then, rely on `bun run build` (includes `tsc`) for type safety.

## Adding dependencies

```bash
bun add <pkg>           # runtime dependency
bun add -d <pkg>        # devDependency
```

Commit **`bun.lock`**. Do **not** create or commit `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.

## Pitch / product docs

- `summary.md` — executive summary (includes PWA + accessibility notes).
- `carebridge-pitch-draft.md` — narrative pitch script (12-slide outline).
- `pitch/carebridge-pitch.html` — styled pitch source for PDF export.
- `CareBridge-Pitch-Deck.pdf` — rendered 12-page pitch (regenerate with `bun run pitch`).
- `DESIGN.md` — visual design rules.

Update these when shipping features that affect the story (languages, offline/PWA, a11y, integrations).

## Common tasks

| Task | How |
|------|-----|
| Add a language | `src/services/languages.ts` + speech engines as needed |
| Change colors | `theme.css` / `variables.css` → Tailwind classes; never scatter hex |
| Change PWA name/icons | `vite.config.ts` manifest + `public/*` icons |
| New component | Put under `src/components/`; follow existing Header/Footer patterns |
| Typecheck only | `bunx tsc --noEmit` or `bun run build` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm` / lockfile appears | Delete `package-lock.json`, run `bun install`, only commit `bun.lock` |
| Port 3000 in use | Stop other Vite, or change `server.port` in `vite.config.ts` |
| SW not updating | Hard refresh; `bun run build && bun run preview`; check Application → Service Workers |
| Fonts blocked offline | First visit online caches Google Fonts; subsequent offline loads from SW cache |
| `eslint` not found | `bun add -d eslint …` (see [Lint](#lint)) |
