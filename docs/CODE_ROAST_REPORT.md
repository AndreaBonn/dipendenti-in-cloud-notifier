# Code Roast Report — Promemoria Timbrature (Chrome Extension)

## Panoramica

- **Linguaggi rilevati**: JavaScript (ES2022, ES modules), HTML, CSS
- **File analizzati**: 23 file sorgente (tutti i `.js` in `src/` + `tests/`, più `manifest.json`, `package.json`, `eslint.config.js`)
- **Problemi totali**: 15 (CRITICAL 0 · MAJOR 5 · MINOR 7 · NITPICK 3)
- **Contesto rilevato**: progetto personale/distribuzione privata, linter ESLint + Prettier configurati, test runner Vitest con 132 test tutti verdi, nessuna CI/CD, nessun Dockerfile
- **Giudizio complessivo**: architettura solida per una Chrome Extension MV3, test suite eccellente sulle pure functions; un bug attivo sul secondo dominio supportato e la mancanza di Alarm API sono i punti critici da risolvere prima di una presentazione pubblica

---

## CRITICAL (0 problemi)

Nessuna vulnerabilità critica rilevata. CSP rigorosa nel manifest, allowlist origine validata con `URL` parser, input validati prima di entrare in storage.

---

## MAJOR (5 problemi)

### [BUG ATTIVO] `content.js`: `cloud.dipendentincloud.it` escluso dalla detection

**File**: `src/content/content.js` (righe 183-186, 544)

**Problema**: Il content script viene iniettato su entrambi i domini dichiarati nel manifest (`secure.dipendentincloud.it` e `cloud.dipendentincloud.it`). Il controllo interno per decidere se eseguire la detection usa `document.location.href.includes('secure.dipendentincloud.it')` (riga 183) — stringa hardcoded che esclude il secondo dominio. Il check a riga 544 nel listener `getStatus` usa la stessa stringa. Gli utenti su `cloud.dipendentincloud.it` ottengono sempre stato `null` (icona grigia) invece del risultato reale.

**Perché è grave**: bug attivo che impatta una categoria di utenti in modo invisibile. Nessun errore in console, l'estensione "funziona" ma restituisce dati sbagliati. La disconnessione rispetto all'allowlist condivisa in `constants.js` garantisce che si ripresenterà se si aggiunge un terzo dominio.

**Come fixare** (3 righe):
```js
// Riga 183 — sostituire il check
if (ALLOWED_ORIGINS.some(origin => document.location.href.startsWith(origin))) {
```
Dato che content.js non può usare ES modules, definire `ALLOWED_ORIGINS` come costante locale all'inizio del file con un commento `// SYNC: aggiornare anche constants.js`.

---

### [ARCH] Logica mute/blink triplicata in `index.js`

**File**: `src/background/index.js` (righe 97-128, 156-179, 246-274)
**Problema**: il pattern "controlla se mutedSituation corrisponde → avvia o no il suono → chiama `startBlinking`" appare tre volte quasi identiche: in `handleUpdateIcon`, in `checkStatusOnStartup` e nel body del `setInterval` STATUS_CHECK. Ogni volta che la logica cambia (es. nuovo stato "do not disturb") va aggiornata in tre posti distinti.
**Perché è grave**: una divergenza silente tra le tre copie ha già causato (o causerà) comportamenti incoerenti che si manifestano solo in percorsi specifici di avvio/ripristino — i peggiori da diagnosticare in background.
**Come fixare**: estrarre una funzione `applyBlinkState(baseState, shouldBlinkNow, situationId, mutedSituation)` che contenga la logica unica di avvio/stop blink + suono. I tre punti diventano semplici caller.

---

### [ARCH-MV3] `setInterval` nel service worker MV3 senza Alarm API

**File**: `src/background/index.js` (righe 222-260, 263-271)

**Problema**: Due `setInterval` a livello di modulo — 30s per status check, 60s per badge update. I service worker MV3 vengono terminati dal browser dopo ~30 secondi di inattività. Quando ripartono, i `setInterval` si reinizializzano e ripartono da zero: il tempo trascorso durante il sleep non viene mai conteggiato.

**Perché è grave**: durante i periodi di inattività (es. nessuna interazione con la UI), i check non avvengono alla frequenza prevista. Chrome Developers sconsiglia esplicitamente `setInterval` nei service worker MV3 in favore di `chrome.alarms`, che persiste anche quando il worker è inattivo.

