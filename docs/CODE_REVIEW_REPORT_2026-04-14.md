# Code Review Report — Promemoria Timbrature (Chrome Extension MV3)

**Data review:** 2026-04-14
**Revisore:** Senior Code Reviewer
**Contesto:** Progetto da mostrare a CTO multinazionali. Severità calibrata su standard produzione pubblica.

---

## Panoramica

- **Linguaggio:** JavaScript (ES Modules, no bundler, plain MV3)
- **File analizzati:** 23 sorgenti (`src/`), 4 test suite
- **Test:** 196 test — tutti verdi
- **Tooling:** ESLint, Prettier, Vitest — tutti configurati
- **Maturità rilevata:** Progetto maturo con CI/CD assente ma con CONTRIBUTING.md, CHANGELOG.md, test suite significativa, architettura modulare deliberata

---

## Summary Table

| Severità  | Conteggio | Stato |
|-----------|-----------|-------|
| CRITICAL  | 0         | PASS  |
| HIGH      | 4         | WARN  |
| MEDIUM    | 6         | INFO  |
| LOW       | 5         | NOTE  |

**Verdict: WARNING** — Nessun problema critico. Quattro problemi HIGH che un CTO attento individuerebbe durante una code review live.

---

## Punti di Forza

- **Architettura MV3 corretta:** separazione netta background/content/popup/options/offscreen. Service worker senza stato globale implicito (sincronizzazione via `syncStateOnWakeUp` documentata e corretta).
- **CSP molto restrittiva:** `default-src 'none'` nel manifest è il massimo livello di hardening possibile per un'estensione Chrome. Nessun `unsafe-inline` né `unsafe-eval`.
- **Validazione input pervasiva:** `isAllowedOrigin` usa URL parser (non regex) — immune a subdomain spoofing. `normalizeSoundType`, `normalizeVolume`, `filterValidExclusions` coprono tutti i boundary correttamente.
- **`chrome.runtime.lastError` ovunque:** nessuna callback Chrome senza controllo errore. Disciplina encomiabile.
- **Test comportamentali di qualità:** 196 test coprono boundary conditions, custom schedule, null state, casi negativi. Nessun test tautologico. `getBadgeText` e `shouldBlink` hanno boundary tests espliciti off-by-one.
- **`chrome.alarms` invece di `setInterval` per il polling periodico:** scelta corretta per MV3 — sopravvive alla terminazione del service worker.
- **Separazione pura/impura:** `time-utils.js` è completamente puro (zero dipendenze Chrome o DOM), testabile direttamente con Vitest senza mock.
- **Deduplicazione delle costanti:** `ALLOWED_ORIGINS`, `VALID_SOUND_TYPES`, `DEFAULT_SCHEDULE_STRINGS` in un unico `constants.js` condiviso.

---

## Problemi HIGH

### [H-01] `content.js` — logica di detection duplicata in `checkTimbratura` e `extractTimbratureOggi`

**File:** `src/content/content.js` (righe 24–54 e 217–238)

**Problema:** La ricerca di orari tramite `text.match(/\d{1,2}:\d{2}/g)` con filtro `TIME_FORMAT_STRICT` è implementata due volte con logica quasi identica. `extractTimbratureOggi` restituisce un array ordinato e deduplicato. `checkTimbratura` (righe 217–238) replica il loop su `timbratureElements` per calcolare `timbratureCount` e `lastTimbratura`, estraendo gli stessi orari senza usare il risultato di `extractTimbratureOggi`.

**Impatto:** `timbratureOggi` (da `extractTimbratureOggi`) e `timbratureCount`/`lastTimbratura` (da `checkTimbratura`) possono divergere silenziosamente se il DOM cambia tra le due chiamate — `extractTimbratureOggi` viene chiamata prima (riga 197), poi il loop duplicato usa `timbratureElements` rieseguito su un DOM già potenzialmente modificato dalla SPA.

