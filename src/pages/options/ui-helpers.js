/**
 * UI helper utilities for the options page: toast notifications, confirm dialogs, validation.
 */

export const MAX_EXCLUSIONS = 365;
export const MAX_DESCRIPTION_LENGTH = 100;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_PERIODS = ['morning', 'afternoon'];

export function isValidDate(dateStr) {
  return DATE_REGEX.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

export function sanitizeDescription(value) {
  return value.trim().substring(0, MAX_DESCRIPTION_LENGTH);
}

export function showToast(message, type = 'info', duration = 4000) {
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

export function showConfirm(message) {
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
