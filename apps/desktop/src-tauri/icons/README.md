# App icons

The build icon is generated from **`icon-source.png`** (the light appearance) by
`node scripts/generate-icon.mjs`, then expanded to the platform set with
`pnpm --filter @inkling/desktop exec tauri icon src-tauri/icons/icon-source.png -o src-tauri/icons`.

`generate-icon.mjs` also emits **`icon-dark.png`** and **`icon-tinted.png`** —
the dark and tinted appearances.

## Appearance-switching dock icon (macOS 14+ / Tahoe)

macOS chooses a light / dark / tinted icon at runtime, but as of macOS 26 (Tahoe)
that requires the **Icon Composer** `.icon` format — the old asset-catalog
appearance variants no longer compile via `actool` on the command line. To ship
a true adaptive icon:

1. Open **Icon Composer** (bundled with Xcode).
2. Drop in `icon-source.png` (light), `icon-dark.png` (dark), `icon-tinted.png`.
3. Export the `.icon`, place it in the app bundle, and set `CFBundleIconName`.

Until then the single peacock squircle (`icon-source.png`) is used — it reads
well on both light and dark docks.
