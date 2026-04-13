# Code Review Report — Promemoria Timbrature (Chrome Extension)

**Data review**: 2026-04-12
**Reviewer**: Senior Code Reviewer (15 anni esperienza)
**Contesto**: Presentazione a convegno CTO multinazionali

---

## Panoramica

| Parametro | Valore |
|---|---|
| Linguaggi | JavaScript (Vanilla, no framework) |
| File analizzati | 12 (background.js, content.js, popup.js, options.js, offscreen.js, src/time-utils.js, manifest.json, package.json, popup.html, options.html, offscreen.html, CI workflow) |
| Tooling rilevato | ESLint + Prettier + Vitest + GitHub Actions CI |
| Test | 28 test su `src/time-utils.js` (funzioni pure) |
| Architettura | MV3 Service Worker + Content Script + Offscreen Document |
| Giudizio complessivo | Progetto solido nella sua semplicità, con un paio di difetti strutturali che un CTO noterebbe immediatamente |

---

## Punti di Forza

- **Architettura MV3 corretta**: uso di Offscreen Document per Web Audio API, manifest CSP restrittivo (`script-src 'self'`), nessuna dipendenza di runtime esterna.
- **Estrazione del core in modulo testabile**: `src/time-utils.js` isola correttamente la logica pura. Le funzioni sono piccole, firme chiare, JSDoc presente.
- **Suite di test professionale**: 28 test con copertura di boundary (off-by-one), schedule custom, input nulli. Pattern AAA rispettato, nessuna tautologia.
- **Tooling completo**: ESLint + Prettier + Vitest + CI su ogni push/PR. `package.json` pulito (solo devDependencies, nessuna dipendenza di runtime nel lock che non serve).
- **Security posture base**: CSP extension_pages con `script-src 'self'`, nessun `eval`, nessuna richiesta HTTP verso server terzi, dati in `chrome.storage.local` (mai cookie, mai `localStorage`).
- **README professionale**: disclaimer chiaro, funzionalità ben documentate, istruzioni di installazione complete.

---

## Report Qualità

### CRITICAL (0 problemi)

Nessun problema critico rilevato.

---

### HIGH (3 problemi)

---

#### [H-01] MutationObserver in `content.js` chiama `checkTimbratura()` ad ogni mutazione DOM — nessun debounce

**File**: `content.js` righe 326–340

**Problema**: `MutationObserver` è configurato con `{ childList: true, subtree: true }` sull'intero `document.body`. Dipendenti in Cloud è un'app Angular/SPA che produce aggiornamenti DOM continui. Ogni micromutazione triggera `checkTimbratura()`, che esegue `querySelectorAll` su selettori multipli, loop su `timbratureElements`, e una scrittura su `chrome.storage.local`.

**Impatto concreto**: Su una SPA con rendering frequente, si possono generare 50–200 invocazioni al secondo. Ogni invocazione crea un write su `chrome.storage.local`. Il service worker (background.js) riceve `updateIcon` in loop. Su hardware medio, questo degrada la responsività del browser.

**Come fixare**:
```javascript
let debounceTimer = null;
const observer = new MutationObserver(function (_mutations) {
  if (!isRuntimeValid()) {
    observer.disconnect();
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(checkTimbratura, 500);
});
```
Un debounce di 500ms è sufficiente per catturare il rendering Angular senza saturare lo storage.

---

#### [H-02] `startCountdownTimer` in `popup.js` usa orari hardcoded invece del `workSchedule` personalizzato

**File**: `popup.js` righe 151–246

**Problema**: La funzione `startCountdownTimer` calcola i target time con valori fissi (`setHours(9,0)`, `setHours(13,0)`, `setHours(14,0)`, `setHours(18,0)`). L'utente può configurare orari personalizzati nelle opzioni — ma il countdown nel popup ignora completamente questa configurazione. Se un utente imposta entrata alle 08:00, il countdown mostra sempre "Entrata Mattina: X ore" calcolato sul default 09:00.

