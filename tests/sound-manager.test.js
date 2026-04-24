import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupChromeMock } from './helpers/chrome-mock.js';
import { sendToOffscreen, stopSound, startSound } from '../src/background/sound-manager.js';

describe('sendToOffscreen', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('sends message directly when offscreen document already exists', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(true);
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    sendToOffscreen({ action: 'playSound' });
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalledOnce());

    expect(sendSpy.mock.calls[0][0]).toEqual({ action: 'playSound' });
  });

  it('creates offscreen document then sends message when document does not exist', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(false);
    chrome.offscreen.createDocument = vi.fn().mockResolvedValue(undefined);
    vi.useFakeTimers();
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    sendToOffscreen({ action: 'playSound' });

    await Promise.resolve(); // flush hasDocument promise
    await Promise.resolve(); // flush createDocument promise
    vi.advanceTimersByTime(50); // flush 50ms delay

    expect(chrome.offscreen.createDocument).toHaveBeenCalledOnce();
    expect(sendSpy).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('passes correct document options when creating offscreen document', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(false);
    const createSpy = vi
      .spyOn(chrome.offscreen, 'createDocument')
      .mockResolvedValue(undefined);
    vi.useFakeTimers();

    sendToOffscreen({ action: 'test' });
    await Promise.resolve();
    await Promise.resolve();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'src/pages/offscreen/offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
      })
    );
    vi.useRealTimers();
  });

  it('does not throw when hasDocument rejects', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockRejectedValue(new Error('API unavailable'));

    await expect(async () => {
      sendToOffscreen({ action: 'playSound' });
      await Promise.resolve();
    }).not.toThrow();
  });

  it('does not throw when createDocument rejects', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(false);
    chrome.offscreen.createDocument = vi.fn().mockRejectedValue(new Error('create failed'));

    await expect(async () => {
      sendToOffscreen({ action: 'playSound' });
      await Promise.resolve();
      await Promise.resolve();
    }).not.toThrow();
  });

  it('handles chrome.runtime.lastError in sendMessage callback without throwing', async () => {
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(true);
    chrome.runtime.sendMessage = vi.fn((msg, callback) => {
      chrome.runtime.lastError = { message: 'sendMessage failed' };
      if (callback) callback();
      chrome.runtime.lastError = null;
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    sendToOffscreen({ action: 'playSound' });
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('stopSound', () => {
  let setStorageData;

  beforeEach(() => {
    ({ setStorageData } = setupChromeMock());
    vi.useFakeTimers();
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    stopSound();
    vi.useRealTimers();
  });

  it('is a no-op when sound is not running (does not throw)', () => {
    stopSound(); // ensure clean state
    expect(() => stopSound()).not.toThrow();
  });

  it('clears the repeat interval so playback does not continue after stop', async () => {
    setStorageData({ enableSound: true, soundType: 'classic', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    // flush the immediate playNotificationSound call
    await Promise.resolve();
    await Promise.resolve();

    stopSound();
    sendSpy.mockClear();

    // Advance past one SOUND_REPEAT_MS interval (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000 + 100);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('startSound', () => {
  let setStorageData;

  beforeEach(() => {
    ({ setStorageData } = setupChromeMock());
    vi.useFakeTimers();
    chrome.offscreen.hasDocument = vi.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    stopSound();
    vi.useRealTimers();
  });

  it('plays sound immediately on call when enableSound is true', async () => {
    setStorageData({ enableSound: true, soundType: 'classic', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('does not play sound when enableSound is false', async () => {
    setStorageData({ enableSound: false, soundType: 'classic', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('sends correct playSound message with soundType and volume', async () => {
    setStorageData({ enableSound: true, soundType: 'bell', soundVolume: 80 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledOnce();
    const msg = sendSpy.mock.calls[0][0];
    expect(msg.action).toBe('playSound');
    expect(msg.soundType).toBe('bell');
    expect(msg.volume).toBeCloseTo(0.8, 2);
    expect(msg.target).toBe('offscreen');
  });

  it('sets up a repeat interval that fires after SOUND_REPEAT_MS', async () => {
    setStorageData({ enableSound: true, soundType: 'classic', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();
    sendSpy.mockClear();

    // Advance by one full interval (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledOnce();
  });

  it('stops previous sound before starting a new one', async () => {
    setStorageData({ enableSound: true, soundType: 'classic', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();
    sendSpy.mockClear();

    startSound(); // second call stops first interval
    await Promise.resolve();
    await Promise.resolve();
    sendSpy.mockClear();

    // Only one interval should be running — advance by one period
    vi.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();
    await Promise.resolve();

    // Exactly one call (not two) because the first interval was stopped
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('normalizes unknown soundType to "classic"', async () => {
    setStorageData({ enableSound: true, soundType: 'invalid-type', soundVolume: 50 });
    const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    startSound();
    await Promise.resolve();
    await Promise.resolve();

    const msg = sendSpy.mock.calls[0][0];
    expect(msg.soundType).toBe('classic');
  });
});
