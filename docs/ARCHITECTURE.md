# Architecture

> [Italiano](ARCHITECTURE.it.md)

Technical documentation of the extension's internal architecture, message flows, and state management.

## Component Overview

The extension runs across 5 isolated Chrome execution contexts, connected via `chrome.runtime`/`chrome.tabs` messaging and `chrome.storage.local` as the shared state bus.

```mermaid
%%{init: {'theme': 'default'}}%%
graph LR
  site["dipendentincloud.it"]
  content["Content Script<br/>DOM scraping"]
  storage[("chrome.storage.local")]
  background["Service Worker<br/>Orchestrator"]
  popup["Popup<br/>Status + Countdown"]
  options["Options<br/>Settings"]
  offscreen["Offscreen Doc<br/>Web Audio API"]
  notif["Chrome Notifications"]
  alarms["Chrome Alarms<br/>30s + 60s"]

  site --> content
  content -->|"timbratureStatus"| storage
  content -->|"updateIcon"| background
  background --> storage
  background -->|"playSound"| offscreen
  background --> notif
  alarms -->|"statusCheck / badgeUpdate"| background
  popup -->|"read status"| storage
  popup -.->|"getStatus"| content
  popup -->|"muteNotification"| background
  options -->|"read/write settings"| storage
  options -->|"testSound"| background
  options -.->|"extractAssenze"| content

  classDef core fill:#2563eb,stroke:#1d4ed8,color:#fff
  classDef data fill:#d97706,stroke:#b45309,color:#fff
  classDef ext fill:#6b7280,stroke:#4b5563,color:#fff
  classDef engine fill:#059669,stroke:#047857,color:#fff

  class background,alarms core
  class storage data
  class site,notif ext
  class content,offscreen engine
  class popup,options core
```

**Legend:** Blue = orchestration (service worker, alarms, UI pages) | Green = execution engines (content script, offscreen audio) | Orange = shared state (storage) | Gray = external (site, Chrome APIs)

**Solid arrows** = `chrome.runtime.sendMessage` or direct storage access. **Dashed arrows** = `chrome.tabs.sendMessage` (requires active tab on the target origin).

## Message Flow

Complete sequence from page load to reminder activation, then user interaction via popup.

```mermaid
sequenceDiagram
  participant site as dipendentincloud.it
  participant cs as Content Script
  participant bg as Service Worker
  participant st as chrome.storage
  participant osd as Offscreen Doc
  participant pop as Popup

  site->>cs: Page load + DOM ready
  cs->>cs: Scrape clock status
  cs->>st: Write timbratureStatus
  cs->>bg: updateIcon

  bg->>st: Load schedule + exclusions
  bg->>bg: Evaluate shouldBlink

  alt Blink needed
    bg->>osd: playSound
    osd->>osd: Web Audio synthesis
    bg->>bg: Send desktop notification
    bg->>st: Write isBlinking=true
  end

  Note over bg: Sound repeats every 5 min

  pop->>st: Read timbratureStatus
  pop->>cs: getStatus via tabs.sendMessage
  cs-->>pop: isTimbrato + timbratureOggi

  pop->>bg: muteNotification
  bg->>st: Write mutedSituation
  bg->>osd: Stop sound
```

Key details:
- Content script uses 3 detection strategies in priority order: button text, time-count parity, status-indicator CSS classes.
- The `MutationObserver` re-triggers detection on SPA navigation (debounced 500ms, min interval 10s).
- Popup queries content script only when the active tab matches an allowed origin.

## Icon State Machine

The extension icon reflects the user's clock status and whether action is needed. Six states, driven by `shouldBlink()` evaluation in `time-utils.js`.

```mermaid
stateDiagram-v2
  [*] --> gray

  state "Unknown (gray)" as gray
  state "Clocked In (green)" as green
  state "Clocked Out (red)" as red
  state "Blink Red: clock IN" as blink_red
  state "Blink Green: clock OUT" as blink_green
  state "Muted (blink, no sound)" as muted

  gray --> green : isTimbrato=true
  gray --> red : isTimbrato=false
  gray --> blink_red : not timbrato + in window
  gray --> blink_green : timbrato + in window

  green --> blink_green : Lunch/evening window
  red --> blink_red : Morning/afternoon window

  blink_red --> green : User clocks in
  blink_green --> red : User clocks out
  blink_red --> red : Window ends
  blink_green --> green : Window ends

  blink_red --> muted : User mutes
  blink_green --> muted : User mutes
  muted --> blink_red : Situation changes
  muted --> blink_green : Situation changes

  green --> gray : Excluded day
  red --> gray : Excluded day
  blink_red --> gray : Excluded day
  blink_green --> gray : Excluded day
```

The 4 blink conditions map to the work schedule:

| Window | Clock status | Blink color | Meaning |
|--------|-------------|-------------|---------|
| `morningStart` - `lunchEnd` | Not clocked in | Red | Need to clock in for morning |
| `lunchEnd` - `afternoonStart` | Clocked in | Green | Need to clock out for lunch |
| `afternoonStart` - `eveningEnd` | Not clocked in | Red | Need to clock in for afternoon |
| After `eveningEnd` | Clocked in | Green | Need to clock out for evening |

**Mute** silences sound but keeps the icon blinking. When the situation changes (next time slot boundary), mute resets automatically.

## Periodic Check Cycle

Two Chrome alarms keep the state consistent even across service worker restarts (MV3 can terminate the SW at any time).

```mermaid
sequenceDiagram
  participant alarm as Chrome Alarms
  participant bg as Background
  participant st as chrome.storage
  participant icon as Icon Manager
  participant snd as Sound Manager
  participant ntf as Notification Mgr

  alarm->>bg: statusCheck (every 30s)
  bg->>st: Read timbratureStatus
  bg->>st: Read mutedSituation + schedule
  bg->>bg: Check isExcludedDay

  alt Excluded day
    bg->>icon: stopBlinking + setIcon(gray)
    bg->>snd: stopSound
  else Should blink AND not muted
    bg->>icon: startBlinking
    bg->>snd: startSound
    bg->>ntf: checkAndSendNotifications
  else Should blink AND muted
    bg->>icon: startBlinking (no sound)
  else Should NOT blink
    bg->>icon: stopBlinking + setIcon
    bg->>snd: stopSound
  end

  bg->>icon: updateBadgeCountdown

  Note over alarm,bg: badgeUpdate alarm (every 60s)
  alarm->>bg: badgeUpdate
  bg->>icon: updateBadgeCountdown
```

The `statusCheck` alarm (30s) is the heartbeat: it re-reads storage, re-evaluates the full blink decision tree, and reconciles state. This handles cases where:
- The service worker was killed and restarted by Chrome
- The user clocked in/out on another tab
- A schedule boundary was crossed between checks

The `badgeUpdate` alarm (60s) is lighter: it only refreshes the countdown badge text.
