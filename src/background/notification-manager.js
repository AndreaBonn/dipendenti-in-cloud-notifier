/**
 * Desktop notification management: sending, scheduling, and startup notifications.
 */

import { log } from '../shared/logging.js';
import { getNotificationsToSend } from '../time-utils.js';
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_AUTO_CLOSE_MS,
  NOTIFICATION_WINDOW_MINUTES,
} from '../shared/constants.js';
import { getStartupNotificationType } from '../shared/validation.js';
import { storageSet } from './storage-helpers.js';

/** Send a desktop notification with optional urgency. */
export function sendNotification(title, message, urgent = false) {
  chrome.storage.local.get({ enableNotifications: true }, function (options) {
    if (!options.enableNotifications) return;

    const notificationOptions = {
      type: 'basic',
      iconUrl: urgent ? 'images/timer-red-128.png' : 'images/timer-green-128.png',
      title: title,
      message: message,
      priority: urgent ? 2 : 1,
      requireInteraction: urgent,
    };

    chrome.notifications.create(
      'timbratura-' + Date.now(),
      notificationOptions,
      function (notificationId) {
        log('[Notifica] Inviata:', title);

        if (!urgent) {
          setTimeout(() => {
            chrome.notifications.clear(notificationId);
          }, NOTIFICATION_AUTO_CLOSE_MS);
        }
      }
    );
  });
}

/**
 * Check and send time-slot notifications based on current time and clock state.
 * Reads/writes notificationsSent to chrome.storage.local (single source of truth
 * for MV3 service workers that get killed and restarted frequently).
 */
export function checkAndSendNotifications(currentTime, isTimbrato, workSchedule) {
  chrome.storage.local.get({ notificationsSent: {} }, function (data) {
    const today = new Date().toDateString();
    let stored = data.notificationsSent;

    // Reset if new day
    if (!stored.date || stored.date !== today) {
      stored = { date: today };
    }

    const toSend = getNotificationsToSend(
      currentTime,
      isTimbrato,
      workSchedule,
      NOTIFICATION_WINDOW_MINUTES
    );

    let changed = false;
    toSend.forEach(function (key) {
      if (!stored[key]) {
        const msg = NOTIFICATION_MESSAGES[key];
        sendNotification(msg.title, msg.message, true);
        stored[key] = true;
        changed = true;
      }
    });

    if (changed) {
      storageSet({ notificationsSent: stored });
    }
  });
}

// Startup notification messages (keyed by type from getStartupNotificationType)
const STARTUP_MESSAGES = {
  morning: { title: 'TIMBRA ENTRATA', message: "Non hai ancora timbrato l'entrata del mattino!" },
  lunch: {
    title: 'TIMBRA INIZIO PAUSA PRANZO',
    message: "Non hai ancora timbrato l'uscita per la pausa pranzo!",
  },
  afternoon: {
    title: 'TIMBRA FINE PAUSA PRANZO',
    message: 'Non hai ancora timbrato il rientro dalla pausa pranzo!',
  },
  evening: { title: 'TIMBRA USCITA', message: "Non hai ancora timbrato l'uscita serale!" },
};

/** Send an immediate notification on startup if clock state requires attention. */
export function sendStartupNotification(isTimbrato, workSchedule) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const type = getStartupNotificationType(currentTime, isTimbrato, workSchedule);

  if (type) {
    const msg = STARTUP_MESSAGES[type];
    sendNotification(msg.title, msg.message, true);
  }
}
