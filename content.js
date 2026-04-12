const DEBUG = false;
function log(...args) { if (DEBUG) log(...args); }

// Funzione per estrarre le timbrature di oggi
function extractTimbratureOggi() {
  const timbratureOggi = [];
  const today = new Date();
  const todayStr = today.toLocaleDateString('it-IT');
  
  // Cerca elementi che contengono timbrature
  const timbratureElements = document.querySelectorAll('.timbratura, .sessione, [class*="timb"], [class*="punch"], tr, .row');
  
  timbratureElements.forEach(el => {
    const text = el.textContent;
    if (text.includes(todayStr) || text.includes('oggi') || text.includes('Oggi')) {
      // Estrai tutti gli orari (formato HH:MM)
      const timeMatches = text.match(/\d{1,2}:\d{2}/g);
      if (timeMatches) {
        timeMatches.forEach(time => {
          if (!timbratureOggi.includes(time)) {
            timbratureOggi.push(time);
          }
        });
      }
    }
  });
  
  // Ordina le timbrature per orario
  timbratureOggi.sort();
  
  log('[Timbratura] Timbrature oggi:', timbratureOggi);
  return timbratureOggi;
}

// Funzione per estrarre le assenze dalla pagina (dashboard - prossimi 7 giorni)
function extractAssenze() {
  log('[Assenze] Inizio estrazione assenze dalla dashboard (prossimi 7 giorni)...');
  log('[Assenze] URL corrente:', window.location.href);
  
  const assenze = [];
  
  // Cerca il widget delle assenze - può essere vuoto o con contenuto
  const widgetContainer = document.querySelector('dic-dashboard-card-content, [class*="dashboard-card"]');
  
  if (widgetContainer) {
    log('[Assenze] Trovato container widget assenze');
    log('[Assenze] HTML del widget:', widgetContainer.innerHTML.substring(0, 500));
    
    // Verifica se c'è il messaggio "Non sono previste assenze"
    const emptyState = widgetContainer.querySelector('dic-week-widget-empty-state');
    if (emptyState) {
      log('[Assenze] Trovato empty state - nessuna assenza nei prossimi 7 giorni');
      return assenze; // Ritorna array vuoto
    }
    
    // Se non c'è empty state, cerca le assenze nel widget
    // Cerca tutti gli elementi che potrebbero contenere assenze
    const assenzeElements = widgetContainer.querySelectorAll('div, li, tr, [class*="item"], [class*="row"]');
    
    log('[Assenze] Elementi nel widget:', assenzeElements.length);
    
    assenzeElements.forEach(el => {
      const text = el.textContent.trim();
      const lowerText = text.toLowerCase();
      
      // Salta elementi vuoti o troppo lunghi (probabilmente container)
      if (!text || text.length > 200) return;
      
      log('[Assenze] Analizzo elemento:', text.substring(0, 100));
      
      // Cerca date nel formato gg/mm/aaaa o gg-mm-aaaa
      const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
      const dateMatches = text.match(datePattern);
      
      if (dateMatches) {
        log('[Assenze] Date trovate nell\'elemento:', dateMatches);
        
        dateMatches.forEach(dateStr => {
          // Converti in formato ISO
          const parts = dateStr.split(/[\/\-\.]/);
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const isoDate = `${year}-${month}-${day}`;
          
          // Verifica se è una data valida
          const date = new Date(isoDate);
          if (isNaN(date.getTime())) {
            return;
          }
          
          // Filtra: solo prossimi 7 giorni
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          if (date < now || date > sevenDaysFromNow) {
            log('[Assenze] Data fuori range (prossimi 7 giorni):', isoDate);
            return;
          }
          
          // Cerca il tipo di assenza nel testo
          let tipo = 'Assenza';
          
          if (lowerText.includes('ferie') || lowerText.includes('vacanza') || lowerText.includes('holiday')) {
            tipo = 'Ferie';
          } else if (lowerText.includes('permesso') || lowerText.includes('permit')) {
            tipo = 'Permesso';
          } else if (lowerText.includes('malattia') || lowerText.includes('sick')) {
            tipo = 'Malattia';
          } else if (lowerText.includes('smart') || lowerText.includes('remoto') || lowerText.includes('remote')) {
            tipo = 'Smart Working';
          } else if (lowerText.includes('congedo')) {
            tipo = 'Congedo';
          }
          
          // Verifica se non è già presente
          const exists = assenze.some(a => a.date === isoDate);
          if (!exists) {
            log('[Assenze] ✓ Trovata assenza valida:', isoDate, tipo);
            assenze.push({
              date: isoDate,
              tipo: tipo,
              descrizione: tipo
            });
          }
        });
      }
    });
  } else {
    log('[Assenze] Widget assenze non trovato nella dashboard');
  }
  
  // Ordina per data
  assenze.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  log('[Assenze] ===== RISULTATO FINALE =====');
  log('[Assenze] Totale assenze trovate:', assenze.length);
  log('[Assenze] Dettaglio:', assenze);
  
  return assenze;
}

