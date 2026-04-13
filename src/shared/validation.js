/**
 * Shared validation utilities.
 * Pure functions — no chrome.* or DOM dependencies.
 */

import { ALLOWED_ORIGINS } from './constants.js';

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
