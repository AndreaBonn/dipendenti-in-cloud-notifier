/**
 * Chrome storage helper utilities.
 */

import { logError } from '../shared/logging.js';

/** Safe wrapper for chrome.storage.local.set with lastError check. */
export function storageSet(data, callback) {
  chrome.storage.local.set(data, function () {
    if (chrome.runtime.lastError) {
      logError('storage.set fallito:', chrome.runtime.lastError.message, Object.keys(data));
    }
    if (callback) callback();
  });
}

/** Safe wrapper for chrome.storage.local.get with lastError check. */
export function storageGet(keysOrDefaults, callback) {
  chrome.storage.local.get(keysOrDefaults, function (data) {
    if (chrome.runtime.lastError) {
      logError('storage.get fallito:', chrome.runtime.lastError.message);
      const defaults =
        typeof keysOrDefaults === 'object' && !Array.isArray(keysOrDefaults) ? keysOrDefaults : {};
      callback(defaults);
      return;
    }
    callback(data);
  });
}

/** Safe wrapper for chrome.storage.local.remove with lastError check. */
export function storageRemove(keys, callback) {
  chrome.storage.local.remove(keys, function () {
    if (chrome.runtime.lastError) {
      logError('storage.remove fallito:', chrome.runtime.lastError.message, keys);
    }
    if (callback) callback();
  });
}
