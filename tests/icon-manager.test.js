import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock } from './helpers/chrome-mock.js';
import {
  isCurrentlyBlinking,
  setIcon,
  updateBadgeCountdown,
  stopBlinking,
  startBlinking,
} from '../src/background/icon-manager.js';

const DEFAULT_SCHEDULE = {
  morningStart: 9 * 60, // 540
  lunchEnd: 13 * 60, // 780
  afternoonStart: 14 * 60, // 840
  eveningEnd: 18 * 60, // 1080
};

describe('setIcon', () => {
  beforeEach(() => {
    setupChromeMock();
    stopBlinking();
  });

  it('calls chrome.action.setIcon with green icon paths for state "green"', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    setIcon('green');

    expect(spy).toHaveBeenCalledOnce();
    const path = spy.mock.calls[0][0].path;
    expect(path[16]).toBe('images/timer-green-16.png');
    expect(path[48]).toBe('images/timer-green-48.png');
    expect(path[128]).toBe('images/timer-green-128.png');
  });

  it('calls chrome.action.setIcon with red icon paths for state "red"', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    setIcon('red');

    const path = spy.mock.calls[0][0].path;
    expect(path[16]).toBe('images/timer-red-16.png');
    expect(path[48]).toBe('images/timer-red-48.png');
    expect(path[128]).toBe('images/timer-red-128.png');
  });

  it('calls chrome.action.setIcon with na icon paths for state "na"', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    setIcon('na');

    const path = spy.mock.calls[0][0].path;
    expect(path[16]).toBe('images/timer-na-16.png');
    expect(path[48]).toBe('images/timer-na-48.png');
    expect(path[128]).toBe('images/timer-na-128.png');
  });

  it('falls back to na icon paths for unknown state', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    setIcon('unknown-state');

    const path = spy.mock.calls[0][0].path;
    expect(path[16]).toBe('images/timer-na-16.png');
  });

  it('sets green badge background color for state "green"', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');

    setIcon('green');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].color).toBe('#28a745');
  });

  it('sets red badge background color for state "red"', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');

    setIcon('red');

    expect(spy.mock.calls[0][0].color).toBe('#dc3545');
  });

  it('sets na badge background color for state "na"', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');

    setIcon('na');

    expect(spy.mock.calls[0][0].color).toBe('#6c757d');
  });

  it('falls back to na badge color for unknown state', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeBackgroundColor');

    setIcon('whatever');

    expect(spy.mock.calls[0][0].color).toBe('#6c757d');
  });

  it('handles chrome.runtime.lastError in setIcon callback without throwing', () => {
    chrome.runtime.lastError = { message: 'setIcon failed' };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => setIcon('green')).not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    chrome.runtime.lastError = null;
    consoleSpy.mockRestore();
  });

  it('handles chrome.runtime.lastError in setBadgeBackgroundColor callback without throwing', () => {
    // Override setBadgeBackgroundColor to simulate lastError
    chrome.action.setBadgeBackgroundColor = (details, callback) => {
      chrome.runtime.lastError = { message: 'setBadgeBackgroundColor failed' };
      if (callback) callback();
      chrome.runtime.lastError = null;
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => setIcon('red')).not.toThrow();

    consoleSpy.mockRestore();
  });
});