// Funzione per controllare lo stato della timbratura
function checkTimbratura() {
  let isTimbrato = null; // Inizialmente null (stato non disponibile)
  let lastTimbratura = '';
  let timbratureCount = 0;
  let timbratureOggi = [];
  
  // Verifichiamo se siamo nella pagina di Dipendenti in Cloud
  if (document.location.href.includes('secure.dipendentincloud.it') || 
      document.location.href.includes('cloud.dipendentincloud.it')) {
    
    log('[Timbratura] Inizio controllo stato...');
    
    // Estrai le timbrature di oggi
    timbratureOggi = extractTimbratureOggi();
    
    // Strategia 1: Cerca bottoni con testo specifico
    const buttons = document.querySelectorAll('button');
    let timbraEntrataFound = false;
    let timbraUscitaFound = false;
    
    buttons.forEach(button => {
      const text = button.textContent.trim().toLowerCase();
      if (text.includes('timbra entrata') || text.includes('entrata')) {
        timbraEntrataFound = true;
        log('[Timbratura] Trovato bottone entrata');
      }
      if (text.includes('timbra uscita') || text.includes('uscita')) {
        timbraUscitaFound = true;
        log('[Timbratura] Trovato bottone uscita');
      }
    });
    
    // Strategia 2: Conta le timbrature di oggi
    const timbratureElements = document.querySelectorAll('.timbratura, .sessione, [class*="timb"], [class*="punch"]');
    log('[Timbratura] Trovati ' + timbratureElements.length + ' elementi timbratura');
    
    // Strategia 3: Cerca nella tabella/lista delle timbrature
    const today = new Date();
    const todayStr = today.toLocaleDateString('it-IT');
    
    timbratureElements.forEach(el => {
      const text = el.textContent;
      if (text.includes(todayStr) || text.includes('oggi') || text.includes('Oggi')) {
        // Conta quante volte appare un orario (formato HH:MM)
        const timeMatches = text.match(/\d{1,2}:\d{2}/g);
        if (timeMatches) {
          timbratureCount = timeMatches.length;
          if (timeMatches.length > 0) {
            lastTimbratura = timeMatches[timeMatches.length - 1];
          }
        }
      }
    });
    
    log('[Timbratura] Numero timbrature oggi: ' + timbratureCount);
    
    // Determina lo stato in base alle informazioni raccolte
    if (timbraUscitaFound) {
      // Se c'è il bottone "Timbra uscita", significa che l'entrata è stata timbrata
      isTimbrato = true;
      log('[Timbratura] Stato: TIMBRATO (bottone uscita trovato)');
    } else if (timbraEntrataFound) {
      // Se c'è il bottone "Timbra entrata", significa che non è stato timbrato
      isTimbrato = false;
      log('[Timbratura] Stato: NON TIMBRATO (bottone entrata trovato)');
    } else if (timbratureCount > 0) {
      // Se abbiamo trovato timbrature, determina lo stato dal numero
      // Numero dispari = timbrato (ultima è entrata)
      // Numero pari = non timbrato (ultima è uscita)
      isTimbrato = (timbratureCount % 2 === 1);
      log('[Timbratura] Stato determinato da conteggio: ' + (isTimbrato ? 'TIMBRATO' : 'NON TIMBRATO'));
    } else {
      // Fallback: cerca elementi con classi specifiche
      const statusIndicators = document.querySelectorAll('[class*="status"], [class*="stato"], [class*="badge"]');
      statusIndicators.forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes('entrato') || text.includes('presente') || text.includes('in corso')) {
          isTimbrato = true;
        } else if (text.includes('uscito') || text.includes('assente') || text.includes('non timbrato')) {
          isTimbrato = false;
        }
      });
      
      if (isTimbrato !== null) {
        log('[Timbratura] Stato determinato da indicatori: ' + (isTimbrato ? 'TIMBRATO' : 'NON TIMBRATO'));
      } else {
        log('[Timbratura] Stato: SCONOSCIUTO (nessun indicatore trovato)');
      }
    }
    
    // Salviamo lo stato nella storage locale solo se siamo nella pagina corretta
    const statusData = {
      isTimbrato: isTimbrato,
      lastTimbratura: lastTimbratura,
      timbratureCount: timbratureCount,
      timbratureOggi: timbratureOggi,
      lastChecked: new Date().toISOString(),
      url: document.location.href
    };
    
    chrome.storage.local.set({ 'timbratureStatus': statusData }, function() {
      log('[Timbratura] Stato salvato:', statusData);
    });
    
    // Aggiorniamo l'icona dell'estensione
    try {
      chrome.runtime.sendMessage({
        action: 'updateIcon',
        isTimbrato: isTimbrato
      });
    } catch (error) {
      log('[Timbratura] Errore invio messaggio (estensione ricaricata?):', error);
    }
  } else {
    // Se non siamo nella pagina corretta, recuperiamo lo stato dalla storage
    chrome.storage.local.get('timbratureStatus', function(data) {
      if (data && data.timbratureStatus) {
        log('Stato timbratura recuperato dalla storage:', data.timbratureStatus);
        
        // Aggiorniamo l'icona dell'estensione con lo stato memorizzato
        try {
          chrome.runtime.sendMessage({
            action: 'updateIcon',
            isTimbrato: data.timbratureStatus.isTimbrato
          });
        } catch (error) {
          log('[Timbratura] Errore invio messaggio (estensione ricaricata?):', error);
        }
      }
    });
  }
  
  return {
    isTimbrato: isTimbrato,
    lastTimbratura: lastTimbratura,
    timbratureOggi: timbratureOggi
  };
}

