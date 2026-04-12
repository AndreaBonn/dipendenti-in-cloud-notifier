// Toast notification system (replaces alert/confirm)
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.addEventListener('click', function () {
    toast.remove();
  });
  container.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, duration);
}

function showConfirm(message) {
  return new Promise(function (resolve) {
    const overlay = document.getElementById('confirmOverlay');
    const messageEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    messageEl.textContent = message;
    overlay.classList.add('active');

    function cleanup(result) {
      overlay.classList.remove('active');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(result);
    }

    function onYes() {
      cleanup(true);
    }
    function onNo() {
      cleanup(false);
    }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

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

// Renderizza le giornate intere escluse
function renderFullDayExclusions(exclusions) {
  const container = document.getElementById('fullDayExclusions');
  const emptyMessage = document.getElementById('emptyFullDay');

  container.textContent = '';

  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  // Ordina per data
  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));

  exclusions.forEach((exclusion, index) => {
    const item = document.createElement('div');
    item.className = 'exclusion-item';

    const date = new Date(exclusion.date);
    const formattedDate = date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const text = exclusion.description
      ? `${formattedDate} - ${exclusion.description}`
      : formattedDate;

    const span = document.createElement('span');
    span.textContent = text;

    const button = document.createElement('button');
    button.dataset.index = index;
    button.textContent = 'Rimuovi';
    button.addEventListener('click', function () {
      removeFullDayExclusion(index);
    });

    item.appendChild(span);
    item.appendChild(button);
    container.appendChild(item);
  });
}

// Renderizza le mezze giornate escluse
function renderHalfDayExclusions(exclusions) {
  const container = document.getElementById('halfDayExclusions');
  const emptyMessage = document.getElementById('emptyHalfDay');

  container.textContent = '';

  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  // Ordina per data
  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));

  exclusions.forEach((exclusion, index) => {
    const item = document.createElement('div');
    item.className = 'exclusion-item';

    const date = new Date(exclusion.date);
    const formattedDate = date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const period = exclusion.period === 'morning' ? 'Mattina' : 'Pomeriggio';

    const text = exclusion.description
      ? `${formattedDate} (${period}) - ${exclusion.description}`
      : `${formattedDate} (${period})`;

    const span = document.createElement('span');
    span.textContent = text;

    const button = document.createElement('button');
    button.dataset.index = index;
    button.textContent = 'Rimuovi';
    button.addEventListener('click', function () {
      removeHalfDayExclusion(index);
    });

    item.appendChild(span);
    item.appendChild(button);
    container.appendChild(item);
  });
}

// Aggiungi giornata intera
function addFullDayExclusion() {
  const dateInput = document.getElementById('fullDayDate');
  const descriptionInput = document.getElementById('fullDayDescription');

  if (!dateInput.value) {
    showToast('Seleziona una data', 'warning');
    return;
  }

  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const exclusions = items.fullDayExclusions;

    // Verifica se la data esiste già
    if (exclusions.some((e) => e.date === dateInput.value)) {
      showToast('Questa data è già stata aggiunta', 'warning');
      return;
    }

    exclusions.push({
      date: dateInput.value,
      description: descriptionInput.value,
    });

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      renderFullDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Aggiungi mezza giornata
function addHalfDayExclusion() {
  const dateInput = document.getElementById('halfDayDate');
  const periodInput = document.getElementById('halfDayPeriod');
  const descriptionInput = document.getElementById('halfDayDescription');

  if (!dateInput.value) {
    showToast('Seleziona una data', 'warning');
    return;
  }

  chrome.storage.local.get({ halfDayExclusions: [] }, function (items) {
    const exclusions = items.halfDayExclusions;

    // Verifica se la data e periodo esistono già
    if (exclusions.some((e) => e.date === dateInput.value && e.period === periodInput.value)) {
      showToast('Questa mezza giornata è già stata aggiunta', 'warning');
      return;
    }

    exclusions.push({
      date: dateInput.value,
      period: periodInput.value,
      description: descriptionInput.value,
    });

    chrome.storage.local.set({ halfDayExclusions: exclusions }, function () {
      renderHalfDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Rimuovi giornata intera
function removeFullDayExclusion(index) {
  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const exclusions = items.fullDayExclusions;
    exclusions.splice(index, 1);

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      renderFullDayExclusions(exclusions);
    });
  });
}

// Rimuovi mezza giornata
function removeHalfDayExclusion(index) {
  chrome.storage.local.get({ halfDayExclusions: [] }, function (items) {
    const exclusions = items.halfDayExclusions;
    exclusions.splice(index, 1);

    chrome.storage.local.set({ halfDayExclusions: exclusions }, function () {
      renderHalfDayExclusions(exclusions);
    });
  });
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
  const soundVolume = parseInt(document.getElementById('soundVolume').value);

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
      // Mostra il messaggio di conferma
      const status = document.getElementById('status');
      status.style.display = 'block';

      // Richiedi permesso notifiche se abilitato
      if (enableNotifications && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Nascondi il messaggio dopo 3 secondi
      setTimeout(function () {
        status.style.display = 'none';
      }, 3000);
    }
  );
}

// Funzione per importare assenze da Dipendenti in Cloud
function importAssenze() {
  const importButton = document.getElementById('importAssenze');
  importButton.disabled = true;
  importButton.textContent = '⏳ Ricerca assenze...';

  // Cerca una tab con Dipendenti in Cloud aperta
  chrome.tabs.query({ url: '*://secure.dipendentincloud.it/*' }, function (tabs) {
    if (tabs.length === 0) {
      showConfirm('Nessuna pagina di Dipendenti in Cloud aperta. Vuoi aprire la pagina ora?').then(
        function (openNow) {
          if (openNow) {
            chrome.tabs.create(
              { url: 'https://secure.dipendentincloud.it/it/app/dashboard' },
              function () {
                showToast(
                  'Pagina aperta! Attendi il caricamento, poi clicca di nuovo "Importa".',
                  'success',
                  5000
                );
              }
            );
          }
          importButton.disabled = false;
          importButton.textContent = '📥 Importa da Dipendenti in Cloud';
        }
      );
      return;
    }

    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, { action: 'extractAssenze' }, function (response) {
      importButton.disabled = false;
      importButton.textContent = '📥 Importa da Dipendenti in Cloud';

      if (chrome.runtime.lastError) {
        showToast(
          'Errore di comunicazione. Ricarica la pagina di Dipendenti in Cloud e riprova.',
          'error',
          5000
        );
        return;
      }

      if (!response || !response.success) {
        showToast(
          "Errore durante l'estrazione. Assicurati di essere nella pagina corretta.",
          'error',
          5000
        );
        return;
      }

      if (response.assenze.length === 0) {
        showToast(
          'Nessuna assenza trovata nei prossimi 7 giorni. Aggiungi manualmente le date future.',
          'info',
          5000
        );
        return;
      }

      // Mostra il modal con le assenze trovate
      showImportModal(response.assenze);
    });
  });
}

