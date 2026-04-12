import {
  timeToMinutes,
  getSituationId,
  shouldBlink,
  getBadgeText,
  getNotificationsToSend,
} from './src/time-utils.js';

const DEBUG = false;
function log(...args) {
  if (DEBUG) console.log(...args);
}

// Timing constants
const SOUND_REPEAT_MS = 5 * 60 * 1000;
const BLINK_INTERVAL_MS = 500;
const STATUS_CHECK_MS = 30 * 1000;
const BADGE_UPDATE_MS = 60 * 1000;
const NOTIFICATION_WINDOW_MINUTES = 5;
const NOTIFICATION_AUTO_CLOSE_MS = 10 * 1000;
const STARTUP_DELAY_MS = 2000;

// State
let blinkInterval = null;
let currentIconState = 'na';
let isBlinking = false;

let soundInterval = null;
let lastSoundTime = null;

// Variabili per gestire le notifiche
let notificationsSent = {};
const workSchedule = {
  morningStart: 9 * 60,
  lunchEnd: 13 * 60,
  afternoonStart: 14 * 60,
  eveningEnd: 18 * 60,
};

// Funzione per caricare gli orari personalizzati
function loadWorkSchedule(callback) {
  chrome.storage.local.get(
    {
      morningStart: '09:00',
      lunchEnd: '13:00',
      afternoonStart: '14:00',
      eveningEnd: '18:00',
    },
    function (items) {
      workSchedule.morningStart = timeToMinutes(items.morningStart);
      workSchedule.lunchEnd = timeToMinutes(items.lunchEnd);
      workSchedule.afternoonStart = timeToMinutes(items.afternoonStart);
      workSchedule.eveningEnd = timeToMinutes(items.eveningEnd);
      if (callback) callback();
    }
  );
}

// Funzione per inviare notifica desktop
function sendNotification(title, message, urgent = false) {
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

        // Auto-chiudi dopo 10 secondi se non urgente
        if (!urgent) {
          setTimeout(() => {
            chrome.notifications.clear(notificationId);
          }, NOTIFICATION_AUTO_CLOSE_MS);
        }
      }
    );
  });
}

// Click sulla notifica apre Dipendenti in Cloud
chrome.notifications.onClicked.addListener(function (notificationId) {
  if (notificationId.startsWith('timbratura-')) {
    chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' });
  }
});

// Funzione per impostare l'icona
function setIcon(state) {
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
  currentIconState = state;

  // Imposta il colore del badge in base allo stato
  const badgeColors = {
    green: '#28a745',
    red: '#dc3545',
    na: '#6c757d',
  };
  chrome.action.setBadgeBackgroundColor({ color: badgeColors[state] || badgeColors.na });
}

// Funzione per aggiornare il badge con il countdown (uses imported getBadgeText)
function updateBadgeCountdown(isTimbrato) {
  if (isTimbrato === null) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  loadWorkSchedule(function () {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const text = getBadgeText(currentTime, isTimbrato, workSchedule);
    chrome.action.setBadgeText({ text });
  });
}

// Funzione per riprodurre il suono di notifica
function playNotificationSound() {
  // Verifica se i suoni sono abilitati
  chrome.storage.local.get(
    {
      enableSound: true,
      soundType: 'classic',
      soundVolume: 50,
    },
    function (options) {
      if (!options.enableSound) return;

      const volume = options.soundVolume / 100; // Converti in 0-1

      // Creiamo un offscreen document per riprodurre l'audio
      chrome.offscreen
        .createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Riproduzione suono di notifica per timbratura mancante',
        })
        .then(() => {
          chrome.runtime.sendMessage({
            action: 'playSound',
            soundType: options.soundType,
            volume: volume,
          });
        })
        .catch((error) => {
          // Se il documento esiste già, inviamo solo il messaggio
          if (error.message.includes('Only a single offscreen')) {
            chrome.runtime.sendMessage({
              action: 'playSound',
              soundType: options.soundType,
              volume: volume,
            });
          }
        });
    }
  );
}

// Funzione per fermare il suono
function stopSound() {
  if (soundInterval) {
    clearInterval(soundInterval);
    soundInterval = null;
    lastSoundTime = null;
  }
}

// Funzione per avviare il suono ripetuto
function startSound() {
  stopSound();

  // Riproduciamo immediatamente il primo suono
  playNotificationSound();
  lastSoundTime = Date.now();

  // Impostiamo l'intervallo per ripetere ogni 5 minuti
  soundInterval = setInterval(() => {
    playNotificationSound();
    lastSoundTime = Date.now();
  }, SOUND_REPEAT_MS);
}

