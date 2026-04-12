/**
 * Pure utility functions for time and schedule calculations.
 * Extracted for testability — used by background.js at runtime,
 * and by tests via ES module imports.
 */

/** Convert "HH:MM" string to total minutes since midnight. */
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Get the current time slot identifier for mute/notification tracking. */
export function getSituationId(currentMinutes, schedule, dateStr) {
  if (currentMinutes >= schedule.morningStart && currentMinutes < schedule.lunchEnd) {
    return `entrata-mattina-${dateStr}`;
  } else if (currentMinutes >= schedule.lunchEnd && currentMinutes < schedule.afternoonStart) {
    return `uscita-pranzo-${dateStr}`;
  } else if (currentMinutes >= schedule.afternoonStart && currentMinutes < schedule.eveningEnd) {
    return `entrata-pomeriggio-${dateStr}`;
  } else if (currentMinutes >= schedule.eveningEnd) {
    return `uscita-serale-${dateStr}`;
  }
  return null;
}

/** Determine if the icon should blink based on clock state and time. */
export function shouldBlink(currentMinutes, isTimbrato, schedule) {
  const { morningStart, lunchEnd, afternoonStart, eveningEnd } = schedule;

  // 09:00-13:00: RED (not clocked in) → blink
  if (currentMinutes >= morningStart && currentMinutes < lunchEnd && isTimbrato === false) {
    return true;
  }
  // 13:00-14:00: GREEN (clocked in, didn't clock out for lunch) → blink
  if (currentMinutes >= lunchEnd && currentMinutes < afternoonStart && isTimbrato === true) {
    return true;
  }
  // 14:00-18:00: RED (not clocked in for afternoon) → blink
  if (currentMinutes >= afternoonStart && currentMinutes < eveningEnd && isTimbrato === false) {
    return true;
  }
  // 18:00+: GREEN (didn't clock out for evening) → blink
  if (currentMinutes >= eveningEnd && isTimbrato === true) {
    return true;
  }

  return false;
}

/** Calculate badge countdown text from current time and clock state. */
export function getBadgeText(currentMinutes, isTimbrato, schedule) {
  let targetTime = null;

  if (isTimbrato === false) {
    if (currentMinutes < schedule.morningStart) targetTime = schedule.morningStart;
    else if (currentMinutes < schedule.lunchEnd) targetTime = schedule.lunchEnd;
    else if (currentMinutes < schedule.afternoonStart) targetTime = schedule.afternoonStart;
    else if (currentMinutes < schedule.eveningEnd) targetTime = schedule.eveningEnd;
  } else if (isTimbrato === true) {
    if (currentMinutes < schedule.lunchEnd) targetTime = schedule.lunchEnd;
    else if (currentMinutes < schedule.afternoonStart) targetTime = schedule.afternoonStart;
    else if (currentMinutes < schedule.eveningEnd) targetTime = schedule.eveningEnd;
    else targetTime = 24 * 60;
  }

  if (targetTime === null) return '';

  const diff = targetTime - currentMinutes;
  if (diff <= 0) return '!';
  if (diff < 60) return diff + 'm';
  return Math.floor(diff / 60) + 'h';
}

/**
 * Check if a given date/time falls on an excluded day or half-day.
 *
 * @param {object} params
 * @param {number} params.dayOfWeek - 0 (Sun) to 6 (Sat)
 * @param {string} params.dateStr - "YYYY-MM-DD"
 * @param {number} params.currentMinutes - minutes since midnight
 * @param {boolean} params.excludeWeekends
 * @param {Array<{date:string, description?:string}>} params.fullDayExclusions
 * @param {Array<{date:string, period:string, description?:string}>} params.halfDayExclusions
 * @param {boolean} [params.checkTime=true] - if true, half-day exclusions are only active
 *   during the relevant time window; if false, any half-day match is returned regardless of time
 * @returns {{excluded:boolean, reason:string|null, description?:string}}
 */
export function checkExclusion({
  dayOfWeek,
  dateStr,
  currentMinutes,
  excludeWeekends,
  fullDayExclusions,
  halfDayExclusions,
  checkTime = true,
}) {
  // Weekend
  if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return { excluded: true, reason: 'weekend' };
  }

  // Full-day exclusion
  const fullDay = fullDayExclusions.find((e) => e.date === dateStr);
  if (fullDay) {
    return { excluded: true, reason: 'fullDay', description: fullDay.description };
  }

  // Half-day exclusion
  const halfDay = halfDayExclusions.find((e) => e.date === dateStr);
  if (halfDay) {
    if (!checkTime) {
      return {
        excluded: true,
        reason: 'halfDay',
        period: halfDay.period,
        description: halfDay.description,
      };
    }
    // Morning: 8:00-13:00 (480-780 minutes)
    if (halfDay.period === 'morning' && currentMinutes >= 480 && currentMinutes < 780) {
      return { excluded: true, reason: 'halfDayMorning', description: halfDay.description };
    }
    // Afternoon: 14:00-18:00 (840-1080 minutes)
    if (halfDay.period === 'afternoon' && currentMinutes >= 840 && currentMinutes <= 1080) {
      return { excluded: true, reason: 'halfDayAfternoon', description: halfDay.description };
    }
  }

  return { excluded: false, reason: null };
}

/**
 * Check which notifications should fire at the given time.
 * Returns an array of notification keys that should trigger.
 */
export function getNotificationsToSend(currentMinutes, isTimbrato, schedule, windowMinutes) {
  const notifications = [];

  if (
    isTimbrato === false &&
    currentMinutes >= schedule.morningStart &&
    currentMinutes < schedule.morningStart + windowMinutes
  ) {
    notifications.push('morning');
  }

  if (
    isTimbrato === true &&
    currentMinutes >= schedule.lunchEnd &&
    currentMinutes < schedule.lunchEnd + windowMinutes
  ) {
    notifications.push('lunch');
  }

  if (
    isTimbrato === false &&
    currentMinutes >= schedule.afternoonStart &&
    currentMinutes < schedule.afternoonStart + windowMinutes
  ) {
    notifications.push('afternoon');
  }

  if (
    isTimbrato === true &&
    currentMinutes >= schedule.eveningEnd &&
    currentMinutes < schedule.eveningEnd + windowMinutes
  ) {
    notifications.push('evening');
  }

  return notifications;
}
