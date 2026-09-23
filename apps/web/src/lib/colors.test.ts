/**
 * Module — assignment color helpers (Part 3).
 * The preset palette must stay valid hex; readableTextColor must pick dark ink
 * on light colors and white on dark ones (the exact branch the placed-block
 * renderer uses); assignmentColor must fall back to the leaf-100 default when
 * no custom color (or a malformed one) is set — the no-regression path.
 */
import { describe, expect, it } from 'vitest';
import {
  COLOR_PRESETS,
  HEX_COLOR_PATTERN,
  assignmentColor,
  readableTextColor,
} from './colors';

describe('COLOR_PRESETS', () => {
  it('offers a curated palette of 9 hex colors', () => {
    expect(COLOR_PRESETS).toHaveLength(9);
    for (const preset of COLOR_PRESETS) {
      expect(preset.hex).toMatch(HEX_COLOR_PATTERN);
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });

  it('starts with the app leaf greens and includes the required accents', () => {
    expect(COLOR_PRESETS.map((preset) => preset.hex)).toEqual([
      '#2FBF71', // leaf-500
      '#166B3E', // leaf-700
      '#2563EB', // blue
      '#D97706', // amber
      '#DC2626', // red
      '#7C3AED', // purple
      '#0D9488', // teal
      '#DB2777', // pink
      '#475569', // slate
    ]);
  });
});

describe('readableTextColor', () => {
  it('picks dark ink on light backgrounds (leaf green)', () => {
    expect(readableTextColor('#2FBF71')).toBe('#10241A');
    expect(readableTextColor('#D7F5E2')).toBe('#10241A'); // the default leaf-100
  });

  it('picks white on dark backgrounds (every dark accent)', () => {
    expect(readableTextColor('#166B3E')).toBe('#FFFFFF'); // forest
    expect(readableTextColor('#2563EB')).toBe('#FFFFFF'); // blue
    expect(readableTextColor('#DC2626')).toBe('#FFFFFF'); // red
    expect(readableTextColor('#7C3AED')).toBe('#FFFFFF'); // purple
    expect(readableTextColor('#0D9488')).toBe('#FFFFFF'); // teal
    expect(readableTextColor('#DB2777')).toBe('#FFFFFF'); // pink
    expect(readableTextColor('#475569')).toBe('#FFFFFF'); // slate
  });

  it('matches the readable text color of every preset consistently', () => {
    for (const preset of COLOR_PRESETS) {
      const text = readableTextColor(preset.hex);
      expect(['#10241A', '#FFFFFF']).toContain(text);
    }
  });
});

describe('assignmentColor (default fallback)', () => {
  it('falls back to the leaf-100 default when no color is set', () => {
    expect(assignmentColor({ color: null })).toBe('#D7F5E2');
    expect(assignmentColor({})).toBe('#D7F5E2');
  });

  it('falls back to the default on a malformed color (no regression)', () => {
    expect(assignmentColor({ color: 'green' })).toBe('#D7F5E2');
    expect(assignmentColor({ color: '#2FBF7' })).toBe('#D7F5E2');
    expect(assignmentColor({ color: '#2FBF711' })).toBe('#D7F5E2');
  });

  it('passes a valid custom hex straight through', () => {
    expect(assignmentColor({ color: '#2563EB' })).toBe('#2563EB');
    expect(assignmentColor({ color: '#2fbf71' })).toBe('#2fbf71');
  });
});
