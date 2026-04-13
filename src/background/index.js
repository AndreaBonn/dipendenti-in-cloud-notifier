/**
 * Background service worker — entry point.
 * Orchestrates icon, sound, notification, and schedule managers.
 */

import { shouldBlink } from '../time-utils.js';
import { log } from '../shared/logging.js';
import {
  VALID_SOUND_TYPES,
  STATUS_CHECK_MS,
  BADGE_UPDATE_MS,
  STARTUP_DELAY_MS,
} from '../shared/constants.js';
import { isAllowedOrigin } from '../shared/validation.js';
import { storageSet, storageGet, storageRemove } from './storage-helpers.js';
import {
  setIcon,
  startBlinking,
  stopBlinking,
  isCurrentlyBlinking,
  updateBadgeCountdown,
} from './icon-manager.js';
import { startSound, stopSound, sendToOffscreen } from './sound-manager.js';
import { checkAndSendNotifications, sendStartupNotification } from './notification-manager.js';
import {
  loadWorkSchedule,
  getWorkSchedule,
  getCurrentSituationId,
  isExcludedDay,
  isWorkingHours,
} from './schedule-manager.js';

/** Check if icon should blink (combines exclusion check + schedule check + notifications). */
function checkShouldBlink(isTimbrato, schedule, callback) {
  isExcludedDay(function (result) {
    if (result.excluded) {
      callback(false);
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    checkAndSendNotifications(currentTime, isTimbrato, schedule);
    callback(shouldBlink(currentTime, isTimbrato, schedule));
  });
}

/** Open Dipendenti in Cloud in a new or existing tab. */
function openDipendentiInCloud() {
  chrome.tabs.query({ url: '*://secure.dipendentincloud.it/*' }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({
        url: 'https://secure.dipendentincloud.it/it/app/dashboard',
        active: false,
      });
    }
  });
}

/**
 * Sync in-memory state from storage on service worker wake-up.
 * MV3 service workers are killed after ~30s of inactivity; on restart,
 * module-level variables reset to defaults while storage retains stale values.
 */
function syncStateOnWakeUp(callback) {
  storageGet(['isBlinking'], function (data) {
    if (data.isBlinking && !isCurrentlyBlinking()) {
      storageSet({ isBlinking: false });
    }
    if (callback) callback();
  });
}

/** Activate blink state: start blinking and optionally play sound if not muted. */
function activateBlinkState(baseState, isMuted) {
  startBlinking(baseState);
  storageSet({ isBlinking: true });
  if (!isMuted) {
    startSound();
  }
}

/** Deactivate blink state: stop blinking, stop sound, restore static icon. */
function deactivateBlinkState(baseState) {
  stopBlinking();
  stopSound();
  setIcon(baseState);
  storageSet({ isBlinking: false });
}

/** Handle the updateIcon action: determine state, blink/sound, update badge. */
function handleUpdateIcon(isTimbrato) {
  let baseState;
  if (isTimbrato === true) {
    baseState = 'green';
  } else if (isTimbrato === false) {
    baseState = 'red';
  } else {
    baseState = 'na';
  }

  if (isTimbrato !== null) {
    loadWorkSchedule(function () {
      const schedule = getWorkSchedule();
      checkShouldBlink(isTimbrato, schedule, function (shouldBlinkNow) {
        if (shouldBlinkNow) {
          const situationId = getCurrentSituationId();
          storageGet(['mutedSituation'], function (data) {
            activateBlinkState(baseState, data.mutedSituation === situationId);
          });
        } else {
          deactivateBlinkState(baseState);
        }
        updateBadgeCountdown(isTimbrato, schedule);
      });
    });
  } else {
    deactivateBlinkState(baseState);
    loadWorkSchedule(function () {
      updateBadgeCountdown(isTimbrato, getWorkSchedule());
    });
  }
}

