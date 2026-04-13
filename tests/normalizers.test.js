import { describe, it, expect } from 'vitest';
import {
  normalizeVolume,
  normalizeSoundType,
  isValidTimeString,
  filterValidExclusions,
} from '../src/shared/validation.js';

// === normalizeVolume ===

describe('normalizeVolume', () => {
  describe('ratio mode (isPercentage=false, default)', () => {
    it('passes through 0.5 unchanged', () => {
      expect(normalizeVolume(0.5)).toBe(0.5);
    });

    it('passes through 1 as max', () => {
      expect(normalizeVolume(1)).toBe(1);
    });

    it('passes through 0 as valid silence', () => {
      expect(normalizeVolume(0)).toBe(0);
    });

    it('clamps values above 1 to 1', () => {
      expect(normalizeVolume(1.5)).toBe(1);
    });

    it('clamps negative values to 0', () => {
      expect(normalizeVolume(-0.3)).toBe(0);
    });

    it('returns 0.5 default for NaN', () => {
      expect(normalizeVolume(NaN)).toBe(0.5);
    });

    it('returns 0.5 default for undefined', () => {
      expect(normalizeVolume(undefined)).toBe(0.5);
    });

    it('treats null as 0 (Number(null) === 0, which is valid silence)', () => {
      expect(normalizeVolume(null)).toBe(0);
    });

    it('returns 0.5 default for non-numeric string', () => {
      expect(normalizeVolume('abc')).toBe(0.5);
    });

    it('handles numeric string "0.7"', () => {
      expect(normalizeVolume('0.7')).toBeCloseTo(0.7);
    });

    it('handles string "0" as valid silence', () => {
      expect(normalizeVolume('0')).toBe(0);
    });
  });

  describe('percentage mode (isPercentage=true)', () => {
    it('converts 50% to 0.5', () => {
      expect(normalizeVolume(50, true)).toBe(0.5);
    });

    it('converts 100% to 1', () => {
      expect(normalizeVolume(100, true)).toBe(1);
    });

    it('converts 0% to 0 (the bug that was fixed)', () => {
      expect(normalizeVolume(0, true)).toBe(0);
    });

    it('clamps 150% to 1', () => {
      expect(normalizeVolume(150, true)).toBe(1);
    });

    it('returns 0.5 default for NaN', () => {
      expect(normalizeVolume(NaN, true)).toBe(0.5);
    });

    it('returns 0.5 default for undefined', () => {
      expect(normalizeVolume(undefined, true)).toBe(0.5);
    });

    it('handles string "75" as percentage', () => {
      expect(normalizeVolume('75', true)).toBe(0.75);
    });
  });
});

// === normalizeSoundType ===

describe('normalizeSoundType', () => {
  it('passes through valid "classic"', () => {
    expect(normalizeSoundType('classic')).toBe('classic');
  });

  it('passes through valid "urgent"', () => {
    expect(normalizeSoundType('urgent')).toBe('urgent');
  });

  it('passes through valid "gentle"', () => {
    expect(normalizeSoundType('gentle')).toBe('gentle');
  });

  it('passes through valid "bell"', () => {
    expect(normalizeSoundType('bell')).toBe('bell');
  });

  it('passes through valid "digital"', () => {
    expect(normalizeSoundType('digital')).toBe('digital');
  });

  it('passes through valid "alarm"', () => {
    expect(normalizeSoundType('alarm')).toBe('alarm');
  });

  it('returns "classic" for unknown type', () => {
    expect(normalizeSoundType('unknown')).toBe('classic');
  });

  it('returns "classic" for empty string', () => {
    expect(normalizeSoundType('')).toBe('classic');
  });

  it('returns "classic" for null', () => {
    expect(normalizeSoundType(null)).toBe('classic');
  });

  it('returns "classic" for undefined', () => {
    expect(normalizeSoundType(undefined)).toBe('classic');
  });

  it('returns "classic" for numeric value', () => {
    expect(normalizeSoundType(42)).toBe('classic');
  });
});

// === isValidTimeString ===

describe('isValidTimeString', () => {
  it('accepts "09:00"', () => {
    expect(isValidTimeString('09:00')).toBe(true);
  });

  it('accepts "9:00" (single digit hour)', () => {
    expect(isValidTimeString('9:00')).toBe(true);
  });

  it('accepts "23:59"', () => {
    expect(isValidTimeString('23:59')).toBe(true);
  });

  it('accepts "0:00"', () => {
    expect(isValidTimeString('0:00')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidTimeString('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidTimeString(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidTimeString(undefined)).toBe(false);
  });

  it('rejects number', () => {
    expect(isValidTimeString(900)).toBe(false);
  });

  it('rejects string without colon', () => {
    expect(isValidTimeString('0900')).toBe(false);
  });

  it('rejects string with letters', () => {
    expect(isValidTimeString('ab:cd')).toBe(false);
  });

  it('rejects string with three digits after colon', () => {
    expect(isValidTimeString('09:000')).toBe(false);
  });

  it('rejects "09:0" (single digit minutes)', () => {
    expect(isValidTimeString('09:0')).toBe(false);
  });
});

// === filterValidExclusions ===

describe('filterValidExclusions', () => {
  it('returns empty array for non-array input', () => {
    expect(filterValidExclusions(null)).toEqual([]);
    expect(filterValidExclusions(undefined)).toEqual([]);
    expect(filterValidExclusions('string')).toEqual([]);
    expect(filterValidExclusions(42)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(filterValidExclusions([])).toEqual([]);
  });

  it('keeps valid exclusion objects with date string', () => {
    const input = [{ date: '2024-12-01', description: 'Ferie' }];
    expect(filterValidExclusions(input)).toEqual(input);
  });

  it('filters out null entries', () => {
    const input = [{ date: '2024-12-01' }, null, { date: '2024-12-02' }];
    expect(filterValidExclusions(input)).toEqual([{ date: '2024-12-01' }, { date: '2024-12-02' }]);
  });

  it('filters out entries without date property', () => {
    const input = [{ description: 'no date' }, { date: '2024-12-01' }];
    expect(filterValidExclusions(input)).toEqual([{ date: '2024-12-01' }]);
  });

  it('filters out entries where date is not a string', () => {
    const input = [{ date: 12345 }, { date: '2024-12-01' }, { date: null }];
    expect(filterValidExclusions(input)).toEqual([{ date: '2024-12-01' }]);
  });

  it('preserves additional properties on valid entries', () => {
    const input = [{ date: '2024-12-01', period: 'morning', description: 'Dottore' }];
    expect(filterValidExclusions(input)).toEqual(input);
  });

  it('filters out undefined entries', () => {
    const input = [undefined, { date: '2024-12-01' }];
    expect(filterValidExclusions(input)).toEqual([{ date: '2024-12-01' }]);
  });
});