// Funzione per verificare se il runtime è ancora valido
function isRuntimeValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// Funzione per osservare cambiamenti nella pagina
function setupObserver() {
  // Configuriamo un MutationObserver per rilevare cambiamenti nella pagina
  const observer = new MutationObserver(function(mutations) {
    if (isRuntimeValid()) {
      checkTimbratura();
    } else {
      log('[Timbratura] Estensione ricaricata, ricarica la pagina per riattivare');
      observer.disconnect();
    }
  });
  
  // Osserviamo il corpo del documento per eventuali cambiamenti
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// Controlliamo lo stato quando la pagina è caricata
window.addEventListener('load', function() {
  // Attendiamo un po' per assicurarci che la pagina sia completamente caricata
  setTimeout(function() {
    checkTimbratura();
    setupObserver();
  }, 1000);
});

// Funzione per simulare un click realistico
function simulateRealClick(element) {
  // Crea eventi mouse realistici
  const mousedownEvent = new MouseEvent('mousedown', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });
  
  const mouseupEvent = new MouseEvent('mouseup', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });
  
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });
  
  // Simula la sequenza completa di eventi
  element.dispatchEvent(mousedownEvent);
  element.dispatchEvent(mouseupEvent);
  element.dispatchEvent(clickEvent);
  
  // Prova anche il metodo click() nativo
  element.click();
}

