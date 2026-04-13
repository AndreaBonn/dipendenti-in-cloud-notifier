/**
 * Countdown timer logic for the popup.
 * Manages the real-time countdown display based on clock state and work schedule.
 */

import { checkExclusion, getCountdownTarget } from '../../time-utils.js';

let countdownInterval = null;

/** Clear any running countdown interval. */
export function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/** Check if today is an excluded day (uses shared checkExclusion from time-utils). */
function checkExcludedDay(callback) {
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
        checkTime: false, // popup shows exclusion regardless of time
      });

      if (!result.excluded) {
        callback({ excluded: false });
        return;
      }

      let displayReason;
      if (result.reason === 'weekend') {
        displayReason = 'Weekend';
      } else if (result.reason === 'fullDay') {
        displayReason = result.description || 'Giornata esclusa';
      } else if (result.reason === 'halfDay') {
        const period = result.period === 'morning' ? 'Mattina' : 'Pomeriggio';
        displayReason = `${period} escluso${result.description ? ' - ' + result.description : ''}`;
      } else {
        displayReason = 'Escluso';
      }

      callback({ excluded: true, reason: displayReason });
    }
  );
}

/** Convert "HH:MM" string to {h, m} object with validation. */
function parseTimeToHoursMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return { h: 0, m: 0 };
  }
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) {
    return { h: 0, m: 0 };
  }
  return { h, m };
}

/**
 * Start or restart the countdown timer.
 *
 * @param {boolean|null} isTimbrato - clock-in state
 * @param {HTMLElement} countdownElement - DOM element to update
 */
export function updateCountdown(isTimbrato, countdownElement) {
  clearCountdown();

  checkExcludedDay(function (result) {
    if (result.excluded) {
      countdownElement.textContent = `🏖️ ${result.reason}`;
      countdownElement.className = 'countdown';
      return;
    }

    // Load schedule once, then start the tick interval
    chrome.storage.local.get(
      {
        morningStart: '09:00',
        lunchEnd: '13:00',
        afternoonStart: '14:00',
        eveningEnd: '18:00',
      },
      function (scheduleData) {
        const mStart = parseTimeToHoursMinutes(scheduleData.morningStart);
        const lEnd = parseTimeToHoursMinutes(scheduleData.lunchEnd);
        const aStart = parseTimeToHoursMinutes(scheduleData.afternoonStart);
        const eEnd = parseTimeToHoursMinutes(scheduleData.eveningEnd);

        const schedule = {
          morningStart: mStart.h * 60 + mStart.m,
          lunchEnd: lEnd.h * 60 + lEnd.m,
          afternoonStart: aStart.h * 60 + aStart.m,
          eveningEnd: eEnd.h * 60 + eEnd.m,
        };

        countdownInterval = setInterval(() => {
          tickCountdown(isTimbrato, schedule, countdownElement);
        }, 1000);
      }
    );
  });
}

/** Single countdown tick — compute and render the current countdown state. */
function tickCountdown(isTimbrato, schedule, countdownElement) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const target = getCountdownTarget(currentMinutes, isTimbrato, schedule);

  if (!target && isTimbrato === false) {
    countdownElement.textContent = 'Fuori Orario Lavorativo';
    countdownElement.className = 'countdown';
    return;
  }
  if (!target && isTimbrato === true) {
    countdownElement.textContent = 'Uscita Serale — SCADUTO!';
    countdownElement.className = 'countdown urgent';
    return;
  }
  if (!target) {
    countdownElement.textContent = '';
    return;
  }

  const targetTime = new Date(now);
  const targetH = Math.floor(target.targetMinutes / 60);
  const targetM = target.targetMinutes % 60;
  targetTime.setHours(targetH, targetM, 0, 0);

  const diff = targetTime - now;

  if (diff <= 0) {
    countdownElement.textContent = target.label + ' - SCADUTO!';
    countdownElement.className = 'countdown urgent';
  } else {
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

    let timeString;
    if (hoursLeft > 0) {
      timeString = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
    } else {
      timeString = `${minutesLeft}m ${secondsLeft}s`;
    }

    countdownElement.textContent = `${target.label}: ${timeString}`;

    if (target.isUrgent || minutesLeft < 5) {
      countdownElement.className = 'countdown urgent';
    } else if (minutesLeft < 15) {
      countdownElement.className = 'countdown warning';
    } else {
      countdownElement.className = 'countdown';
    }
  }
}
