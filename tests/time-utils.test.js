import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  getSituationId,
  shouldBlink,
  getBadgeText,
  getNotificationsToSend,
} from '../src/time-utils.js';

const DEFAULT_SCHEDULE = {
  morningStart: 9 * 60, // 540
  lunchEnd: 13 * 60, // 780
  afternoonStart: 14 * 60, // 840
  eveningEnd: 18 * 60, // 1080
};

describe('timeToMinutes', () => {
  it('converts "09:00" to 540', () => {
    expect(timeToMinutes('09:00')).toBe(540);
  });

  it('converts "13:30" to 810', () => {
    expect(timeToMinutes('13:30')).toBe(810);
  });

  it('converts "00:00" to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts "23:59" to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('getSituationId', () => {
  const date = '2024-12-01';

  it('returns morning entry during work hours', () => {
    expect(getSituationId(600, DEFAULT_SCHEDULE, date)).toBe(`entrata-mattina-${date}`);
  });

  it('returns lunch exit during lunch break', () => {
    expect(getSituationId(800, DEFAULT_SCHEDULE, date)).toBe(`uscita-pranzo-${date}`);
  });

  it('returns afternoon entry during afternoon', () => {
    expect(getSituationId(900, DEFAULT_SCHEDULE, date)).toBe(`entrata-pomeriggio-${date}`);
  });

  it('returns evening exit after work', () => {
    expect(getSituationId(1100, DEFAULT_SCHEDULE, date)).toBe(`uscita-serale-${date}`);
  });

  it('returns null before work hours', () => {
    expect(getSituationId(400, DEFAULT_SCHEDULE, date)).toBeNull();
  });
});

describe('shouldBlink', () => {
  it('blinks when not clocked in during morning', () => {
    expect(shouldBlink(600, false, DEFAULT_SCHEDULE)).toBe(true);
  });

  it('does not blink when clocked in during morning', () => {
    expect(shouldBlink(600, true, DEFAULT_SCHEDULE)).toBe(false);
  });

  it('blinks when still clocked in during lunch break', () => {
    expect(shouldBlink(790, true, DEFAULT_SCHEDULE)).toBe(true);
  });

  it('does not blink when clocked out during lunch', () => {
    expect(shouldBlink(790, false, DEFAULT_SCHEDULE)).toBe(false);
  });

  it('blinks when not clocked in during afternoon', () => {
    expect(shouldBlink(900, false, DEFAULT_SCHEDULE)).toBe(true);
  });

  it('blinks when still clocked in after evening end', () => {
    expect(shouldBlink(1100, true, DEFAULT_SCHEDULE)).toBe(true);
  });

  it('does not blink when clocked out after evening', () => {
    expect(shouldBlink(1100, false, DEFAULT_SCHEDULE)).toBe(false);
  });

  it('does not blink before work hours', () => {
    expect(shouldBlink(400, false, DEFAULT_SCHEDULE)).toBe(false);
    expect(shouldBlink(400, true, DEFAULT_SCHEDULE)).toBe(false);
  });
});

describe('getBadgeText', () => {
  it('shows minutes when less than 60 min to target', () => {
    // Not clocked in, 30 min before morning start
    expect(getBadgeText(510, false, DEFAULT_SCHEDULE)).toBe('30m');
  });

  it('shows hours when more than 60 min to target', () => {
    // Clocked in at 10:00, target is 13:00 lunch = 180 min = 3h
    expect(getBadgeText(600, true, DEFAULT_SCHEDULE)).toBe('3h');
  });

  it('shows ! when past target', () => {
    // Clocked in, past evening end (target is 24*60=1440, current 1440 → past midnight target)
    // Actually: clocked in at 1100, target is eveningEnd=1080... wait that's already past
    // Let me reconsider: at 1080 (eveningEnd), target becomes 24*60=1440, diff=360 → 6h
    expect(getBadgeText(1080, true, DEFAULT_SCHEDULE)).toBe('6h');
  });

  it('returns empty when no target applicable', () => {
    expect(getBadgeText(1200, false, DEFAULT_SCHEDULE)).toBe('');
  });
});

describe('getNotificationsToSend', () => {
  const window = 5;

  it('triggers morning notification at morning start', () => {
    const result = getNotificationsToSend(540, false, DEFAULT_SCHEDULE, window);
    expect(result).toContain('morning');
  });

  it('does not trigger morning if clocked in', () => {
    const result = getNotificationsToSend(540, true, DEFAULT_SCHEDULE, window);
    expect(result).not.toContain('morning');
  });

  it('triggers lunch notification at lunch end', () => {
    const result = getNotificationsToSend(780, true, DEFAULT_SCHEDULE, window);
    expect(result).toContain('lunch');
  });

  it('triggers afternoon notification at afternoon start', () => {
    const result = getNotificationsToSend(840, false, DEFAULT_SCHEDULE, window);
    expect(result).toContain('afternoon');
  });

  it('triggers evening notification at evening end', () => {
    const result = getNotificationsToSend(1080, true, DEFAULT_SCHEDULE, window);
    expect(result).toContain('evening');
  });

  it('does not trigger outside window', () => {
    const result = getNotificationsToSend(550, false, DEFAULT_SCHEDULE, window);
    expect(result).not.toContain('morning');
  });

  it('returns empty array when nothing to notify', () => {
    const result = getNotificationsToSend(400, false, DEFAULT_SCHEDULE, window);
    expect(result).toEqual([]);
  });
});
