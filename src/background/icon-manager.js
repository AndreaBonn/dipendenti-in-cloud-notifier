/**
 * Icon, badge, and blink management for the extension action button.
 */

import { getBadgeText } from '../time-utils.js';
import { BLINK_INTERVAL_MS } from '../shared/constants.js';

let blinkInterval = null;
let isBlinking = false;

/** Whether the icon is currently blinking. */
export function isCurrentlyBlinking() {
  return isBlinking;
}

/** Set the extension icon to the given state: 'green', 'red', or 'na'. */
export function setIcon(state) {
  const icons = {
    green: {
      16: 'images/timer-green-16.png',
      48: 'images/timer-green-48.png',
      128: 'images/timer-green-128.png',
    },
    red: {
      16: 'images/timer-red-16.png',
      48: 'images/timer-red-48.png',
      128: 'images/timer-red-128.png',
    },
    na: {
      16: 'images/timer-na-16.png',
      48: 'images/timer-na-48.png',
      128: 'images/timer-na-128.png',
    },
  };

  chrome.action.setIcon({ path: icons[state] || icons.na });

  const badgeColors = {
    green: '#28a745',
    red: '#dc3545',
    na: '#6c757d',
  };
  chrome.action.setBadgeBackgroundColor({ color: badgeColors[state] || badgeColors.na });
}

/**
 * Update the badge text with a countdown based on clock state and work schedule.
 *
 * @param {boolean|null} isTimbrato
 * @param {object} workSchedule - { morningStart, lunchEnd, afternoonStart, eveningEnd } in minutes
 */
export function updateBadgeCountdown(isTimbrato, workSchedule) {
  if (isTimbrato === null) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const text = getBadgeText(currentTime, isTimbrato, workSchedule);
  chrome.action.setBadgeText({ text });
}

/** Stop icon blinking. */
export function stopBlinking() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
    isBlinking = false;
  }
}

/** Start icon blinking between the given baseState and 'na'. */
export function startBlinking(baseState) {
  stopBlinking();
  isBlinking = true;
  let showIcon = true;

  blinkInterval = setInterval(() => {
    if (showIcon) {
      setIcon(baseState);
    } else {
      setIcon('na');
    }
    showIcon = !showIcon;
  }, BLINK_INTERVAL_MS);
}
