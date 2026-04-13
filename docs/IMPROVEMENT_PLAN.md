# Improvement Plan — Presentazione Convegno CTO

**Data audit:** 2026-04-12
**Voto attuale:** 8.3/10
**Obiettivo:** Raggiungere livello impeccabile per presentazione a convegno multinazionali

---

## Priorità ALTA — Da risolvere prima del convegno

### 1. Bug: notifiche duplicate dopo sleep

- **File:** `background.js:34`
- **Problema:** `notificationsSent` è in memoria volatile del service worker. Dopo sleep/wake del laptop si azzera → notifiche duplicate
- **Fix:** Persistere `notificationsSent` in `chrome.storage.local`
- **Effort:** ~10 righe

### 2. Bug: doppio click in simulateRealClick

- **File:** `content.js:386`
- **Problema:** `dispatchEvent(clickEvent)` + `element.click()` nello stesso frame → rischio doppia timbratura sulla SPA Angular
- **Fix:** Rimuovere uno dei due dispatch
- **Effort:** 1 riga

### 3. Lint script non copre src/

- **File:** `package.json` script `lint`
- **Problema:** `eslint *.js` non fa crawling nelle subdirectory → `src/time-utils.js` non viene lintato
- **Fix:** Cambiare in `eslint '**/*.js'` o `eslint '*.js' 'src/**/*.js'`
- **Effort:** 1 riga

### 4. Crash potenziale su sender.tab.url

- **File:** `background.js:311`
- **Problema:** Se `sender.tab.url` è `undefined`, `.startsWith()` lancia `TypeError`
- **Fix:** Aggiungere `!sender.tab.url ||` al check
- **Effort:** 1 riga

### 5. Logica duplicata isExcludedDay

- **File:** `popup.js` e `background.js`
- **Problema:** Stessa logica presente in due file — viola DRY, un CTO lo nota subito
- **Fix:** Centralizzare in `src/time-utils.js` (dove è già parzialmente)
- **Effort:** ~30 righe (refactor)

---

## Priorità MEDIA — Miglioramenti per "Wow Factor"

### 6. Copertura test insufficiente

- **Stato attuale:** 28 test solo su `src/time-utils.js`
- **Problema:** Logica di parsing timbratura, countdown e scheduling senza test
- **Azione:** Aggiungere test per parsing in `content.js` e logica scheduling
- **Effort:** ~200 righe di test

### 7. MutationObserver senza debounce

- **File:** `content.js`
- **Problema:** Ogni micro-mutazione DOM scatena il callback — spreco risorse
- **Fix:** Aggiungere debounce 300ms al callback
- **Effort:** ~10 righe

### 8. Message passing non filtra URL tab

- **File:** `popup.js:369`
- **Problema:** Invia messaggi a qualsiasi tab attiva senza verificare che sia `secure.dipendentincloud.it`
- **Fix:** Controllare `currentTab.url` prima di `sendMessage`
- **Effort:** ~5 righe

### 9. Offscreen message senza target filter

- **File:** `offscreen.js`
- **Problema:** Riceve tutti i messaggi broadcast dell'estensione
- **Fix:** Aggiungere `if (request.target !== 'offscreen') return;`
- **Effort:** 1 riga

### 10. Dati DOM non sanitizzati in chrome.storage

- **File:** `content.js:266-277`
- **Problema:** `document.location.href` salvato intero (inclusi query string con possibili token)
- **Fix:** Salvare solo origin o path pulito
- **Effort:** ~5 righe

### 11. Type validation su isTimbrato

- **File:** `background.js:414-416`, `popup.js:289,299`
- **Problema:** Valore letto da storage senza type-checking
- **Fix:** Normalizzare a booleano alla lettura
- **Effort:** ~3 righe

---

## Priorità BASSA — Cosmetica e struttura repo

### 12. Riorganizzare file marketing dal root

- **File:** `PROPOSTA_COMMERCIALE.md`, `SCHEDA_PRODOTTO.md`, `GUIDA_OPZIONI.md`, `SUONI_NOTIFICA.md`
- **Azione:** Spostare in `docs/` o `docs/commercial/`
- **Motivo:** Root troppo affollato (24 file)

### 13. Aggiungere CONTRIBUTING.md

- **Motivo:** Standard per repo open-source professionali

### 14. Aggiungere SECURITY.md

- **Motivo:** Dimostra maturità security-aware

### 15. Rimuovere about.html se inutilizzato

- **Problema:** File orfano, non referenziato nel manifest

### 16. Fix .DS_Store duplicato in .gitignore

- **Problema:** Ridondanza minore (righe 31 e 61)

---

## Punti di Forza (da evidenziare nella presentazione)

- Zero dipendenze runtime — nessun rischio supply chain
- CSP restrittiva — `script-src 'self'`, nessun `eval`/`innerHTML`
- Permessi minimali — solo 4 permission, host-specific
- DOM manipulation sicura — `textContent`/`createElement`, mai `innerHTML`
- CI/CD completo — lint + format + test + manifest validation
- Architettura testabile — core logic in modulo puro (`src/time-utils.js`)

---

## Checklist Completamento

- [x] Fix 1 — notificationsSent persistente
- [x] Fix 2 — rimuovere doppio click
- [x] Fix 3 — lint script copre src/
- [x] Fix 4 — null guard sender.tab.url
- [x] Fix 5 — centralizzare isExcludedDay (già centralizzata, documentato)
- [x] Fix 6 — aggiungere test coverage (56→78 test, +getCountdownTarget)
- [x] Fix 7 — debounce MutationObserver (già implementato, verificato)
- [x] Fix 8 — filtrare URL tab in popup.js
- [x] Fix 9 — target filter offscreen
- [x] Fix 10 — sanitizzare URL in storage
- [x] Fix 11 — type validation isTimbrato
- [x] Fix 12 — riorganizzare file marketing
- [x] Fix 13 — CONTRIBUTING.md
- [x] Fix 14 — SECURITY.md
- [x] Fix 15 — rimuovere about.html (spostato in docs/)
- [x] Fix 16 — dedup .gitignore