**Come fixare**:
```js
// In onInstalled/onStartup:
chrome.alarms.create('statusCheck', { periodInMinutes: 0.5 });
chrome.alarms.create('badgeUpdate', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'statusCheck') { /* logica attuale del setInterval STATUS_CHECK */ }
  if (alarm.name === 'badgeUpdate') { /* logica badge */ }
});
```
Aggiungere `"alarms"` nei `permissions` del manifest.

---

### [LOGIC] Ramo `isTimbrato === null` in `handleUpdateIcon` non chiama `stopBlinking`/`stopSound` esplicitamente

**File**: `src/background/index.js` (righe 120-128)
**Problema**: quando `isTimbrato` e null, la funzione chiama `stopBlinking()` e `stopSound()` — ma solo perche si trova dentro il ramo `else` dopo il controllo `if (isTimbrato !== null)`. Se il service worker si risveglia con `isBlinking: true` in storage e `isTimbrato: null` (edge case reale dopo reset parziale), `syncStateOnWakeUp` azzera il flag in storage ma il blink in memoria viene fermato solo alla prossima chiamata a `handleUpdateIcon` con valore non-null. Il comportamento corretto sarebbe: qualunque percorso che porta a `setIcon('na')` deve sempre chiamare `stopBlinking()` e `stopSound()`.
**Come fixare**: chiamare `stopBlinking(); stopSound();` come prima cosa in `handleUpdateIcon`, prima del branching, poi gestire icona e badge in base al valore.

---

### [DOM] `content.js`: DOM scraping fragile per design, nessun segnale diagnostico di failure

**File**: `src/content/content.js` (righe 14-44, 168-270)
**Problema**: il rilevamento dello stato timbratura usa quattro strategie in cascata basate su classi CSS generiche (`[class*="timb"]`, `.sessione`, `[class*="badge"]`), testo dei pulsanti in italiano/inglese e conteggio pari/dispari degli orari. Qualsiasi redesign dell'app target rompe silenziosamente l'estensione restituendo `null` invece di `false` — l'icona diventa grigia invece di rossa, nascondendo il problema all'utente. Non esiste alcun meccanismo che notifichi quando il parsing fallisce sistematicamente.
**Perché e grave**: questo e il cuore dell'estensione. Un aggiornamento upstream lo rompe senza nessun segnale diagnostico.
**Come fixare**: implementare un contatore di `consecutiveNullResults` in storage. Se supera soglia (es. 3 check consecutivi con `null`), inviare una notifica "Impossibile leggere lo stato: verifica che la pagina sia caricata correttamente". Documentare la fragilita nel codice.

---

### [ASYNC] `confirmImport` legge dati sensibili da attributi HTML DOM invece che da stato in memoria

**File**: `src/pages/options/import-manager.js` (righe 144-165)

**Problema**: `confirmImport` recupera data e description da `checkbox.getAttribute('data-date')` e `checkbox.getAttribute('data-description')` — attributi scritti nel DOM da `showImportModal`. La fonte di verità sono i dati ricevuti dal content script, non il DOM. Il pattern è sbagliato: tra `showImportModal` e `confirmImport` il DOM è mutabile. `sanitizeDescription` è applicata al salvataggio (corretto), ma la data viene usata senza ulteriore validazione dopo la lettura dal DOM (riga 160 chiama `isValidDate` — quindi non è un bug, ma è ridondante e la difesa è al posto sbagliato).

**Come fixare**: conservare `pendingAssenze` come variabile di modulo in `import-manager.js` e usarla in `confirmImport`. Il DOM serve solo per il display.

---

## MINOR (7 problemi)

### [DRY] `checkExcludedDay` in `countdown.js` duplica `isExcludedDay` di `schedule-manager.js`

**File**: `src/pages/popup/countdown.js` (righe 20-59) vs `src/background/schedule-manager.js` (righe 51-72)
**Problema**: entrambe le funzioni leggono gli stessi 3 campi da storage, costruiscono lo stesso oggetto di parametri e chiamano `checkExclusion`. Differiscono solo in `checkTime` e nel post-processing. Se si aggiunge un nuovo tipo di esclusione, va aggiornato in due posti.
**Come fixare**: esporre da un modulo condiviso una funzione `readExclusionOptions(callback)` che legga da storage e chiami il callback con i raw options. Entrambi i caller la usano passando il proprio `checkTime`.

---

### [DRY] Default schedule hardcoded inline in `countdown.js` invece di usare `DEFAULT_SCHEDULE_STRINGS`

