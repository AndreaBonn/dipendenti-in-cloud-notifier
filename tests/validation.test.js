import { describe, it, expect } from 'vitest';
import {
  isAllowedOrigin,
  isValidDate,
  sanitizeDescription,
  parseTimeToHoursMinutes,
  getStartupNotificationType,
} from '../src/shared/validation.js';

const DEFAULT_SCHEDULE = {
  morningStart: 9 * 60, // 540
  lunchEnd: 13 * 60, // 780
  afternoonStart: 14 * 60, // 840
  eveningEnd: 18 * 60, // 1080
};

// === isAllowedOrigin ===

describe('isAllowedOrigin', () => {
  it('accepts secure.dipendentincloud.it', () => {
    expect(isAllowedOrigin('https://secure.dipendentincloud.it/it/app/dashboard')).toBe(true);
  });

  it('accepts cloud.dipendentincloud.it', () => {
    expect(isAllowedOrigin('https://cloud.dipendentincloud.it/some/path')).toBe(true);
  });

  it('rejects HTTP (non-HTTPS) variant', () => {
    expect(isAllowedOrigin('http://secure.dipendentincloud.it/it/app/dashboard')).toBe(false);
  });

  it('rejects subdomain spoofing (evil.secure.dipendentincloud.it)', () => {
    expect(isAllowedOrigin('https://evil.secure.dipendentincloud.it')).toBe(false);
  });

  it('rejects lookalike domain (dipendentincloud.it without subdomain)', () => {
    expect(isAllowedOrigin('https://dipendentincloud.it')).toBe(false);
  });

  it('rejects completely unrelated domain', () => {
    expect(isAllowedOrigin('https://example.com')).toBe(false);
  });

  it('rejects origin embedded in path', () => {
    expect(
      isAllowedOrigin('https://evil.com/redirect?to=https://secure.dipendentincloud.it')
    ).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAllowedOrigin('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAllowedOrigin(null)).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });

  it('returns false for malformed URL', () => {
    expect(isAllowedOrigin('not-a-url')).toBe(false);
  });

  it('rejects origin with port number', () => {
    expect(isAllowedOrigin('https://secure.dipendentincloud.it:8443/app')).toBe(false);
  });
});

// === isValidDate ===

describe('isValidDate', () => {
  it('accepts valid YYYY-MM-DD date', () => {
    expect(isValidDate('2026-04-13')).toBe(true);
  });

  it('accepts leap day on leap year', () => {
    expect(isValidDate('2024-02-29')).toBe(true);
  });

  it('rejects leap day on non-leap year', () => {
    expect(isValidDate('2025-02-29')).toBe(false);
  });

  it('rejects invalid month', () => {
    expect(isValidDate('2026-13-01')).toBe(false);
  });

  it('rejects invalid day', () => {
    expect(isValidDate('2026-04-32')).toBe(false);
  });

  it('rejects DD/MM/YYYY format', () => {
    expect(isValidDate('13/04/2026')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDate('')).toBe(false);
  });

  it('rejects date with extra characters', () => {
    expect(isValidDate('2026-04-13T00:00')).toBe(false);
  });

  it('rejects correctly formatted but non-existent date (Apr 31)', () => {
    expect(isValidDate('2026-04-31')).toBe(false);
  });
});

// === sanitizeDescription ===

describe('sanitizeDescription', () => {
  it('trims whitespace', () => {
    expect(sanitizeDescription('  Ferie Estive  ')).toBe('Ferie Estive');
  });

  it('truncates at 100 characters', () => {
    const long = 'A'.repeat(150);
    expect(sanitizeDescription(long)).toHaveLength(100);
  });

  it('preserves strings under 100 characters', () => {
    expect(sanitizeDescription('Visita medica')).toBe('Visita medica');
  });

  it('handles empty string', () => {
    expect(sanitizeDescription('')).toBe('');
  });

  it('trims then truncates (whitespace does not count toward limit)', () => {
    const padded = '  ' + 'B'.repeat(100) + '  ';
    const result = sanitizeDescription(padded);
    expect(result).toHaveLength(100);
    expect(result).toBe('B'.repeat(100));
  });
});

// === parseTimeToHoursMinutes ===

describe('parseTimeToHoursMinutes', () => {
  it('parses "09:00" to { h: 9, m: 0 }', () => {
    expect(parseTimeToHoursMinutes('09:00')).toEqual({ h: 9, m: 0 });
  });

  it('parses "13:30" to { h: 13, m: 30 }', () => {
    expect(parseTimeToHoursMinutes('13:30')).toEqual({ h: 13, m: 30 });
  });

  it('parses "23:59" to { h: 23, m: 59 }', () => {
    expect(parseTimeToHoursMinutes('23:59')).toEqual({ h: 23, m: 59 });
  });

  it('parses "00:00" to { h: 0, m: 0 }', () => {
    expect(parseTimeToHoursMinutes('00:00')).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for null', () => {
    expect(parseTimeToHoursMinutes(null)).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for undefined', () => {
    expect(parseTimeToHoursMinutes(undefined)).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for empty string', () => {
    expect(parseTimeToHoursMinutes('')).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for string without colon', () => {
    expect(parseTimeToHoursMinutes('0900')).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for non-numeric parts', () => {
    expect(parseTimeToHoursMinutes('ab:cd')).toEqual({ h: 0, m: 0 });
  });

  it('returns { h: 0, m: 0 } for non-string input', () => {
    expect(parseTimeToHoursMinutes(930)).toEqual({ h: 0, m: 0 });
  });
});

// === getStartupNotificationType ===

describe('getStartupNotificationType', () => {
  describe('returns correct type for each time slot', () => {
    it('morning: not clocked in during morning hours', () => {
      expect(getStartupNotificationType(600, false, DEFAULT_SCHEDULE)).toBe('morning');
    });

    it('lunch: clocked in during lunch break', () => {
      expect(getStartupNotificationType(790, true, DEFAULT_SCHEDULE)).toBe('lunch');
    });

    it('afternoon: not clocked in during afternoon', () => {
      expect(getStartupNotificationType(900, false, DEFAULT_SCHEDULE)).toBe('afternoon');
    });

    it('evening: still clocked in after evening end', () => {
      expect(getStartupNotificationType(1100, true, DEFAULT_SCHEDULE)).toBe('evening');
    });
  });

  describe('returns null when no notification is needed', () => {
    it('clocked in during morning (correct state)', () => {
      expect(getStartupNotificationType(600, true, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('not clocked in during lunch break (correct state)', () => {
      expect(getStartupNotificationType(790, false, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('clocked in during afternoon (correct state)', () => {
      expect(getStartupNotificationType(900, true, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('not clocked in after evening end (correct state)', () => {
      expect(getStartupNotificationType(1100, false, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('before work hours', () => {
      expect(getStartupNotificationType(400, false, DEFAULT_SCHEDULE)).toBeNull();
      expect(getStartupNotificationType(400, true, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('null isTimbrato', () => {
      expect(getStartupNotificationType(600, null, DEFAULT_SCHEDULE)).toBeNull();
    });
  });

  describe('exact boundary conditions', () => {
    it('morning starts exactly at morningStart', () => {
      expect(getStartupNotificationType(539, false, DEFAULT_SCHEDULE)).toBeNull();
      expect(getStartupNotificationType(540, false, DEFAULT_SCHEDULE)).toBe('morning');
    });

    it('morning ends exactly at lunchEnd', () => {
      expect(getStartupNotificationType(779, false, DEFAULT_SCHEDULE)).toBe('morning');
      expect(getStartupNotificationType(780, false, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('lunch starts exactly at lunchEnd', () => {
      expect(getStartupNotificationType(779, true, DEFAULT_SCHEDULE)).toBeNull();
      expect(getStartupNotificationType(780, true, DEFAULT_SCHEDULE)).toBe('lunch');
    });

    it('lunch ends exactly at afternoonStart', () => {
      expect(getStartupNotificationType(839, true, DEFAULT_SCHEDULE)).toBe('lunch');
      expect(getStartupNotificationType(840, true, DEFAULT_SCHEDULE)).toBeNull();
    });

    it('afternoon starts exactly at afternoonStart', () => {
      expect(getStartupNotificationType(839, false, DEFAULT_SCHEDULE)).toBeNull();
      expect(getStartupNotificationType(840, false, DEFAULT_SCHEDULE)).toBe('afternoon');
    });

    it('evening starts exactly at eveningEnd', () => {
      expect(getStartupNotificationType(1079, true, DEFAULT_SCHEDULE)).toBeNull();
      expect(getStartupNotificationType(1080, true, DEFAULT_SCHEDULE)).toBe('evening');
    });

    it('evening continues past midnight', () => {
      expect(getStartupNotificationType(1439, true, DEFAULT_SCHEDULE)).toBe('evening');
    });
  });

  describe('with custom schedule', () => {
    const CUSTOM = {
      morningStart: 8 * 60,
      lunchEnd: 12 * 60,
      afternoonStart: 13 * 60,
      eveningEnd: 17 * 60,
    };

    it('respects custom morning start', () => {
      expect(getStartupNotificationType(479, false, CUSTOM)).toBeNull();
      expect(getStartupNotificationType(480, false, CUSTOM)).toBe('morning');
    });

    it('respects custom evening end', () => {
      expect(getStartupNotificationType(1019, true, CUSTOM)).toBeNull();
      expect(getStartupNotificationType(1020, true, CUSTOM)).toBe('evening');
    });
  });
});
