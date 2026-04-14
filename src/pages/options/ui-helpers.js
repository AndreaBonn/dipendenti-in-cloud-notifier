/**
 * UI helper utilities for the options page: toast notifications, confirm dialogs.
 * Pure validation functions re-exported from shared/validation.js for convenience.
 */

export { isValidDate, sanitizeDescription } from '../../shared/validation.js';

export const MAX_EXCLUSIONS = 365;
export const VALID_PERIODS = ['morning', 'afternoon'];

export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
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

    yesBtn.addEventListener('click', onYes, { once: true });
    noBtn.addEventListener('click', onNo, { once: true });
  });
}
