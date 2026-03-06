/**
 * Tests for pure utility functions in handler-utils.ts.
 * These functions have no Figma dependencies and can be tested directly.
 */

import { describe, it, expect } from 'vitest';
import { base64Encode, base64Decode, detectImageMimeType, getFontStyleFromWeight } from '../handler-utils.js';

// ─── base64Encode / base64Decode ───────────────────────────────────────────

describe('base64Encode', () => {
  it('encodes an empty Uint8Array to an empty string', () => {
    expect(base64Encode(new Uint8Array([]))).toBe('');
  });

  it('encodes a single byte correctly', () => {
    // 0x00 = 0b00000000 → 'AAAA' with padding
    const result = base64Encode(new Uint8Array([0]));
    expect(result).toBe('AA==');
  });

  it('encodes two bytes correctly', () => {
    const result = base64Encode(new Uint8Array([0, 0]));
    expect(result).toBe('AAA=');
  });

  it('encodes three bytes without padding', () => {
    const result = base64Encode(new Uint8Array([0, 0, 0]));
    expect(result).toBe('AAAA');
  });

  it('encodes "hello" correctly', () => {
    const bytes = new TextEncoder().encode('hello');
    expect(base64Encode(bytes)).toBe('aGVsbG8=');
  });

  it('encodes "Man" correctly (classic base64 test vector)', () => {
    const bytes = new Uint8Array([77, 97, 110]); // "Man"
    expect(base64Encode(bytes)).toBe('TWFu');
  });
});

describe('base64Decode', () => {
  it('decodes an empty string to empty Uint8Array', () => {
    const result = base64Decode('');
    expect(result).toEqual(new Uint8Array([]));
  });

  it('decodes a single-byte base64 string', () => {
    const result = base64Decode('AA==');
    expect(result).toEqual(new Uint8Array([0]));
  });

  it('decodes "aGVsbG8=" back to "hello"', () => {
    const result = base64Decode('aGVsbG8=');
    expect(new TextDecoder().decode(result)).toBe('hello');
  });

  it('decodes "TWFu" back to "Man"', () => {
    const result = base64Decode('TWFu');
    expect(result).toEqual(new Uint8Array([77, 97, 110]));
  });

  it('strips whitespace and padding before decoding', () => {
    const result = base64Decode('aGVs bG8=');
    expect(new TextDecoder().decode(result)).toBe('hello');
  });
});

describe('base64Encode / base64Decode round-trip', () => {
  it('round-trips arbitrary binary data', () => {
    const original = new Uint8Array([1, 2, 3, 127, 128, 200, 255]);
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    expect(decoded).toEqual(original);
  });

  it('round-trips a 100-byte sequence', () => {
    const original = new Uint8Array(100);
    for (let i = 0; i < 100; i++) original[i] = i;
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded);
    expect(decoded).toEqual(original);
  });
});

// ─── detectImageMimeType ───────────────────────────────────────────────────

describe('detectImageMimeType', () => {
  it('detects PNG by magic bytes', () => {
    const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMimeType(pngMagic)).toBe('image/png');
  });

  it('detects JPEG by magic bytes', () => {
    const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectImageMimeType(jpegMagic)).toBe('image/jpeg');
  });

  it('detects GIF by magic bytes', () => {
    const gifMagic = new Uint8Array([0x47, 0x49, 0x46, 0x38]); // "GIF8"
    expect(detectImageMimeType(gifMagic)).toBe('image/gif');
  });

  it('detects WebP by magic bytes (RIFF)', () => {
    const webpMagic = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    expect(detectImageMimeType(webpMagic)).toBe('image/webp');
  });

  it('returns image/png for unknown formats', () => {
    const unknown = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(detectImageMimeType(unknown)).toBe('image/png');
  });
});

// ─── getFontStyleFromWeight ────────────────────────────────────────────────

describe('getFontStyleFromWeight', () => {
  it('maps 100 to Thin', () => {
    expect(getFontStyleFromWeight(100)).toBe('Thin');
  });

  it('maps 200 to Extra Light', () => {
    expect(getFontStyleFromWeight(200)).toBe('Extra Light');
  });

  it('maps 300 to Light', () => {
    expect(getFontStyleFromWeight(300)).toBe('Light');
  });

  it('maps 400 to Regular', () => {
    expect(getFontStyleFromWeight(400)).toBe('Regular');
  });

  it('maps 500 to Medium', () => {
    expect(getFontStyleFromWeight(500)).toBe('Medium');
  });

  it('maps 600 to Semi Bold', () => {
    expect(getFontStyleFromWeight(600)).toBe('Semi Bold');
  });

  it('maps 700 to Bold', () => {
    expect(getFontStyleFromWeight(700)).toBe('Bold');
  });

  it('maps 800 to Extra Bold', () => {
    expect(getFontStyleFromWeight(800)).toBe('Extra Bold');
  });

  it('maps 900 to Black', () => {
    expect(getFontStyleFromWeight(900)).toBe('Black');
  });

  it('maps unknown weight to Regular', () => {
    expect(getFontStyleFromWeight(450)).toBe('Regular');
    expect(getFontStyleFromWeight(0)).toBe('Regular');
    expect(getFontStyleFromWeight(1000)).toBe('Regular');
  });
});
