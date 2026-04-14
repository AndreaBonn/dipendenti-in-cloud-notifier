# Politica di Sicurezza

> [English](SECURITY.md) | **Italiano**
>
> Torna al [README](README.it.md)

## Versioni Supportate

| Versione | Supportata |
|----------|-----------|
| 2.x      | Si        |
| < 2.0    | No        |

## Segnalazione Vulnerabilità

Se scopri una vulnerabilità di sicurezza, segnalala in modo responsabile:

1. **Non** aprire una issue pubblica.
2. Contatta direttamente il maintainer via email con i dettagli della vulnerabilità.
3. Includi i passaggi per riprodurla e l'impatto potenziale.
4. Concedi un tempo ragionevole per la correzione prima della divulgazione pubblica.

## Design di Sicurezza

Questa estensione segue le best practice di sicurezza:

- **Zero dipendenze runtime** -- nessuna superficie di attacco da supply chain.
- **Content Security Policy restrittiva** -- `default-src 'none'; script-src 'self'`. Nessun `eval()`, nessuno script inline.
- **Permessi minimi** -- solo `storage`, `notifications`, `offscreen` e `alarms`. Accesso host limitato ai sottodomini di `dipendentincloud.it`.
- **Validazione dell'origine** -- tutti i gestori di messaggi verificano `sender.id === chrome.runtime.id` e validano l'URL del tab contro una allowlist usando il parser `URL` (non regex).
- **Whitelist delle azioni** -- i gestori di messaggi accettano solo azioni note tramite `VALID_ACTIONS`.
- **Nessun codice remoto** -- tutto il codice è locale. Nessun CDN, nessuno script esterno, `connect-src 'none'`.
- **Manipolazione DOM sicura** -- solo `textContent` e `createElement`, mai `innerHTML`.
- **Sanitizzazione input** -- tipi di suono validati contro una whitelist, volumi limitati a intervalli validi, descrizioni troncate.
- **Sanitizzazione URL** -- query string rimosse prima del salvataggio per prevenire la fuoriuscita di token di sessione.

## Gestione dei Dati

- Tutti i dati sono salvati localmente in `chrome.storage.local`.
- Nessun dato viene trasmesso a server esterni.
- Nessuna forma di analytics, telemetria o tracciamento.
- Nessuna credenziale utente viene salvata o elaborata.