**Impatto concreto**: Bug funzionale silenzioso. Un utente con orari non standard vede countdown errati. È il tipo di bug che emerge in demo e distrugge la credibilità del prodotto.

**Come fixare**: Leggere lo schedule da `chrome.storage.local` prima di avviare il timer, esattamente come fa `background.js` con `loadWorkSchedule()`. La logica di countdown deve essere centralizzata in `src/time-utils.js` come funzione pura (già parzialmente fatto con `getBadgeText`) o almeno leggere lo stesso schedule.

---

#### [H-03] Logica `isExcludedDay` duplicata in tre file senza sorgente unico

**File**: `background.js` righe 469–516, `popup.js` righe 94–130, con varianti parziali

**Problema**: La logica per determinare se un giorno è escluso (weekend, fullDayExclusions, halfDayExclusions) è implementata tre volte con variazioni sottili:
- `background.js`: controlla anche `currentTime` per le mezze giornate (righe 501–510)
- `popup.js`: controlla giorno/data ma non l'ora corrente per le mezze giornate
- Nessuna delle due versioni è importata dall'altra

**Impatto concreto**: Un fix a una versione non propaga all'altra. La versione di `popup.js` è incompleta rispetto a `background.js` (manca il check orario per halfDayExclusion). Qualsiasi modifica alla logica richiede un aggiornamento coordinato in più file — pattern garantito per introdurre divergenze.

**Come fixare**: Estrarre `isExcludedDay(options, now)` in `src/time-utils.js` come funzione pura con la firma completa. Entrambi i file la importano. Già esistono le fondamenta (il modulo è già creato e importato da background.js).

---

### MEDIUM (3 problemi)

---

#### [M-01] `checkTimbratura()` in `content.js` ritorna dati stantii nel caso asincrono

**File**: `content.js` righe 161–311

**Problema**: La funzione `checkTimbratura()` ha due percorsi di esecuzione:
1. Se siamo su `secure.dipendentincloud.it`: scrivi su storage, invia messaggio, poi `return { isTimbrato, ... }` (riga 307) — restituisce valori calcolati sincronicamente nel ramo.
2. Se non siamo sul sito: avvia una `chrome.storage.local.get` asincrona (righe 290–304), poi `return { isTimbrato: null, ... }` (riga 307) — restituisce `null` anche se lo storage ha dati validi.

Il caller nel `onMessage` listener (riga 503) chiama `sendResponse(checkTimbratura())` — nel caso asincrono risponde immediatamente con `null` invece di aspettare la callback.

**Come fixare**: Refactoring a callback o Promise. Il caso sincrono (siamo sul sito) dovrebbe rimanere tale; il caso asincrono dovrebbe chiamare `sendResponse` dalla callback dello storage e `return true` dal listener.

---

#### [M-02] `options.js` manca validazione degli orari di lavoro prima del salvataggio

**File**: `options.js` righe 272–313

**Problema**: `saveOptions()` salva gli orari senza verificare che siano logicamente coerenti. Non viene controllato che:
- `morningStart < lunchEnd`
- `lunchEnd < afternoonStart`
- `afternoonStart < eveningEnd`

Un utente che per errore imposta `lunchEnd = 08:00` e `morningStart = 13:00` creerà uno schedule che fa andare in loop tutte le funzioni di calcolo (incluse quelle in `time-utils.js` che assumono ordine cronologico corretto).

**Come fixare**:
```javascript
function validateSchedule(morningStart, lunchEnd, afternoonStart, eveningEnd) {
  const times = [morningStart, lunchEnd, afternoonStart, eveningEnd].map(timeToMinutes);
  return times[0] < times[1] && times[1] < times[2] && times[2] < times[3];
}
```
Chiamare in `saveOptions()` prima del `chrome.storage.local.set`. Mostrare toast di errore se non valido.

---

#### [M-03] `offscreen.js` — `createBellTone` ha variabili `start`/`end` calcolate ma mai usate

