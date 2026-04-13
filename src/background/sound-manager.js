/**
 * Sound management: offscreen document creation and sound playback scheduling.
 */

import { logError } from '../shared/logging.js';
import { SOUND_REPEAT_MS } from '../shared/constants.js';
import { normalizeVolume, normalizeSoundType } from '../shared/validation.js';
import { storageGet } from './storage-helpers.js';

let soundInterval = null;

/**
 * Send a message to the offscreen document, creating it if needed.
 * Adds a small delay after fresh creation to ensure the listener is registered.
 */
export function sendToOffscreen(message) {
  function doSend() {
    chrome.runtime.sendMessage(message, function () {
      if (chrome.runtime.lastError) {
        logError('sendMessage to offscreen fallito:', chrome.runtime.lastError.message);
      }
    });
  }

  chrome.offscreen
    .hasDocument()
    .then((exists) => {
      if (exists) {
        doSend();
      } else {
        chrome.offscreen
          .createDocument({
            url: 'src/pages/offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Riproduzione suono di notifica',
          })
          .then(() => {
            // Fresh creation — small delay to let the listener register
            setTimeout(doSend, 50);
          })
          .catch((error) => {
            logError('Errore creazione offscreen document:', error.message);
          });
      }
    })
    .catch((error) => {
      logError('hasDocument() fallito — suono non riprodotto:', error.message);
    });
}

/** Play the notification sound using current user preferences. */
function playNotificationSound() {
  storageGet(
    {
      enableSound: true,
      soundType: 'classic',
      soundVolume: 50,
    },
    function (options) {
      if (!options.enableSound) return;

      const soundType = normalizeSoundType(options.soundType);
      const volume = normalizeVolume(options.soundVolume, true);

      sendToOffscreen({
        action: 'playSound',
        soundType: soundType,
        volume: volume,
        target: 'offscreen',
      });
    }
  );
}

/** Stop the repeating sound interval. */
export function stopSound() {
  if (soundInterval) {
    clearInterval(soundInterval);
    soundInterval = null;
  }
}

/** Start playing the notification sound immediately and repeat every 5 minutes. */
export function startSound() {
  stopSound();

  playNotificationSound();

  soundInterval = setInterval(() => {
    playNotificationSound();
  }, SOUND_REPEAT_MS);
}
