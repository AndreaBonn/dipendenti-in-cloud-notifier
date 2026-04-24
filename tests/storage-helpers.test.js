import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupChromeMock } from './helpers/chrome-mock.js';
import { storageSet, storageGet, storageRemove } from '../src/background/storage-helpers.js';

describe('storageSet', () => {
  let setStorageData, setLastError;

  beforeEach(() => {
    ({ setStorageData, setLastError } = setupChromeMock());
  });

  it('stores data and calls callback', () => {
    const callback = vi.fn();

    storageSet({ foo: 'bar' }, callback);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('persists data to chrome.storage.local', () => {
    storageSet({ answer: 42 }, null);

    const callback = vi.fn();
    chrome.storage.local.get({ answer: null }, callback);

    expect(callback).toHaveBeenCalledWith({ answer: 42 });
  });

  it('calls callback with no error on success', () => {
    const callback = vi.fn();
    storageSet({ x: 1 }, callback);
    expect(callback).toHaveBeenCalledWith();
  });

  it('still calls callback when lastError is set', () => {
    setLastError('disk full');
    const callback = vi.fn();

    storageSet({ x: 1 }, callback);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('does not throw when callback is omitted', () => {
    expect(() => storageSet({ key: 'value' })).not.toThrow();
  });

  it('does not throw when callback is null', () => {
    expect(() => storageSet({ key: 'value' }, null)).not.toThrow();
  });
});

describe('storageGet', () => {
  let setStorageData, setLastError;

  beforeEach(() => {
    ({ setStorageData, setLastError } = setupChromeMock());
  });

  it('returns stored data matching object defaults keys', () => {
    setStorageData({ name: 'Alice' });
    const callback = vi.fn();

    storageGet({ name: 'default' }, callback);

    expect(callback).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('returns default values for missing keys when using object defaults', () => {
    setStorageData({});
    const callback = vi.fn();

    storageGet({ missing: 'fallback' }, callback);

    expect(callback).toHaveBeenCalledWith({ missing: 'fallback' });
  });

  it('returns data for array keys', () => {
    setStorageData({ a: 1, b: 2 });
    const callback = vi.fn();

    storageGet(['a', 'b'], callback);

    expect(callback).toHaveBeenCalledWith({ a: 1, b: 2 });
  });

  it('returns empty object for array keys with no matching data', () => {
    setStorageData({});
    const callback = vi.fn();

    storageGet(['nonexistent'], callback);

    expect(callback).toHaveBeenCalledWith({});
  });

  it('returns object defaults on lastError', () => {
    setLastError('read error');
    const callback = vi.fn();

    storageGet({ enabled: true, count: 0 }, callback);

    expect(callback).toHaveBeenCalledWith({ enabled: true, count: 0 });
  });

  it('returns empty object as defaults on lastError with array keys', () => {
    setLastError('read error');
    const callback = vi.fn();

    storageGet(['key1', 'key2'], callback);

    expect(callback).toHaveBeenCalledWith({});
  });

  it('handles multiple keys with mixed stored and default values', () => {
    setStorageData({ existing: 'stored' });
    const callback = vi.fn();

    storageGet({ existing: 'default', missing: 'fallback' }, callback);

    expect(callback).toHaveBeenCalledWith({ existing: 'stored', missing: 'fallback' });
  });
});

describe('storageRemove', () => {
  let setStorageData, setLastError;

  beforeEach(() => {
    ({ setStorageData, setLastError } = setupChromeMock());
  });

  it('removes a single key and calls callback', () => {
    setStorageData({ toDelete: 'gone', keep: 'here' });
    const callback = vi.fn();

    storageRemove('toDelete', callback);

    expect(callback).toHaveBeenCalledOnce();
    // verify the key is gone
    const verify = vi.fn();
    chrome.storage.local.get(['toDelete', 'keep'], verify);
    expect(verify).toHaveBeenCalledWith({ keep: 'here' });
  });

  it('removes multiple keys provided as array', () => {
    setStorageData({ a: 1, b: 2, c: 3 });
    const callback = vi.fn();

    storageRemove(['a', 'b'], callback);

    expect(callback).toHaveBeenCalledOnce();
    const verify = vi.fn();
    chrome.storage.local.get({ a: null, b: null, c: null }, verify);
    expect(verify).toHaveBeenCalledWith({ a: null, b: null, c: 3 });
  });

  it('still calls callback when lastError is set', () => {
    setLastError('remove error');
    const callback = vi.fn();

    storageRemove('key', callback);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('does not throw when callback is omitted', () => {
    expect(() => storageRemove('key')).not.toThrow();
  });

  it('does not throw when callback is null', () => {
    expect(() => storageRemove('key', null)).not.toThrow();
  });
});
