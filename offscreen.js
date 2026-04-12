// Gestione della riproduzione audio usando Web Audio API
let audioContext = null;

// Libreria di suoni disponibili
const SOUNDS = {
  // Suono classico (default) - Più morbido e professionale
  classic: {
    name: 'Classico',
    play: function (ctx, volume) {
      const duration = 0.2;
      const gap = 0.08;

      // Primo tono (C5 - 523 Hz)
      createTone(ctx, 523, duration, 0, volume, 'sine');
      // Secondo tono (E5 - 659 Hz)
      createTone(ctx, 659, duration, duration + gap, volume, 'sine');
      // Terzo tono (G5 - 784 Hz) - più lungo
      createTone(ctx, 784, duration * 1.5, (duration + gap) * 2, volume, 'sine');
    },
  },

  // Suono urgente - Più incisivo
  urgent: {
    name: 'Urgente',
    play: function (ctx, volume) {
      const duration = 0.15;
      const gap = 0.05;

      // Sequenza rapida ascendente
      createTone(ctx, 800, duration, 0, volume, 'square');
      createTone(ctx, 1000, duration, duration + gap, volume, 'square');
      createTone(ctx, 1200, duration, (duration + gap) * 2, volume, 'square');
      createTone(ctx, 1400, duration * 1.2, (duration + gap) * 3, volume, 'square');
    },
  },

  // Suono gentile - Discreto e piacevole
  gentle: {
    name: 'Gentile',
    play: function (ctx, volume) {
      const duration = 0.3;

      // Due toni morbidi
      createTone(ctx, 440, duration, 0, volume * 0.7, 'sine');
      createTone(ctx, 554, duration * 1.3, duration * 0.5, volume * 0.7, 'sine');
    },
  },

  // Suono campanella - Simile a notifica smartphone
  bell: {
    name: 'Campanella',
    play: function (ctx, volume) {
      const duration = 0.25;
      const gap = 0.1;

      // Toni con armoniche per effetto campanella
      createBellTone(ctx, 880, duration, 0, volume);
      createBellTone(ctx, 1046, duration, duration + gap, volume * 0.8);
    },
  },

  // Suono digitale - Moderno e tech
  digital: {
    name: 'Digitale',
    play: function (ctx, volume) {
      const duration = 0.12;
      const gap = 0.06;

      // Sequenza digitale veloce
      for (let i = 0; i < 4; i++) {
        const freq = 1000 + i * 200;
        createTone(ctx, freq, duration, i * (duration + gap), volume * 0.8, 'triangle');
      }
    },
  },

  // Suono allarme - Molto evidente
  alarm: {
    name: 'Allarme',
    play: function (ctx, volume) {
      const duration = 0.2;
      const gap = 0.1;

      // Alternanza di due frequenze (effetto sirena)
      for (let i = 0; i < 3; i++) {
        const freq = i % 2 === 0 ? 600 : 800;
        createTone(ctx, freq, duration, i * (duration + gap), volume, 'sawtooth');
      }
    },
  },
};

// Funzione helper per creare un tono semplice
function createTone(ctx, frequency, duration, startTime, volume, type = 'sine') {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  const start = ctx.currentTime + startTime;
  const end = start + duration;

  // Envelope ADSR per suono più naturale
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(volume, start + 0.01); // Attack
  gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, start + duration * 0.3); // Decay
  gainNode.gain.setValueAtTime(volume * 0.7, start + duration * 0.7); // Sustain
  gainNode.gain.exponentialRampToValueAtTime(0.01, end); // Release

  oscillator.start(start);
  oscillator.stop(end);
}

// Funzione helper per creare un tono "campanella" con armoniche
function createBellTone(ctx, frequency, duration, startTime, volume) {
  // Frequenza fondamentale
  createTone(ctx, frequency, duration, startTime, volume * 0.6, 'sine');

  // Armoniche per effetto campanella
  createTone(ctx, frequency * 2, duration * 0.8, startTime, volume * 0.3, 'sine');
  createTone(ctx, frequency * 3, duration * 0.6, startTime, volume * 0.15, 'sine');
  createTone(ctx, frequency * 4.2, duration * 0.4, startTime, volume * 0.08, 'sine');
}

// Funzione principale per riprodurre il suono
function playSound(soundType = 'classic', volume = 0.5) {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  // Riprendi il contesto se è sospeso (policy browser)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const sound = SOUNDS[soundType] || SOUNDS.classic;
  sound.play(audioContext, volume);
}

// Ascoltiamo i messaggi dal background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Accetta solo messaggi dall'estensione stessa
  if (sender.id !== chrome.runtime.id) return;

  if (request.action === 'playSound') {
    const soundType = request.soundType || 'classic';
    const volume = request.volume !== undefined ? request.volume : 0.5;

    playSound(soundType, volume);
    sendResponse({ success: true });
  } else if (request.action === 'testSound') {
    // Per testare i suoni dalle opzioni
    const soundType = request.soundType || 'classic';
    const volume = request.volume !== undefined ? request.volume : 0.5;

    playSound(soundType, volume);
    sendResponse({ success: true });
  }
  return true;
});
