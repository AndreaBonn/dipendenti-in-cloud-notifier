# Promemoria Timbrature

> [English](README.md) | **Italiano**
>
> [Contribuire](CONTRIBUTING.it.md) | [Sicurezza](SECURITY.it.md) | [Changelog](CHANGELOG.md)

![CI](https://github.com/AndreaBonn/dipendenti-in-cloud-notifier/actions/workflows/ci.yml/badge.svg)
![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Zero Dependencies](https://img.shields.io/badge/runtime_deps-0-brightgreen)

Estensione Chrome che ti ricorda di timbrare su [dipendentincloud.it](https://www.dipendentincloud.it).

## Disclaimer

Questa estensione **non è ufficiale** e **non è affiliata** in alcun modo con Dipendenti in Cloud o dipendentincloud.it.

L'utente è **l'unico responsabile** delle proprie timbrature. Questa estensione è fornita come strumento di comodità senza alcuna garanzia. Non sostituisce la necessità di verificare i propri dati direttamente sulla piattaforma.

## A Cosa Serve

Dipendenti in Cloud è una piattaforma usata dalle aziende italiane per gestire presenze, cedolini e comunicazioni aziendali. I dipendenti timbrano entrata e uscita tramite l'interfaccia web, e dimenticare di farlo è una causa frequente di problemi con le buste paga.

Questa estensione monitora lo stato della timbratura su dipendentincloud.it e ti avvisa quando è ora di timbrare, usando indicatori visivi, notifiche desktop e suoni configurabili. Funziona interamente nel browser, senza dipendenze esterne e senza inviare dati a nessun server.

## Installazione

L'estensione non è pubblicata sul Chrome Web Store. Per installarla, caricala manualmente in modalità sviluppatore:

1. Scarica o clona questo repository.
2. Apri Chrome e vai su `chrome://extensions/`.
3. Attiva la **Modalità sviluppatore** (toggle in alto a destra).
4. Clicca **Carica estensione non pacchettizzata** e seleziona la cartella root di questo repository.
5. Visita [secure.dipendentincloud.it](https://secure.dipendentincloud.it) ed effettua l'accesso. L'estensione si attiva automaticamente.

Per aggiornare, scarica le ultime modifiche e clicca il pulsante di ricaricamento sulla scheda dell'estensione in `chrome://extensions/`.

## Come Funziona

### Stati dell'Icona

L'icona dell'estensione nella toolbar di Chrome riflette il tuo stato attuale:

| Colore icona           | Significato                                        |
| ---------------------- | -------------------------------------------------- |
| **Verde**              | Sei timbrato. Nessuna azione necessaria.           |
| **Rosso**              | Non sei timbrato.                                  |
| **Rosso lampeggiante** | Devi timbrare adesso.                              |
| **Grigio**             | Stato sconosciuto (visita il sito per aggiornare). |

Un **badge** sull'icona mostra il countdown (in minuti o ore) al prossimo evento di timbratura previsto.

### Popup

Clicca sull'icona dell'estensione per aprire il popup, che mostra:

- Stato attuale della timbratura (entrata/uscita/sconosciuto).
- Countdown dettagliato al prossimo evento, con indicatori di urgenza.
- Storico completo delle timbrature del giorno con orari.
- Pulsante per aprire Dipendenti in Cloud direttamente.
- Pulsante per silenziare il ciclo di notifiche corrente.

### Notifiche

Quando è ora di timbrare, l'estensione invia:

- **Notifiche desktop** tramite il sistema di notifiche di Chrome.
- **Avvisi sonori** sintetizzati in tempo reale tramite la Web Audio API (nessun file audio esterno). Sono disponibili sei profili sonori, ciascuno pensato per un ambiente diverso.

Le notifiche si ripetono ogni pochi minuti finché non timbri o le silenzi.

### Profili Sonori

Tutti i suoni sono generati localmente tramite la Web Audio API. Nessun file audio viene scaricato o incluso nel pacchetto.

| Suono      | Carattere                                                     | Indicato per                        |
| ---------- | ------------------------------------------------------------- | ----------------------------------- |
| Classico   | Tre toni morbidi ascendenti, professionale                    | Uffici condivisi, uso quotidiano    |
| Gentile    | Due toni sovrapposti, molto discreto (volume ridotto del 30%) | Ambienti silenziosi, open space     |
| Campanella | Armoniche naturali, simile a notifica smartphone              | Home office, lavoro remoto          |
| Digitale   | Sequenza rapida di quattro toni, moderno                      | Ambienti tech, startup              |
| Urgente    | Sequenza incisiva ad onda quadra, difficile da ignorare       | Ambienti rumorosi                   |
| Allarme    | Effetto sirena alternato, impossibile da ignorare             | Massima allerta (usare con cautela) |

Il **volume** è regolabile da 0% a 100%. Valori consigliati: 30-40% per uffici condivisi, 50-60% per home office, 70-80% per ambienti rumorosi.

## Configurazione

Clicca con il tasto destro sull'icona dell'estensione e seleziona **Opzioni**, oppure clicca il link Opzioni nel popup.

### Orari di Lavoro

Imposta il tuo orario personale. L'estensione usa questi orari per decidere quando inviare i promemoria:

- Entrata mattina (default: 09:00)
- Pausa pranzo (default: 13:00)
- Rientro pomeriggio (default: 14:00)
- Uscita serale (default: 18:00)

### Esclusioni

Evita le notifiche nei giorni in cui non lavori:

- **Esclusione weekend** -- disattiva tutti gli avvisi il sabato e la domenica.
- **Giornate intere escluse** -- aggiungi date specifiche (ferie, permessi) con descrizione opzionale.
- **Mezze giornate escluse** -- indica una mattina o un pomeriggio libero (es. visita medica).
- **Importazione automatica** -- importa le assenze programmate direttamente dalla dashboard di Dipendenti in Cloud (prossimi 7 giorni).

### Notifiche e Suoni

- Abilita o disabilita le notifiche desktop indipendentemente dagli avvisi sonori.
- Seleziona un profilo sonoro tra i sei disponibili.
- Regola il volume e ascolta un'anteprima prima di salvare.

### Generali

- **Apertura automatica** -- apre automaticamente Dipendenti in Cloud all'avvio di Chrome durante l'orario lavorativo (opzionale).

## Risoluzione Problemi

**L'estensione non rileva il mio stato.**
Visita dipendentincloud.it e assicurati di aver effettuato l'accesso. L'estensione necessita di almeno un caricamento della pagina per leggere lo stato corrente.

**Non sento alcun suono.**
Verifica che gli avvisi sonori siano abilitati nelle opzioni, che il volume sia sopra lo 0%, e che il volume del sistema operativo non sia azzerato. Chrome deve inoltre avere i permessi audio.

**Le notifiche sono troppo frequenti.**
Usa il pulsante di silenziamento nel popup per fermare il ciclo corrente, oppure timbra per interromperle definitivamente.

**L'icona resta grigia.**
Significa che l'estensione non è riuscita a determinare il tuo stato. Ricarica la pagina di Dipendenti in Cloud.

## Privacy e Sicurezza

- Tutti i dati sono salvati localmente in `chrome.storage.local`. Nulla viene trasmesso all'esterno.
- L'estensione legge solo informazioni pubblicamente visibili dalla pagina di dipendentincloud.it. Non accede a credenziali, token o dati personali.
- Nessuna forma di analytics, telemetria o tracciamento.
- Zero dipendenze runtime. Nessun CDN, nessuno script esterno.
- Content Security Policy: `default-src 'none'; script-src 'self'`.
- Tutti i gestori di messaggi verificano l'identità e l'origine del mittente prima dell'elaborazione.
- La manipolazione del DOM usa esclusivamente `textContent` e `createElement` -- mai `innerHTML`.

Per il design di sicurezza completo, consulta [SECURITY.it.md](SECURITY.it.md).

## Requisiti

- Google Chrome 116+ o qualsiasi browser basato su Chromium (Edge, Brave, Opera, Vivaldi).
- Un account attivo su dipendentincloud.it.

Permessi richiesti dall'estensione:

| Permesso                             | Scopo                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `storage`                            | Salvare impostazioni e stato della timbratura localmente                       |
| `notifications`                      | Inviare promemoria desktop                                                     |
| `offscreen`                          | Riprodurre avvisi sonori in background tramite Web Audio API                   |
| `alarms`                             | Pianificare controlli periodici che sopravvivono ai riavvii del service worker |
| Accesso host a `dipendentincloud.it` | Leggere lo stato della timbratura dalla pagina                                 |

## Contribuire

I contributi sono benvenuti. Consulta [CONTRIBUTING.it.md](CONTRIBUTING.it.md) per le linee guida.

## Licenza

Questo progetto è rilasciato sotto la [Licenza MIT](LICENSE).

Copyright (c) 2024-2026 Andrea Bonacci.

---

Se trovi utile questa estensione, lascia una stella al repository. Aiuta altri a scoprire il progetto.

**Disclaimer:** Questo è uno strumento indipendente. Verifica sempre le tue presenze direttamente su Dipendenti in Cloud.

Sviluppato da **Andrea Bonacci**.
