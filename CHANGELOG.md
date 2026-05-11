## What's Changed in v1.0.0

> Initial release of the Chrome extension for dipendentincloud.it time tracking reminders.

### ✨ New Features
- Initial release v2.0 - Chrome extension for dipendentincloud.it time tracking reminders (face46e)

### 🐛 Bug Fixes
- Harden input validation, reduce permissions (#5)
- Audit hardening, silent failure fixes, and 64 new tests (#4)
- Harden reliability, expand test coverage, reorganize repo (#3)
- Harden security and resolve audit findings (#2)
- Harden security, fix countdown bug, resolve all lint warnings (#1)
- Pin system time in sendStartupNotification morning test (f21a5fa)
- Format test files and ensure JUnit reporter runs always (c93dc46)
- Add @emnapi/core and @emnapi/runtime to resolve npm ci failure (02bd1ca)
- Harden input validation, eliminate duplicate DOM query, reduce permissions (918040d)
- Harden error handling, input validation, and volume calculation (ccb88cc)
- Harden chrome API error handling, migrate to alarms, fix multi-domain bug (7849853)
- Eliminate silent failures and centralize storage error handling (0bd5a5d)
- Harden error handling, security, and robustness across extension (dfdb09b)
- Harden extension reliability and resolve audit findings (110dd20)
- Harden security and resolve audit findings across extension (97cb7f2)
- Harden security, fix countdown bug, and resolve all lint warnings (85aecab)
- Regenerate package-lock.json from clean state (e7608d5)
- Regenerate package-lock.json to fix npm ci sync error (d064f59)
- Align version string to semver 2.0.0 in about page (bd8fd35)
- Replace alert/confirm with toast notifications and custom dialog (85c7c4a)
- Add CSP, fix semver and homepage URL in manifest (9d58cb5)
- Replace innerHTML with safe DOM APIs to prevent XSS (804bf3e)

### 📚 Documentation
- Add UI screenshots for popup and options pages (b385f03)
- Rewrite documentation with bilingual EN/IT and cross-navigation (2a4f56f)
- Add code review report with security audit findings (86fbe85)
- Add CLAUDE.md with architecture overview and dev instructions (b615490)
- Add .env.example clarifying no env vars needed (28432ee)
- Add CHANGELOG.md and .editorconfig (cc139b4)
- Add MIT license (18a202a)

### 🔧 Maintenance
- Update repository URLs to new public name (#6)
- Update badges [skip ci] (8f5bea3)
- Update badges [skip ci] (0770e0a)
- Update badges [skip ci] (0dfcdde)
- Update badges [skip ci] (a04e50e)
- Use Node.js 24 to match local npm 11 lock file format (81a2cdf)
- Upgrade Node.js from 20 to 22 LTS in CI workflow (99a9c75)
- Update badges [skip ci] (07f75b2)
- Add dynamic coverage percentage badge (7008a9e)
- Update test badge [skip ci] (e424b4f)
- Add dynamic test badge and professional README badges (e0e41a7)
- Update repository URLs to new public name (0776234)
- Reorganize repo structure and add community files (6a63812)
- Add .prettierignore for node_modules and lock files (66674ad)
- Add GitHub Actions workflow for lint and manifest validation (8e9a961)
- Add ESLint + Prettier toolchain, fix all lint errors (d442a0a)
- Remove commercial/marketing docs from repository (7ce8b5d)

### Other
- Add 96 tests for all background modules (196→292) (2946767)
- Improve badge layout with 4+5 row split (eb001ed)
- Fix Prettier formatting in Italian docs (e31dab3)
- Add 54 behavioral tests and fix isValidDate bug (24efc93)
- Extract getCountdownTarget and expand test coverage to 78 tests (fc32fe4)
- Format CLAUDE.md with Prettier (bc7860c)
- Add unit tests for core scheduling logic with Vitest (a65dd25)
- Format README.md and offscreen.html with Prettier (30bed3b)

# Changelog

> Back to [README](README.md) | [README (IT)](README.it.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-01

### Added

- Real-time time-clock status detection (clocked in/out)
- Dynamic extension icon (green/red/gray with blinking alerts)
- Badge countdown to next clock event
- Desktop notifications at clock-in/out times
- 6 notification sound types with volume control (Web Audio API)
- Mute button for current notification
- Daily punch history in popup
- Customizable work schedule (morning start, lunch, afternoon, evening)
- Weekend exclusion
- Full-day and half-day exclusions (holidays, PTO)
- Auto-import absences from Dipendenti in Cloud dashboard
- Auto-open Dipendenti in Cloud on Chrome startup
- Options page with full configuration UI

### Security

- Content Security Policy declared in manifest
- Safe DOM manipulation (no innerHTML with dynamic data)
- Conditional debug logging (disabled in production)

## [1.0.0] - 2024-11-01

### Added

- Initial release with basic time-clock monitoring
- Simple icon state changes
