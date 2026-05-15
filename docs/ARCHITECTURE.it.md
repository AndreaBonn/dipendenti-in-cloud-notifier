# Architettura

> [English](ARCHITECTURE.md)

Documentazione tecnica dell'architettura interna dell'estensione, flussi di messaggi e gestione dello stato.

## Panoramica Componenti

L'estensione opera in 5 contesti di esecuzione Chrome isolati, connessi tramite messaging `chrome.runtime`/`chrome.tabs` e `chrome.storage.local` come bus di stato condiviso.

```mermaid
%%{init: {'theme': 'default'}}%%
graph LR
  site["dipendentincloud.it"]
  content["Content Script<br/>Lettura DOM"]
  storage[("chrome.storage.local")]
  background["Service Worker<br/>Orchestratore"]
  popup["Popup<br/>Stato + Countdown"]
  options["Opzioni<br/>Impostazioni"]
  offscreen["Offscreen Doc<br/>Web Audio API"]
  notif["Notifiche Chrome"]
  alarms["Chrome Alarms<br/>30s + 60s"]

  site --> content
  content -->|"timbratureStatus"| storage
  content -->|"updateIcon"| background
  background --> storage
  background -->|"playSound"| offscreen
  background --> notif
  alarms -->|"statusCheck / badgeUpdate"| background
  popup -->|"leggi stato"| storage
  popup -.->|"getStatus"| content
  popup -->|"muteNotification"| background
  options -->|"leggi/scrivi impostazioni"| storage
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

**Legenda:** Blu = orchestrazione (service worker, alarms, pagine UI) | Verde = motori di esecuzione (content script, audio offscreen) | Arancione = stato condiviso (storage) | Grigio = esterni (sito, API Chrome)

**Frecce continue** = `chrome.runtime.sendMessage` o accesso diretto allo storage. **Frecce tratteggiate** = `chrome.tabs.sendMessage` (richiede tab attivo sull'origine target).

## Flusso Messaggi

Sequenza completa dal caricamento pagina all'attivazione del promemoria, poi interazione utente tramite popup.

```mermaid
sequenceDiagram
  participant site as dipendentincloud.it
  participant cs as Content Script
  participant bg as Service Worker
  participant st as chrome.storage
  participant osd as Offscreen Doc
  participant pop as Popup

  site->>cs: Caricamento pagina + DOM ready
  cs->>cs: Lettura stato timbratura
  cs->>st: Scrivi timbratureStatus
  cs->>bg: updateIcon

  bg->>st: Carica orario + esclusioni
  bg->>bg: Valuta shouldBlink

  alt Blink necessario
    bg->>osd: playSound
    osd->>osd: Sintesi Web Audio
    bg->>bg: Invia notifica desktop
    bg->>st: Scrivi isBlinking=true
  end

  Note over bg: Suono ripetuto ogni 5 min

  pop->>st: Leggi timbratureStatus
  pop->>cs: getStatus via tabs.sendMessage
  cs-->>pop: isTimbrato + timbratureOggi

  pop->>bg: muteNotification
  bg->>st: Scrivi mutedSituation
  bg->>osd: Ferma suono
```

Dettagli chiave:
- Il content script usa 3 strategie di rilevamento in ordine di priorita: testo pulsante, parita conteggio timbrature, classi CSS indicatori stato.
- Il `MutationObserver` ri-attiva il rilevamento alla navigazione SPA (debounce 500ms, intervallo minimo 10s).
- Il popup interroga il content script solo quando il tab attivo corrisponde a un'origine consentita.

## Macchina a Stati dell'Icona

L'icona dell'estensione riflette lo stato della timbratura e se serve un'azione. Sei stati, guidati dalla valutazione `shouldBlink()` in `time-utils.js`.

```mermaid
stateDiagram-v2
  [*] --> gray

  state "Sconosciuto (grigio)" as gray
  state "Timbrato (verde)" as green
  state "Non timbrato (rosso)" as red
  state "Lampeggio rosso: timbra IN" as blink_red
  state "Lampeggio verde: timbra OUT" as blink_green
  state "Silenziato (lampeggio, no suono)" as muted

  gray --> green : isTimbrato=true
  gray --> red : isTimbrato=false
  gray --> blink_red : non timbrato + in finestra
  gray --> blink_green : timbrato + in finestra

  green --> blink_green : Finestra pranzo/sera
  red --> blink_red : Finestra mattina/pomeriggio

  blink_red --> green : Utente timbra entrata
  blink_green --> red : Utente timbra uscita
  blink_red --> red : Finestra termina
  blink_green --> green : Finestra termina

  blink_red --> muted : Utente silenzia
  blink_green --> muted : Utente silenzia
  muted --> blink_red : Cambio situazione
  muted --> blink_green : Cambio situazione

  green --> gray : Giorno escluso
  red --> gray : Giorno escluso
  blink_red --> gray : Giorno escluso
  blink_green --> gray : Giorno escluso
```

Le 4 condizioni di lampeggio corrispondono all'orario di lavoro:

| Finestra | Stato timbratura | Colore lampeggio | Significato |
|----------|-----------------|------------------|-------------|
| `morningStart` - `lunchEnd` | Non timbrato | Rosso | Devi timbrare l'entrata mattina |
| `lunchEnd` - `afternoonStart` | Timbrato | Verde | Devi timbrare l'uscita pranzo |
| `afternoonStart` - `eveningEnd` | Non timbrato | Rosso | Devi timbrare l'entrata pomeriggio |
| Dopo `eveningEnd` | Timbrato | Verde | Devi timbrare l'uscita sera |

**Silenzia** ferma il suono ma l'icona continua a lampeggiare. Quando la situazione cambia (confine dello slot orario successivo), il silenziamento si resetta automaticamente.

## Ciclo di Controllo Periodico

Due alarm Chrome mantengono lo stato coerente anche dopo riavvii del service worker (MV3 puo terminare il SW in qualsiasi momento).

```mermaid
sequenceDiagram
  participant alarm as Chrome Alarms
  participant bg as Background
  participant st as chrome.storage
  participant icon as Icon Manager
  participant snd as Sound Manager
  participant ntf as Notification Mgr

  alarm->>bg: statusCheck (ogni 30s)
  bg->>st: Leggi timbratureStatus
  bg->>st: Leggi mutedSituation + orario
  bg->>bg: Controlla isExcludedDay

  alt Giorno escluso
    bg->>icon: stopBlinking + setIcon(gray)
    bg->>snd: stopSound
  else Blink necessario E non silenziato
    bg->>icon: startBlinking
    bg->>snd: startSound
    bg->>ntf: checkAndSendNotifications
  else Blink necessario E silenziato
    bg->>icon: startBlinking (no suono)
  else Non deve lampeggiare
    bg->>icon: stopBlinking + setIcon
    bg->>snd: stopSound
  end

  bg->>icon: updateBadgeCountdown

  Note over alarm,bg: badgeUpdate alarm (ogni 60s)
  alarm->>bg: badgeUpdate
  bg->>icon: updateBadgeCountdown
```

L'alarm `statusCheck` (30s) e' il battito cardiaco: rilegge lo storage, rivaluta l'intero albero decisionale del blink, e riconcilia lo stato. Gestisce i casi in cui:
- Il service worker e' stato terminato e riavviato da Chrome
- L'utente ha timbrato in un altro tab
- Un confine orario e' stato superato tra un controllo e l'altro

L'alarm `badgeUpdate` (60s) e' piu leggero: aggiorna solo il testo del countdown nel badge.
