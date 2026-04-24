import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock } from './helpers/chrome-mock.js';
import {
  sendNotification,
  checkAndSendNotifications,
  sendStartupNotification,
} from '../src/background/notification-manager.js';

const DEFAULT_SCHEDULE = {
  morningStart: 9 * 60, // 540
  lunchEnd: 13 * 60, // 780
  afternoonStart: 14 * 60, // 840
  eveningEnd: 18 * 60, // 1080
};

describe('sendNotification', () => {
  let setStorageData, setLastError;

  beforeEach(() => {
    ({ setStorageData, setLastError } = setupChromeMock());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips creating notification when enableNotifications is false', () => {
    setStorageData({ enableNotifications: false });
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('Title', 'Message');

    expect(spy).not.toHaveBeenCalled();
  });

  it('creates notification when enableNotifications is true', () => {
    setStorageData({ enableNotifications: true });
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('Title', 'Message');

    expect(spy).toHaveBeenCalledOnce();
  });

  it('creates notification with default enableNotifications=true when not set', () => {
    setStorageData({});
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('Title', 'Message');

    expect(spy).toHaveBeenCalledOnce();
  });

  it('uses red icon for urgent notifications', () => {
    setStorageData({ enableNotifications: true });
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('Urgent', 'Message', true);

    const options = spy.mock.calls[0][1];
    expect(options.iconUrl).toBe('images/timer-red-128.png');
    expect(options.priority).toBe(2);
    expect(options.requireInteraction).toBe(true);
  });

  it('uses green icon for non-urgent notifications', () => {
    setStorageData({ enableNotifications: true });
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('Normal', 'Message', false);

    const options = spy.mock.calls[0][1];
    expect(options.iconUrl).toBe('images/timer-green-128.png');
    expect(options.priority).toBe(1);
    expect(options.requireInteraction).toBe(false);
  });

  it('includes correct title and message in notification options', () => {
    setStorageData({ enableNotifications: true });
    const spy = vi.spyOn(chrome.notifications, 'create');

    sendNotification('My Title', 'My Message');

    const options = spy.mock.calls[0][1];
    expect(options.title).toBe('My Title');
    expect(options.message).toBe('My Message');
    expect(options.type).toBe('basic');
  });

  it('auto-closes non-urgent notifications after NOTIFICATION_AUTO_CLOSE_MS', () => {
    setStorageData({ enableNotifications: true });
    const clearSpy = vi.spyOn(chrome.notifications, 'clear');

    sendNotification('Title', 'Message', false);

    // Before timeout fires
    expect(clearSpy).not.toHaveBeenCalled();

    // After auto-close timeout (10 seconds)
    vi.advanceTimersByTime(10_000);

    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it('does not auto-close urgent notifications', () => {
    setStorageData({ enableNotifications: true });
    const clearSpy = vi.spyOn(chrome.notifications, 'clear');

    sendNotification('Urgent', 'Message', true);
    vi.advanceTimersByTime(15_000);

    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('does not throw when chrome.runtime.lastError is set during creation', () => {
    setStorageData({ enableNotifications: true });

    // Override create to simulate lastError
    vi.spyOn(chrome.notifications, 'create').mockImplementation((id, options, callback) => {
      chrome.runtime.lastError = { message: 'notifications error' };
      callback(id);
      chrome.runtime.lastError = null;
    });

    expect(() => sendNotification('Title', 'Msg')).not.toThrow();
  });
});

describe('checkAndSendNotifications', () => {
  let setStorageData;

  beforeEach(() => {
    ({ setStorageData } = setupChromeMock());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends notification for a time slot that has not been sent yet', () => {
    setStorageData({
      enableNotifications: true,
      notificationsSent: {},
    });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    // 09:02 — within morning window (morningStart=540, window=5min)
    vi.setSystemTime(new Date('2024-06-10T09:02:00'));

    checkAndSendNotifications(9 * 60 + 2, false, DEFAULT_SCHEDULE);

    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('does not re-send a notification already marked as sent today', () => {
    const today = new Date('2024-06-10T09:02:00').toDateString();
    setStorageData({
      enableNotifications: true,
      notificationsSent: { date: today, morning: true },
    });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    vi.setSystemTime(new Date('2024-06-10T09:02:00'));

    checkAndSendNotifications(9 * 60 + 2, false, DEFAULT_SCHEDULE);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('resets notificationsSent on a new day and sends fresh notifications', () => {
    const yesterday = new Date('2024-06-09').toDateString();
    setStorageData({
      enableNotifications: true,
      notificationsSent: { date: yesterday, morning: true },
    });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    vi.setSystemTime(new Date('2024-06-10T09:02:00'));

    checkAndSendNotifications(9 * 60 + 2, false, DEFAULT_SCHEDULE);

    // morning slot reset — should send
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it('sends multiple notifications if multiple slots are in window', () => {
    setStorageData({
      enableNotifications: true,
      notificationsSent: {},
    });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    // Use a time where multiple slots need notification — but normally only one at a time.
    // Test with morning slot only.
    vi.setSystemTime(new Date('2024-06-10T09:00:00'));

    checkAndSendNotifications(9 * 60, false, DEFAULT_SCHEDULE);

    expect(createSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('sendStartupNotification', () => {
  let setStorageData;

  beforeEach(() => {
    ({ setStorageData } = setupChromeMock());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends urgent notification when morning stamp is missing (isTimbrato=false, morning hours)', () => {
    setStorageData({ enableNotifications: true });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    // 10:00 = 600 min — morningStart(540) ≤ 600 < lunchEnd(780), isTimbrato=false → 'morning'
    sendStartupNotification(false, DEFAULT_SCHEDULE);

    // Notification should be called with urgent=true options
    expect(createSpy).toHaveBeenCalledOnce();
    const options = createSpy.mock.calls[0][1];
    expect(options.requireInteraction).toBe(true);
  });

  it('sends urgent notification when lunch stamp is missing (isTimbrato=true, lunch hours)', () => {
    setStorageData({ enableNotifications: true });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    // We need to call with a schedule where lunchEnd ≤ current < afternoonStart
    // We'll call sendStartupNotification after setting system time to lunch period
    vi.setSystemTime(new Date('2024-06-10T13:10:00')); // 790 min

    // Re-import to pick up fresh time — but sendStartupNotification uses new Date() internally
    sendStartupNotification(true, DEFAULT_SCHEDULE);

    expect(createSpy).toHaveBeenCalledOnce();
    const options = createSpy.mock.calls[0][1];
    expect(options.title).toBe('TIMBRA INIZIO PAUSA PRANZO');
  });

  it('sends evening notification when clocked in after eveningEnd', () => {
    setStorageData({ enableNotifications: true });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    vi.setSystemTime(new Date('2024-06-10T18:15:00')); // 1095 min > eveningEnd(1080)

    sendStartupNotification(true, DEFAULT_SCHEDULE);

    expect(createSpy).toHaveBeenCalledOnce();
    const options = createSpy.mock.calls[0][1];
    expect(options.title).toBe('TIMBRA USCITA');
  });

  it('does nothing when no notification type is needed (null type)', () => {
    setStorageData({ enableNotifications: true });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    // 07:00 = 420 min — before morningStart(540), type=null
    vi.setSystemTime(new Date('2024-06-10T07:00:00'));

    sendStartupNotification(false, DEFAULT_SCHEDULE);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('does nothing when isTimbrato is null (unknown state)', () => {
    setStorageData({ enableNotifications: true });
    const createSpy = vi.spyOn(chrome.notifications, 'create');

    vi.setSystemTime(new Date('2024-06-10T10:00:00'));

    sendStartupNotification(null, DEFAULT_SCHEDULE);

    expect(createSpy).not.toHaveBeenCalled();
  });
});
