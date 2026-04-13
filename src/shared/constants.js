/**
 * Shared constants used across multiple extension modules.
 * Single source of truth — avoids magic strings and duplicated values.
 */

// Valid notification sound types (used by background, options, offscreen)
export const VALID_SOUND_TYPES = ['classic', 'urgent', 'gentle', 'bell', 'digital', 'alarm'];

// Allowed origins for content script communication
export const ALLOWED_ORIGINS = [
  'https://secure.dipendentincloud.it',
  'https://cloud.dipendentincloud.it',
];

// Timing constants (background service worker)
export const SOUND_REPEAT_MS = 5 * 60 * 1000;
export const BLINK_INTERVAL_MS = 500;
export const STATUS_CHECK_MS = 30 * 1000;
export const BADGE_UPDATE_MS = 60 * 1000;
export const NOTIFICATION_WINDOW_MINUTES = 5;
export const NOTIFICATION_AUTO_CLOSE_MS = 10 * 1000;
export const STARTUP_DELAY_MS = 2000;

// Default work schedule (HH:MM strings — used by storage.get defaults)
export const DEFAULT_SCHEDULE_STRINGS = {
  morningStart: '09:00',
  lunchEnd: '13:00',
  afternoonStart: '14:00',
  eveningEnd: '18:00',
};

// Notification messages per time slot
export const NOTIFICATION_MESSAGES = {
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