**File**: `offscreen.js` righe 119–130

**Problema**:
```javascript
function createBellTone(ctx, frequency, duration, startTime, volume) {
  const start = ctx.currentTime + startTime;  // calcolata...
  const end = start + duration;               // ...mai usata
  // poi delegato tutto a createTone()
```
Le variabili `start` ed `end` sono dichiarate e mai utilizzate. ESLint con `no-unused-vars` dovrebbe segnalarle, ma la configurazione attuale ha `argsIgnorePattern: '^_'` solo per argomenti, non per variabili locali.

**Come fixare**: Rimuovere le due righe. Dead code in una funzione audio può confondere chi la modifica.

---

### LOW / NITPICK (4 problemi)

---

#### [L-01] `popup.js` applica classi CSS cumulativamente senza reset — bug su secondo open

**File**: `popup.js` righe 253–277

**Problema**: `updateUI()` chiama `statusElement.classList.add('timbrato')`, `statusIcon.classList.add('green')` etc. senza mai rimuovere le classi precedenti. Il popup si chiude e si riapre su ogni click — ma la finestra è ricreata ogni volta, quindi in pratica non è un bug attivo oggi. Tuttavia, se la logica cambia (es. polling senza ricreazione), le classi si accumulano.

**Come fixare**: Aggiungere `statusElement.className = 'status'` (reset al valore base) all'inizio di `updateUI()`, prima di aggiungere classi di stato.

---

#### [L-02] `background.js` — `onInstalled` contiene un blocco `if` vuoto

**File**: `background.js` righe 656–659

**Problema**:
```javascript
chrome.storage.local.get({ enableNotifications: true }, function (options) {
  if (options.enableNotifications) {
    // Le notifiche verranno richieste quando l'utente salva le opzioni
  }
});
```
Il blocco legge lo storage solo per entrare in un `if` con corpo vuoto. Il commento spiega il motivo ma il codice è comunque dead. L'intera callback non fa nulla.

**Come fixare**: Rimuovere il blocco `chrome.storage.local.get` dall'handler `onInstalled`. Se in futuro serve logica di inizializzazione, aggiungerla allora.

---

#### [L-03] `popup.html` usa `<a>` con `href="#"` e gestione via `addEventListener` — inconsistente

**File**: `popup.html` righe 28–29

**Problema**:
```html
<a id="open-site" class="button" href="#" target="_blank">🌐 Apri Dipendenti in Cloud</a>
<a id="open-options" class="button secondary" href="#">⚙️ Opzioni</a>
```
Entrambi i link hanno `href="#"` e vengono gestiti via `addEventListener` in `popup.js`. Il `target="_blank"` su `open-site` è ignorato perché l'handler chiama `chrome.tabs.create` (che gestisce il tab separatamente). Il `href="#"` non porta da nessuna parte e può causare un flash di navigazione sulla pagina corrente del popup.

**Come fixare**: Usare `<button>` invece di `<a>` per azioni che non navigano a un URL diretto. I `<button>` sono semanticamente corretti per azioni e non richiedono `href`.

---

#### [L-04] `tests/time-utils.test.js` contiene commenti che documentano confusione sul comportamento atteso (riga 237)

**File**: `tests/time-utils.test.js` righe 237–249

**Problema**: Il test `'shows ! when exactly at target'` ha un commento di 10 righe che ragiona ad alta voce sul perché il comportamento atteso è diverso da quanto suggerito dal nome del test. Il test finisce per verificare `'4h'` anziché `'!'`. Il nome del test e il suo corpo documentano un malinteso sulla logica, poi corretto durante la scrittura.

**Come fixare**: Rinominare il test in qualcosa come `'returns hours when exactly at morningStart (not clocked in)'` e rimuovere il commento auto-esplicativo. I test devono essere leggibili senza archeologia intellettuale.

---

## Summary Table

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 0 | pass |
| HIGH | 3 | warn |
| MEDIUM | 3 | warn |
| LOW | 4 | note |

