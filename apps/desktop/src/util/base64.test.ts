import { describe, it, expect } from 'vitest';
import { bytesToBase64 } from './base64.js';

describe('bytesToBase64', () => {
  it('encodes ASCII bytes', () => {
    expect(bytesToBase64(new TextEncoder().encode('Inkling'))).toBe('SW5rbGluZw==');
  });

  it('encodes an empty buffer', () => {
    expect(bytesToBase64(new Uint8Array())).toBe('');
  });

  it('round-trips arbitrary bytes through atob', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    const decoded = atob(bytesToBase64(bytes));
    const back = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    expect([...back]).toEqual([...bytes]);
  });

  it('handles buffers larger than the 0x8000 chunk', () => {
    const big = new Uint8Array(0x8000 * 2 + 5).fill(65);
    expect(bytesToBase64(big).length).toBeGreaterThan(0);
  });
});
