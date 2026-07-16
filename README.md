# Inkling

> A native desktop diagramming app where a compact text DSL is the single source of truth, and a live hand-drawn canvas redraws as you type.

**Inkling** pairs a precise monospace "ink" editor with a warm, hand-drawn "paper" canvas. You write a compact, line-based text DSL on the left; a live [Excalidraw](https://excalidraw.com/) canvas on the right redraws with every keystroke. The text is authoritative — the diagram is always a pure function of what you typed.

Its primary focus is **Entity-Relationship (ER) diagrams**, with a twist: the *same* logical model can be rendered in **five notations**, switchable at will — **Chen** (default), **Crow's Foot / Information Engineering (IE)**, **UML class-style**, **IDEF1X**, and **Min-Max (ISO `(min,max)`)**. A set of raw drawing primitives is always available as a free-form escape hatch.

Built with **Tauri v2 + Vite + React + TypeScript**, using **CodeMirror 6** as the editor and **@excalidraw/excalidraw** as both the renderer and the exporter.

---

## Screenshots

<!-- SCREENSHOT PLACEHOLDER -->
> _Screenshots go here._
>
> - **Split view** — the ink editor (left) beside the paper canvas (right), through frosted translucent window chrome.
> - **Notation picker** — the same model rendered in Chen, Crow's Foot, UML, IDEF1X, and Min-Max.
> - **Export dialog** — theme-aware output with independent light/dark and background controls.

---

## Features

- **One model, five notations.** Write the ER model once; render it as Chen, Crow's Foot / IE, UML, IDEF1X, or Min-Max. Switch live from the notation picker without touching your text.
- **Live preview.** The canvas is recompiled from the DSL as you type. What you see is exactly what you export — the same Excalidraw elements feed both.
- **Compact, readable DSL.** One statement per line, case-insensitive keywords, `#` comments. Semantic ER statements (`entity`, `weak`, `attr`, `rel`, `link`) plus raw primitives (`rect`, `ellipse`, `diamond`, `text`, `arrow`, `line`).
- **Flowcharts.** Connect primitives with arrows and set `direction` (`TB` / `BT` / `LR` / `RL`); coordless shapes auto-layout along the flow.
- **Data structures.** `array`, `stack`, `queue`, and `linked_list` draw real shapes — with `push` / `pop` / `enqueue` / `dequeue` / `append` operations that update the drawing live.
- **Theme-aware, multi-format export.** `.excalidraw` (re-editable), SVG, PNG (@1x/@2x/@3x), JPG, PDF (vector with raster fallback), and copy-to-clipboard (PNG + SVG). Exported artifacts carry their own light/dark and background settings, independent of the editor theme.
- **Headless CLI.** Render `.ink` files to images from the command line — great for CI, docs pipelines, and batch jobs.
- **Native and cross-platform.** macOS, Windows, and Linux, with platform-appropriate window effects (macOS vibrancy, Windows Mica/Acrylic, Linux opaque fallback).
- **Accessible by default.** Contrast ≥ 4.5:1, visible focus rings, honors `prefers-reduced-motion`, and lint errors never rely on color alone (gutter marker + squiggle too).

---

## DSL quick-start

Inkling documents are plain text. Here is a small ER model:

```ink
notation chen
title "Site Safety"
direction LR

entity engineer   "Engineer"
entity site       "Site"
weak   audit      "Audit"

attr engineer.eid  "Employee ID" key
attr site.name     "Name" key

rel inspects "Inspects" engineer 1-N site
rel logs     "Logs" identifying
link logs audit 1 total
link logs site  N
```

Rendered in **Chen** notation, this produces: a rectangle for each entity, a *double* rectangle for the weak `audit` entity, diamonds for the `Inspects` and `Logs` relationships (`Logs` is a *double* diamond because it is identifying), ellipses for the attributes (with `Employee ID` and `Name` underlined as keys), and connectors labelled with cardinalities (`1`, `N`) — with a double line where participation is total.

Flip the notation picker to **Crow's Foot** and the same model redraws with crow's-foot symbols; flip to **Min-Max** and it shows `(min,max)` pairs; and so on. Your text never changes.

A generic construction-safety sample document ships with the app and loads on first run.

See **[docs/DSL.md](docs/DSL.md)** for the complete language reference and **[SPEC.md](SPEC.md)** for the architecture and design spec.

---

## Supported export formats

| Format | Notes |
| --- | --- |
| `.excalidraw` | Native JSON; reopens fully editable in Inkling or Excalidraw. |
| SVG | Vector; theme-aware. |
| PNG | Raster at @1x / @2x / @3x. |
| JPG | Raster; flattened background. |
| PDF | Embeds vector SVG with a raster fallback. |
| Clipboard | Copy as PNG **and** SVG. |

All exports have their own light/dark mode, background color, and a transparent-background toggle — independent of the editor's theme. A dark editor can emit a clean light PNG, and vice-versa.

---

## Build it yourself

Inkling builds entirely from source with no signing credentials required. (Code-signing and notarization secrets, when present, are read from environment variables / CI secrets only — they are never hardcoded and never needed for a local build.)

### Prerequisites (all platforms)

- **Node 22** — the repo pins it in [`.nvmrc`](.nvmrc); `engines.node` requires `>=20`.
- **pnpm** — `npm i -g pnpm` (needs `>=9`; the repo uses `pnpm@11.13.1`).
- **Rust (stable)** — install via [`rustup`](https://rustup.rs/).

### Platform-specific prerequisites

**macOS**

```sh
xcode-select --install   # Xcode Command Line Tools
```

**Windows**

- Microsoft C++ Build Tools (the "Desktop development with C++" workload).
- WebView2 runtime (ships with Windows 11; install the Evergreen runtime on older Windows).

**Linux (Ubuntu / Debian)**

```sh
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
  libayatana-appindicator3-dev build-essential curl wget file libssl-dev
```

### Install & run

```sh
git clone https://github.com/regaj/inkling.git
cd inkling
pnpm install
pnpm dev            # or: npm run tauri dev  — run the desktop app in dev
```

### Common tasks

```sh
pnpm test                          # run Vitest across all packages
pnpm typecheck                     # type-check the workspace
pnpm lint                          # ESLint
pnpm format:check                  # Prettier check
pnpm --filter @inkling/core build  # build the pure DSL engine
```

### Produce installers

```sh
pnpm tauri build   # or: npm run tauri build
```

Outputs:

- **macOS** — `.dmg` and `.app`
- **Windows** — `.msi` and NSIS `.exe`
- **Linux** — `.deb` and `.AppImage`

### CLI

The headless exporter reuses `@inkling/core` and renders via headless Excalidraw (Playwright):

```sh
pnpm --filter @inkling/cli start -- diagram.ink -o out.svg --notation chen
# e.g.
inkling diagram.ink -o out.png --theme dark --notation crowsfoot
```

---

## Project layout

Inkling is a pnpm workspace monorepo:

| Package | What it is |
| --- | --- |
| `packages/core` | Pure, DOM-free DSL engine: tokenizer → parser → typed AST → semantic ER model → notation renderers → Excalidraw skeleton elements. Zero runtime dependencies, fully unit-tested with Vitest. |
| `apps/desktop` | The Tauri v2 + React GUI: editor, live preview, export, theming, window effects. |
| `packages/cli` | Headless exporter that reuses `core` and renders via headless Excalidraw (Playwright). |

Extensibility is built on **registry patterns** — an exporter registry, a notation-renderer registry, and a shape/node registry in the compiler. Adding a notation, an export format, or a DSL node kind is a one-file change. See [SPEC.md](SPEC.md).

---

## Contributing

Contributions are welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for dev setup, tests, code style, and concrete walkthroughs for adding an export format or a new DSL node kind / notation. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

Inkling is released under the **MIT License**. See [LICENSE](LICENSE).
