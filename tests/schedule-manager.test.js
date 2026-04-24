import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupChromeMock } from './helpers/chrome-mock.js';

// schedule-manager holds module-level state (workSchedule), so we need fresh
// imports per describe block. Use dynamic imports inside tests where isolation matters.

describe('getWorkSchedule', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('returns an object with the four schedule fields', async () => {
    const { getWorkSchedule } = await import('../src/background/schedule-manager.js');
    const schedule = getWorkSchedule();

    expect(schedule).toHaveProperty('morningStart');
    expect(schedule).toHaveProperty('lunchEnd');
    expect(schedule).toHaveProperty('afternoonStart');
    expect(schedule).toHaveProperty('eveningEnd');
  });

  it('returns numeric minute values for all fields', async () => {
    const { getWorkSchedule } = await import('../src/background/schedule-manager.js');
    const schedule = getWorkSchedule();

    for (const value of Object.values(schedule)) {
      expect(typeof value).toBe('number');
    }
  });
});

describe('loadWorkSchedule', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.resetModules();
  });

  it('loads valid custom schedule strings from storage and converts to minutes', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({
      morningStart: '08:00',
      lunchEnd: '12:30',
      afternoonStart: '13:30',
      eveningEnd: '17:00',
    });

    const { loadWorkSchedule, getWorkSchedule } =
      await import('../src/background/schedule-manager.js');

    const callback = vi.fn();
    loadWorkSchedule(callback);

    expect(callback).toHaveBeenCalledOnce();
    const schedule = getWorkSchedule();
    expect(schedule.morningStart).toBe(8 * 60); // 480
    expect(schedule.lunchEnd).toBe(12 * 60 + 30); // 750
    expect(schedule.afternoonStart).toBe(13 * 60 + 30); // 810
    expect(schedule.eveningEnd).toBe(17 * 60); // 1020
  });

  it('falls back to defaults for invalid time string values', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({
      morningStart: 'not-a-time',
      lunchEnd: '13:00',
      afternoonStart: '14:00',
      eveningEnd: '18:00',
    });

    const { loadWorkSchedule, getWorkSchedule } =
      await import('../src/background/schedule-manager.js');

    const callback = vi.fn();
    loadWorkSchedule(callback);

    const schedule = getWorkSchedule();
    // Default morningStart is '09:00' = 540
    expect(schedule.morningStart).toBe(9 * 60);
  });

  it('calls callback without arguments on completion', async () => {
    setupChromeMock();
    const { loadWorkSchedule } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    loadWorkSchedule(callback);

    expect(callback).toHaveBeenCalledWith();
  });

  it('does not throw when callback is omitted', async () => {
    setupChromeMock();
    const { loadWorkSchedule } = await import('../src/background/schedule-manager.js');

    expect(() => loadWorkSchedule()).not.toThrow();
  });
});

describe('getCurrentSituationId', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.resetModules();
  });

  it('returns morning situation ID during morning work hours', async () => {
    // 10:00 = 600 minutes — within morningStart(540) to lunchEnd(780)
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { getCurrentSituationId } = await import('../src/background/schedule-manager.js');

    const id = getCurrentSituationId();

    expect(id).toBe('entrata-mattina-2024-06-10');
    vi.useRealTimers();
  });

  it('returns lunch situation ID during lunch break', async () => {
    // 13:30 = 810 minutes — within lunchEnd(780) to afternoonStart(840)
    vi.setSystemTime(new Date('2024-06-10T13:30:00'));
    const { getCurrentSituationId } = await import('../src/background/schedule-manager.js');

    const id = getCurrentSituationId();

    expect(id).toBe('uscita-pranzo-2024-06-10');
    vi.useRealTimers();
  });

  it('returns afternoon situation ID during afternoon hours', async () => {
    // 15:00 = 900 minutes — within afternoonStart(840) to eveningEnd(1080)
    vi.setSystemTime(new Date('2024-06-10T15:00:00'));
    const { getCurrentSituationId } = await import('../src/background/schedule-manager.js');

    const id = getCurrentSituationId();

    expect(id).toBe('entrata-pomeriggio-2024-06-10');
    vi.useRealTimers();
  });

  it('returns evening situation ID after end of work', async () => {
    // 18:30 = 1110 minutes — after eveningEnd(1080)
    vi.setSystemTime(new Date('2024-06-10T18:30:00'));
    const { getCurrentSituationId } = await import('../src/background/schedule-manager.js');

    const id = getCurrentSituationId();

    expect(id).toBe('uscita-serale-2024-06-10');
    vi.useRealTimers();
  });

  it('returns null before work hours start', async () => {
    // 07:00 = 420 minutes — before morningStart(540)
    vi.setSystemTime(new Date('2024-06-10T07:00:00'));
    const { getCurrentSituationId } = await import('../src/background/schedule-manager.js');

    const id = getCurrentSituationId();

    expect(id).toBeNull();
    vi.useRealTimers();
  });
});

