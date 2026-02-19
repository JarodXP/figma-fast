import { describe, it, expect } from 'vitest';
import { hexToRgba, rgbaToHex } from '../colors.js';

describe('hexToRgba', () => {
  // TEST-001: hexToRgba parses 6-digit hex correctly
  it('parses 6-digit hex correctly', () => {
    const result = hexToRgba('#FF8800');
    expect(result.r).toBeCloseTo(1, 2);
    expect(result.g).toBeCloseTo(136 / 255, 2);
    expect(result.b).toBeCloseTo(0, 2);
    expect(result.a).toBeCloseTo(1, 2);
  });

  // TEST-002: hexToRgba parses 3-digit shorthand hex
  it('parses 3-digit shorthand hex the same as the equivalent 6-digit hex', () => {
    const short = hexToRgba('#F80');
    const full = hexToRgba('#FF8800');
    expect(short.r).toBeCloseTo(full.r, 2);
    expect(short.g).toBeCloseTo(full.g, 2);
    expect(short.b).toBeCloseTo(full.b, 2);
    expect(short.a).toBeCloseTo(full.a, 2);
  });

  // TEST-003: hexToRgba parses 8-digit hex with alpha
  it('parses 8-digit hex with alpha', () => {
    const result = hexToRgba('#FF000080');
    expect(result.r).toBeCloseTo(1, 2);
    expect(result.g).toBeCloseTo(0, 2);
    expect(result.b).toBeCloseTo(0, 2);
    expect(result.a).toBeCloseTo(128 / 255, 2);
  });

  // TEST-004: hexToRgba handles # prefix presence/absence
  it('handles hex with and without # prefix identically', () => {
    const withHash = hexToRgba('#FF0000');
    const withoutHash = hexToRgba('FF0000');
    expect(withHash.r).toBeCloseTo(withoutHash.r, 2);
    expect(withHash.g).toBeCloseTo(withoutHash.g, 2);
    expect(withHash.b).toBeCloseTo(withoutHash.b, 2);
    expect(withHash.a).toBeCloseTo(withoutHash.a, 2);
  });

  // TEST-005: hexToRgba handles black and white
  it('handles black correctly', () => {
    const result = hexToRgba('#000000');
    expect(result.r).toBeCloseTo(0, 2);
    expect(result.g).toBeCloseTo(0, 2);
    expect(result.b).toBeCloseTo(0, 2);
    expect(result.a).toBeCloseTo(1, 2);
  });

  it('handles white correctly', () => {
    const result = hexToRgba('#FFFFFF');
    expect(result.r).toBeCloseTo(1, 2);
    expect(result.g).toBeCloseTo(1, 2);
    expect(result.b).toBeCloseTo(1, 2);
    expect(result.a).toBeCloseTo(1, 2);
  });

  // TEST-006: hexToRgba handles full transparency
  it('handles full transparency (#00000000)', () => {
    const result = hexToRgba('#00000000');
    expect(result.r).toBeCloseTo(0, 2);
    expect(result.g).toBeCloseTo(0, 2);
    expect(result.b).toBeCloseTo(0, 2);
    expect(result.a).toBeCloseTo(0, 2);
  });

  // TEST-010: hexToRgba boundary values
  it('produces values within [0,1] range for boundary hex values', () => {
    const cases = ['#000', '#FFF', '#00000000', '#FFFFFFFF'];
    for (const hex of cases) {
      const result = hexToRgba(hex);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(1);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(1);
      expect(result.a).toBeGreaterThanOrEqual(0);
      expect(result.a).toBeLessThanOrEqual(1);
    }
  });
});

describe('rgbaToHex', () => {
  // TEST-007: rgbaToHex converts opaque color correctly
  it('converts opaque color to hex without alpha suffix', () => {
    const result = rgbaToHex({ r: 1, g: 0, b: 0, a: 1 });
    expect(result).toBe('#ff0000');
  });

  // TEST-008: rgbaToHex includes alpha when not fully opaque
  it('includes alpha suffix when color is not fully opaque', () => {
    const result = rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 });
    // alpha = round(0.5 * 255) = 128 = 0x80
    expect(result).toBe('#00000080');
  });

  // TEST-009: hexToRgba and rgbaToHex roundtrip
  it('roundtrips hex -> rgba -> hex correctly', () => {
    const original = '#3a7bf2';
    const rgba = hexToRgba(original);
    const result = rgbaToHex(rgba);
    expect(result.toLowerCase()).toBe(original.toLowerCase());
  });
});
