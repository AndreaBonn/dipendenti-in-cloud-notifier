/**
 * Shared validation utilities.
 * Pure functions — no chrome.* or DOM dependencies.
 */

import { ALLOWED_ORIGINS, VALID_SOUND_TYPES } from './constants.js';

/** Validate URL origin against allowlist using URL parser (prevents subdomain bypass). */
export function isAllowedOrigin(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.includes(parsed.origin);
  } catch (_error) {
    return false;
  }
}

/** Validate a date string in YYYY-MM-DD format (rejects non-existent calendar dates). */
export function isValidDate(dateStr) {
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_REGEX.test(dateStr)) return false;

  // new Date('2025-02-29') silently overflows to Mar 1 — round-trip check catches this
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

/** Sanitize and truncate a description string. */
export function sanitizeDescription(value) {
  const MAX_DESCRIPTION_LENGTH = 100;
  return value.trim().substring(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * Convert "HH:MM" string to { h, m } object with validation.
 * Returns { h: 0, m: 0 } for invalid input.
 */
export function parseTimeToHoursMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    console.warn('[Timbratura] parseTimeToHoursMinutes: input non valido:', timeStr); // eslint-disable-line no-console
    return { h: 0, m: 0 };
  }
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    console.warn('[Timbratura] parseTimeToHoursMinutes: valore non numerico:', timeStr); // eslint-disable-line no-console
    return { h: 0, m: 0 };
  }
  return { h, m };
}

/**
 * Normalize a volume value to the 0-1 range.
 * Handles the falsy trap: volume=0 is valid silence, not a missing value.
 *
 * @param {*} rawValue - volume as 0-100 percentage, 0-1 ratio, or invalid
 * @param {boolean} [isPercentage=false] - if true, divides by 100 first
 * @returns {number} clamped 0-1
 */
export function normalizeVolume(rawValue, isPercentage = false) {
  const num = isPercentage ? Number(rawValue) / 100 : Number(rawValue);
  return Math.max(0, Math.min(1, Number.isFinite(num) ? num : 0.5));
}

/**
 * Validate and normalize a sound type against the whitelist.
 *
 * @param {*} soundType
 * @returns {string} valid sound type or 'classic' as fallback
 */
export function normalizeSoundType(soundType) {
  return VALID_SOUND_TYPES.includes(soundType) ? soundType : 'classic';
}

/**
 * Validate a schedule time string matches HH:MM format.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidTimeString(value) {
  return typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
}

/**
 * Filter an array of exclusions, keeping only structurally valid entries.
 *
 * @param {*} exclusions - raw value from storage
 * @returns {Array<{date: string}>} only entries with a valid date string
 */
export function filterValidExclusions(exclusions) {
  if (!Array.isArray(exclusions)) return [];
  return exclusions.filter((e) => e && typeof e.date === 'string');
}

/**
 * Determine which startup notification type should fire based on clock state and time.
 * Unlike getNotificationsToSend (which checks a narrow window), this covers the entire
 * time slot — on startup, we alert even if hours have passed since the slot started.
 *
 * @returns {string|null} Notification key ('morning'|'lunch'|'afternoon'|'evening') or null
 */
export function getStartupNotificationType(currentMinutes, isTimbrato, schedule) {
  const { morningStart, lunchEnd, afternoonStart, eveningEnd } = schedule;

  if (isTimbrato === false && currentMinutes >= morningStart && currentMinutes < lunchEnd) {
    return 'morning';
  }
  if (isTimbrato === true && currentMinutes >= lunchEnd && currentMinutes < afternoonStart) {
    return 'lunch';
  }
  if (isTimbrato === false && currentMinutes >= afternoonStart && currentMinutes < eveningEnd) {
    return 'afternoon';
  }
  if (isTimbrato === true && currentMinutes >= eveningEnd) {
    return 'evening';
  }
  return null;
}
