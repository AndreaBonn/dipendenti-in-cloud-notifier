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