// Funzione per fermare il lampeggiamento
function stopBlinking() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
    isBlinking = false;
  }
}

// Funzione per avviare il lampeggiamento
function startBlinking(baseState) {
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

// Funzione per verificare se deve lampeggiare (uses imported shouldBlink)
function checkShouldBlink(isTimbrato, callback) {
  isExcludedDay(function (result) {
    if (result.excluded) {
      callback(false);
      return;
    }

    loadWorkSchedule(function () {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      checkAndSendNotifications(currentTime, isTimbrato);
      callback(shouldBlink(currentTime, isTimbrato, workSchedule));
    });
  });
}

// Notification messages for each time slot
const NOTIFICATION_MESSAGES = {
  morning: { title: 'TIMBRA ENTRATA', message: "Buongiorno! È ora di timbrare l'entrata" },
  lunch: {
    title: 'TIMBRA INIZIO PAUSA PRANZO',
    message: "È ora di timbrare l'uscita per la pausa pranzo",
  },
  afternoon: {
    title: 'TIMBRA FINE PAUSA PRANZO',
    message: 'È ora di timbrare il rientro dalla pausa pranzo',
  },
  evening: { title: 'TIMBRA USCITA', message: "È ora di timbrare l'uscita" },
};

// Funzione per controllare e inviare notifiche (uses imported getNotificationsToSend)
function checkAndSendNotifications(currentTime, isTimbrato) {
  const today = new Date().toDateString();

  // Reset notifiche se è un nuovo giorno
  if (!notificationsSent.date || notificationsSent.date !== today) {
    notificationsSent = { date: today };
  }

  const toSend = getNotificationsToSend(
    currentTime,
    isTimbrato,
    workSchedule,
    NOTIFICATION_WINDOW_MINUTES
  );

  toSend.forEach(function (key) {
    if (!notificationsSent[key]) {
      const msg = NOTIFICATION_MESSAGES[key];
      sendNotification(msg.title, msg.message, true);
      notificationsSent[key] = true;
    }
  });
}

// Wrapper: uses imported getSituationId with current time
function getCurrentSituationId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  return getSituationId(currentTime, workSchedule, dateStr);
}

