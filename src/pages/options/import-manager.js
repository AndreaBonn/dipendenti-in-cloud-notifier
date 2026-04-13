/**
 * Absence import: fetch from Dipendenti in Cloud, show modal, confirm import.
 */

import { showToast, showConfirm, isValidDate, sanitizeDescription } from './ui-helpers.js';
import { renderFullDayExclusions } from './exclusion-manager.js';

// Importa assenze da Dipendenti in Cloud
export function importAssenze() {
  const importButton = document.getElementById('importAssenze');
  importButton.disabled = true;
  importButton.textContent = '⏳ Ricerca assenze...';

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

      showImportModal(response.assenze);
    });
  });
}

// Mostra il modal di importazione
function showImportModal(assenze) {
  const modal = document.getElementById('importModal');
  const assenzeList = document.getElementById('assenzeList');

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

// Conferma l'importazione delle assenze selezionate
export function confirmImport() {
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
      const description = checkbox.getAttribute('data-description') || '';

      if (!isValidDate(date)) return;

      if (!exclusions.some((e) => e.date === date)) {
        exclusions.push({
          date: date,
          description: sanitizeDescription(description),
        });
      }
    });

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nel salvataggio: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      document.getElementById('importModal').style.display = 'none';
      renderFullDayExclusions(exclusions);
      showToast(`${checkboxes.length} assenze importate con successo!`, 'success');
    });
  });
}