describe('isExcludedDay', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.resetModules();
  });

  it('returns excluded=true on weekends when excludeWeekends is true', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({ excludeWeekends: true, fullDayExclusions: [], halfDayExclusions: [] });

    // Saturday 2024-06-08
    vi.setSystemTime(new Date('2024-06-08T10:00:00'));
    const { isExcludedDay } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isExcludedDay(callback);

    expect(callback).toHaveBeenCalledOnce();
    const result = callback.mock.calls[0][0];
    expect(result.excluded).toBe(true);
    vi.useRealTimers();
  });

  it('returns excluded=false on weekdays with no exclusions', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({ excludeWeekends: true, fullDayExclusions: [], halfDayExclusions: [] });

    // Monday 2024-06-10
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { isExcludedDay } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isExcludedDay(callback);

    const result = callback.mock.calls[0][0];
    expect(result.excluded).toBe(false);
    vi.useRealTimers();
  });

  it('returns excluded=true for a full-day exclusion date', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({
      excludeWeekends: false,
      fullDayExclusions: [{ date: '2024-06-10' }],
      halfDayExclusions: [],
    });

    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { isExcludedDay } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isExcludedDay(callback);

    const result = callback.mock.calls[0][0];
    expect(result.excluded).toBe(true);
    vi.useRealTimers();
  });

  it('returns excluded=false on a weekday not in any exclusion list', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({
      excludeWeekends: true,
      fullDayExclusions: [{ date: '2024-06-11' }],
      halfDayExclusions: [],
    });

    // Monday 2024-06-10 — different from exclusion date
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { isExcludedDay } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isExcludedDay(callback);

    const result = callback.mock.calls[0][0];
    expect(result.excluded).toBe(false);
    vi.useRealTimers();
  });
});

describe('isWorkingHours', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.resetModules();
  });

  it('returns true when within 08:00-19:00 window on a non-excluded weekday', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({ excludeWeekends: true, fullDayExclusions: [], halfDayExclusions: [] });

    // Monday 10:00
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { isWorkingHours } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isWorkingHours(callback);

    expect(callback).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('returns false when before 08:00', async () => {
    setupChromeMock();
    vi.setSystemTime(new Date('2024-06-10T07:30:00'));
    const { isWorkingHours } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isWorkingHours(callback);

    expect(callback).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it('returns false when after 19:00', async () => {
    setupChromeMock();
    vi.setSystemTime(new Date('2024-06-10T19:30:00'));
    const { isWorkingHours } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isWorkingHours(callback);

    expect(callback).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it('returns false when within hours but day is excluded (weekend)', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({ excludeWeekends: true, fullDayExclusions: [], halfDayExclusions: [] });

    // Saturday 10:00
    vi.setSystemTime(new Date('2024-06-08T10:00:00'));
    const { isWorkingHours } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isWorkingHours(callback);

    expect(callback).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it('returns false when within hours but day is in full-day exclusions', async () => {
    const { setStorageData } = setupChromeMock();
    setStorageData({
      excludeWeekends: false,
      fullDayExclusions: [{ date: '2024-06-10' }],
      halfDayExclusions: [],
    });

    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const { isWorkingHours } = await import('../src/background/schedule-manager.js');
    const callback = vi.fn();

    isWorkingHours(callback);

    expect(callback).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