/** Check status on startup: auto-open site, restore blink/sound state. */
function checkStatusOnStartup() {
  storageGet({ autoOpenSite: true }, function (options) {
    if (options.autoOpenSite) {
      isWorkingHours(function (isWorking) {
        if (isWorking) {
          setTimeout(() => {
            openDipendentiInCloud();
          }, STARTUP_DELAY_MS);
        }
      });
    }
  });

  storageGet('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      const raw = data.timbratureStatus.isTimbrato;
      const isTimbrato = raw === true ? true : raw === false ? false : null;
      if (isTimbrato === null) {
        setIcon('na');
        updateBadgeCountdown(null, getWorkSchedule());
        return;
      }
      const baseState = isTimbrato ? 'green' : 'red';
      const schedule = getWorkSchedule();

      checkShouldBlink(isTimbrato, schedule, function (shouldBlinkNow) {
        if (shouldBlinkNow) {
          const situationId = getCurrentSituationId();
          storageGet(['mutedSituation'], function (mutedData) {
            const isMuted = mutedData.mutedSituation === situationId;
            activateBlinkState(baseState, isMuted);

            if (!isMuted) {
              sendStartupNotification(isTimbrato, schedule);
            }
          });
        } else {
          setIcon(baseState);
        }
        updateBadgeCountdown(isTimbrato, schedule);
      });
    } else {
      setIcon('na');
      updateBadgeCountdown(null, getWorkSchedule());
    }
  });
}

// --- Event listeners ---

// Click on notification opens Dipendenti in Cloud
chrome.notifications.onClicked.addListener(function (notificationId) {
  if (notificationId.startsWith('timbratura-')) {
    chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' });
  }
});

// Message handler from content script and options page
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (sender.id !== chrome.runtime.id) return;

  // Defense-in-depth: validate origin for content script messages
  if (sender.tab && (!sender.tab.url || !isAllowedOrigin(sender.tab.url))) return;

  if (request.action === 'testSound') {
    const soundType = VALID_SOUND_TYPES.includes(request.soundType) ? request.soundType : 'classic';
    const volume = Math.max(0, Math.min(1, Number(request.volume) || 0.5));

    sendToOffscreen({ action: 'testSound', soundType: soundType, volume: volume });

    sendResponse({ success: true });
    return true;
  } else if (request.action === 'updateIcon') {
    handleUpdateIcon(request.isTimbrato);
  } else if (request.action === 'muteNotification') {
    const situationId = getCurrentSituationId();
    if (situationId) {
      storageSet({ mutedSituation: situationId }, function () {
        stopSound();
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  return true;
});

// --- Periodic checks ---

// Check blink/sound state every 30 seconds
setInterval(() => {
  storageGet(['timbratureStatus', 'mutedSituation', 'lastSituationId'], function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      const raw = data.timbratureStatus.isTimbrato;
      const isTimbrato = raw === true ? true : raw === false ? false : null;
      if (isTimbrato === null) return;
      const baseState = isTimbrato ? 'green' : 'red';

      loadWorkSchedule(function () {
        const schedule = getWorkSchedule();
        checkShouldBlink(isTimbrato, schedule, function (shouldBlinkNow) {
          const currentSituationId = getCurrentSituationId();
          const lastSituationId = data.lastSituationId;
          const situationChanged = currentSituationId !== lastSituationId;

          if (shouldBlinkNow) {
            if (situationChanged && currentSituationId) {
              log('[Background] Situazione cambiata:', lastSituationId, '->', currentSituationId);
              storageSet({ lastSituationId: currentSituationId });
              storageRemove('mutedSituation');
              stopSound();
              activateBlinkState(baseState, false);
            } else if (!isCurrentlyBlinking()) {
              activateBlinkState(baseState, data.mutedSituation === currentSituationId);

              if (currentSituationId) {
                storageSet({ lastSituationId: currentSituationId });
              }
            }
          } else if (!shouldBlinkNow && isCurrentlyBlinking()) {
            deactivateBlinkState(baseState);
            storageRemove('mutedSituation');
          }
          updateBadgeCountdown(isTimbrato, schedule);
        });
      });
    }
  });
}, STATUS_CHECK_MS);

// Update badge countdown every minute
setInterval(() => {
  storageGet('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      loadWorkSchedule(function () {
        updateBadgeCountdown(data.timbratureStatus.isTimbrato, getWorkSchedule());
      });
    }
  });
}, BADGE_UPDATE_MS);

// --- Lifecycle events ---

chrome.runtime.onInstalled.addListener(function () {
  syncStateOnWakeUp(function () {
    loadWorkSchedule(function () {
      checkStatusOnStartup();
    });
  });
});

chrome.runtime.onStartup.addListener(function () {
  syncStateOnWakeUp(function () {
    loadWorkSchedule(function () {
      checkStatusOnStartup();
    });
  });
});