**File**: `src/pages/popup/countdown.js` (righe 79-83)
**Problema**: i default `'09:00'`, `'13:00'`, `'14:00'`, `'18:00'` sono hardcoded nella chiamata `chrome.storage.local.get`. La costante `DEFAULT_SCHEDULE_STRINGS` esiste gia in `src/shared/constants.js` ma non viene importata qui. Se il default cambia, `countdown.js` rimane disallineato.
**Come fixare**: importare `DEFAULT_SCHEDULE_STRINGS` da `constants.js` e usarla come defaults nella chiamata storage.

---

### [MAGIC] Costanti di orario non nominate in `schedule-manager.js` e `time-utils.js`

**File**: `src/background/schedule-manager.js` (righe 79-80) + `src/time-utils.js` (righe 127, 131)
**Problema**: `8 * 60` (08:00) e `19 * 60` (19:00) in `isWorkingHours` sono hardcoded senza costante nominata. I range half-day `480`, `780`, `840`, `1080` in `checkExclusion` non derivano dall'orario configurabile dall'utente — un utente con orario personalizzato vedrebbe le esclusioni mezze-giornata calcolate rispetto a range fissi invece che al suo schedule.
**Come fixare**: aggiungere `WORKING_HOURS_BUFFER_START` e `WORKING_HOURS_BUFFER_END` in `constants.js`. Il disallineamento half-day vs schedule configurabile e un problema piu profondo: `checkExclusion` dovrebbe ricevere lo schedule come parametro opzionale per calcolare i range half-day dinamicamente.

---

### [UX] `saveOptions` usa un elemento custom per il feedback di successo invece del sistema toast

