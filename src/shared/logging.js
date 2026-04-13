/**
 * Shared logging utilities.
 * Provides debug-gated logging and always-visible error/warning logging.
 *
 * Note: content.js cannot use ES modules (MV3 content_scripts limitation),
 * so it maintains its own copy of these functions.
 */

const DEBUG = false;

export function log(...args) {
  if (DEBUG) console.log(...args); // eslint-disable-line no-console
}

export function logError(...args) {
  console.error('[Timbratura]', ...args); // eslint-disable-line no-console
}

export function logWarn(...args) {
  console.warn('[Timbratura]', ...args); // eslint-disable-line no-console
}
