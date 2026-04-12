# Promemoria Timbrature - Chrome Extension

## Overview
Chrome Manifest V3 extension that monitors clock-in/out status on dipendentincloud.it and sends reminders via notifications, sounds, and icon changes.

## Architecture
- **background.js** — Service worker: icon management, notifications, sound scheduling, periodic status checks
- **content.js** — Content script injected on dipendentincloud.it: DOM scraping for clock status, button detection
- **popup.js/popup.html/popup.css** — Extension popup: status display, countdown timer, punch history
- **options.js/options.html/options.css** — Options page: work schedule, exclusions, sound preferences
- **offscreen.js/offscreen.html** — Offscreen document for Web Audio API sound playback
- **src/time-utils.js** — Pure functions extracted for testability (schedule logic, badge text, blink rules)

## Key Patterns
- No bundler — plain JS loaded directly by Chrome. `src/time-utils.js` uses ES modules for tests only.
- State stored in `chrome.storage.local` — no external services, no backend
- Callback-based Chrome API wrappers (not async/await) for broadest compatibility
- `DEBUG` flag in background.js and content.js controls console output

## Development
```bash
npm install          # Install dev dependencies (ESLint, Prettier, Vitest)
npm run lint         # Run ESLint
npm run format:check # Check Prettier formatting
npm test             # Run unit tests (28 tests, Vitest)
```

## Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this directory
4. Visit `secure.dipendentincloud.it` to activate

## Testing
Unit tests cover `src/time-utils.js` pure functions: time conversion, blink logic, badge text, notification windows. Run with `npm test`.