// Funzione per mostrare il modal di importazione
function showImportModal(assenze) {
  const modal = document.getElementById('importModal');
  const assenzeList = document.getElementById('assenzeList');

  // Carica le assenze già esistenti
  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const existingDates = items.fullDayExclusions.map((e) => e.date);

    assenzeList.textContent = '';

    if (assenze.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'no-assenze';
      emptyDiv.textContent = 'Nessuna assenza trovata';
      assenzeList.appendChild(emptyDiv);
    } else {
      assenze.forEach((assenza, index) => {
        const isDuplicate = existingDates.includes(assenza.date);
        const date = new Date(assenza.date);
        const formattedDate = date.toLocaleDateString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        const item = document.createElement('div');
        item.className = 'assenza-preview' + (isDuplicate ? ' duplicate' : '');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'assenza-info';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'assenza-date';
        dateDiv.textContent = formattedDate;

        const tipoDiv = document.createElement('div');
        tipoDiv.className = 'assenza-tipo';
        tipoDiv.textContent = assenza.descrizione + (isDuplicate ? ' (già presente)' : '');

        infoDiv.appendChild(dateDiv);
        infoDiv.appendChild(tipoDiv);

        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'assenza-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.index = index;
        checkbox.dataset.date = assenza.date;
        checkbox.dataset.description = assenza.descrizione;
        if (isDuplicate) {
          checkbox.disabled = true;
        } else {
          checkbox.checked = true;
        }

        checkboxDiv.appendChild(checkbox);
        item.appendChild(infoDiv);
        item.appendChild(checkboxDiv);
        assenzeList.appendChild(item);
      });
    }

    modal.style.display = 'block';
  });
}

// Funzione per confermare l'importazione
function confirmImport() {
  const checkboxes = document.querySelectorAll(
    '#assenzeList input[type="checkbox"]:checked:not(:disabled)'
  );

  if (checkboxes.length === 0) {
    showToast("Seleziona almeno un'assenza da importare", 'warning');
    return;
  }

  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const exclusions = items.fullDayExclusions;

    checkboxes.forEach((checkbox) => {
      const date = checkbox.getAttribute('data-date');
      const description = checkbox.getAttribute('data-description');

      // Verifica che non esista già
      if (!exclusions.some((e) => e.date === date)) {
        exclusions.push({
          date: date,
          description: description,
        });
      }
    });

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      // Chiudi il modal
      document.getElementById('importModal').style.display = 'none';

      // Ricarica la lista
      renderFullDayExclusions(exclusions);

      // Mostra messaggio di successo
      showToast(`${checkboxes.length} assenze importate con successo!`, 'success');
    });
  });
}

// Funzione per testare il suono
function testSound() {
  const soundType = document.getElementById('soundType').value;
  const soundVolume = parseInt(document.getElementById('soundVolume').value) / 100;

  // Invia messaggio al background per creare offscreen document e riprodurre suono
  chrome.runtime.sendMessage({
    action: 'testSound',
    soundType: soundType,
    volume: soundVolume,
  });
}

// Carica le opzioni quando la pagina viene aperta
document.addEventListener('DOMContentLoaded', function () {
  loadOptions();

  // Event listeners
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('addFullDay').addEventListener('click', addFullDayExclusion);
  document.getElementById('addHalfDay').addEventListener('click', addHalfDayExclusion);
  document.getElementById('importAssenze').addEventListener('click', importAssenze);
  document.getElementById('testSound').addEventListener('click', testSound);

  // Aggiorna il valore del volume in tempo reale
  document.getElementById('soundVolume').addEventListener('input', function (e) {
    document.getElementById('volumeValue').textContent = e.target.value + '%';
  });

  // Modal event listeners
  const modal = document.getElementById('importModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancelImport');
  const confirmBtn = document.getElementById('confirmImport');

  closeBtn.onclick = function () {
    modal.style.display = 'none';
  };

  cancelBtn.onclick = function () {
    modal.style.display = 'none';
  };

  confirmBtn.onclick = confirmImport;

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});
