/**
 * Popup page — main orchestrator.
 * Displays clock status, punch history, countdown timer, and mute controls.
 */

import { updateCountdown, clearCountdown } from './countdown.js';
import { isAllowedOrigin } from '../../shared/validation.js';

function logWarn(...args) {
  console.warn('[Timbratura Popup]', ...args); // eslint-disable-line no-console
}

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

  openSiteButton.addEventListener('click', function () {
    chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' }, function () {
      if (chrome.runtime.lastError) {
        errorElement.textContent =
          'Impossibile aprire la pagina: ' + chrome.runtime.lastError.message;
        errorElement.style.display = 'block';
      }
    });
  });

  const openOptionsButton = document.getElementById('open-options');
  openOptionsButton.addEventListener('click', function () {
    chrome.runtime.openOptionsPage(function () {
      if (chrome.runtime.lastError) {
        errorElement.textContent = 'Impossibile aprire le impostazioni';
        errorElement.style.display = 'block';
      }
    });
  });

  const muteButton = document.getElementById('mute-notification');
  muteButton.addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: 'muteNotification' }, function (response) {
      if (chrome.runtime.lastError) {
        logWarn('muteNotification fallito:', chrome.runtime.lastError.message);
        return;
      }
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

  const TIME_FORMAT = /^\d{1,2}:\d{2}$/;

  function showStorico(timbrature) {
    const storicoSection = document.getElementById('storico-section');
    const storicoList = document.getElementById('storico-list');

    const validTimbrature = (timbrature || []).filter((t) => TIME_FORMAT.test(t));

    if (validTimbrature.length === 0) {
      storicoList.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'storico-empty';
      emptyDiv.textContent = 'Nessuna timbratura oggi';
      storicoList.appendChild(emptyDiv);
      storicoSection.style.display = 'block';
      return;
    }

    storicoList.textContent = '';
    validTimbrature.forEach((timb, index) => {
      const item = document.createElement('div');
      const tipo = index % 2 === 0 ? 'entrata' : 'uscita';
      const tipoLabel = index % 2 === 0 ? 'Entrata' : 'Uscita';

      item.className = `storico-item ${tipo}`;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'storico-time';
      timeSpan.textContent = timb;

      const typeSpan = document.createElement('span');
      typeSpan.className = `storico-type ${tipo}`;
      typeSpan.textContent = tipoLabel;

      item.appendChild(timeSpan);
      item.appendChild(typeSpan);
      storicoList.appendChild(item);
    });

    storicoSection.style.display = 'block';
  }

  function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function updateUI(status) {
    loadingElement.style.display = 'none';
    statusContainer.style.display = 'block';

    statusElement.classList.remove('timbrato', 'non-timbrato', 'non-disponibile');
    statusIcon.classList.remove('green', 'red', 'gray');
    statusText.classList.remove('text-green', 'text-red', 'text-gray');

    if (status.isTimbrato === true) {
      statusElement.classList.add('timbrato');
      statusIcon.classList.add('green');
      statusText.classList.add('text-green');
      statusText.textContent = 'Timbrato';

      if (status.lastTimbratura) {
        timeElement.textContent = 'Ultima timbratura: ' + status.lastTimbratura;
      }
    } else if (status.isTimbrato === false) {
      statusElement.classList.add('non-timbrato');
      statusIcon.classList.add('red');
      statusText.classList.add('text-red');
      statusText.textContent = 'Non timbrato';
    } else {
      statusElement.classList.add('non-disponibile');
      statusIcon.classList.add('gray');
      statusText.classList.add('text-gray');
      statusText.textContent = 'Stato non disponibile';
      errorElement.textContent = 'Apri Dipendenti in Cloud per vedere lo stato della timbratura';
      errorElement.style.display = 'block';
    }

    if (status.timbratureOggi && status.timbratureOggi.length > 0) {
      showStorico(status.timbratureOggi);
    }

    updateCountdown(status.isTimbrato, countdownElement);
    checkIfShouldShowMuteButton(status.isTimbrato);

    if (status.fromStorage && status.lastChecked) {
      const lastCheckedText = document.createElement('div');
      lastCheckedText.className = 'time';
      lastCheckedText.textContent = 'Ultimo controllo: ' + formatDateTime(status.lastChecked);
      timeElement.parentNode.insertBefore(lastCheckedText, timeElement.nextSibling);
    }
  }

  function checkIfShouldShowMuteButton(isTimbrato) {
    const muteBtn = document.getElementById('mute-notification');
    chrome.storage.local.get(['isBlinking'], function (data) {
      if (chrome.runtime.lastError) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Popup] checkIfShouldShowMuteButton storage.get fallito:',
          chrome.runtime.lastError.message
        );
        return;
      }
      if (data.isBlinking && isTimbrato !== null) {
        muteBtn.style.display = 'block';
      } else {
        muteBtn.style.display = 'none';
      }
    });
  }

  // Load status from storage first, then try real-time from content script
  chrome.storage.local.get('timbratureStatus', function (data) {
    if (chrome.runtime.lastError) {
      console.warn('[Popup] Lettura storage iniziale fallita:', chrome.runtime.lastError.message); // eslint-disable-line no-console
      checkCurrentTab();
      return;
    }
    if (data && data.timbratureStatus) {
      updateUI({
        isTimbrato: data.timbratureStatus.isTimbrato,
        lastTimbratura: data.timbratureStatus.lastTimbratura,
        timbratureOggi: data.timbratureStatus.timbratureOggi || [],
        fromStorage: true,
        lastChecked: data.timbratureStatus.lastChecked,
      });
      checkCurrentTab();
    } else {
      checkCurrentTab();
    }
  });

  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        if (loadingElement.style.display !== 'none') {
          loadingElement.style.display = 'none';
          errorElement.textContent = 'Errore: impossibile accedere alla tab corrente';
          errorElement.style.display = 'block';
        }
        return;
      }

      const currentTab = tabs[0];

      if (!isAllowedOrigin(currentTab.url || '')) {
        return;
      }

      chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, function (response) {
        if (chrome.runtime.lastError || !response) {
          logWarn(
            'sendMessage getStatus:',
            chrome.runtime.lastError?.message || 'nessuna risposta'
          );
          if (loadingElement.style.display !== 'none') {
            loadingElement.style.display = 'none';
            statusContainer.style.display = 'block';
            statusElement.classList.add('non-disponibile');
            statusIcon.classList.add('gray');
            statusText.textContent = 'Stato non disponibile';
            errorElement.textContent =
              'Apri Dipendenti in Cloud per vedere lo stato della timbratura';
            errorElement.style.display = 'block';
          }
          return;
        }

        updateUI(response);
      });
    });
  }

  window.addEventListener('unload', function () {
    clearCountdown();
  });
});
