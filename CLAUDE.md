# Promemoria Timbrature - Chrome Extension

## Overview

Chrome Manifest V3 extension that monitors clock-in/out status on dipendentincloud.it and sends reminders via notifications, sounds, and icon changes.

## Architecture

```
src/
  background/           — Service worker modules (ES modules)
    index.js            — Entry point: event listeners, orchestration
    icon-manager.js     — Icon state, badge text, blinking
    sound-manager.js    — Offscreen document, sound scheduling
    notification-manager.js — Desktop notifications, time-slot alerts
    schedule-manager.js — Work schedule loading, exclusion checks
    storage-helpers.js  — Safe chrome.storage wrappers
  content/
    content.js          — Content script: DOM scraping, clock status detection
  pages/
    popup/              — Extension popup: status display, countdown, history
    options/            — Options page: schedule, exclusions, sound prefs
    offscreen/          — Offscreen document for Web Audio API playback
  shared/
    constants.js        — Shared constants (timing, sound types, origins)
    logging.js          — Debug-gated logging utilities
  time-utils.js         — Pure functions for schedule logic (testable)
```

## Key Patterns

- No bundler — plain JS with ES modules. Service worker and extension pages use `type="module"`.
- Content script (`src/content/content.js`) cannot use ES modules (MV3 limitation) — self-contained.
- State stored in `chrome.storage.local` — no external services, no backend.
- Callback-based Chrome API wrappers (not async/await) for broadest compatibility.
- `DEBUG` flag in `src/shared/logging.js` and `src/content/content.js` controls console output.

## Development

```bash
npm install          # Install dev dependencies (ESLint, Prettier, Vitest)
npm run lint         # Run ESLint
npm run format:check # Check Prettier formatting
npm test             # Run unit tests (78 tests, Vitest)
```

## Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this directory
4. Visit `secure.dipendentincloud.it` to activate

## Testing

Unit tests cover `src/time-utils.js` pure functions: time conversion, blink logic, badge text, notification windows, exclusion checks, countdown targets. Run with `npm test`.

# currentDate

Today's date is 2026-04-13.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
