# Contribuire

> [English](CONTRIBUTING.md) | **Italiano**
>
> Torna al [README](README.it.md)

Grazie per considerare di contribuire a Promemoria Timbrature.

## Per Iniziare

1. Fai un fork del repository.
2. Clona il fork in locale.
3. Installa le dipendenze di sviluppo: `npm install`.
4. Carica l'estensione in Chrome: `chrome://extensions/` > Modalità sviluppatore > Carica estensione non pacchettizzata.

## Workflow di Sviluppo

```bash
npm run lint         # Esegui ESLint
npm run lint:fix     # Correggi automaticamente i problemi di lint
npm run format       # Formatta con Prettier
npm run format:check # Controlla la formattazione senza modificare
npm test             # Esegui i test unitari (Vitest)
npm run test:watch   # Esegui i test in modalità watch
```

Tutto il codice deve superare i controlli di lint, formattazione e test prima dell'invio.

## Stile del Codice

- JavaScript puro con ES modules (nessun bundler, nessun TypeScript).
- Wrapper delle Chrome API basati su callback per la massima compatibilità.
- Funzioni pure in `src/time-utils.js` e `src/shared/` per la testabilità.
- Codice specifico di Chrome isolato in `src/background/`, `src/content/` e `src/pages/`.
- Seguire le convenzioni di naming e i pattern esistenti.

## Pull Request

1. Crea un branch da `main`: `feature/nome-feature` o `fix/nome-fix`.
2. Scrivi test per le nuove funzionalità.
3. Verifica che `npm run lint && npm test` passi senza errori.
4. Invia una PR con una descrizione chiara delle modifiche e della loro motivazione.

I messaggi di commit seguono il formato [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(scope): descrizione breve in inglese

Corpo opzionale che spiega la motivazione alla base della modifica.
```

## Segnalazione Bug

Apri una issue includendo:

- Versione di Chrome e sistema operativo.
- Versione dell'estensione (da `manifest.json`).
- Passaggi per riprodurre il problema.
- Comportamento atteso vs. comportamento effettivo.
