// Generates 1024×1024 source PNGs for the app icon: a macOS-style squircle
// (rounded, inset, transparent outside) with a peacock-ink gradient and a warm
// off-white ink drop — in three appearances (light / dark / tinted) so the dock
// icon adapts on macOS 14+. Dependency-free.
//
//   node scripts/generate-icon.mjs
//
// Writes icon-source.png (light, also the base for `tauri icon`), icon-dark.png,
// and icon-tinted.png into apps/desktop/src-tauri/icons/.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SIZE = 1024;
const MARGIN = 92;
const RADIUS = 190;

const APPEARANCES = {
  // [bgTopLeft, bgBottomRight, dropletColor]
  light: [[0x14, 0x8a, 0x96], [0x0a, 0x54, 0x5d], [0xfb, 0xfb, 0xfd]],
  dark: [[0x11, 0x3e, 0x45], [0x06, 0x16, 0x1b], [0x8f, 0xe4, 0xef]],
  tinted: [[0x3a, 0x3a, 0x3e], [0x18, 0x18, 0x1c], [0xdc, 0xdc, 0xe0]],
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

function roundedRectSDF(x, y, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(x - cx) - (halfW - r);
  const qy = Math.abs(y - cy) - (halfH - r);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
function dropletSDF(x, y) {
  const cx = SIZE / 2;
  const cy = SIZE * 0.6;
  const r = SIZE * 0.24;
  const dCircle = Math.hypot(x - cx, y - cy) - r;
  const ty = SIZE * 0.26;
  if (y >= cy) return dCircle;
  const spread = clamp01((y - ty) / (cy - ty));
  const dTail = Math.abs(x - cx) - spread * r;
  return y < ty ? Math.hypot(x - cx, y - ty) - 1 : Math.max(dTail, dCircle > 0 ? dTail : -1);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rgba, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render([bgA, bgB, drop]) {
  const half = (SIZE - 2 * MARGIN) / 2;
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  let p = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[p++] = 0;
    for (let x = 0; x < SIZE; x++) {
      const alpha = clamp01(0.5 - roundedRectSDF(x, y, SIZE / 2, SIZE / 2, half, half, RADIUS));
      let col = mix(bgA, bgB, clamp01((x + y) / (2 * SIZE)));
      col = mix(col, drop, clamp01(0.5 - dropletSDF(x, y)));
      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = Math.round(alpha * 255);
    }
  }
  return encodePng(raw);
}

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps/desktop/src-tauri/icons');
const files = { light: 'icon-source.png', dark: 'icon-dark.png', tinted: 'icon-tinted.png' };
for (const [mode, name] of Object.entries(files)) {
  const png = render(APPEARANCES[mode]);
  writeFileSync(resolve(dir, name), png);
  console.log(`Wrote ${name} (${png.length} bytes)`);
}
