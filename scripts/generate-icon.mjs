// Generates a 1024×1024 source PNG for the app icon: a warm off-white ink drop
// on the peacock-ink accent. Run `tauri icon` on the output to produce the
// platform icon set. Dependency-free (Node zlib + a tiny PNG encoder).
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SIZE = 1024;
const PEACOCK = [0x0e, 0x7c, 0x86];
const PEACOCK_DK = [0x0a, 0x62, 0x6b];
const INK = [0xfb, 0xfb, 0xfd];

function mix(a, b, t) {
  return a.map((c, i) => Math.round(c + (b[i] - c) * t));
}

// Signed-distance helpers for a rounded droplet (circle + tapered top).
function droplet(x, y) {
  const cx = SIZE / 2;
  const cy = SIZE * 0.6;
  const r = SIZE * 0.3;
  const dCircle = Math.hypot(x - cx, y - cy) - r;
  // Tapered tail toward the top.
  const ty = SIZE * 0.14;
  const spread = (y - ty) / (cy - ty);
  const halfWidth = Math.max(0, spread) * r;
  const dTail = y < cy ? Math.abs(x - cx) - halfWidth : Infinity;
  return Math.min(dCircle, Math.max(dTail, y < ty ? Infinity : dCircle > 0 ? dTail : -1));
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    // Radial background shading.
    const t = Math.hypot(x - SIZE / 2, y - SIZE / 2) / (SIZE * 0.75);
    let col = mix(PEACOCK, PEACOCK_DK, Math.min(1, t));
    // Antialiased droplet.
    const d = droplet(x, y);
    const cov = Math.min(1, Math.max(0, 0.5 - d));
    col = mix(col, INK, cov);
    raw[p++] = col[0];
    raw[p++] = col[1];
    raw[p++] = col[2];
    raw[p++] = 0xff;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
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
