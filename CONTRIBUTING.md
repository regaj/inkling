# Contributing to Inkling

Thanks for your interest in improving Inkling! This guide covers local setup, the test/lint workflow, code style, and — most usefully — how the registry-based extension points let you add an export format, a DSL node kind, or a whole new notation in a single file.

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Contribution flow

Inkling uses a simple **fork → branch → PR** flow. There is **no CLA and no DCO sign-off** required — just open a pull request.

1. Fork the repository and clone your fork.
2. Create a topic branch: `git checkout -b my-change`.
3. Make your change, with tests.
4. Run the checks below and make sure they pass.
5. Push and open a pull request against the default branch. Fill out the [PR template](.github/pull_request_template.md).

---

## Dev setup

You'll need:

- **Node 22** (see [`.nvmrc`](.nvmrc); `engines.node >=20`).
- **pnpm** `>=9` (`npm i -g pnpm`; the repo uses `pnpm@11.13.1`).
- **Rust (stable)** via [`rustup`](https://rustup.rs/) — required for the Tauri desktop app.

Platform prerequisites (Xcode CLT on macOS; C++ Build Tools + WebView2 on Windows; the `webkit2gtk-4.1` / GTK apt packages on Linux) are listed in full in the [README](README.md#build-it-yourself).

```sh
pnpm install
pnpm dev            # run the desktop app (or: npm run tauri dev)
```

If you're only working on the language engine, you don't need Rust or the desktop app at all — `packages/core` is pure TypeScript.

---

## Running tests & checks

```sh
pnpm test                          # Vitest across all packages
pnpm typecheck                     # type-check the workspace
pnpm lint                          # ESLint
pnpm format:check                  # Prettier check
pnpm --filter @inkling/core build  # build the pure engine
```

Please make sure `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm format:check` all pass before opening a PR. New behavior in `packages/core` should come with Vitest unit tests — the core is DOM-free specifically so it can be tested exhaustively without a browser.

---

## Code style

- **ESLint + Prettier** enforce style; don't hand-format against them. Run `pnpm lint` and `pnpm format:check`, or let your editor apply Prettier on save.
- **EditorConfig** ([`.editorconfig`](.editorconfig)) sets base whitespace rules; most editors pick it up automatically.
- **TypeScript everywhere**, strict. Prefer explicit types at package boundaries.
- Keep `packages/core` **DOM-free and dependency-free** — it must remain pure and unit-testable.

---

## Extension points

Inkling is built around three registries, each a small `register(key, impl)` map. Most additions are one new file plus one registration call. See [SPEC.md](SPEC.md#6-extension-points-the-three-registries) for the architecture.

### How to add a new export format

Exporters live behind the **exporter registry** and consume the shared Excalidraw elements (so you inherit correct bindings, double borders, and labels for free).

1. Create a new file in the exporters directory, e.g. `webp.ts`.
2. Implement a function that takes the shared Excalidraw elements plus theme/background options and returns the encoded bytes/string:

   ```ts
   import { register } from "../registry";

   export function webpExporter(elements, opts) {
     // turn elements + opts into WebP bytes
   }

   register("webp", webpExporter);
   ```

3. Register the format id and wire it into the export UI's format list (and the CLI's `-o` extension handling, if applicable).
4. Add a test asserting the exporter produces output for a known model.

Nothing upstream of the shared elements changes.

### How to add a new DSL node kind

New statements go through the **shape/node registry** in the compiler.

1. Create a file for the statement, e.g. `cloud.ts`, defining:
   - the **parser** for the statement's tokens (validate and produce a typed AST node),
   - the **AST node kind**,
   - the statement's **contribution to the semantic model**.
2. Register the keyword:

   ```ts
   register("cloud", { parse, toModel });
   ```

3. Ensure each notation renderer knows how to project the new model element (or provide a sensible default).
4. Add parser tests (including the error cases: duplicate id, malformed args, unknown references) and a model-building test.
5. Document the statement in [docs/DSL.md](docs/DSL.md).

The tokenizer and downstream stages need no changes — they discover the keyword through the registry.

### How to add a new notation

Renderers go through the **notation-renderer registry**.

1. Create `packages/core/.../notations/mynotation.ts`.
2. Implement a renderer that walks the semantic model and emits Excalidraw **skeleton elements** (reuse the shared layout helpers driven by the `direction` hint):

   ```ts
   import { register } from "../registry";

   export const myNotationRenderer = (model, ctx) => {
     // emit skeleton elements for entities, relationships, attributes, cardinality…
   };

   register("mynotation", myNotationRenderer);
   ```

3. Handle every model element kind, including the double-border cases (weak entity, identifying relationship, multivalued attribute, total participation) and your notation's cardinality presentation.
4. Add the id to the notation picker and the `notation` directive's accepted values.
5. Add Vitest coverage that renders a representative model and asserts on the emitted skeleton.
6. Document the notation's cardinality rendering in [docs/DSL.md](docs/DSL.md#how-each-notation-renders-cardinality).

---

## Reporting bugs & requesting features

Use the issue templates:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.md) — include repro steps, expected vs. actual, your OS, the notation, a minimal sample `.ink`, and the app version.
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.md) — describe the problem, your proposed solution, and alternatives considered.

---

## License

Inkling is released under the **MIT License** ([LICENSE](LICENSE)). By contributing, you agree that your contributions will be licensed under the same terms.
