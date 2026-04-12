// Carica le opzioni salvate
function loadOptions() {
  chrome.storage.local.get({
    autoOpenSite: true,
    excludeWeekends: true,
    fullDayExclusions: [],
    halfDayExclusions: [],
    morningStart: '09:00',
    lunchEnd: '13:00',
    afternoonStart: '14:00',
    eveningEnd: '18:00',
    enableNotifications: true,
    enableSound: true,
    soundType: 'classic',
    soundVolume: 50
  }, function(items) {
    document.getElementById('autoOpenSite').checked = items.autoOpenSite;
    document.getElementById('excludeWeekends').checked = items.excludeWeekends;
    document.getElementById('morningStart').value = items.morningStart;
    document.getElementById('lunchEnd').value = items.lunchEnd;
    document.getElementById('afternoonStart').value = items.afternoonStart;
    document.getElementById('eveningEnd').value = items.eveningEnd;
    document.getElementById('enableNotifications').checked = items.enableNotifications;
    document.getElementById('enableSound').checked = items.enableSound;
    document.getElementById('soundType').value = items.soundType;
    document.getElementById('soundVolume').value = items.soundVolume;
    document.getElementById('volumeValue').textContent = items.soundVolume + '%';
    
    renderFullDayExclusions(items.fullDayExclusions);
    renderHalfDayExclusions(items.halfDayExclusions);
  });
}

// Renderizza le giornate intere escluse
function renderFullDayExclusions(exclusions) {
  const container = document.getElementById('fullDayExclusions');
  const emptyMessage = document.getElementById('emptyFullDay');
  
  container.innerHTML = '';
  
  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }
  
  emptyMessage.style.display = 'none';
  
  // Ordina per data
  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  exclusions.forEach((exclusion, index) => {
    const item = document.createElement('div');
    item.className = 'exclusion-item';
    
    const date = new Date(exclusion.date);
    const formattedDate = date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const text = exclusion.description 
      ? `${formattedDate} - ${exclusion.description}`
      : formattedDate;
    
    item.innerHTML = `
      <span>${text}</span>
      <button data-index="${index}">Rimuovi</button>
    `;
    
    item.querySelector('button').addEventListener('click', function() {
      removeFullDayExclusion(index);
    });
    
    container.appendChild(item);
  });
}

// Renderizza le mezze giornate escluse
function renderHalfDayExclusions(exclusions) {
  const container = document.getElementById('halfDayExclusions');
  const emptyMessage = document.getElementById('emptyHalfDay');
  
  container.innerHTML = '';
  
  if (exclusions.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }
  
  emptyMessage.style.display = 'none';
  
  // Ordina per data
  exclusions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  exclusions.forEach((exclusion, index) => {
    const item = document.createElement('div');
    item.className = 'exclusion-item';
    
    const date = new Date(exclusion.date);
    const formattedDate = date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const period = exclusion.period === 'morning' ? 'Mattina' : 'Pomeriggio';
    
    const text = exclusion.description 
      ? `${formattedDate} (${period}) - ${exclusion.description}`
      : `${formattedDate} (${period})`;
    
    item.innerHTML = `
      <span>${text}</span>
      <button data-index="${index}">Rimuovi</button>
    `;
    
    item.querySelector('button').addEventListener('click', function() {
      removeHalfDayExclusion(index);
    });
    
    container.appendChild(item);
  });
}

