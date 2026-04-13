# Code Roast Report — Promemoria Timbrature (Chrome Extension)

> Revisione: 2026-04-13 · Tono: professionale diretto

## Panoramica

- **Linguaggi rilevati**: JavaScript (ES2022, ES modules), HTML, CSS
- **File analizzati**: 18 file `.js` in `src/` + 2 file di test in `tests/` + `manifest.json`, `package.json`, `eslint.config.js`
- **Problemi totali**: 12 (CRITICAL 0 · MAJOR 4 · MINOR 5 · NITPICK 3)
- **Contesto rilevato**: progetto personale/distribuzione privata, linter ESLint + Prettier configurati, CI con GitHub Actions, test runner Vitest con 132 test tutti verdi (2 file di test), nessun Dockerfile
- **Giudizio complessivo**: architettura MV3 ben strutturata, separazione delle responsabilità chiara, error handling sistematico e test suite eccellente sulle pure functions. I problemi rimanenti sono concentrati in `content.js` (modulo più complesso e meno testato), con alcune lacune di copertura test e un paio di logiche fragili.

---

## CRITICAL (0 problemi)

Nessuna vulnerabilità critica. CSP rigorosa nel manifest (`default-src 'none'`), allowlist origine validata con parser `URL` (non confronto stringhe), input sanitizzati prima di entrare in storage, nessuna stringa esterna interpolata in DOM.

---

## MAJOR (4 problemi)

### [ARCH] `checkTimbratura` in `content.js`: funzione da 168 righe con tre responsabilità distinte

**File**: `src/content/content.js` (righe 178–346)

**Problema**: `checkTimbratura()` combina in un'unica funzione: (a) estrazione DOM dei pulsanti, (b) determinazione dello stato logico, (c) persistenza su `chrome.storage`, (d) invio messaggio al background. Raggiunge 168 righe con 4 livelli di nesting.

**Perché è grave**: questa funzione è il cuore dell'estensione ma è completamente esclusa dai test. L'impossibilità di testarla deriva direttamente dalla sua struttura monolitica — mischia I/O DOM, I/O storage e logica di business. Un refactoring della pagina target che cambi l'ordine dei pulsanti, o una modifica al formato data, romperebbe la detection senza che nessun test lo rilevi. Il prossimo sviluppatore (o il te futuro) che deve modificare questo codice deve tenere quattro cose in testa simultaneamente.

**Come fixare**: estrarre la logica di detection in una funzione pura `detectClockStatus(doc)` che accetta il documento e restituisce `{ isTimbrato, lastTimbratura, timbratureCount, timbratureOggi }`. La funzione pura è testabile senza DOM reale. Il corpo di `checkTimbratura()` diventa: chiama `detectClockStatus`, persisti, notifica.

```js
// Estraibile e testabile in isolamento
function detectClockStatus(doc) {
  const timbratureOggi = extractTimbratureOggi();
  // ... logica di detection ...
  return { isTimbrato, lastTimbratura, timbratureCount, timbratureOggi };
}

function checkTimbratura() {
  if (!ALLOWED_HOSTNAMES.includes(doc.location.hostname)) {
    // percorso storage-only
    return;
  }
  const status = detectClockStatus(document);
  persistStatus(status);
  notifyBackground(status.isTimbrato);
  return status;
}
```

---

### [BUG] `checkTimbratura`: logica fallback "numero dispari = timbrato" produce false positives

**File**: `src/content/content.js` (righe 243–250)

