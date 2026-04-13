/**
 * Options page — main orchestrator.
 * Loads/saves settings, wires event listeners, delegates to sub-modules.
 */

import { VALID_SOUND_TYPES } from '../../shared/constants.js';
import { showToast } from './ui-helpers.js';
import {
  renderFullDayExclusions,
  renderHalfDayExclusions,
  addFullDayExclusion,
  addHalfDayExclusion,
} from './exclusion-manager.js';
import { importAssenze, confirmImport } from './import-manager.js';

// Carica le opzioni salvate
function loadOptions() {
  chrome.storage.local.get(
    {
      autoOpenSite: true,
      excludeWeekends: true,
      fullDayExclusions: [],
      halfDayExclusions: [],
      morningStart: '09:00',
      lunchEnd: '13:00',
      afternoonStart: '14:00',
      eveningEnd: '18:00',
      enableNotifications: true,
      enableSound: true,
      soundType: 'classic',
      soundVolume: 50,
    },
    function (items) {
      if (chrome.runtime.lastError) {
        showToast('Errore caricamento impostazioni: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      document.getElementById('autoOpenSite').checked = items.autoOpenSite;
      document.getElementById('excludeWeekends').checked = items.excludeWeekends;
      document.getElementById('morningStart').value = items.morningStart;
      document.getElementById('lunchEnd').value = items.lunchEnd;
      document.getElementById('afternoonStart').value = items.afternoonStart;
      document.getElementById('eveningEnd').value = items.eveningEnd;
      document.getElementById('enableNotifications').checked = items.enableNotifications;
      document.getElementById('enableSound').checked = items.enableSound;
      document.getElementById('soundType').value = items.soundType;
      document.getElementById('soundVolume').value = items.soundVolume;
      document.getElementById('volumeValue').textContent = items.soundVolume + '%';

      renderFullDayExclusions(items.fullDayExclusions);
      renderHalfDayExclusions(items.halfDayExclusions);
    }
  );
}

// Salva le opzioni
function saveOptions() {
  const autoOpenSite = document.getElementById('autoOpenSite').checked;
  const excludeWeekends = document.getElementById('excludeWeekends').checked;
  const morningStart = document.getElementById('morningStart').value;
  const lunchEnd = document.getElementById('lunchEnd').value;
  const afternoonStart = document.getElementById('afternoonStart').value;
  const eveningEnd = document.getElementById('eveningEnd').value;
  const enableNotifications = document.getElementById('enableNotifications').checked;
  const enableSound = document.getElementById('enableSound').checked;
  const soundType = document.getElementById('soundType').value;
  const soundVolume = parseInt(document.getElementById('soundVolume').value, 10);

  // Validazione formato HH:MM
  const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
  const times = [morningStart, lunchEnd, afternoonStart, eveningEnd];
  if (times.some((t) => !TIME_REGEX.test(t))) {
    showToast('Formato orario non valido (richiesto HH:MM)', 'error');
    return;
  }

  // Validazione coerenza orari — string comparison works because HH:MM is zero-padded
  for (let i = 0; i < times.length - 1; i++) {
    if (times[i] >= times[i + 1]) {
      showToast('Gli orari devono essere in ordine cronologico crescente', 'error');
      return;
    }
  }

  chrome.storage.local.set(
    {
      autoOpenSite: autoOpenSite,
      excludeWeekends: excludeWeekends,
      morningStart: morningStart,
      lunchEnd: lunchEnd,
      afternoonStart: afternoonStart,
      eveningEnd: eveningEnd,
      enableNotifications: enableNotifications,
      enableSound: enableSound,
      soundType: soundType,
      soundVolume: soundVolume,
    },
    function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nel salvataggio: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      showToast('Opzioni salvate correttamente', 'success');

      if (enableNotifications && Notification.permission === 'default') {
        Notification.requestPermission()
          .then(function (permission) {
            if (permission === 'denied') {
              showToast('Permesso notifiche negato dal browser', 'warning');
            }
          })
          .catch(function (err) {
            // Non-secure context or API not available — non-blocking
            showToast('Permesso notifiche non disponibile: ' + (err.message || err), 'warning');
          });
      }
    }
  );
}

// Test del suono
function testSound() {
  const rawSoundType = document.getElementById('soundType').value;
  const soundType = VALID_SOUND_TYPES.includes(rawSoundType) ? rawSoundType : 'classic';
  const soundVolume = parseInt(document.getElementById('soundVolume').value, 10) / 100;

  chrome.runtime.sendMessage(
    { action: 'testSound', soundType: soundType, volume: soundVolume },
    function () {
      if (chrome.runtime.lastError) {
        showToast('Test suono fallito: ' + chrome.runtime.lastError.message, 'error');
      }
    }
  );
}

// Inizializzazione pagina
document.addEventListener('DOMContentLoaded', function () {
  loadOptions();

  // Event listeners
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('addFullDay').addEventListener('click', addFullDayExclusion);
  document.getElementById('addHalfDay').addEventListener('click', addHalfDayExclusion);
  document.getElementById('importAssenze').addEventListener('click', importAssenze);
  document.getElementById('testSound').addEventListener('click', testSound);

  document.getElementById('soundVolume').addEventListener('input', function (e) {
    document.getElementById('volumeValue').textContent = e.target.value + '%';
  });

  // Modal event listeners
  const modal = document.getElementById('importModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancelImport');
  const confirmBtn = document.getElementById('confirmImport');

  closeBtn.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  cancelBtn.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  confirmBtn.addEventListener('click', confirmImport);

  window.addEventListener('click', function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
