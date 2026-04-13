/**
 * Background service worker — entry point.
 * Orchestrates icon, sound, notification, and schedule managers.
 */

import { shouldBlink } from '../time-utils.js';
import { log, logError } from '../shared/logging.js';
import { VALID_SOUND_TYPES, ALLOWED_ORIGINS, STATUS_CHECK_MS, BADGE_UPDATE_MS, STARTUP_DELAY_MS } from '../shared/constants.js';
import { storageSet } from './storage-helpers.js';
import { setIcon, startBlinking, stopBlinking, isCurrentlyBlinking, updateBadgeCountdown } from './icon-manager.js';
import { startSound, stopSound, sendToOffscreen } from './sound-manager.js';
import { checkAndSendNotifications, sendStartupNotification } from './notification-manager.js';
import { loadWorkSchedule, getWorkSchedule, getCurrentSituationId, isExcludedDay, isWorkingHours } from './schedule-manager.js';

// --- Internal helpers ---

/** Validate URL origin against allowlist using URL parser. */
function isAllowedOrigin(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.includes(parsed.origin);
  } catch (_error) {
    return false;
  }
}

/** Check if icon should blink (combines exclusion check + schedule check + notifications). */
function checkShouldBlink(isTimbrato, callback) {
  isExcludedDay(function (result) {
    if (result.excluded) {
      callback(false);
      return;
    }

    loadWorkSchedule(function () {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      checkAndSendNotifications(currentTime, isTimbrato, getWorkSchedule());
      callback(shouldBlink(currentTime, isTimbrato, getWorkSchedule()));
    });
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
  chrome.storage.local.get(['isBlinking'], function (data) {
    if (chrome.runtime.lastError) {
      logError('syncStateOnWakeUp storage.get fallito:', chrome.runtime.lastError.message);
      if (callback) callback();
      return;
    }
    if (data.isBlinking && !isCurrentlyBlinking()) {
      storageSet({ isBlinking: false });
    }
    if (callback) callback();
  });
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
    checkShouldBlink(isTimbrato, function (shouldBlinkNow) {
      if (shouldBlinkNow) {
        const situationId = getCurrentSituationId();
        chrome.storage.local.get(['mutedSituation'], function (data) {
          if (data.mutedSituation === situationId) {
            startBlinking(baseState);
            storageSet({ isBlinking: true });
          } else {
            startBlinking(baseState);
            startSound();
            storageSet({ isBlinking: true });
          }
        });
      } else {
        stopBlinking();
        stopSound();
        setIcon(baseState);
        storageSet({ isBlinking: false });
      }
      loadWorkSchedule(function () {
        updateBadgeCountdown(isTimbrato, getWorkSchedule());
      });
    });
  } else {
    stopBlinking();
    stopSound();
    setIcon(baseState);
    storageSet({ isBlinking: false });
    loadWorkSchedule(function () {
      updateBadgeCountdown(isTimbrato, getWorkSchedule());
    });
  }
}

/** Check status on startup: auto-open site, restore blink/sound state. */
function checkStatusOnStartup() {
  chrome.storage.local.get({ autoOpenSite: true }, function (options) {
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

  chrome.storage.local.get('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      const raw = data.timbratureStatus.isTimbrato;
      const isTimbrato = raw === true ? true : raw === false ? false : null;
      if (isTimbrato === null) {
        setIcon('na');
        updateBadgeCountdown(null, getWorkSchedule());
        return;
      }
      const baseState = isTimbrato ? 'green' : 'red';

      checkShouldBlink(isTimbrato, function (shouldBlinkNow) {
        if (shouldBlinkNow) {
          const situationId = getCurrentSituationId();
          chrome.storage.local.get(['mutedSituation'], function (mutedData) {
            if (mutedData.mutedSituation === situationId) {
              startBlinking(baseState);
              storageSet({ isBlinking: true });
            } else {
              startBlinking(baseState);
              startSound();
              storageSet({ isBlinking: true });

              loadWorkSchedule(function () {
                sendStartupNotification(isTimbrato, getWorkSchedule());
              });
            }
          });
        } else {
          setIcon(baseState);
        }
        loadWorkSchedule(function () {
          updateBadgeCountdown(isTimbrato, getWorkSchedule());
        });
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
  chrome.storage.local.get(
    ['timbratureStatus', 'mutedSituation', 'lastSituationId'],
    function (data) {
      if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
        const raw = data.timbratureStatus.isTimbrato;
        const isTimbrato = raw === true ? true : raw === false ? false : null;
        if (isTimbrato === null) return;
        const baseState = isTimbrato ? 'green' : 'red';

        checkShouldBlink(isTimbrato, function (shouldBlinkNow) {
          const currentSituationId = getCurrentSituationId();
          const lastSituationId = data.lastSituationId;
          const situationChanged = currentSituationId !== lastSituationId;

          if (shouldBlinkNow) {
            if (situationChanged && currentSituationId) {
              log('[Background] Situazione cambiata:', lastSituationId, '->', currentSituationId);
              storageSet({ lastSituationId: currentSituationId });
              chrome.storage.local.remove('mutedSituation');
              stopSound();
              startBlinking(baseState);
              startSound();
              storageSet({ isBlinking: true });
            } else if (!isCurrentlyBlinking()) {
              if (data.mutedSituation === currentSituationId) {
                startBlinking(baseState);
                storageSet({ isBlinking: true });
              } else {
                startBlinking(baseState);
                startSound();
                storageSet({ isBlinking: true });
              }

              if (currentSituationId) {
                storageSet({ lastSituationId: currentSituationId });
              }
            }
          } else if (!shouldBlinkNow && isCurrentlyBlinking()) {
            stopBlinking();
            stopSound();
            setIcon(baseState);
            storageSet({ isBlinking: false });
            chrome.storage.local.remove('mutedSituation');
          }
          loadWorkSchedule(function () {
            updateBadgeCountdown(isTimbrato, getWorkSchedule());
          });
        });
      }
    }
  );
}, STATUS_CHECK_MS);

// Update badge countdown every minute
setInterval(() => {
  chrome.storage.local.get('timbratureStatus', function (data) {
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