// Gestione dei messaggi dal content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'testSound') {
    // Test del suono dalle opzioni
    const soundType = request.soundType || 'classic';
    const volume = request.volume !== undefined ? request.volume : 0.5;

    chrome.offscreen
      .createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Test suono notifica',
      })
      .then(() => {
        chrome.runtime.sendMessage({
          action: 'testSound',
          soundType: soundType,
          volume: volume,
        });
      })
      .catch((error) => {
        if (error.message.includes('Only a single offscreen')) {
          chrome.runtime.sendMessage({
            action: 'testSound',
            soundType: soundType,
            volume: volume,
          });
        }
      });

    sendResponse({ success: true });
    return true;
  } else if (request.action === 'updateIcon') {
    const isTimbrato = request.isTimbrato;

    // Determiniamo lo stato base dell'icona
    let baseState;
    if (isTimbrato === true) {
      baseState = 'green';
    } else if (isTimbrato === false) {
      baseState = 'red';
    } else {
      baseState = 'na';
    }

    // Verifichiamo se deve lampeggiare
    if (isTimbrato !== null) {
      checkShouldBlink(isTimbrato, function (shouldBlink) {
        if (shouldBlink) {
          // Verifica se questa situazione è stata silenziata
          const situationId = getCurrentSituationId();
          chrome.storage.local.get(['mutedSituation'], function (data) {
            if (data.mutedSituation === situationId) {
              // Situazione silenziata, solo lampeggia senza suono
              startBlinking(baseState);
              chrome.storage.local.set({ isBlinking: true });
            } else {
              // Situazione non silenziata, lampeggia e suona
              startBlinking(baseState);
              startSound();
              chrome.storage.local.set({ isBlinking: true });
            }
          });
        } else {
          stopBlinking();
          stopSound();
          setIcon(baseState);
          chrome.storage.local.set({ isBlinking: false });
        }
        // Aggiorna il badge countdown
        updateBadgeCountdown(isTimbrato);
      });
    } else {
      stopBlinking();
      stopSound();
      setIcon(baseState);
      chrome.storage.local.set({ isBlinking: false });
      updateBadgeCountdown(isTimbrato);
    }
  } else if (request.action === 'muteNotification') {
    // Silenzia la notifica per la situazione corrente
    const situationId = getCurrentSituationId();
    if (situationId) {
      chrome.storage.local.set({ mutedSituation: situationId }, function () {
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

// Controlliamo periodicamente se deve lampeggiare e suonare
setInterval(() => {
  chrome.storage.local.get(
    ['timbratureStatus', 'mutedSituation', 'lastSituationId'],
    function (data) {
      if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
        const isTimbrato = data.timbratureStatus.isTimbrato;
        const baseState = isTimbrato ? 'green' : 'red';

        checkShouldBlink(isTimbrato, function (shouldBlink) {
          const currentSituationId = getCurrentSituationId();
          const lastSituationId = data.lastSituationId;

          // Verifica se la situazione è cambiata (es: da "entrata mattina" a "uscita pranzo")
          const situationChanged = currentSituationId !== lastSituationId;

          if (shouldBlink) {
            // Se la situazione è cambiata, riavvia il suono anche se già lampeggia
            if (situationChanged && currentSituationId) {
              log('[Background] Situazione cambiata:', lastSituationId, '->', currentSituationId);
              chrome.storage.local.set({ lastSituationId: currentSituationId });

              // Rimuovi il vecchio silenziamento
              chrome.storage.local.remove('mutedSituation');

              // Riavvia suono e lampeggio
              stopSound();
              startBlinking(baseState);
              startSound();
              chrome.storage.local.set({ isBlinking: true });
            } else if (!isBlinking) {
              // Prima volta che deve lampeggiare
              if (data.mutedSituation === currentSituationId) {
                // Situazione silenziata, solo lampeggia
                startBlinking(baseState);
                chrome.storage.local.set({ isBlinking: true });
              } else {
                // Situazione non silenziata
                startBlinking(baseState);
                startSound();
                chrome.storage.local.set({ isBlinking: true });
              }

              if (currentSituationId) {
                chrome.storage.local.set({ lastSituationId: currentSituationId });
              }
            }
          } else if (!shouldBlink && isBlinking) {
            stopBlinking();
            stopSound();
            setIcon(baseState);
            chrome.storage.local.set({ isBlinking: false });

            // Rimuovi il silenziamento quando la situazione cambia
            chrome.storage.local.remove('mutedSituation');
          }
          // Aggiorna il badge countdown
          updateBadgeCountdown(isTimbrato);
        });
      }
    }
  );
}, STATUS_CHECK_MS);

// Aggiorna il badge ogni minuto per il countdown
setInterval(() => {
  chrome.storage.local.get('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      updateBadgeCountdown(data.timbratureStatus.isTimbrato);
    }
  });
}, BADGE_UPDATE_MS);

// Funzione per verificare se oggi è escluso
function isExcludedDay(callback) {
  chrome.storage.local.get(
    {
      excludeWeekends: true,
      fullDayExclusions: [],
      halfDayExclusions: [],
    },
    function (options) {
      const now = new Date();
      const day = now.getDay(); // 0 = Domenica, 6 = Sabato
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = hours * 60 + minutes;

      // Formato data YYYY-MM-DD
      const today = now.toISOString().split('T')[0];

      // Verifica weekend
      if (options.excludeWeekends && (day === 0 || day === 6)) {
        callback({ excluded: true, reason: 'weekend' });
        return;
      }

      // Verifica giornate intere escluse
      if (options.fullDayExclusions.some((e) => e.date === today)) {
        callback({ excluded: true, reason: 'fullDay' });
        return;
      }

      // Verifica mezze giornate escluse
      const halfDayExclusion = options.halfDayExclusions.find((e) => e.date === today);
      if (halfDayExclusion) {
        // Mattina: 8:00-13:00 (480-780 minuti)
        // Pomeriggio: 14:00-18:00 (840-1080 minuti)
        if (halfDayExclusion.period === 'morning' && currentTime >= 480 && currentTime < 780) {
          callback({ excluded: true, reason: 'halfDayMorning' });
          return;
        }
        if (halfDayExclusion.period === 'afternoon' && currentTime >= 840 && currentTime <= 1080) {
          callback({ excluded: true, reason: 'halfDayAfternoon' });
          return;
        }
      }

      callback({ excluded: false });
    }
  );
}

// Funzione per verificare se siamo in orario lavorativo
function isWorkingHours(callback) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  // Orario lavorativo: dalle 8:00 alle 19:00
  const startWork = 8 * 60; // 08:00
  const endWork = 19 * 60; // 19:00

  if (currentTime < startWork || currentTime > endWork) {
    callback(false);
    return;
  }

  // Verifica se oggi è escluso
  isExcludedDay(function (result) {
    callback(!result.excluded);
  });
}

