/**
 * Work schedule loading and exclusion/working-hours checks.
 */

import { timeToMinutes, checkExclusion, getSituationId } from '../time-utils.js';
import { DEFAULT_SCHEDULE_STRINGS } from '../shared/constants.js';

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
  chrome.storage.local.get(
    {
      morningStart: DEFAULT_SCHEDULE_STRINGS.morningStart,
      lunchEnd: DEFAULT_SCHEDULE_STRINGS.lunchEnd,
      afternoonStart: DEFAULT_SCHEDULE_STRINGS.afternoonStart,
      eveningEnd: DEFAULT_SCHEDULE_STRINGS.eveningEnd,
    },
    function (items) {
      workSchedule.morningStart = timeToMinutes(items.morningStart);
      workSchedule.lunchEnd = timeToMinutes(items.lunchEnd);
      workSchedule.afternoonStart = timeToMinutes(items.afternoonStart);
      workSchedule.eveningEnd = timeToMinutes(items.eveningEnd);
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
  chrome.storage.local.get(
    {
      excludeWeekends: true,
      fullDayExclusions: [],
      halfDayExclusions: [],
    },
    function (options) {
      const now = new Date();
      const result = checkExclusion({
        dayOfWeek: now.getDay(),
        dateStr: now.toISOString().split('T')[0],
        currentMinutes: now.getHours() * 60 + now.getMinutes(),
        excludeWeekends: options.excludeWeekends,
        fullDayExclusions: options.fullDayExclusions,
        halfDayExclusions: options.halfDayExclusions,
        checkTime: true,
      });
      callback(result);
    }
  );
}

/** Check if current time is within working hours (8:00-19:00) and not excluded. */
export function isWorkingHours(callback) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startWork = 8 * 60; // 08:00
  const endWork = 19 * 60; // 19:00

  if (currentTime < startWork || currentTime > endWork) {
    callback(false);
    return;
  }

  isExcludedDay(function (result) {
    callback(!result.excluded);
  });
}
