/**
 * Exclusion management: render, add, remove full-day and half-day exclusions.
 */

import { showToast, isValidDate, sanitizeDescription, MAX_EXCLUSIONS, VALID_PERIODS } from './ui-helpers.js';

// Renderizza le giornate intere escluse
export function renderFullDayExclusions(exclusions) {
  const container = document.getElementById('fullDayExclusions');
  const emptyMessage = document.getElementById('emptyFullDay');

  container.textContent = '';

  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));

  exclusions.forEach((exclusion) => {
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
    button.textContent = 'Rimuovi';
    button.addEventListener('click', function () {
      removeFullDayExclusion(exclusion.date);
    });

    item.appendChild(span);
    item.appendChild(button);
    container.appendChild(item);
  });
}

// Renderizza le mezze giornate escluse
export function renderHalfDayExclusions(exclusions) {
  const container = document.getElementById('halfDayExclusions');
  const emptyMessage = document.getElementById('emptyHalfDay');

  container.textContent = '';

  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));

  exclusions.forEach((exclusion) => {
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
    button.textContent = 'Rimuovi';
    button.addEventListener('click', function () {
      removeHalfDayExclusion(exclusion.date, exclusion.period);
    });

    item.appendChild(span);
    item.appendChild(button);
    container.appendChild(item);
  });
}

// Aggiungi giornata intera
export function addFullDayExclusion() {
  const dateInput = document.getElementById('fullDayDate');
  const descriptionInput = document.getElementById('fullDayDescription');

  if (!dateInput.value) {
    showToast('Seleziona una data', 'warning');
    return;
  }

  if (!isValidDate(dateInput.value)) {
    showToast('Data non valida', 'error');
    return;
  }

  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const exclusions = items.fullDayExclusions;

    if (exclusions.length >= MAX_EXCLUSIONS) {
      showToast(`Massimo ${MAX_EXCLUSIONS} esclusioni raggiunto`, 'warning');
      return;
    }

    if (exclusions.some((e) => e.date === dateInput.value)) {
      showToast('Questa data è già stata aggiunta', 'warning');
      return;
    }

    exclusions.push({
      date: dateInput.value,
      description: sanitizeDescription(descriptionInput.value),
    });

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nel salvataggio: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      renderFullDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Aggiungi mezza giornata
export function addHalfDayExclusion() {
  const dateInput = document.getElementById('halfDayDate');
  const periodInput = document.getElementById('halfDayPeriod');
  const descriptionInput = document.getElementById('halfDayDescription');

  if (!dateInput.value) {
    showToast('Seleziona una data', 'warning');
    return;
  }

  if (!isValidDate(dateInput.value)) {
    showToast('Data non valida', 'error');
    return;
  }

  if (!VALID_PERIODS.includes(periodInput.value)) {
    showToast('Periodo non valido', 'error');
    return;
  }

  chrome.storage.local.get({ halfDayExclusions: [] }, function (items) {
    const exclusions = items.halfDayExclusions;

    if (exclusions.length >= MAX_EXCLUSIONS) {
      showToast(`Massimo ${MAX_EXCLUSIONS} esclusioni raggiunto`, 'warning');
      return;
    }

    if (exclusions.some((e) => e.date === dateInput.value && e.period === periodInput.value)) {
      showToast('Questa mezza giornata è già stata aggiunta', 'warning');
      return;
    }

    exclusions.push({
      date: dateInput.value,
      period: periodInput.value,
      description: sanitizeDescription(descriptionInput.value),
    });

    chrome.storage.local.set({ halfDayExclusions: exclusions }, function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nel salvataggio: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      renderHalfDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Rimuovi giornata intera
function removeFullDayExclusion(date) {
  chrome.storage.local.get({ fullDayExclusions: [] }, function (items) {
    const exclusions = items.fullDayExclusions.filter((e) => e.date !== date);

    chrome.storage.local.set({ fullDayExclusions: exclusions }, function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nella rimozione: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      renderFullDayExclusions(exclusions);
    });
  });
}

// Rimuovi mezza giornata
function removeHalfDayExclusion(date, period) {
  chrome.storage.local.get({ halfDayExclusions: [] }, function (items) {
    const exclusions = items.halfDayExclusions.filter(
      (e) => !(e.date === date && e.period === period)
    );

    chrome.storage.local.set({ halfDayExclusions: exclusions }, function () {
      if (chrome.runtime.lastError) {
        showToast('Errore nella rimozione: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      renderHalfDayExclusions(exclusions);
    });
  });
}
