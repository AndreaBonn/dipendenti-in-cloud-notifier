/**
 * Background service worker — entry point.
 * Orchestrates icon, sound, notification, and schedule managers.
 */

import { shouldBlink } from '../time-utils.js';
import { log } from '../shared/logging.js';
import { STARTUP_DELAY_MS } from '../shared/constants.js';
import { isAllowedOrigin, normalizeVolume, normalizeSoundType } from '../shared/validation.js';
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
    if (chrome.runtime.lastError) {
      log('[Background] tabs.query fallito:', chrome.runtime.lastError.message);
      return;
    }
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true }, function () {
        if (chrome.runtime.lastError) {
          log('[Background] tabs.update fallito:', chrome.runtime.lastError.message);
        }
      });
      chrome.windows.update(tabs[0].windowId, { focused: true }, function () {
        if (chrome.runtime.lastError) {
          log('[Background] windows.update fallito:', chrome.runtime.lastError.message);
        }
      });
    } else {
      chrome.tabs.create(
        { url: 'https://secure.dipendentincloud.it/it/app/dashboard', active: false },
        function () {
          if (chrome.runtime.lastError) {
            log('[Background] tabs.create fallito:', chrome.runtime.lastError.message);
          }
        }
      );
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
      storageSet({ isBlinking: false }, function () {
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
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
    chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' }, function () {
      if (chrome.runtime.lastError) {
        log('[Background] tabs.create da notifica fallito:', chrome.runtime.lastError.message);
      }
    });
  }
});

// Message handler from content script and options page
const VALID_ACTIONS = ['testSound', 'updateIcon', 'muteNotification'];

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (sender.id !== chrome.runtime.id) return;

  // Defense-in-depth: validate origin for content script messages
  if (sender.tab && (!sender.tab.url || !isAllowedOrigin(sender.tab.url))) return;

  // Validate request structure
  if (!request || typeof request !== 'object' || !VALID_ACTIONS.includes(request.action)) return;

  if (request.action === 'testSound') {
    const soundType = normalizeSoundType(request.soundType);
    const volume = normalizeVolume(request.volume);

    sendToOffscreen({
      action: 'testSound',
      soundType: soundType,
      volume: volume,
      target: 'offscreen',
    });

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

// --- Periodic checks (via chrome.alarms — survives service worker termination) ---

/** Periodic status check: blink/sound state evaluation. */
function periodicStatusCheck() {
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
}

/** Periodic badge update: refresh countdown text. */
function periodicBadgeUpdate() {
  storageGet('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      loadWorkSchedule(function () {
        updateBadgeCountdown(data.timbratureStatus.isTimbrato, getWorkSchedule());
      });
    }
  });
}

const ALARM_STATUS_CHECK = 'statusCheck';
const ALARM_BADGE_UPDATE = 'badgeUpdate';

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === ALARM_STATUS_CHECK) {
    periodicStatusCheck();
  } else if (alarm.name === ALARM_BADGE_UPDATE) {
    periodicBadgeUpdate();
  }
});

// --- Lifecycle events ---

/** Set up periodic alarms (idempotent — safe to call on every wake-up). */
function ensureAlarms() {
  chrome.alarms.create(ALARM_STATUS_CHECK, { periodInMinutes: 0.5 });
  chrome.alarms.create(ALARM_BADGE_UPDATE, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(function () {
  ensureAlarms();
  syncStateOnWakeUp(function () {
    loadWorkSchedule(function () {
      checkStatusOnStartup();
    });
  });
});

chrome.runtime.onStartup.addListener(function () {
  ensureAlarms();
  syncStateOnWakeUp(function () {
    loadWorkSchedule(function () {
      checkStatusOnStartup();
    });
  });
});
