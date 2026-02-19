import { describe, it, expect } from 'vitest';
import { getFontStyle, collectFonts } from '../fonts.js';
import type { SceneNode } from '../scene-spec.js';

describe('getFontStyle', () => {
  // TEST-011: getFontStyle maps numeric weights to style names
  it('maps all numeric weights to correct style names', () => {
    expect(getFontStyle(100)).toBe('Thin');
    expect(getFontStyle(200)).toBe('Extra Light');
    expect(getFontStyle(300)).toBe('Light');
    expect(getFontStyle(400)).toBe('Regular');
    expect(getFontStyle(500)).toBe('Medium');
    expect(getFontStyle(600)).toBe('Semi Bold');
    expect(getFontStyle(700)).toBe('Bold');
    expect(getFontStyle(800)).toBe('Extra Bold');
    expect(getFontStyle(900)).toBe('Black');
  });

  // TEST-012: getFontStyle returns Regular for undefined/unknown weight
  it('returns Regular for undefined', () => {
    expect(getFontStyle(undefined)).toBe('Regular');
  });

  it('returns Regular for unmapped numeric weights', () => {
    expect(getFontStyle(450)).toBe('Regular');
    expect(getFontStyle(0)).toBe('Regular');
    expect(getFontStyle(-1)).toBe('Regular');
  });

  // TEST-013: getFontStyle passes through string values
  it('passes through string weight values as-is', () => {
    expect(getFontStyle('Bold Italic')).toBe('Bold Italic');
    expect(getFontStyle('Light')).toBe('Light');
  });
});

describe('collectFonts', () => {
  // TEST-014: collectFonts returns unique font refs from TEXT nodes
  it('deduplicates repeated font refs and returns unique entries', () => {
    const spec: SceneNode = {
      type: 'FRAME',
      children: [
        { type: 'TEXT', fontFamily: 'Roboto', fontWeight: 700 },
        { type: 'TEXT', fontFamily: 'Inter' },
        { type: 'TEXT', fontFamily: 'Roboto', fontWeight: 700 },
      ],
    };
    const fonts = collectFonts(spec);
    // Roboto Bold, Inter Regular (fallback coincides with second TEXT), so 2 unique + fallback already present
    const keys = fonts.map((f) => `${f.family}::${f.style}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length); // no duplicates
    expect(keys).toContain('Roboto::Bold');
    expect(keys).toContain('Inter::Regular');
  });

  // TEST-015: collectFonts always includes Inter Regular fallback
  it('always includes Inter Regular fallback even when not explicitly used', () => {
    const spec: SceneNode = {
      type: 'FRAME',
      children: [{ type: 'TEXT', fontFamily: 'Roboto', fontWeight: 400 }],
    };
    const fonts = collectFonts(spec);
    const keys = fonts.map((f) => `${f.family}::${f.style}`);
    expect(keys).toContain('Inter::Regular');
    expect(keys).toContain('Roboto::Regular');
  });

  // TEST-016: collectFonts handles spec with no TEXT nodes
  it('returns at least Inter Regular when there are no TEXT nodes', () => {
    const spec: SceneNode = {
      type: 'FRAME',
      children: [{ type: 'RECTANGLE' }, { type: 'ELLIPSE' }],
    };
    const fonts = collectFonts(spec);
    expect(fonts.length).toBeGreaterThanOrEqual(1);
    expect(fonts.some((f) => f.family === 'Inter' && f.style === 'Regular')).toBe(true);
  });

  // TEST-017: collectFonts walks nested children
  it('walks deeply nested children to find TEXT nodes', () => {
    const spec: SceneNode = {
      type: 'FRAME',
      children: [
        {
          type: 'FRAME',
          children: [{ type: 'TEXT', fontFamily: 'Mono', fontWeight: 300 }],
        },
      ],
    };
    const fonts = collectFonts(spec);
    expect(fonts.some((f) => f.family === 'Mono' && f.style === 'Light')).toBe(true);
  });
});
