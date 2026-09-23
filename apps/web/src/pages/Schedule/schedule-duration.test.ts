/**
 * Module — chunk duration math (the sidebar duration picker's pure core).
 * Covers the 0.5h stepping, the "never exceed remaining hours" clamp, the
 * "0/negative = invalid (drag disabled)" marker, and label formatting.
 */
import { describe, expect, it } from 'vitest';
import {
  CHUNK_STEP_HOURS,
  MIN_CHUNK_HOURS,
  clampChunkHours,
  formatHours,
  isChunkDurationValid,
  stepChunkHours,
} from './schedule-duration';

describe('schedule-duration — clampChunkHours', () => {
  it('keeps a legal duration untouched', () => {
    expect(clampChunkHours(1.5, 3)).toBe(1.5);
    expect(clampChunkHours(3, 3)).toBe(3);
  });

  it('clamps an over-remaining entry down to the remaining hours', () => {
    expect(clampChunkHours(5, 1.5)).toBe(1.5);
    expect(clampChunkHours(2.5, 2)).toBe(2);
  });

  it('bumps a below-minimum entry up to the 0.5h floor (when remaining allows)', () => {
    expect(clampChunkHours(0.25, 3)).toBe(MIN_CHUNK_HOURS);
  });

  it('caps to a remaining tail smaller than the floor instead of overshooting it', () => {
    expect(clampChunkHours(2, 0.25)).toBe(0.25);
    expect(clampChunkHours(0.5, 0.25)).toBe(0.25);
  });

  it('maps non-numeric, zero and negative entries to the invalid 0 marker', () => {
    expect(clampChunkHours(Number.NaN, 3)).toBe(0);
    expect(clampChunkHours(0, 3)).toBe(0);
    expect(clampChunkHours(-1, 3)).toBe(0);
    expect(clampChunkHours(3, 0)).toBe(0);
  });
});

describe('schedule-duration — stepChunkHours (0.5h stepper)', () => {
  it('steps up and down by half an hour', () => {
    expect(CHUNK_STEP_HOURS).toBe(0.5);
    expect(stepChunkHours(2, 1, 3)).toBe(2.5);
    expect(stepChunkHours(2.5, -1, 3)).toBe(2);
  });

  it('never steps past the remaining hours (clamped, not wrapped)', () => {
    expect(stepChunkHours(2.5, 1, 3)).toBe(3);
    expect(stepChunkHours(3, 1, 3)).toBe(3);
  });

  it('never steps below the 0.5h minimum', () => {
    expect(stepChunkHours(0.5, -1, 3)).toBe(0.5);
  });

  it('recovers from the invalid 0 marker back to a legal duration', () => {
    expect(stepChunkHours(0, 1, 3)).toBe(0.5);
    expect(stepChunkHours(0, -1, 3)).toBe(0);
  });

  it('steps without float dust (3 - 0.5 stays 2.5, not 2.4999…)', () => {
    expect(stepChunkHours(3, -1, 3)).toBe(2.5);
    expect(stepChunkHours(0.5, 1, 3)).toBe(1);
  });
});

describe('schedule-duration — validity + labels', () => {
  it('marks 0 (or anything invalid) as undraggable and clamped values as valid', () => {
    expect(isChunkDurationValid(1.5, 3)).toBe(true);
    expect(isChunkDurationValid(3, 3)).toBe(true);
    expect(isChunkDurationValid(0, 3)).toBe(false);
    expect(isChunkDurationValid(-1, 3)).toBe(false);
    expect(isChunkDurationValid(Number.NaN, 3)).toBe(false);
  });

  it('formats whole hours without a trailing .0 and halves with one decimal', () => {
    expect(formatHours(3)).toBe('3');
    expect(formatHours(1.5)).toBe('1.5');
    expect(formatHours(0.5)).toBe('0.5');
    expect(formatHours(0)).toBe('0');
    // Float-dust tolerance: 1.5 + 1.5 - 3 style artifacts stay clean.
    expect(formatHours(0.1 + 0.2)).toBe('0.3');
  });
});
