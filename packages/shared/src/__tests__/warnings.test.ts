import { describe, it, expect } from 'vitest';
import { detectIgnoredProperties } from '../warnings.js';

// Phase 10A: Warning System Tests
// TEST-P10A-001 through TEST-P10A-007
describe('detectIgnoredProperties', () => {
  // TEST-P10A-001: warns on x/y for COMPONENT children in COMPONENT_SET
  it('warns on x and y for COMPONENT node with COMPONENT_SET parent', () => {
    const warnings = detectIgnoredProperties('COMPONENT', 'COMPONENT_SET', { x: 100, y: 200 });
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    const warningText = warnings.join(' ');
    expect(warningText).toMatch(/x/);
    expect(warningText).toMatch(/y/);
  });

  // TEST-P10A-002: warns on layout properties for TEXT nodes
  it('warns on layoutMode, itemSpacing, and padding for TEXT nodes', () => {
    const warnings = detectIgnoredProperties('TEXT', undefined, {
      layoutMode: 'VERTICAL',
      itemSpacing: 8,
      padding: 16,
    });
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    const warningText = warnings.join(' ');
    expect(warningText).toMatch(/layoutMode/);
    expect(warningText).toMatch(/itemSpacing/);
    expect(warningText).toMatch(/padding/);
  });

  // TEST-P10A-003: warns on text properties for non-TEXT nodes
  it('warns on characters, fontSize, fontFamily for RECTANGLE nodes', () => {
    const warnings = detectIgnoredProperties('RECTANGLE', undefined, {
      characters: 'Hello',
      fontSize: 16,
      fontFamily: 'Inter',
    });
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    const warningText = warnings.join(' ');
    expect(warningText).toMatch(/characters/);
    expect(warningText).toMatch(/fontSize/);
    expect(warningText).toMatch(/fontFamily/);
  });

  // TEST-P10A-004: warns on structural changes to INSTANCE nodes
  it('warns on layoutMode and children for INSTANCE nodes', () => {
    const warnings = detectIgnoredProperties('INSTANCE', undefined, {
      layoutMode: 'HORIZONTAL',
      children: [],
    });
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    const warningText = warnings.join(' ');
    expect(warningText).toMatch(/layoutMode/);
    expect(warningText).toMatch(/children/);
  });

  // TEST-P10A-005: returns empty array for valid FRAME properties
  it('returns empty array for valid FRAME properties (x, y, fills, layoutMode)', () => {
    const warnings = detectIgnoredProperties('FRAME', undefined, {
      x: 100,
      fills: [{ type: 'SOLID', color: '#FF0000' }],
      layoutMode: 'VERTICAL',
    });
    expect(warnings).toHaveLength(0);
  });

  // TEST-P10A-006: returns empty array for valid TEXT properties
  it('returns empty array for valid TEXT properties (characters, fontSize, fontFamily, x)', () => {
    const warnings = detectIgnoredProperties('TEXT', undefined, {
      characters: 'Hello',
      fontSize: 16,
      fontFamily: 'Inter',
      x: 50,
    });
    expect(warnings).toHaveLength(0);
  });

  // TEST-P10A-007: all warning strings start with "[warning]"
  it('all warning strings start with "[warning]" prefix', () => {
    const warnings = detectIgnoredProperties('TEXT', undefined, {
      layoutMode: 'VERTICAL',
    });
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(warning).toMatch(/^\[warning\]/);
    }
  });
});
