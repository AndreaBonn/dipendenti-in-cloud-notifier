/**
 * Work schedule loading and exclusion/working-hours checks.
 */

import { timeToMinutes, checkExclusion, getSituationId } from '../time-utils.js';
import { DEFAULT_SCHEDULE_STRINGS } from '../shared/constants.js';
import { logError } from '../shared/logging.js';
import { storageGet } from './storage-helpers.js';

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;

const workSchedule = {
  morningStart: 9 * 60,
  lunchEnd: 13 * 60,
  afternoonStart: 14 * 60,
  eveningEnd: 18 * 60,
};

/** Get the current work schedule (in minutes). */
export function getWorkSchedule() {
  return workSchedule;
}

/** Load custom work schedule from chrome.storage into the in-memory object. */
export function loadWorkSchedule(callback) {
  storageGet(
    {
      morningStart: DEFAULT_SCHEDULE_STRINGS.morningStart,
      lunchEnd: DEFAULT_SCHEDULE_STRINGS.lunchEnd,
      afternoonStart: DEFAULT_SCHEDULE_STRINGS.afternoonStart,
      eveningEnd: DEFAULT_SCHEDULE_STRINGS.eveningEnd,
    },
    function (items) {
      const fields = ['morningStart', 'lunchEnd', 'afternoonStart', 'eveningEnd'];
      for (const field of fields) {
        if (typeof items[field] === 'string' && TIME_PATTERN.test(items[field])) {
          workSchedule[field] = timeToMinutes(items[field]);
        } else {
          logError('loadWorkSchedule: valore invalido per', field, items[field]);
          workSchedule[field] = timeToMinutes(DEFAULT_SCHEDULE_STRINGS[field]);
        }
      }
      if (callback) callback();
    }
  );
}

/** Get the current time-slot situation ID (for mute tracking). */
export function getCurrentSituationId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  return getSituationId(currentTime, workSchedule, dateStr);
}

/**
 * Check if today is an excluded day (weekend, full-day, or half-day exclusion).
 * Reads exclusion settings from storage and delegates to checkExclusion().
 */
export function isExcludedDay(callback) {
  storageGet(
    {
      excludeWeekends: true,
      fullDayExclusions: [],
      halfDayExclusions: [],
    },
    function (options) {
      const now = new Date();
      const safeFullDay = Array.isArray(options.fullDayExclusions)
        ? options.fullDayExclusions.filter((e) => e && typeof e.date === 'string')
        : [];
      const safeHalfDay = Array.isArray(options.halfDayExclusions)
        ? options.halfDayExclusions.filter((e) => e && typeof e.date === 'string')
        : [];

      const result = checkExclusion({
        dayOfWeek: now.getDay(),
        dateStr: now.toISOString().split('T')[0],
        currentMinutes: now.getHours() * 60 + now.getMinutes(),
        excludeWeekends: options.excludeWeekends,
        fullDayExclusions: safeFullDay,
        halfDayExclusions: safeHalfDay,
        checkTime: true,
      });
      callback(result);
    }
  );
}

/**
 * Check if current time is within the broad working window (8:00-19:00) and not excluded.
 * Note: this uses a fixed 8-19 window intentionally wider than the user's custom schedule,
 * to cover early arrivals and late departures. The user's schedule controls blink/notification
 * timing via shouldBlink(), while this function only gates auto-open and startup checks.
 */
export function isWorkingHours(callback) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startWork = 8 * 60; // 08:00 — intentionally wider than user schedule
  const endWork = 19 * 60; // 19:00 — intentionally wider than user schedule

  if (currentTime < startWork || currentTime > endWork) {
    callback(false);
    return;
  }

  isExcludedDay(function (result) {
    callback(!result.excluded);
  });
}