**Verdict**: WARNING — Nessun problema bloccante. I tre HIGH devono essere risolti prima della presentazione: [H-02] è un bug funzionale visibile in demo, [H-01] è un problema di performance osservabile su hardware medio, [H-03] è debito tecnico che un CTO con occhio da architetto noterà.

---

## Priorità di Refactoring Consigliate

1. **Fix [H-02] — Countdown con schedule personalizzato** — È il bug più imbarazzante in demo. Un CTO che testa il prodotto con orari non standard lo trova in 30 secondi. Fix stimato: 1 ora.

2. **Fix [H-01] — Debounce MutationObserver** — Quattro righe di codice che impediscono un degrado di performance percepibile. Fix stimato: 15 minuti.

3. **Fix [H-03] — Centralizzare `isExcludedDay` in `src/time-utils.js`** — Completa il pattern architetturale già iniziato (logica pura estratta in modulo testabile). Porta anche copertura di test gratuita. Fix stimato: 2 ore con test.

4. **Fix [M-02] — Validazione schedule in `saveOptions`** — Difesa contro configurazione utente invalida che fa crashare silenziosamente il resto dell'app. Fix stimato: 30 minuti.

5. **Cleanup [L-02] e [M-03]** — Dead code in due file. Rimozione pura, nessun rischio. Fix stimato: 5 minuti.

---

## Verdict Finale

Il progetto è architetturalmente onesto: rispetta le API MV3 correttamente, ha estratto la logica core in un modulo testabile, ha tooling professionale e CI che gira. Non ci sono horror show.

Detto questo, ci sono tre difetti che emergono chiaramente sotto pressione di demo: un bug funzionale silenzioso sul countdown, un MutationObserver che non dovrebbe lavorare così, e la stessa logica di esclusione giornata scritta due volte. Tutti e tre risolvibili in mezza giornata di lavoro — e la differenza tra "progetto serio" e "progetto da convegno" è esattamente questa mezza giornata.

---

## SECURITY REPORT (separato)

### Analisi di sicurezza

**Contesto**: Estensione Chrome single-user. Non c'è backend, nessun dato trasmesso a server terzi, nessun input utente usato in query o template HTML dinamici. La superficie di attacco è intrinsecamente ristretta.

#### Checklist P0 — Exploitable Now
- SQL injection: N/A (nessun DB)
- XSS: nessun `innerHTML` con dati non controllati — `popup.js` e `options.js` usano sempre `textContent` o `createElement` + `textContent`
- Command injection: N/A
- Path traversal: N/A
- Hardcoded secrets: nessuno
- Missing authentication: N/A (extension locale)
- SSRF: N/A

#### Checklist P1 — Exploitable with Effort
- `content.js` legge `textContent` di elementi DOM del sito target: i dati non vengono mai riflessi in HTML (solo letti e scritti su storage o inviati via message). Rischio XSS: assente nel flusso attuale.
- `chrome.storage.local` contiene lo stato della timbratura e le configurazioni utente: non contiene dati sensibili (nessuna credenziale, nessun token).

#### Checklist P2 — Hardening
- CSP `extension_pages`: `script-src 'self'; object-src 'self'` — corretto e restrittivo.
- Permessi manifest: `activeTab`, `storage`, `offscreen`, `tabs`, `notifications` — tutti giustificati dall'uso effettivo. Nessun permesso eccessivo (es. `webRequest`, `<all_urls>` non presenti).
- `content_scripts` matches limitato a `*://secure.dipendentincloud.it/*` e `*://cloud.dipendentincloud.it/*` — scope corretto.

#### Valutazione

✅ **Nessuna vulnerabilità rilevata** — La security posture dell'estensione è adeguata al contesto single-user. Il manifesto è configurato con il principio di minimo privilegio. I dati utente non lasciano il browser locale. Nessuna dipendenza di runtime esterna che potrebbe introdurre vettori di supply chain.