**File**: `src/pages/options/options.js` (righe 94-104)
**Problema**: il salvataggio con successo mostra `document.getElementById('status').style.display = 'block'` — un elemento custom con timeout manuale. Gli errori nello stesso file usano `showToast(...)`. Il sistema di feedback e incoerente: due meccanismi paralleli per la stessa funzione (informare l'utente).
**Come fixare**: sostituire il blocco `status.style.display` con `showToast('Opzioni salvate correttamente', 'success')`.

---

### [CONFIG] `package.json` manca `"type": "module"` — warning ESLint a ogni esecuzione

**File**: `package.json`
**Problema**: ESLint stampa a ogni run "_Module type of file is not specified... Reparsing as ES module... This incurs a performance overhead_" perche `eslint.config.js` usa `import` ma `package.json` non dichiara `"type": "module"`. Tecnicamente innocuo, ma rumoroso e rallenta il linter.
**Come fixare**: aggiungere `"type": "module"` a `package.json`. Verificare che non ci siano file `.js` che usano `require()` (non ce ne sono).

---

### [STYLE] `content.js` usa commenti in italiano e nessun JSDoc — incoerente con il resto del codebase

**File**: `src/content/content.js` (tutti i commenti)
**Problema**: l'unico file senza header JSDoc e con commenti inline in italiano invece di inglese. Non e un problema funzionale, ma segnala che il file ha storia diversa e crea discontinuita nella leggibilita.
**Come fixare**: aggiungere header JSDoc e allineare i commenti allo stile del progetto in occasione della prossima modifica del file.

---

## NITPICK (3 problemi)

### [NAMING] `sendToOffscreen` e un nome fuorviante

**File**: `src/background/sound-manager.js` (riga 14)
Il nome suggerisce un semplice invio di messaggio, ma la funzione crea anche il documento offscreen se non esiste. Un nome come `ensureOffscreenAndSend` o `dispatchToOffscreen` sarebbe piu accurato.

---

### [STYLE] `showConfirm` non chiude su Escape e non gestisce click outside-overlay

**File**: `src/pages/options/ui-helpers.js` (righe 25-52)
Il modal di importazione in `options.js` gestisce il click outside tramite `window.addEventListener('click', ...)`, ma il `confirmOverlay` no. Non e necessariamente un bug (il design puo essere intenzionale per forzare una scelta esplicita), ma andrebbe documentato esplicitamente per evitare che un futuro maintainer lo "corregga" rompendo il comportamento voluto.

---

### [MV3] `sendToOffscreen` usa pattern matching su stringa di errore interna al browser

**File**: `src/background/sound-manager.js` (righe 34-39)

**Problema**: il catch di `createDocument` distingue "documento già esiste" da "errore reale" tramite `error.message.includes('Only a single offscreen')`. Fare pattern matching su stringhe di errore interne al browser è fragile — la stringa potrebbe cambiare tra versioni di Chrome. L'API corretta è `chrome.offscreen.hasDocument()`, disponibile da Chrome 116 (stesso `minimum_chrome_version` del manifest):

```js
export function sendToOffscreen(message) {
  chrome.offscreen.hasDocument().then((exists) => {
    if (exists) {
      doSend();
    } else {
      chrome.offscreen.createDocument({ ... }).then(() => setTimeout(doSend, 50));
    }
  });
}
```

---

### [DEAD CODE] `getBadgeText` contiene un branch `diff <= 0` che non puo essere raggiunto

**File**: `src/time-utils.js` (riga 76)
Con la logica attuale, `diff` non puo mai essere ≤ 0 perche ogni branch usa `<` stretto e `targetTime` e sempre strettamente maggiore di `currentMinutes`. Il solo `'!'` restituito in pratica e quello hardcoded a riga 70. Il test suite lo nota gia nei commenti (righe 239-256). Non e sbagliato, ma la dead branch aggiunge rumore cognitivo. Valutare se rimuoverla o documentarne il motivo.

---

## Priorita di Refactoring Consigliate

1. **Estrarre `applyBlinkState` (MAJOR #1)** — la triplicazione della logica mute/blink e il debito con ROI piu alto: un fix elimina tre punti di divergenza potenziale in uno script che gira in background senza supervision.

2. **Disaccoppiare `checkShouldBlink` dal caricamento schedule (MAJOR #2)** — rimuove i doppi round-trip a storage e rende il flusso dati lineare e tracciabile.

3. **Aggiungere feedback di "parsing fallito" nel content script (MAJOR #4)** — l'estensione attuale fallisce silenziosamente quando il sito cambia struttura DOM. Un contatore di fallimenti consecutivi con notifica trasforma un bug invisibile in uno diagnosticabile.

4. **`"type": "module"` in package.json e default schedule da costante (MINOR #4, #5)** — due righe di codice, eliminano warning e disallineamento.

5. **Unificare il feedback di salvataggio options (MINOR #4)** — cambio rapido, elimina il meccanismo parallelo al sistema toast.

---

## Report Qualita — Tabella Riepilogo

| Severity | Conteggio | Stato  |
|----------|-----------|--------|
| CRITICAL | 0         | pass   |
| MAJOR    | 5         | warn   |
| MINOR    | 6         | info   |
| NITPICK  | 3         | note   |

**Verdict**: WARNING — nessun problema bloccante, ma i MAJOR #1 e #4 meritano attenzione prima di distribuire l'estensione a utenti esterni.

---

## SECURITY REPORT (separato e obbligatorio)

### Risultato: nessuna vulnerabilita rilevata

La superficie di attacco e intrinsecamente ridotta (estensione personale, nessun backend, nessun input utente non validato). Punti verificati:

- **CSP** (`manifest.json`): `default-src 'none'`, `script-src 'self'`, nessun `unsafe-inline` o `unsafe-eval`. Ottima.
- **Validazione origine messaggi** (`index.js` riga 198, `content.js` riga 525): `sender.id !== chrome.runtime.id` + `isAllowedOrigin(sender.tab.url)` — doppia guardia corretta.
- **`isAllowedOrigin`** (`shared/validation.js`): usa `new URL().origin` — immune a subdomain spoofing e path embedding. Testato con 10 casi edge nel test suite.
- **Input storage**: tutte le descrizioni passano per `sanitizeDescription` (trim + truncate), le date per `isValidDate` (round-trip check contro overflow silenzioso di `new Date`). Nessuna iniezione possibile su `chrome.storage.local`.
- **Sound type whitelist**: validato in tre punti indipendenti (background, offscreen, options) — defense in depth corretta.
- **URL aperte**: hardcoded a `https://secure.dipendentincloud.it/it/app/dashboard`, nessun redirect parametrizzato.
- **`data-description` in DOM**: letto in `confirmImport` senza HTML injection possibile perche inserito via `textContent` in `showImportModal` (riga 112) e validato con `sanitizeDescription` al salvataggio (riga 165).

**Unica osservazione** (non vulnerabilita): `chrome.runtime.lastError.message` viene passato direttamente a `showToast(...)` in `options.js` (riga 91). In un'estensione browser i messaggi di errore Chrome sono controllati da Google e non da input utente — non e una vulnerabilita, ma vale notare il pattern per il futuro.

✅ Nessuna vulnerabilita di sicurezza rilevata.

---

*Report generato il 2026-04-13 — branch `fix/audit-improvements`*