// Aggiungi giornata intera
function addFullDayExclusion() {
  const dateInput = document.getElementById('fullDayDate');
  const descriptionInput = document.getElementById('fullDayDescription');
  
  if (!dateInput.value) {
    alert('Seleziona una data');
    return;
  }
  
  chrome.storage.local.get({ fullDayExclusions: [] }, function(items) {
    const exclusions = items.fullDayExclusions;
    
    // Verifica se la data esiste già
    if (exclusions.some(e => e.date === dateInput.value)) {
      alert('Questa data è già stata aggiunta');
      return;
    }
    
    exclusions.push({
      date: dateInput.value,
      description: descriptionInput.value
    });
    
    chrome.storage.local.set({ fullDayExclusions: exclusions }, function() {
      renderFullDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Aggiungi mezza giornata
function addHalfDayExclusion() {
  const dateInput = document.getElementById('halfDayDate');
  const periodInput = document.getElementById('halfDayPeriod');
  const descriptionInput = document.getElementById('halfDayDescription');
  
  if (!dateInput.value) {
    alert('Seleziona una data');
    return;
  }
  
  chrome.storage.local.get({ halfDayExclusions: [] }, function(items) {
    const exclusions = items.halfDayExclusions;
    
    // Verifica se la data e periodo esistono già
    if (exclusions.some(e => e.date === dateInput.value && e.period === periodInput.value)) {
      alert('Questa mezza giornata è già stata aggiunta');
      return;
    }
    
    exclusions.push({
      date: dateInput.value,
      period: periodInput.value,
      description: descriptionInput.value
    });
    
    chrome.storage.local.set({ halfDayExclusions: exclusions }, function() {
      renderHalfDayExclusions(exclusions);
      dateInput.value = '';
      descriptionInput.value = '';
    });
  });
}

// Rimuovi giornata intera
function removeFullDayExclusion(index) {
  chrome.storage.local.get({ fullDayExclusions: [] }, function(items) {
    const exclusions = items.fullDayExclusions;
    exclusions.splice(index, 1);
    
    chrome.storage.local.set({ fullDayExclusions: exclusions }, function() {
      renderFullDayExclusions(exclusions);
    });
  });
}

// Rimuovi mezza giornata
function removeHalfDayExclusion(index) {
  chrome.storage.local.get({ halfDayExclusions: [] }, function(items) {
    const exclusions = items.halfDayExclusions;
    exclusions.splice(index, 1);
    
    chrome.storage.local.set({ halfDayExclusions: exclusions }, function() {
      renderHalfDayExclusions(exclusions);
    });
  });
}

// Salva le opzioni
function saveOptions() {
  const autoOpenSite = document.getElementById('autoOpenSite').checked;
  const excludeWeekends = document.getElementById('excludeWeekends').checked;
  const morningStart = document.getElementById('morningStart').value;
  const lunchEnd = document.getElementById('lunchEnd').value;
  const afternoonStart = document.getElementById('afternoonStart').value;
  const eveningEnd = document.getElementById('eveningEnd').value;
  const enableNotifications = document.getElementById('enableNotifications').checked;
  const enableSound = document.getElementById('enableSound').checked;
  const soundType = document.getElementById('soundType').value;
  const soundVolume = parseInt(document.getElementById('soundVolume').value);
  
  chrome.storage.local.set({
    autoOpenSite: autoOpenSite,
    excludeWeekends: excludeWeekends,
    morningStart: morningStart,
    lunchEnd: lunchEnd,
    afternoonStart: afternoonStart,
    eveningEnd: eveningEnd,
    enableNotifications: enableNotifications,
    enableSound: enableSound,
    soundType: soundType,
    soundVolume: soundVolume
  }, function() {
    // Mostra il messaggio di conferma
    const status = document.getElementById('status');
    status.style.display = 'block';
    
    // Richiedi permesso notifiche se abilitato
    if (enableNotifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Nascondi il messaggio dopo 3 secondi
    setTimeout(function() {
      status.style.display = 'none';
    }, 3000);
  });
}

// Funzione per importare assenze da Dipendenti in Cloud
function importAssenze() {
  const importButton = document.getElementById('importAssenze');
  importButton.disabled = true;
  importButton.textContent = '⏳ Ricerca assenze...';
  
  // Cerca una tab con Dipendenti in Cloud aperta
  chrome.tabs.query({ url: '*://secure.dipendentincloud.it/*' }, function(tabs) {
    if (tabs.length === 0) {
      const openNow = confirm('⚠️ Nessuna pagina di Dipendenti in Cloud aperta.\n\nVuoi aprire la pagina ora?');
      if (openNow) {
        chrome.tabs.create({ url: 'https://secure.dipendentincloud.it/it/app/dashboard' }, function(newTab) {
          alert('✓ Pagina aperta!\n\nAttendi che si carichi, poi clicca di nuovo "Importa da Dipendenti in Cloud".');
        });
      }
      importButton.disabled = false;
      importButton.textContent = '📥 Importa da Dipendenti in Cloud';
      return;
    }
    
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, { action: 'extractAssenze' }, function(response) {
      importButton.disabled = false;
      importButton.textContent = '📥 Importa da Dipendenti in Cloud';
      
      if (chrome.runtime.lastError) {
        alert('⚠️ Errore di comunicazione con la pagina.\n\nProva a:\n1. Ricaricare la pagina di Dipendenti in Cloud\n2. Ricaricare questa pagina di opzioni\n3. Riprovare l\'importazione');
        return;
      }
      
      if (!response || !response.success) {
        alert('⚠️ Errore durante l\'estrazione delle assenze.\n\nAssicurati di essere nella pagina corretta di Dipendenti in Cloud.');
        return;
      }
      
      if (response.assenze.length === 0) {
        alert('ℹ️ Nessuna assenza trovata nei prossimi 7 giorni.\n\nSe hai assenze programmate oltre i prossimi 7 giorni, dovrai aggiungerle manualmente usando il form qui sotto.');
        return;
      }
      
      // Mostra il modal con le assenze trovate
      showImportModal(response.assenze);
    });
  });
}

// Funzione per mostrare il modal di importazione
function showImportModal(assenze) {
  const modal = document.getElementById('importModal');
  const assenzeList = document.getElementById('assenzeList');
  
  // Carica le assenze già esistenti
  chrome.storage.local.get({ fullDayExclusions: [] }, function(items) {
    const existingDates = items.fullDayExclusions.map(e => e.date);
    
    assenzeList.innerHTML = '';
    
    if (assenze.length === 0) {
      assenzeList.innerHTML = '<div class="no-assenze">Nessuna assenza trovata</div>';
    } else {
      assenze.forEach((assenza, index) => {
        const isDuplicate = existingDates.includes(assenza.date);
        const date = new Date(assenza.date);
        const formattedDate = date.toLocaleDateString('it-IT', { 
          weekday: 'short', 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        
        const item = document.createElement('div');
        item.className = 'assenza-preview' + (isDuplicate ? ' duplicate' : '');
        item.innerHTML = `
          <div class="assenza-info">
            <div class="assenza-date">${formattedDate}</div>
            <div class="assenza-tipo">${assenza.descrizione}${isDuplicate ? ' (già presente)' : ''}</div>
          </div>
          <div class="assenza-checkbox">
            <input type="checkbox" 
                   data-index="${index}" 
                   data-date="${assenza.date}"
                   data-description="${assenza.descrizione}"
                   ${isDuplicate ? 'disabled' : 'checked'}>
          </div>
        `;
        
        assenzeList.appendChild(item);
      });
    }
    
    modal.style.display = 'block';
  });
}

// Funzione per confermare l'importazione
function confirmImport() {
  const checkboxes = document.querySelectorAll('#assenzeList input[type="checkbox"]:checked:not(:disabled)');
  
  if (checkboxes.length === 0) {
    alert('Seleziona almeno un\'assenza da importare');
    return;
  }
  
  chrome.storage.local.get({ fullDayExclusions: [] }, function(items) {
    const exclusions = items.fullDayExclusions;
    
    checkboxes.forEach(checkbox => {
      const date = checkbox.getAttribute('data-date');
      const description = checkbox.getAttribute('data-description');
      
      // Verifica che non esista già
      if (!exclusions.some(e => e.date === date)) {
        exclusions.push({
          date: date,
          description: description
        });
      }
    });
    
    chrome.storage.local.set({ fullDayExclusions: exclusions }, function() {
      // Chiudi il modal
      document.getElementById('importModal').style.display = 'none';
      
      // Ricarica la lista
      renderFullDayExclusions(exclusions);
      
      // Mostra messaggio di successo
      alert(`${checkboxes.length} assenze importate con successo!`);
    });
  });
}

// Funzione per testare il suono
function testSound() {
  const soundType = document.getElementById('soundType').value;
  const soundVolume = parseInt(document.getElementById('soundVolume').value) / 100;
  
  // Invia messaggio al background per creare offscreen document e riprodurre suono
  chrome.runtime.sendMessage({
    action: 'testSound',
    soundType: soundType,
    volume: soundVolume
  });
}

// Carica le opzioni quando la pagina viene aperta
document.addEventListener('DOMContentLoaded', function() {
  loadOptions();
  
  // Event listeners
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('addFullDay').addEventListener('click', addFullDayExclusion);
  document.getElementById('addHalfDay').addEventListener('click', addHalfDayExclusion);
  document.getElementById('importAssenze').addEventListener('click', importAssenze);
  document.getElementById('testSound').addEventListener('click', testSound);
  
  // Aggiorna il valore del volume in tempo reale
  document.getElementById('soundVolume').addEventListener('input', function(e) {
    document.getElementById('volumeValue').textContent = e.target.value + '%';
  });
  
  // Modal event listeners
  const modal = document.getElementById('importModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancelImport');
  const confirmBtn = document.getElementById('confirmImport');
  
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  };
  
  cancelBtn.onclick = function() {
    modal.style.display = 'none';
  };
  
  confirmBtn.onclick = confirmImport;
  
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };
});