**Come fixare:**
```js
// In checkTimbratura, derivare count e lastTimbratura dal risultato di extractTimbratureOggi
timbratureOggi = extractTimbratureOggi();
timbratureCount = timbratureOggi.length;
lastTimbratura = timbratureOggi.length > 0 ? timbratureOggi[timbratureOggi.length - 1] : '';
// Eliminare il secondo loop su timbratureElements (righe 217–238)
```

---

### [H-02] `checkTimbratura` — ritorna prima del `sendMessage` su alcuni path

**File:** `src/content/content.js` (righe 311–318)

**Problema:** Il ramo `if (!isRuntimeValid())` alle righe 311–318 fa `return { isTimbrato, lastTimbratura, timbratureOggi }` **dopo** aver già chiamato `chrome.storage.local.set`. Il salvataggio storage è avvenuto, ma il background non riceve il messaggio `updateIcon`. Il ritorno anticipato è corretto per impedire l'invio del messaggio, ma la funzione restituisce dati parziali al chiamante sincrono (il listener `getStatus` a riga 563). In quel path, il caller riceve dati che non corrispondono allo stato memorizzato nel storage.

**Impatto:** Race condition molto rara (si verifica solo se l'estensione viene ricaricata tra il `set` e il `sendMessage`), ma il return a riga 317 precede il normale `return` a riga 349 — la funzione ha due return points con dati potenzialmente diversi.

**Come fixare:** Uniformare a un unico return alla fine, separando la logica di notifica dall'accumulo dati:
```js
// Accumulare i dati, poi decidere se inviare il messaggio
if (isRuntimeValid()) {
  chrome.runtime.sendMessage({ action: 'updateIcon', isTimbrato });
}
return { isTimbrato, lastTimbratura, timbratureOggi };
```

---

### [H-03] `showConfirm` in `ui-helpers.js` — listener multipli su riapertura

**File:** `src/pages/options/ui-helpers.js` (righe 26–53)

**Problema:** `showConfirm` aggiunge `click` listener su `yesBtn` e `noBtn` ad ogni invocazione. La funzione `cleanup` li rimuove — ma solo se la Promise viene risolta. Se l'overlay viene chiuso da un click esterno o da un escape (non gestito), i listener rimangono registrati sul DOM. Alla successiva apertura del dialog, i listener si accumulano: il secondo click su "Sì" chiama `cleanup(true)` due volte, resolve la prima Promise con `true` e la seconda (già risolta) — comportamento inatteso.

Nella pratica attuale è chiamata solo da `importAssenze` con modal chiuso solo tramite i bottoni → non crashante. Ma è fragile per qualsiasi futura estensione del dialog.

**Come fixare:** Usare `{ once: true }` sui listener:
```js
yesBtn.addEventListener('click', onYes, { once: true });
noBtn.addEventListener('click', onNo, { once: true });
```
E semplificare `cleanup` rimuovendo le chiamate `removeEventListener` diventate ridondanti.

---

### [H-04] `ensureAlarms` — non è idempotente in tutte le versioni di Chrome

**File:** `src/background/index.js` (righe 315–318)

**Problema:** Il commento dice "idempotent — safe to call on every wake-up", ma `chrome.alarms.create` senza `chrome.alarms.clear` preventivo non è idempotente per tutti i parametri. In Chrome < 121, chiamare `create` su un alarm già esistente con `periodInMinutes` **non aggiorna** il periodo se l'alarm esiste già con un periodo diverso — viene silenziosamente ignorato. Il `minimum_chrome_version` nel manifest è `116`. Su Chrome 116–120 questa assunzione di idempotenza è tecnicamente incorretta.

**Impatto:** Se il periodo degli alarm viene cambiato in una versione futura del codice (es. da 0.5 a 1 minuto per `statusCheck`), gli utenti con Chrome < 121 già installati non riceverebbero il cambio fino a una reinstallazione.

**Come fixare:**
```js
function ensureAlarms() {
  chrome.alarms.get(ALARM_STATUS_CHECK, (existing) => {
    if (!existing || existing.periodInMinutes !== 0.5) {
      chrome.alarms.create(ALARM_STATUS_CHECK, { periodInMinutes: 0.5 });
    }
  });
  // ... stesso per ALARM_BADGE_UPDATE
}
```
Oppure alzare `minimum_chrome_version` a `121`.

---

## Problemi MEDIUM

### [M-01] `content.js` — commenti in italiano mischiati con funzioni non documentate

**File:** `src/content/content.js`

Le funzioni `checkTimbratura`, `extractAssenze`, `clickTimbraButton` hanno commenti inline in italiano ma nessun JSDoc con firma esplicita. Il file è l'unico sorgente del progetto senza JSDoc. Il contrasto con gli altri file (tutti con JSDoc su ogni export) è visibile e sarebbe notato in una code review pubblica.

**Fix:** Aggiungere JSDoc minimo con `@returns` e una riga di descrizione su ciascuna delle tre funzioni principali. I commenti inline possono restare.

---

### [M-02] `isValidTimeString` — regex permissiva sulle ore (accetta "99:00")

**File:** `src/shared/validation.js` (riga 84)

```js
export function isValidTimeString(value) {
  return typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
}
```

La regex accetta valori come `"99:00"`, `"25:61"`. La funzione è usata in `schedule-manager.js` come gate prima di `timeToMinutes`. Se un valore invalido superasse il check e finisse in `workSchedule`, l'intera logica di scheduling sarebbe silenziosamente corrotta.

In pratica il rischio è basso (i valori arrivano da `chrome.storage` scritto dalla pagina options che ha una propria validazione con regex corretta), ma `isValidTimeString` è documentata come funzione di validazione — dovrebbe fare quello che dichiara.

**Fix:**
```js
return typeof value === 'string' && /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value);
```

Nota: i test in `normalizers.test.js` attualmente passano `"23:59"` e `"0:00"` come validi ma non testano `"99:00"` come invalido — aggiungere il caso negativo.

---

### [M-03] `content.js` — `extractAssenze` ha `log` rimasti con dati di debug verbosi

**File:** `src/content/content.js` (righe 58–70, 85, 94, 101, 161, 178–180)

Con `DEBUG = false` in `logging.js`, i `log(...)` nel content script sono soppressi correttamente. Ma il content script ha la propria copia locale di `log`/`logError`/`logWarn` (non importa da `logging.js` perché i content script non possono usare ES modules), e `DEBUG` è hardcoded `false` in cima al file.

Il problema è che `extractAssenze` ha **molti più log** di qualsiasi altra funzione del progetto: timestamp dell'URL corrente, testo grezzo del widget (riga 70: `.substring(0, 500)`), conteggio elementi, testo di ogni elemento analizzato (riga 94). Sono chiaramente log di sviluppo. Se `DEBUG` venisse abilitato per test da un utente tecnico, l'output di console sarebbe rumoroso rispetto al resto del codebase.

**Fix:** Rimuovere i log a riga 59 (URL), 70 (testo widget raw), 85 (conteggio elementi), 94 (testo elemento) — sono log di ricognizione inutili in produzione anche in DEBUG mode.

---

### [M-04] `import-manager.js` — `pendingAssenze` è module-level mutable state

**File:** `src/pages/options/import-manager.js` (riga 9)

```js
const pendingAssenze = new Map();
```

La `Map` è condivisa tra invocazioni di `showImportModal` e `confirmImport`. Se l'utente apre il modal, non conferma, poi avvia una nuova importazione, `pendingAssenze.clear()` viene chiamata a riga 97 prima di ripopolare — corretto. Ma se `confirmImport` viene chiamata dopo un secondo `showImportModal` non completato, gli indici nel DOM (`data-index`) corrispondono alla seconda map, non alla prima. Il flow attuale lo impedisce (il modal è modale), ma è una dipendenza implicita fragile.

**Fix minimo:** Documentare esplicitamente l'invariante con un commento. **Fix completo:** Passare `pendingAssenze` come parametro a `confirmImport` invece di leggerlo dallo stato globale del modulo.

---

### [M-05] `popup.js` — `updateUI` inserisce nodi nel DOM in modo cumulativo

**File:** `src/pages/popup/popup.js` (righe 155–160)

```js
if (status.fromStorage && status.lastChecked) {
  const lastCheckedText = document.createElement('div');
  lastCheckedText.className = 'time';
  lastCheckedText.textContent = 'Ultimo controllo: ' + formatDateTime(status.lastChecked);
  timeElement.parentNode.insertBefore(lastCheckedText, timeElement.nextSibling);
}
```

`updateUI` viene chiamata due volte nel flusso principale: prima con i dati da storage (riga 191), poi di nuovo con i dati real-time dal content script (riga 239). Se entrambe le chiamate passano `fromStorage=true && lastChecked != null`, il `div` "Ultimo controllo" viene inserito due volte nel DOM.

In pratica il secondo `updateUI` è chiamato con `fromStorage` non impostato (i dati real-time non hanno questo campo), quindi la duplicazione non si verifica nel flusso normale. Ma la condizione è fragile: se in futuro il secondo `updateUI` riceve dati con `fromStorage=true`, il bug si manifesta.

**Fix:** Usare un elemento con ID fisso (`getElementById('last-checked-info')`) invece di creare e inserire un nodo nuovo ad ogni chiamata.

---

### [M-06] `checkExclusion` — magic numbers hardcoded per gli orari delle mezze giornate

**File:** `src/time-utils.js` (righe 127–133)

```js
if (halfDay.period === 'morning' && currentMinutes >= 480 && currentMinutes < 780) {
  // ...
}
if (halfDay.period === 'afternoon' && currentMinutes >= 840 && currentMinutes <= 1080) {
  // ...
}
```

I valori `480` (08:00), `780` (13:00), `840` (14:00), `1080` (18:00) sono magic numbers non collegati al `workSchedule` passato come parametro. `checkExclusion` non riceve il `workSchedule` dell'utente — le finestre per le mezze giornate sono fisse. Se l'utente configura uno schedule personalizzato (es. 08:00–17:00), le finestre di esclusione non rispettano il suo orario.

**Impatto:** Utente con schedule 08:00–12:00–13:00–17:00 — una mezza giornata pomeriggio (13:00–17:00) sarebbe considerata attiva fino alle 18:00 invece che fino alle 17:00.

**Fix:** Aggiungere `schedule` come parametro opzionale a `checkExclusion` con fallback sui valori attuali:
```js
const afternoonEnd = schedule ? schedule.eveningEnd : 1080;
```

---

## Problemi LOW

### [L-01] `offscreen.js` — commento di sincronizzazione non aggiornabile automaticamente

**File:** `src/pages/offscreen/offscreen.js` (righe 166–168)

```js
// Valid sound types whitelist (local copy for defense-in-depth).
// Must stay in sync with VALID_SOUND_TYPES in shared/constants.js.
// Offscreen documents cannot use ES module imports (MV3 limitation).
const VALID_SOUND_TYPES = Object.keys(SOUNDS);
```

La lista locale è derivata da `Object.keys(SOUNDS)` — quindi aggiornata automaticamente quando si aggiunge un nuovo sound type a `SOUNDS`. Il rischio di drift con `constants.js` è reale solo se si aggiunge una voce a `VALID_SOUND_TYPES` in `constants.js` **senza** aggiungere la relativa implementazione in `SOUNDS`. Il commento è corretto ma incompleto: andrebbe invertito ("SOUNDS è la fonte di verità — constants.js deve riflettere Object.keys(SOUNDS)").

---

### [L-02] `syncStateOnWakeUp` — reimposta `isBlinking: false` ma non ferma il suono

**File:** `src/background/index.js` (righe 80–90)

```js
function syncStateOnWakeUp(callback) {
  storageGet(['isBlinking'], function (data) {
    if (data.isBlinking && !isCurrentlyBlinking()) {
      storageSet({ isBlinking: false }, function () {
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  });
}
```

Al riavvio del service worker, se `isBlinking=true` nello storage ma `isCurrentlyBlinking()=false` (module state resettato), la funzione azzera il flag storage ma **non chiama `stopSound()`**. Se l'offscreen document era ancora attivo con un suono in loop (`soundInterval` non è persistente ma il document offscreen potrebbe esserlo), il suono continua. In pratica l'offscreen document viene terminato insieme al service worker, quindi il suono si ferma naturalmente. Ma il comportamento implicito è fragile da documentare.

---

### [L-03] `options.js` — `saveOptions` non valida `soundType` contro whitelist prima del salvataggio

**File:** `src/pages/options/options.js` (righe 66–67)

```js
const soundType = document.getElementById('soundType').value;
const soundVolume = parseInt(document.getElementById('soundVolume').value, 10);
```

`soundType` viene letto dal DOM e salvato in storage senza validazione contro `VALID_SOUND_TYPES`. La funzione `testSound` (riga 125) valida correttamente, ma `saveOptions` non lo fa. Un utente con devtools aperti che modifica il valore del `<select>` prima del click "Salva" potrebbe persistere un valore invalido in storage.

Il background recupera il valore con `normalizeSoundType` che fallback su `'classic'` — quindi non è un vettore di sicurezza. Ma è un'inconsistenza tra i due code path dello stesso modulo.

**Fix:** Aggiungere la stessa guardia di `testSound`:
```js
const soundType = VALID_SOUND_TYPES.includes(document.getElementById('soundType').value)
  ? document.getElementById('soundType').value
  : 'classic';
```

---

### [L-04] `countdown.js` — `countdownInterval` non viene pulito se `checkExcludedDay` fallisce

**File:** `src/pages/popup/countdown.js` (righe 68–112)

`updateCountdown` chiama `clearCountdown()` all'inizio (riga 69) — corretto. Poi chiama `checkExcludedDay` in modo asincrono. Se la callback di `checkExcludedDay` non arriva mai (storage error non gestito nel path), e `updateCountdown` viene richiamata di nuovo (es. da un secondo `updateUI`), viene chiamato un altro `clearCountdown()` che azzera `countdownInterval = null` — ma il secondo `setInterval` viene creato normalmente. Non c'è leak in questo scenario. Ma se `chrome.storage.local.get` nella callback `checkExcludedDay` lancia senza callback (impossibile nel Chrome standard ma possibile in test), il `countdownInterval` rimane `null` e nessun timer parte.

Non è un bug reale — è un'osservazione sul pattern.

---

### [L-05] `content.js` — `ALLOWED_HOSTNAMES` duplica informazione da `constants.js`

**File:** `src/content/content.js` (riga 14)

```js
// SYNC: must match ALLOWED_ORIGINS in src/shared/constants.js (content scripts cannot use ES modules)
const ALLOWED_HOSTNAMES = ['secure.dipendentincloud.it', 'cloud.dipendentincloud.it'];
```

Il commento `// SYNC:` documenta la dipendenza — apprezzabile. Ma la lista è hardcoded come hostname, mentre `constants.js` ha le origin complete (`https://...`). Se venisse aggiunto un terzo hostname in `constants.js`, è facile dimenticare di aggiornare anche `content.js`.

**Fix a costo zero:** Aggiungere un unit test che verifica che ogni hostname in `content.js` corrisponda a una entry in `ALLOWED_ORIGINS` — catching di eventuali drift futuri. Questo è l'unico punto del progetto dove la mancanza di import ES modules crea una vera vulnerabilità di manutenzione.

---

## Problemi ignorati deliberatamente

- **`console.error` in `icon-manager.js` con `// eslint-disable-line`:** intenzionale — gli errori Chrome API non sopprimibili devono essere visibili.
- **`audioContext` come variabile module-level in `offscreen.js`:** corretto per Web Audio API che richiede singleton per contesto documento.
- **Callback-based invece di Promise per Chrome API:** scelta deliberata documentata in CLAUDE.md per "broadest compatibility" — non un problema.
- **`setTimeout(doSend, 50)` in `sound-manager.js`:** magic number ma documentato con commento esplicativo. Il valore è un timing empirico per offscreen doc creation, non business logic.

---

## SECURITY REPORT (separato)

### Superficie analizzata

- Content script iniettato su `secure.dipendentincloud.it` e `cloud.dipendentincloud.it`
- Background service worker con message passing
- Options page con import dati dal DOM esterno
- Offscreen document per audio

### Vulnerabilità rilevate

**Nessuna vulnerabilità sfruttabile rilevata.**

Elementi verificati:

- **Message validation:** background.js riga 209 verifica `sender.id !== chrome.runtime.id` e `isAllowedOrigin(sender.tab.url)` prima di processare qualsiasi messaggio. Content script riga 555 idem. Immune a messaggi da pagine web non autorizzate.
- **XSS:** nessun `innerHTML` con dati non fidati. `popup.js` usa esclusivamente `textContent` e `createElement` per costruire il DOM. `exclusion-manager.js` idem. `import-manager.js` idem. `ui-helpers.js` usa `toast.textContent` — non `.innerHTML`.
- **Data da DOM esterno:** `extractTimbratureOggi` legge `textContent` dal DOM del sito target, non HTML grezzo. I valori vengono validati con `TIME_FORMAT_STRICT.test(time)` prima di essere accettati.
- **Storage pollution:** `filterValidExclusions` valida strutturalmente ogni entry prima dell'uso. `isValidDate` usa round-trip check per date impossibili.
- **CSP estensione:** `default-src 'none'` nel manifest — nessuna risorsa esterna caricabile.
- **Host permissions:** limitate ai due hostname del servizio target. Non c'è `<all_urls>` né wildcard TLD.
- **`clickTimbraButton`:** simula click su elementi del DOM del sito target (automazione). Non è una vulnerabilità di sicurezza dell'estensione — è il comportamento intenzionale della funzione "timbratura rapida". Il cooldown di 5 secondi previene double-click accidentali.
- **`pendingAssenze` (Map):** dati provenienti da `extractAssenze` passati attraverso `chrome.tabs.sendMessage`. Il flusso è interno all'estensione (extension → content script → extension) — non dati utente arbitrari.

**Superficie residua da documentare (non vulnerabilità):**

- I dati di `extractAssenze` includono `assenza.descrizione` che arriva dal DOM del sito target (testo estratto). La `sanitizeDescription` viene applicata in `confirmImport` (riga 175) prima del salvataggio — corretto. Ma non viene applicata in `showImportModal` dove il testo viene assegnato a `tipoDiv.textContent` (riga 121) — sicuro perché `textContent` non interpreta HTML.

✅ **Nessuna vulnerabilità sfruttabile. Security posture: BUONA.**

---

## Priorità di Intervento Consigliate

1. **[H-01] Eliminare la duplicazione DOM-query in `content.js`** — singola riga di codice, elimina una race condition reale e migliora la consistenza dei dati inviati al background.
2. **[H-03] `showConfirm` con `{ once: true }`** — fix di due righe che rende il dialog robusto per qualsiasi estensione futura.
3. **[M-02] `isValidTimeString` regex** — la funzione promette validazione ma non la fornisce completamente; aggiornare la regex e aggiungere il test mancante.
4. **[M-06] Magic numbers in `checkExclusion`** — impatta utenti con schedule non standard; aggiungere `schedule` come parametro opzionale è backward-compatible.
5. **[H-02] Return anticipato in `checkTimbratura`** — refactoring minimo che elimina il doppio return point e rende il flusso deterministico.

---

## Verdict Finale

Il progetto è solido. L'architettura è deliberata e coerente con i vincoli MV3, il testing è di qualità superiore alla media del settore per un'estensione Chrome, e la security posture è genuinamente buona — non per fortuna ma per scelta progettuale verificabile nel codice.

I quattro problemi HIGH sono tutti risolvibili in meno di un'ora. Il progetto è presentabile. Con le correzioni ai punti H-01, H-02 e H-03 diventa difficilmente attaccabile in una code review anche da un esaminatore severo.

