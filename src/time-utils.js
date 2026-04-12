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
