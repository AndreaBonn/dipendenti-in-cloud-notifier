# Promemoria Timbrature

Estensione Chrome **NON UFFICIALE** per aiutarti a ricordare di timbrare su dipendentincloud.it.

## ⚠️ Disclaimer

Questa estensione **NON è ufficiale** e **NON è affiliata** con Dipendenti in Cloud o dipendentincloud.it.

L'utente è **completamente responsabile** delle proprie timbrature. Questa estensione è fornita come strumento di convenienza senza alcuna garanzia.

## 🎯 Funzionalità

### Monitoraggio e Notifiche

- ✅ **Stato timbratura in tempo reale** - Mostra se sei timbrato o non timbrato
- 🎨 **Icona dinamica** - Verde quando timbrato, rossa quando non timbrato, lampeggiante quando devi timbrare
- ⏰ **Countdown intelligente** - Badge con tempo rimanente alla prossima timbratura (minuti/ore)
- 🔔 **Notifiche desktop** - Avvisi quando è ora di timbrare (configurabili)
- 🔊 **Promemoria sonori avanzati** - 6 tipi di suono selezionabili con controllo volume
  - 🎵 Classico (morbido e professionale)
  - 🌸 Gentile (discreto e piacevole)
  - 🔔 Campanella (simile a smartphone)
  - 💻 Digitale (moderno e tech)
  - ⚠️ Urgente (più incisivo)
  - 🚨 Allarme (molto evidente)
- 🎚️ **Controllo volume** - Regola il volume da 0% a 100%
- 🔊 **Test suono** - Prova i suoni prima di salvarli
- 🔕 **Silenzia temporaneamente** - Disattiva le notifiche per la situazione corrente

### Storico e Visualizzazione

- 📋 **Storico timbrature giornaliere** - Visualizza tutte le timbrature del giorno con orari
- 🕐 **Countdown dettagliato** - Tempo rimanente con indicatori di urgenza (verde/giallo/rosso)
- ⚡ **Apertura automatica** - Apre Dipendenti in Cloud all'avvio di Chrome (opzionale)

### Personalizzazione

- ⚙️ **Orari di lavoro personalizzabili** - Configura i tuoi orari:
  - Entrata mattina (default 09:00)
  - Uscita pranzo (default 13:00)
  - Entrata pomeriggio (default 14:00)
  - Uscita serale (default 18:00)
- 📅 **Esclusione weekend** - Disattiva notifiche sabato e domenica
- 🏖️ **Gestione ferie e permessi**:
  - Giornate intere escluse (ferie)
  - Mezze giornate escluse (permessi mattina/pomeriggio)
  - 📥 **Importazione automatica** - Importa assenze direttamente da Dipendenti in Cloud

## 📦 Installazione

### Da Chrome Web Store

[Link quando pubblicata]

### Installazione manuale (sviluppatori)

1. Scarica o clona questo repository
2. Apri Chrome e vai su `chrome://extensions/`
3. Attiva "Modalità sviluppatore" in alto a destra
4. Clicca "Carica estensione non pacchettizzata"
5. Seleziona la cartella dell'estensione

## 🚀 Utilizzo

### Primo Avvio

1. Installa l'estensione
2. Apri dipendentincloud.it e accedi
3. L'estensione rileverà automaticamente lo stato della timbratura
4. L'icona cambierà colore in base allo stato (verde/rosso/grigio)

### Uso Quotidiano

- **Icona verde** = Sei timbrato
- **Icona rossa** = Non sei timbrato
- **Icona lampeggiante** = Devi timbrare ora!
- **Badge con numero** = Tempo rimanente alla prossima timbratura

### Popup Estensione

Clicca sull'icona per vedere:

- Stato attuale della timbratura
- Countdown dettagliato alla prossima timbratura
- Storico completo delle timbrature del giorno
- Pulsante per aprire rapidamente Dipendenti in Cloud
- Pulsante "Silenzia" per disattivare temporaneamente le notifiche

## ⚙️ Configurazione

Clicca su "⚙️ Opzioni" nel popup per personalizzare:

### Impostazioni Generali

- **Apertura automatica** - Apri Dipendenti in Cloud all'avvio di Chrome
- **Escludi weekend** - Disattiva notifiche sabato e domenica

### Notifiche e Suoni

- **Notifiche desktop** - Abilita/disabilita le notifiche
- **Suoni di notifica** - Abilita/disabilita i suoni
- **Tipo di suono** - Scegli tra 6 suoni diversi (Classico, Gentile, Campanella, Digitale, Urgente, Allarme)
- **Volume** - Regola il volume da 0% a 100%
- **Prova suono** - Testa il suono selezionato prima di salvare