// Funzione per aprire Dipendenti in Cloud
function openDipendentiInCloud() {
  // Verifichiamo se la tab è già aperta
  chrome.tabs.query({ url: '*://secure.dipendentincloud.it/*' }, function (tabs) {
    if (tabs.length > 0) {
      // La tab esiste già, la attiviamo
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // La tab non esiste, la creiamo
      chrome.tabs.create({
        url: 'https://secure.dipendentincloud.it/it/app/dashboard',
        active: false, // Apriamo in background per non disturbare
      });
    }
  });
}

// Funzione per controllare lo stato all'avvio
function checkStatusOnStartup() {
  // Verifichiamo se l'apertura automatica è abilitata
  chrome.storage.local.get({ autoOpenSite: true }, function (options) {
    // Se siamo in orario lavorativo e l'opzione è abilitata, apriamo Dipendenti in Cloud
    if (options.autoOpenSite) {
      isWorkingHours(function (isWorking) {
        if (isWorking) {
          // Aspettiamo 2 secondi per dare tempo a Chrome di caricarsi completamente
          setTimeout(() => {
            openDipendentiInCloud();
          }, STARTUP_DELAY_MS);
        }
      });
    }
  });

  // Controlliamo lo stato salvato E forziamo un controllo immediato
  chrome.storage.local.get('timbratureStatus', function (data) {
    if (data && data.timbratureStatus && data.timbratureStatus.isTimbrato !== null) {
      const isTimbrato = data.timbratureStatus.isTimbrato;
      const baseState = isTimbrato ? 'green' : 'red';

      checkShouldBlink(isTimbrato, function (shouldBlink) {
        if (shouldBlink) {
          // All'avvio, controlliamo se la situazione è già stata silenziata
          const situationId = getCurrentSituationId();
          chrome.storage.local.get(['mutedSituation'], function (mutedData) {
            if (mutedData.mutedSituation === situationId) {
              // Situazione silenziata, solo lampeggia
              startBlinking(baseState);
              chrome.storage.local.set({ isBlinking: true });
            } else {
              // Situazione non silenziata, lampeggia, suona E invia notifica
              startBlinking(baseState);
              startSound();
              chrome.storage.local.set({ isBlinking: true });

              // Invia notifica immediata all'avvio se necessario
              sendStartupNotification(isTimbrato);
            }
          });
        } else {
          setIcon(baseState);
        }
        // Aggiorna il badge countdown
        updateBadgeCountdown(isTimbrato);
      });
    } else {
      // Impostiamo l'icona predefinita (na - informazioni non disponibili)
      setIcon('na');
      updateBadgeCountdown(null);
    }
  });
}

// Funzione per inviare notifica all'avvio se necessario
function sendStartupNotification(isTimbrato) {
  loadWorkSchedule(function () {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Verifica in quale fascia oraria siamo e se serve notifica
    if (
      isTimbrato === false &&
      currentTime >= workSchedule.morningStart &&
      currentTime < workSchedule.lunchEnd
    ) {
      sendNotification('TIMBRA ENTRATA', "Non hai ancora timbrato l'entrata del mattino!", true);
    } else if (
      isTimbrato === true &&
      currentTime >= workSchedule.lunchEnd &&
      currentTime < workSchedule.afternoonStart
    ) {
      sendNotification(
        'TIMBRA INIZIO PAUSA PRANZO',
        "Non hai ancora timbrato l'uscita per la pausa pranzo!",
        true
      );
    } else if (
      isTimbrato === false &&
      currentTime >= workSchedule.afternoonStart &&
      currentTime < workSchedule.eveningEnd
    ) {
      sendNotification(
        'TIMBRA FINE PAUSA PRANZO',
        'Non hai ancora timbrato il rientro dalla pausa pranzo!',
        true
      );
    } else if (isTimbrato === true && currentTime >= workSchedule.eveningEnd) {
      sendNotification('TIMBRA USCITA', "Non hai ancora timbrato l'uscita serale!", true);
    }
  });
}

// Quando l'estensione viene installata o aggiornata
chrome.runtime.onInstalled.addListener(function () {
  // Richiedi permesso notifiche
  chrome.storage.local.get({ enableNotifications: true }, function (options) {
    if (options.enableNotifications) {
      // Le notifiche verranno richieste quando l'utente salva le opzioni
    }
  });

  loadWorkSchedule(function () {
    checkStatusOnStartup();
  });
});

// Quando Chrome si avvia o l'estensione viene ricaricata
chrome.runtime.onStartup.addListener(function () {
  loadWorkSchedule(function () {
    checkStatusOnStartup();
  });
});
