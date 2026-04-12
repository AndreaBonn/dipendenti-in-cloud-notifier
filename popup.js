document.addEventListener('DOMContentLoaded', function () {
  const statusContainer = document.getElementById('status-container');
  const statusElement = document.getElementById('status');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const countdownElement = document.getElementById('countdown');
  const timeElement = document.getElementById('time');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');
  const openSiteButton = document.getElementById('open-site');

  let countdownInterval = null;

  // Imposta l'URL del sito Dipendenti in Cloud
  openSiteButton.addEventListener('click', function () {
    chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' });
  });

  // Apri la pagina delle opzioni
  const openOptionsButton = document.getElementById('open-options');
  openOptionsButton.addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  // Silenzia la notifica
  const muteButton = document.getElementById('mute-notification');
  muteButton.addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: 'muteNotification' }, function (response) {
      if (response && response.success) {
        muteButton.textContent = '✓ Notifica silenziata';
        muteButton.style.backgroundColor = '#28a745';
        muteButton.disabled = true;

        setTimeout(function () {
          muteButton.style.display = 'none';
        }, 2000);
      }
    });
  });

  // Funzione per mostrare lo storico delle timbrature
  function showStorico(timbrature) {
    const storicoSection = document.getElementById('storico-section');
    const storicoList = document.getElementById('storico-list');

    if (!timbrature || timbrature.length === 0) {
      storicoList.innerHTML = '<div class="storico-empty">Nessuna timbratura oggi</div>';
      storicoSection.style.display = 'block';
      return;
    }

    storicoList.innerHTML = '';
    timbrature.forEach((timb, index) => {
      const item = document.createElement('div');
      const tipo = (index % 2 === 0) ? 'entrata' : 'uscita';
      const tipoLabel = (index % 2 === 0) ? 'Entrata' : 'Uscita';

      item.className = `storico-item ${tipo}`;
      item.innerHTML = `
        <span class="storico-time">${timb}</span>
        <span class="storico-type ${tipo}">${tipoLabel}</span>
      `;
      storicoList.appendChild(item);
    });

    storicoSection.style.display = 'block';
  }

  // Funzione per formattare la data
  function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Funzione per verificare se oggi è escluso
  function checkExcludedDay(callback) {
    chrome.storage.local.get({
      excludeWeekends: true,
      fullDayExclusions: [],
      halfDayExclusions: []
    }, function (options) {
      const now = new Date();
      const day = now.getDay();
      const today = now.toISOString().split('T')[0];

      if (options.excludeWeekends && (day === 0 || day === 6)) {
        callback({ excluded: true, reason: 'Weekend' });
        return;
      }

      const fullDay = options.fullDayExclusions.find(e => e.date === today);
      if (fullDay) {
        callback({ excluded: true, reason: fullDay.description || 'Giornata esclusa' });
        return;
      }

      const halfDay = options.halfDayExclusions.find(e => e.date === today);
      if (halfDay) {
        const period = halfDay.period === 'morning' ? 'Mattina' : 'Pomeriggio';
        callback({ excluded: true, reason: `${period} escluso${halfDay.description ? ' - ' + halfDay.description : ''}` });
        return;
      }

      callback({ excluded: false });
    });
  }

  // Funzione per calcolare e mostrare il countdown
  function updateCountdown(isTimbrato) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    // Verifica se oggi è escluso
    checkExcludedDay(function (result) {
      if (result.excluded) {
        countdownElement.textContent = `🏖️ ${result.reason}`;
        countdownElement.className = 'countdown';
        return;
      }

      startCountdownTimer(isTimbrato);
    });
  }

  // Funzione per avviare il timer del countdown
  function startCountdownTimer(isTimbrato) {
    countdownInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      let targetTime = null;
      let targetLabel = '';
      let isUrgent = false;

      // Determiniamo il prossimo evento in base allo stato e all'orario
      if (isTimbrato === false) {
        // Non timbrato - prossimo evento è l'entrata
        if (hours < 9) {
          targetTime = new Date(now);
          targetTime.setHours(9, 0, 0, 0);
          targetLabel = 'Entrata Mattina';
          isUrgent = false;
        } else if (hours < 13) {
          targetTime = new Date(now);
          targetTime.setHours(13, 0, 0, 0);
          targetLabel = 'Entrata Mattina (scadenza)';
          isUrgent = (hours >= 9);
        } else if (hours < 14) {
          targetTime = new Date(now);
          targetTime.setHours(14, 0, 0, 0);
          targetLabel = 'Entrata Pomeriggio';
          isUrgent = false;
        } else if (hours < 18) {
          targetTime = new Date(now);
          targetTime.setHours(18, 0, 0, 0);
          targetLabel = 'Entrata Pomeriggio (scadenza)';
          isUrgent = (hours >= 14);
        } else {
          countdownElement.textContent = 'Fuori Orario Lavorativo';
          countdownElement.className = 'countdown';
          return;
        }
      } else if (isTimbrato === true) {
        // Timbrato - prossimo evento è l'uscita
        if (hours < 13) {
          targetTime = new Date(now);
          targetTime.setHours(13, 0, 0, 0);
          targetLabel = 'Uscita Pranzo';
          isUrgent = false;
        } else if (hours < 14) {
          targetTime = new Date(now);
          targetTime.setHours(14, 0, 0, 0);
          targetLabel = 'Uscita Pranzo (scadenza)';
          isUrgent = (hours >= 13);
        } else if (hours < 18) {
          targetTime = new Date(now);
          targetTime.setHours(18, 0, 0, 0);
          targetLabel = 'Uscita Serale';
          isUrgent = false;
        } else {
          targetTime = new Date(now);
          targetTime.setHours(23, 59, 59, 0);
          targetLabel = 'Uscita Serale (SCADUTO!)';
          isUrgent = true;
        }
      } else {
        countdownElement.textContent = '';
        return;
      }

      if (targetTime) {
        const diff = targetTime - now;

        if (diff <= 0) {
          countdownElement.textContent = targetLabel + ' - SCADUTO!';
          countdownElement.className = 'countdown urgent';
        } else {
          const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

          let timeString = '';
          if (hoursLeft > 0) {
            timeString = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`;
          } else {
            timeString = `${minutesLeft}m ${secondsLeft}s`;
          }

          countdownElement.textContent = `${targetLabel}: ${timeString}`;

          if (isUrgent || minutesLeft < 5) {
            countdownElement.className = 'countdown urgent';
          } else if (minutesLeft < 15) {
            countdownElement.className = 'countdown warning';
          } else {
            countdownElement.className = 'countdown';
          }
        }
      }
    }, 1000);
  }

  // Funzione per aggiornare l'interfaccia utente in base allo stato
  function updateUI(status) {
    loadingElement.style.display = 'none';
    statusContainer.style.display = 'block';

    if (status.isTimbrato === true) {
      // Stato timbrato (verde)
      statusElement.classList.add('timbrato');
      statusIcon.classList.add('green');
      statusText.classList.add('text-green');
      statusText.textContent = 'Timbrato';

      if (status.lastTimbratura) {
        timeElement.textContent = 'Ultima timbratura: ' + status.lastTimbratura;
      }
    } else if (status.isTimbrato === false) {
      // Stato non timbrato (rosso)
      statusElement.classList.add('non-timbrato');
      statusIcon.classList.add('red');
      statusText.classList.add('text-red');
      statusText.textContent = 'Non timbrato';
    } else {
      // Stato non disponibile (grigio)
      statusElement.classList.add('non-disponibile');
      statusIcon.classList.add('gray');
      statusText.classList.add('text-gray');
      statusText.textContent = 'Stato non disponibile';
      errorElement.textContent = 'Apri Dipendenti in Cloud per vedere lo stato della timbratura';
      errorElement.style.display = 'block';
    }

    // Mostra lo storico delle timbrature se disponibile
    if (status.timbratureOggi && status.timbratureOggi.length > 0) {
      showStorico(status.timbratureOggi);
    }

    // Avviamo il countdown
    updateCountdown(status.isTimbrato);

    // Verifichiamo se mostrare il bottone silenzia
    checkIfShouldShowMuteButton(status.isTimbrato);

    // Se lo stato proviene dalla storage, mostriamo quando è stato controllato l'ultima volta
    if (status.fromStorage && status.lastChecked) {
      const lastCheckedText = document.createElement('div');
      lastCheckedText.className = 'time';
      lastCheckedText.textContent = 'Ultimo controllo: ' + formatDateTime(status.lastChecked);
      timeElement.parentNode.insertBefore(lastCheckedText, timeElement.nextSibling);
    }
  }

  // Funzione per verificare se mostrare il bottone silenzia
  function checkIfShouldShowMuteButton(isTimbrato) {
    const muteButton = document.getElementById('mute-notification');
    chrome.storage.local.get(['isBlinking'], function (data) {
      if (data.isBlinking && isTimbrato !== null) {
        muteButton.style.display = 'block';
      } else {
        muteButton.style.display = 'none';
      }
    });
  }

  // Prima proviamo a recuperare lo stato dalla storage locale
  chrome.storage.local.get('timbratureStatus', function (data) {
    if (data && data.timbratureStatus) {
      // Abbiamo trovato lo stato nella storage
      updateUI({
        isTimbrato: data.timbratureStatus.isTimbrato,
        lastTimbratura: data.timbratureStatus.lastTimbratura,
        fromStorage: true,
        lastChecked: data.timbratureStatus.lastChecked
      });

      // Anche se abbiamo lo stato dalla storage, proviamo comunque a ottenere lo stato in tempo reale
      // dalla pagina corrente, se è aperta
      checkCurrentTab();
    } else {
      // Non abbiamo trovato lo stato nella storage, controlliamo la tab corrente
      checkCurrentTab();
    }
  });

  // Funzione per controllare la tab corrente
  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        // Errore durante la query delle tab
        if (loadingElement.style.display !== 'none') {
          // Mostriamo questo errore solo se non abbiamo già aggiornato l'UI con i dati dalla storage
          loadingElement.style.display = 'none';
          errorElement.textContent = 'Errore: impossibile accedere alla tab corrente';
          errorElement.style.display = 'block';
        }
        return;
      }

      const currentTab = tabs[0];

      // Chiediamo lo stato al content script
      chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, function (response) {
        if (chrome.runtime.lastError || !response) {
          // Errore o nessuna risposta dal content script
          // Se non abbiamo già aggiornato l'UI con i dati dalla storage, lo facciamo ora
          if (loadingElement.style.display !== 'none') {
            loadingElement.style.display = 'none';
            statusContainer.style.display = 'block';
            statusElement.classList.add('non-disponibile');
            statusIcon.classList.add('gray');
            statusText.textContent = 'Stato non disponibile';
            errorElement.textContent = 'Apri Dipendenti in Cloud per vedere lo stato della timbratura';
            errorElement.style.display = 'block';
          }
          return;
        }

        // Aggiorniamo l'UI con i dati in tempo reale
        updateUI(response);
      });
    });
  }
});