// Funzione per cliccare sul bottone di timbratura
function clickTimbraButton() {
  log('[Timbratura] Tentativo di click sul bottone...');
  log('[Timbratura] URL corrente:', window.location.href);
  
  // Cerca il bottone TIMBRA con vari selettori
  const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], div[onclick]');
  log('[Timbratura] Trovati', buttons.length, 'elementi cliccabili');
  
  let timbraButton = null;
  let tipoTimbratura = '';
  let candidateButtons = [];
  
  for (let button of buttons) {
    const text = button.textContent.trim().toLowerCase();
    const value = button.value ? button.value.toLowerCase() : '';
    const ariaLabel = button.getAttribute('aria-label') ? button.getAttribute('aria-label').toLowerCase() : '';
    const title = button.getAttribute('title') ? button.getAttribute('title').toLowerCase() : '';
    
    // Cerca bottoni con testo "timbra", "entrata", "uscita", "punch", "clock"
    const searchTerms = ['timbra', 'entrata', 'uscita', 'punch', 'clock in', 'clock out'];
    const hasKeyword = searchTerms.some(term => 
      text.includes(term) || value.includes(term) || ariaLabel.includes(term) || title.includes(term)
    );
    
    if (hasKeyword) {
      // Verifica che il bottone sia visibile e cliccabile
      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       rect.width > 0 && 
                       rect.height > 0;
      
      if (isVisible && !button.disabled) {
        candidateButtons.push({
          element: button,
          text: text || value || ariaLabel || title
        });
        
        log('[Timbratura] Candidato trovato:', text || value || ariaLabel || title);
      }
    }
  }
  
  // Se abbiamo trovato candidati, usa il primo
  if (candidateButtons.length > 0) {
    timbraButton = candidateButtons[0].element;
    const buttonText = candidateButtons[0].text;
    
    // Determina il tipo di timbratura
    if (buttonText.includes('entrata') || buttonText.includes('clock in')) {
      tipoTimbratura = 'Entrata';
    } else if (buttonText.includes('uscita') || buttonText.includes('clock out')) {
      tipoTimbratura = 'Uscita';
    } else {
      tipoTimbratura = 'Timbratura';
    }
    
    log('[Timbratura] Bottone selezionato:', buttonText, '- Tipo:', tipoTimbratura);
    log('[Timbratura] Elemento:', timbraButton);
    
    // Scroll al bottone per assicurarsi che sia visibile
    timbraButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Aspetta un attimo dopo lo scroll
    setTimeout(() => {
      // Simula un click realistico
      simulateRealClick(timbraButton);
      log('[Timbratura] Click effettuato!');
      
      // Aspetta un po' e ricontrolla lo stato
      setTimeout(function() {
        checkTimbratura();
      }, 2000);
    }, 300);
    
    return { 
      success: true, 
      message: 'Timbratura effettuata',
      details: {
        tipo: tipoTimbratura
      }
    };
  } else {
    log('[Timbratura] Nessun bottone trovato');
    log('[Timbratura] Prova ad aprire manualmente la pagina e verifica che il bottone sia visibile');
    
    // Debug: mostra tutti i bottoni trovati
    const allButtonTexts = Array.from(buttons).slice(0, 10).map(b => b.textContent.trim().substring(0, 50));
    log('[Timbratura] Primi 10 bottoni nella pagina:', allButtonTexts);
    
    return { 
      success: false, 
      message: 'Bottone timbratura non trovato. Assicurati di essere nella pagina corretta di Dipendenti in Cloud.' 
    };
  }
}

// Rispondiamo ai messaggi dal popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getStatus') {
    // Se siamo nella pagina di Dipendenti in Cloud, controlliamo lo stato in tempo reale
    if (document.location.href.includes('secure.dipendentincloud.it')) {
      sendResponse(checkTimbratura());
    } else {
      // Altrimenti recuperiamo lo stato dalla storage
      chrome.storage.local.get('timbratureStatus', function(data) {
        if (data && data.timbratureStatus) {
          sendResponse({
            isTimbrato: data.timbratureStatus.isTimbrato,
            lastTimbratura: data.timbratureStatus.lastTimbratura,
            timbratureOggi: data.timbratureStatus.timbratureOggi || [],
            fromStorage: true,
            lastChecked: data.timbratureStatus.lastChecked
          });
        } else {
          sendResponse({
            isTimbrato: null,
            lastTimbratura: '',
            timbratureOggi: [],
            fromStorage: false
          });
        }
      });
      return true; // Importante per le risposte asincrone
    }
  } else if (request.action === 'clickTimbra') {
    // Clicca sul bottone di timbratura
    const result = clickTimbraButton();
    sendResponse(result);
  } else if (request.action === 'extractAssenze') {
    // Estrai le assenze dalla pagina
    const assenze = extractAssenze();
    sendResponse({ success: true, assenze: assenze });
  }
  return true;
});
