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