**Problema**: la strategia 3 determina lo stato dal conteggio delle timbrature: `isTimbrato = timbratureCount % 2 === 1`. Questo assume che il flusso sia sempre entrata→uscita→entrata→uscita in modo strettamente alternato. Due entrate accidentali consecutive (errore dell'utente o reingresso nella stessa giornata), oppure una timbratura correttiva, producono un conteggio pari ma stato reale "timbrato".

**Perché è grave**: il bug è silenzioso — l'utente vede l'icona verde mentre è in realtà non timbrato, che è esattamente il contrario di ciò che l'estensione promette. Il caso peggiore è che l'utente si fidi dell'icona verde e si dimentichi di timbrare.

**Come fixare**: la strategia fallback sul conteggio dovrebbe confrontare l'ultima timbratura trovata con l'orario corrente per inferire se è un'entrata o un'uscita, oppure abbandonare questo heuristic e restituire `null` (stato sconosciuto) quando le strategie primarie (bottoni) non trovano nulla. Stato sconosciuto — icona grigia — è più onesto di un guess sbagliato.

```js
// Invece di:
isTimbrato = timbratureCount % 2 === 1;
// Preferire:
isTimbrato = null; // incerto, segnalato con icona grigia
logWarn('Strategia fallback inaffidabile — stato impostato a sconosciuto');
```

---

### [COVERAGE] I moduli `content.js`, `popup.js`, `offscreen.js`, `options.js` sono esclusi dai test

**File**: `tests/` (intera directory)

**Problema**: i 132 test esistenti coprono esclusivamente `src/time-utils.js` e `src/shared/validation.js` — le pure functions. Nessun test per: `content.js` (logica di detection e parsing DOM), `popup.js` (aggiornamento UI da status object), `offscreen.js` (routing dei messaggi), `options.js` (validazione e serializzazione orari), `icon-manager.js` (logica di blink), `schedule-manager.js` (calcolo situationId).

**Perché è grave**: le pure functions testate sono fondamentali ma rappresentano circa il 20% del codice totale. La funzione `checkTimbratura`, che è il cuore del comportamento dell'estensione, non ha un singolo test. Se un fix introduce una regressione sul calcolo dello stato, la CI non la rileva. In una presentazione a un CTO, "132 test, 0 falliti" suona bene fino a quando si chiede "qual è la copertura per il modulo di detection?"

**Come fixare**: `detectClockStatus` estratta come funzione pura (vedi finding precedente) è testabile con un documento sintetico creato via `document.createElement`. Per i moduli con `chrome.*`, usare `vi.mock` di Vitest per moccare l'API Chrome. Priorità: test per `detectClockStatus`, poi per `getBadgeText`/`updateBadgeCountdown` logic, poi per la validazione orari in `options.js`.

---

### [RELIABILITY] `sendToOffscreen`: race condition sul `setTimeout(doSend, 50)`

**File**: `src/background/sound-manager.js` (righe 27–35)

**Problema**: dopo la creazione dell'offscreen document, viene usato un `setTimeout(..., 50)` fisso come garanzia che il listener sia registrato prima di inviare il messaggio. Questo è un time-based assumption — non c'è conferma che i 50ms siano sufficienti su macchine lente, sotto carico, o su futuri Chrome con latenze diverse nella creazione del documento offscreen.

**Perché è grave**: il bug è intermittente e dipendente dall'hardware — difficile da riprodurre, impossibile da testare, invisibile nei log normali. L'errore che produce (`chrome.runtime.lastError: Could not establish connection`) viene già gestito, ma l'effetto è che il suono non viene riprodotto senza alcuna notifica all'utente.

**Come fixare**: la soluzione robusta è che `offscreen.js` invii un messaggio di `ready` al background al termine della propria inizializzazione. Il background attende quel messaggio prima di inviare comandi audio. In alternativa, implementare retry con back-off:

```js
function doSendWithRetry(message, attempts = 3) {
  chrome.runtime.sendMessage(message, function () {
    if (chrome.runtime.lastError && attempts > 1) {
      setTimeout(() => doSendWithRetry(message, attempts - 1), 100);
    }
  });
}
```

---

## MINOR (5 problemi)

### [LOGIC] `checkStatusOnStartup`: normalizzazione `isTimbrato` ridondante e confusa

**File**: `src/background/index.js` (righe 155–158)

**Problema**: il codice legge `raw` da storage e poi lo normalizza con `raw === true ? true : raw === false ? false : null`. Questo triple-equality check è equivalente a usare direttamente `raw` (che è già un booleano o null). La normalizzazione ha senso se si teme che lo storage contenga stringhe come `"true"`, ma il codice che scrive in storage (content.js riga 286) usa già un booleano nativo. La normalizzazione crea l'impressione di un problema che non esiste o protegge da un caso che non viene documentato.

```js
// Attuale — confuso
const isTimbrato = raw === true ? true : raw === false ? false : null;

// Equivalente diretto — oppure documentare esplicitamente la difesa
const isTimbrato = typeof raw === 'boolean' ? raw : null;
```

---

### [DRY] `renderFullDayExclusions` e `renderHalfDayExclusions`: struttura identica al 90%

**File**: `src/pages/options/exclusion-manager.js` (righe 14–107)

**Problema**: le due funzioni condividono: la stessa struttura (get container + clear + sort + forEach + createElement), la stessa formattazione data (stessa chiamata `toLocaleDateString`), la stessa creazione del pulsante "Rimuovi". Differiscono solo nel campo `period` e nel formato del testo. Circa 40 righe di codice duplicato.

**Come fixare**: estrarre `renderExclusions(containerId, emptyMessageId, exclusions, formatLabel)` dove `formatLabel` è una funzione che riceve `exclusion` e restituisce la stringa da mostrare.

---

### [LOGIC] `extractAssenze` in `content.js`: costruzione data da pattern regex potenzialmente ambigua

**File**: `src/content/content.js` (righe 96–115)

**Problema**: il pattern `/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g` assume che la data abbia sempre formato `gg/mm/aaaa`. Ma il pattern accetta anche separatori diversi nello stesso match (es. `01/02.2025`), e non valida che giorno/mese siano in range. Se la pagina target cambia il formato data in `mm/gg/aaaa` (americano), le assenze importate saranno silenziosamente sbagliate.

**Come fixare**: aggiungere un commento esplicito che documenta l'assunzione `gg/mm/aaaa`, e aggiungere un check post-costruzione che verifica che il mese sia `<= 12` e il giorno sia `<= 31`, rigettando i match ambigui invece di convertirli silenziosamente. Questo non garantisce la correttezza ma riduce i false positives da format change.

---

### [STYLE INLINE] `popup.js` riga 42-46: stile inline per feedback visivo del pulsante mute

**File**: `src/pages/popup/popup.js` (righe 42–46)

**Problema**: il feedback visivo del pulsante mute ("Notifica silenziata") viene applicato tramite `muteButton.style.backgroundColor = '#28a745'` e `muteButton.style.display = 'none'` — stile inline hardcoded con un magic color `#28a745`. Il resto della UI usa classi CSS. Questo colore è già definito come `--color-success` (o equivalente) nel CSS. Il pattern misto è incoerente e rende impossibile aggiornare il colore da un unico punto.

**Come fixare**: aggiungere una classe CSS `.muted` con il colore e usare `classList.add('muted')` invece di `style.backgroundColor`.

---

### [MINOR] `background/index.js` riga 271: `!shouldBlinkNow` ridondante nella condizione

**File**: `src/background/index.js` (riga 271)

**Problema**: `} else if (!shouldBlinkNow && isCurrentlyBlinking()) {` — in un `if/else if` dove il ramo precedente è `if (shouldBlinkNow) {...}`, la condizione `!shouldBlinkNow` nell'else-if è always true (per definizione di else). Il check `isCurrentlyBlinking()` è l'unica condizione realmente discriminante. Il codice è corretto ma introduce rumore mentale.

```js
// Attuale
} else if (!shouldBlinkNow && isCurrentlyBlinking()) {

// Più leggibile
} else if (isCurrentlyBlinking()) {
```

---

## NITPICK (3 problemi)

### [COMMENT] `content.js`: commenti in italiano e inglese mescolati

Alcuni commenti di funzione usano frasi italiane (`// Funzione per controllare lo stato...`), altri usano inglese. Il codice ha già adottato un pattern di JSDoc header in inglese per i moduli `background/`. Uniformare a inglese per le funzioni principali (il tono è già ibrido — non è un fix urgente).

---

### [COMMENT] `offscreen.js` riga 161-162: commento duplica l'evidenza

```js
// Valid sound types whitelist (local copy for defense-in-depth).
// Must stay in sync with VALID_SOUND_TYPES in shared/constants.js.
// Offscreen documents cannot use ES module imports (MV3 limitation).
const VALID_SOUND_TYPES = Object.keys(SOUNDS);
```

Il commento è eccellente dal punto di vista del "perché", ma "local copy for defense-in-depth" potrebbe essere reso più diretto: la lista locale è derivata da `Object.keys(SOUNDS)`, quindi è già automaticamente allineata. Il commento suggerisce che esista un rischio di desync che in realtà non esiste per questa variabile specifica.

---

### [NAMING] `background/index.js`: funzione `checkShouldBlink` — nome pleonastico

`checkShouldBlink` inizia con `check` (verbo di procedura) ma restituisce un valore via callback, come le funzioni `should*` (predicato). Il nome mescola due convenzioni: `check` = effettua un'azione, `shouldBlink` = predicato booleano. Una scelta (`isBlinkNeeded`, `computeBlinkState`) sarebbe più leggibile, ma l'impatto è minimo.

---

## Punti di Forza

Sono raramente inclusi nei report di questo tipo, ma in un contesto di presentazione a un CTO vale documentare ciò che è fatto bene.

- **Architettura MV3 corretta**: Alarm API usata correttamente per la persistenza attraverso i wake-up del service worker. `syncStateOnWakeUp` gestisce il caso di restart. `ensureAlarms` è idempotente. Questi sono i tre pattern che quasi ogni estensione MV3 sbaglia.
- **Validazione origine con URL parser**: `isAllowedOrigin` usa `new URL(url).origin` invece di string matching — protegge correttamente da subdomain spoofing. Test espliciti per i casi di bypass.
- **Storage helpers centralizzati**: `storageSet/storageGet/storageRemove` in `storage-helpers.js` garantiscono che tutti gli accessi allo storage abbiano error handling. Il fallback a valori di default in caso di errore in `storageGet` è un dettaglio di robustezza che molte estensioni ignorano.
- **CSP minimalista**: `"default-src 'none'"` nel manifest — non `unsafe-inline`, non `unsafe-eval`, non `*`. Raro vederlo configurato così correttamente.
- **Test suite sulle pure functions**: 132 test che coprono `time-utils.js` e `validation.js` con casi limite reali (date inesistenti, format strings malformati, boundary values). `isValidDate` testa il caso `2025-02-29` con round-trip check — dettaglio non banale.
- **Separazione content script / background**: la logica di business risiede nel background worker, il content script fa solo detection DOM e delega. Questa separazione è l'architettura giusta.

---

## Priorità di Refactoring Consigliate

1. **Estrai `detectClockStatus` da `checkTimbratura`** — sblocca la testabilità del modulo core, riduce la complessità della funzione più critica, e rende visibile la logica fallback da correggere (finding #2). Un'ora di lavoro, beneficio immediato sulla qualità e sulla presentabilità del codice.

2. **Fix logica fallback conteggio pari/dispari** — sostituisci il guess con `null` (stato sconosciuto). Un'icona grigia è più onesta di un'icona verde sbagliata. Dipende dal finding #1 per essere testato correttamente.

3. **Aggiungi test per `detectClockStatus` e `popup.updateUI`** — dopo l'estrazione, scrivere 10-15 test comportamentali che coprono i casi: nessun pulsante trovato, solo pulsante entrata, solo pulsante uscita, pulsanti entrambi assenti con conteggio disponibile. Questo porta la copertura sul codice che effettivamente conta.

4. **Risolvi race condition `sendToOffscreen`** — implementa il ready-handshake da offscreen o il retry con back-off. L'impatto è su un'esperienza utente degradata intermittente (suono che non parte) su macchine lente.

5. **Deduplica `renderFullDayExclusions` / `renderHalfDayExclusions`** — refactoring meccanico, basso rischio, riduce il debito prima che vengano aggiunte ulteriori feature di esclusione.

---

## Verdict finale

Il codice è notevolmente sopra la media per una Chrome Extension personale: architettura MV3 corretta, sicurezza non trascurata, test su tutto ciò che è testabile in isolamento. Il problema strutturale è `content.js`, che concentra complessità non testata nel modulo più fragile (quello che dipende dal DOM di una pagina di terze parti che può cambiare senza preavviso). Un CTO che apre quel file e vede 600 righe con un heuristic `% 2` non commentato farà domande difficili. Estrai, testa, semplifica: è un pomeriggio di lavoro che trasforma il punto debole in un punto di forza.

---

_Report generato: 2026-04-13 — code-reviewer agent_
