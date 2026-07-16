// Generates a 1024×1024 source PNG for the app icon: a macOS-style squircle
// (rounded, inset, transparent outside) with a peacock-ink gradient and a warm
// off-white ink drop. Reads well on both light and dark docks. Run `tauri icon`
// on the output to produce the platform icon set. Dependency-free.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SIZE = 1024;
const MARGIN = 92; // transparent inset around the squircle (macOS convention)
const RADIUS = 190; // corner radius
const PEACOCK = [0x14, 0x8a, 0x96];
const PEACOCK_DK = [0x0a, 0x54, 0x5d];
const INK = [0xfb, 0xfb, 0xfd];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

// Signed distance to a rounded rectangle (negative inside).
function roundedRectSDF(x, y, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(x - cx) - (halfW - r);
  const qy = Math.abs(y - cy) - (halfH - r);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

// Signed distance to a teardrop (circle + tapered top), negative inside.
function dropletSDF(x, y) {
  const cx = SIZE / 2;
  const cy = SIZE * 0.6;
  const r = SIZE * 0.24;
  const dCircle = Math.hypot(x - cx, y - cy) - r;
  const ty = SIZE * 0.26;
  if (y >= cy) return dCircle;
  const spread = clamp01((y - ty) / (cy - ty));
  const halfWidth = spread * r;
  const dTail = Math.abs(x - cx) - halfWidth;
  return y < ty ? Math.hypot(x - cx, y - ty) - 1 : Math.max(dTail, dCircle > 0 ? dTail : -1);
}

const half = (SIZE - 2 * MARGIN) / 2;
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const sdf = roundedRectSDF(x, y, SIZE / 2, SIZE / 2, half, half, RADIUS);
    const alpha = clamp01(0.5 - sdf); // antialiased edge
    // Diagonal peacock gradient.
    const t = clamp01((x + y) / (2 * SIZE));
    let col = mix(PEACOCK, PEACOCK_DK, t);
    const cov = clamp01(0.5 - dropletSDF(x, y));
    col = mix(col, INK, cov);
    raw[p++] = col[0];
    raw[p++] = col[1];
    raw[p++] = col[2];
    raw[p++] = Math.round(alpha * 255);
  }
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

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps/desktop/src-tauri/icons/icon-source.png');
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