### Orari di Lavoro

Configura i tuoi orari personalizzati:

- Entrata mattina (es. 09:00)
- Uscita pranzo (es. 13:00)
- Entrata pomeriggio (es. 14:00)
- Uscita serale (es. 18:00)

### Gestione Assenze

**Giornate Intere (Ferie)**

- Aggiungi manualmente le date di ferie
- Oppure usa "📥 Importa da Dipendenti in Cloud" per importare automaticamente le assenze programmate
- Aggiungi descrizioni opzionali (es. "Ferie Estive")

**Mezze Giornate (Permessi)**

- Aggiungi permessi per mattina (8:00-13:00) o pomeriggio (14:00-18:00)
- Specifica la data e il periodo
- Aggiungi descrizioni opzionali (es. "Visita medica")

## 🔊 Guida ai Suoni

L'estensione offre 6 tipi di suono diversi per adattarsi a ogni ambiente:

| Suono             | Caratteristiche                            | Quando usarlo                            |
| ----------------- | ------------------------------------------ | ---------------------------------------- |
| 🎵 **Classico**   | Tre toni morbidi ascendenti, professionale | Ufficio, uso quotidiano standard         |
| 🌸 **Gentile**    | Discreto, volume ridotto del 30%           | Open space, ambienti silenziosi          |
| 🔔 **Campanella** | Simile a notifiche smartphone              | Smart working, suono familiare           |
| 💻 **Digitale**   | Sequenza rapida moderna                    | Ambiente tech, startup                   |
| ⚠️ **Urgente**    | Incisivo e impossibile da ignorare         | Ambienti rumorosi                        |
| 🚨 **Allarme**    | Effetto sirena, molto evidente             | Massima evidenza (può essere fastidioso) |

**Come scegliere:**

- **Ufficio condiviso**: Gentile o Classico (volume 30-40%)
- **Home office**: Campanella o Digitale (volume 50-60%)
- **Ambiente rumoroso**: Urgente o Allarme (volume 70-80%)
- **Con cuffie**: Qualsiasi suono (volume 20-30%)

**Prova prima di scegliere**: Usa il pulsante "🔊 Prova Suono" nelle opzioni!

## 💡 Suggerimenti

- **Importa le assenze in anticipo** - Usa la funzione di importazione automatica per non ricevere notifiche durante le ferie
- **Personalizza gli orari** - Adatta gli orari di lavoro al tuo contratto
- **Scegli il suono giusto** - Usa "Gentile" in ufficio condiviso, "Urgente" in ambienti rumorosi
- **Regola il volume** - 30-40% per uffici, 50-60% per home office, 70-80% per ambienti rumorosi
- **Testa prima di salvare** - Usa il pulsante "Prova Suono" per trovare il suono perfetto
- **Usa il silenziamento** - Se ricevi una notifica ma non puoi timbrare subito, usa il pulsante "Silenzia"
- **Controlla lo storico** - Verifica nel popup tutte le timbrature del giorno
- **Disabilita i suoni se necessario** - Puoi mantenere solo le notifiche visive

## 🐛 Problemi noti

- L'estensione funziona solo quando Chrome è aperto
- Richiede che la pagina di dipendentincloud.it sia stata visitata almeno una volta
- L'importazione automatica delle assenze funziona solo dalla dashboard (prossimi 7 giorni)
- Le notifiche sonore richiedono che Chrome abbia i permessi audio

### Risoluzione problemi audio

- **Il suono non si sente**: Verifica che "Abilita suoni" sia attivo, controlla il volume dello slider e del sistema
- **Il suono è troppo forte/debole**: Regola lo slider del volume nelle opzioni (20-40% per uffici, 50-60% per home office)
- **Preferisci solo notifiche visive**: Disabilita "Abilita suoni di notifica" nelle opzioni

## 🔒 Privacy e Sicurezza

- ✅ L'estensione legge solo informazioni pubbliche dalla pagina web
- ✅ Non accede a credenziali o dati sensibili
- ✅ Tutti i dati sono salvati localmente nel browser
- ✅ Nessun dato viene inviato a server esterni
- ✅ Codice open source verificabile

## 📋 Requisiti

- Google Chrome o browser basato su Chromium
- Accesso a dipendentincloud.it
- Permessi richiesti:
  - `activeTab` - Per leggere lo stato della timbratura
  - `storage` - Per salvare le impostazioni
  - `notifications` - Per le notifiche desktop
  - `offscreen` - Per riprodurre i suoni di notifica

---

**Nota**: Questa estensione è uno strumento di supporto. Verifica sempre le tue timbrature direttamente su Dipendenti in Cloud.

---

Sviluppato da **Andrea Bonacci**