describe('updateBadgeCountdown', () => {
  beforeEach(() => {
    setupChromeMock();
    stopBlinking();
  });

  it('sets empty badge text when isTimbrato is null', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeText');

    updateBadgeCountdown(null, DEFAULT_SCHEDULE);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].text).toBe('');
  });

  it('calls setBadgeText with a string when isTimbrato is true', () => {
    // 10:00 — within morning slot, isTimbrato=true means clocked in
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const spy = vi.spyOn(chrome.action, 'setBadgeText');

    updateBadgeCountdown(true, DEFAULT_SCHEDULE);

    expect(spy).toHaveBeenCalledOnce();
    expect(typeof spy.mock.calls[0][0].text).toBe('string');
    vi.useRealTimers();
  });

  it('calls setBadgeText with a string when isTimbrato is false', () => {
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    const spy = vi.spyOn(chrome.action, 'setBadgeText');

    updateBadgeCountdown(false, DEFAULT_SCHEDULE);

    expect(spy).toHaveBeenCalledOnce();
    expect(typeof spy.mock.calls[0][0].text).toBe('string');
    vi.useRealTimers();
  });

  it('does not call setBadgeText a second time when isTimbrato is null', () => {
    const spy = vi.spyOn(chrome.action, 'setBadgeText');

    updateBadgeCountdown(null, DEFAULT_SCHEDULE);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('handles chrome.runtime.lastError in setBadgeText callback for null isTimbrato', () => {
    chrome.action.setBadgeText = (details, callback) => {
      chrome.runtime.lastError = { message: 'setBadgeText failed' };
      if (callback) callback();
      chrome.runtime.lastError = null;
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => updateBadgeCountdown(null, DEFAULT_SCHEDULE)).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('handles chrome.runtime.lastError in setBadgeText callback for non-null isTimbrato', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-10T10:00:00'));
    chrome.action.setBadgeText = (details, callback) => {
      chrome.runtime.lastError = { message: 'setBadgeText failed' };
      if (callback) callback();
      chrome.runtime.lastError = null;
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => updateBadgeCountdown(true, DEFAULT_SCHEDULE)).not.toThrow();

    consoleSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe('isCurrentlyBlinking', () => {
  beforeEach(() => {
    setupChromeMock();
    stopBlinking();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopBlinking();
    vi.useRealTimers();
  });

  it('returns false initially (before any blinking starts)', () => {
    expect(isCurrentlyBlinking()).toBe(false);
  });

  it('returns true after startBlinking is called', () => {
    startBlinking('green');

    expect(isCurrentlyBlinking()).toBe(true);
  });

  it('returns false after stopBlinking is called', () => {
    startBlinking('green');
    stopBlinking();

    expect(isCurrentlyBlinking()).toBe(false);
  });
});

describe('startBlinking', () => {
  beforeEach(() => {
    setupChromeMock();
    stopBlinking();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopBlinking();
    vi.useRealTimers();
  });

  it('sets isBlinking to true', () => {
    startBlinking('green');

    expect(isCurrentlyBlinking()).toBe(true);
  });

  it('calls setIcon with the baseState icon on each interval tick', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    startBlinking('red');
    vi.advanceTimersByTime(500); // first tick

    // should have called setIcon with red paths
    const calls = spy.mock.calls;
    const redCall = calls.find((c) => c[0].path[16] === 'images/timer-red-16.png');
    expect(redCall).toBeDefined();
  });

  it('alternates between baseState and na icon on successive ticks', () => {
    const spy = vi.spyOn(chrome.action, 'setIcon');

    startBlinking('green');
    vi.advanceTimersByTime(500); // tick 1 → green
    vi.advanceTimersByTime(500); // tick 2 → na

    const iconPaths = spy.mock.calls.map((c) => c[0].path[16]);
    expect(iconPaths).toContain('images/timer-green-16.png');
    expect(iconPaths).toContain('images/timer-na-16.png');
  });

  it('stops previous blinking before starting a new one', () => {
    startBlinking('green');
    expect(isCurrentlyBlinking()).toBe(true);

    startBlinking('red');
    expect(isCurrentlyBlinking()).toBe(true);

    // After two ticks: only red and na icons should appear (green was stopped)
    const spy = vi.spyOn(chrome.action, 'setIcon');
    vi.advanceTimersByTime(1000);

    const iconPaths = spy.mock.calls.map((c) => c[0].path[16]);
    expect(iconPaths).not.toContain('images/timer-green-16.png');
  });
});

describe('stopBlinking', () => {
  beforeEach(() => {
    setupChromeMock();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopBlinking();
    vi.useRealTimers();
  });

  it('clears the blink interval so setIcon is not called after stop', () => {
    startBlinking('green');
    stopBlinking();

    const spy = vi.spyOn(chrome.action, 'setIcon');
    vi.advanceTimersByTime(2000);

    expect(spy).not.toHaveBeenCalled();
  });

  it('sets isBlinking to false', () => {
    startBlinking('green');
    stopBlinking();

    expect(isCurrentlyBlinking()).toBe(false);
  });

  it('is a no-op when not currently blinking (does not throw)', () => {
    // already stopped from beforeEach
    expect(() => stopBlinking()).not.toThrow();
    expect(isCurrentlyBlinking()).toBe(false);
  });
});
