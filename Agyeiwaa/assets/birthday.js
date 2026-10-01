(() => {
  'use strict';
  if (window.lucide) window.lucide.createIcons();
  const $ = selector => document.querySelector(selector);
  const steps = [...document.querySelectorAll('[data-step]')];
  const stepLinks = [...document.querySelectorAll('[data-step-link]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentStep = 0;
  let furthestStep = 0;
  let candleOut = false;
  let openingTimer = null;
  let musicEnabled = false;
  let musicTimer = null;
  let audioContext = null;
  let musicGain = null;
  let micStream = null;
  let micContext = null;
  let micFrame = null;
  let micTimer = null;
  let micRequest = 0;
  let micActive = false;

  function showStep(index, focus = true) {
    if (index < 0 || index >= steps.length) return;
    clearTimeout(openingTimer);
    openingTimer = null;
    stopMicrophone();
    $('.opening').classList.remove('is-opening');
    $('#open-envelope').disabled = false;
    currentStep = index;
    furthestStep = Math.max(furthestStep, index);
    steps.forEach((step, i) => { step.hidden = i !== index; });
    stepLinks.forEach((button, i) => {
      button.disabled = i > furthestStep;
      button.classList.toggle('visited', i < furthestStep);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (focus) {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      steps[index].querySelector('h1, h2').focus({ preventScroll: true });
    }
    if (index === 4) celebrate();
  }

  $('#open-envelope').addEventListener('click', () => {
    if (openingTimer !== null) return;
    $('.opening').classList.add('is-opening');
    $('#open-envelope').disabled = true;
    playChime();
    openingTimer = setTimeout(() => showStep(1), reducedMotion.matches ? 0 : 950);
  });
  document.querySelectorAll('[data-next]').forEach(button => {
    button.addEventListener('click', () => showStep(currentStep + 1));
  });
  document.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => showStep(currentStep - 1));
  });
  stepLinks.forEach((button, index) => {
    button.addEventListener('click', () => { if (index <= furthestStep) showStep(index); });
  });
  document.querySelectorAll('[data-note]').forEach(button => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.querySelector('.note-reveal').hidden = !expanded;
      button.querySelector('.note-preview').hidden = expanded;
      if (expanded) playChime();
    });
  });

  function celebrate() {
    if (reducedMotion.matches) return;
    const layer = $('#confetti-layer');
    layer.replaceChildren();
    const colors = ['#c56887', '#ebacc2', '#a8bb9f', '#d9bc65', '#e7d3df'];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 68; i++) {
      const piece = document.createElement('span');
      piece.className = `confetti${i % 3 === 0 ? ' heart' : ''}`;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.setProperty('--color', colors[i % colors.length]);
      piece.style.setProperty('--duration', `${2.6 + Math.random() * 1.7}s`);
      piece.style.setProperty('--delay', `${Math.random() * .6}s`);
      piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
      piece.style.setProperty('--spin', `${Math.random() * 800 - 400}deg`);
      piece.addEventListener('animationend', () => piece.remove(), { once: true });
      fragment.appendChild(piece);
    }
    layer.appendChild(fragment);
  }

  function blowCandle() {
    if (candleOut || currentStep !== 2) return;
    candleOut = true;
    stopMicrophone();
    $('#cake-scene').classList.add('blown');
    $('#cake-art').setAttribute('aria-label', 'A pink heart-shaped birthday cake. The candle is blown out.');
    $('#candle-controls').hidden = true;
    $('#cake-next').hidden = false;
    $('#cake-subtitle').textContent = 'A wish made. A little magic sent your way.';
    $('#cake-status').textContent = 'May everything you wished for find its way to you.';
    $('#cake-next button').focus({ preventScroll: true });
    celebrate();
    playChime();
  }
  $('#blow-candle').addEventListener('click', blowCandle);

  // Invalidate pending permission requests when leaving the cake or cancelling.
  function stopMicrophone() {
    micRequest++;
    micActive = false;
    cancelAnimationFrame(micFrame);
    clearTimeout(micTimer);
    micFrame = null;
    micTimer = null;
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    micStream = null;
    if (micContext) micContext.close().catch(() => {});
    micContext = null;
    $('#microphone').classList.remove('listening');
    $('#microphone span').textContent = 'Blow with your microphone';
    $('#microphone').setAttribute('aria-pressed', 'false');
    if (!candleOut) $('#cake-status').textContent = '';
    if (musicGain && audioContext) musicGain.gain.setTargetAtTime(1, audioContext.currentTime, .1);
  }

  $('#microphone').addEventListener('click', async () => {
    if (micActive) { stopMicrophone(); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      $('#cake-status').textContent = 'Your microphone is unavailable here. The candle button works just as well.';
      return;
    }
    micActive = true;
    const request = ++micRequest;
    $('#microphone').classList.add('listening');
    $('#microphone').setAttribute('aria-pressed', 'true');
    $('#microphone span').textContent = 'Cancel microphone';
    $('#cake-status').textContent = 'Allow the microphone, then give the candle a little blow.';
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      if (request !== micRequest || currentStep !== 2 || candleOut) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      micStream = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      micContext = new AudioContext();
      await micContext.resume();
      if (request !== micRequest || currentStep !== 2 || candleOut) return;
      if (musicGain && audioContext) musicGain.gain.setTargetAtTime(0, audioContext.currentTime, .1);
      const analyser = micContext.createAnalyser();
      analyser.fftSize = 2048;
      micContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let aboveThresholdSince = null;
      $('#microphone span').textContent = 'Listening... stop microphone';
      $('#cake-status').textContent = 'Make your wish and blow gently towards your microphone.';
      const detectBlow = now => {
        if (request !== micRequest) return;
        analyser.getFloatTimeDomainData(samples);
        let power = 0;
        for (const value of samples) power += value * value;
        const volume = Math.sqrt(power / samples.length);
        if (volume > .065) {
          if (aboveThresholdSince === null) aboveThresholdSince = now;
          if (now - aboveThresholdSince > 240) { blowCandle(); return; }
        } else aboveThresholdSince = null;
        micFrame = requestAnimationFrame(detectBlow);
      };
      micFrame = requestAnimationFrame(detectBlow);
      micTimer = setTimeout(() => {
        stopMicrophone();
        $('#cake-status').textContent = 'One more try? Or use the candle button to make your wish.';
      }, 20000);
    } catch (error) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (request !== micRequest) return;
      stopMicrophone();
      $('#cake-status').textContent = 'No microphone? No problem. Use the candle button and keep your wish a secret.';
    }
  });

  function getAudio() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
      musicGain = audioContext.createGain();
      musicGain.connect(audioContext.destination);
    }
    audioContext.resume().catch(() => {});
    return audioContext;
  }
  function tone(frequency, when, duration, volume) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(musicGain);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function playChime() {
    if (!musicEnabled || !getAudio()) return;
    [523.25, 659.25, 783.99].forEach((hz, i) => tone(hz, audioContext.currentTime + i * .11, .6, .06));
  }
  function playBirthdayMusic() {
    if (!musicEnabled || !getAudio()) return;
    const melody = [[60,.5],[60,.5],[62,1],[60,1],[65,1],[64,2],[60,.5],[60,.5],[62,1],[60,1],[67,1],[65,2],[60,.5],[60,.5],[72,1],[69,1],[65,1],[64,1],[62,2],[70,.5],[70,.5],[69,1],[65,1],[67,1],[65,2]];
    let offset = .15;
    melody.forEach(([note, beats]) => {
      const duration = beats * .36;
      tone(440 * 2 ** ((note + 12 - 69) / 12), audioContext.currentTime + offset, duration * 1.5, .05);
      offset += duration;
    });
    musicTimer = setTimeout(playBirthdayMusic, (offset + 8) * 1000);
  }
  function updateSoundButton() {
    const button = $('#sound');
    const label = musicEnabled ? 'Turn off birthday music' : 'Turn on birthday music';
    button.setAttribute('aria-pressed', String(musicEnabled));
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = `<i data-lucide="${musicEnabled ? 'volume-2' : 'volume-x'}"></i>`;
    window.lucide?.createIcons();
  }
  $('#sound').addEventListener('click', async () => {
    try {
      musicEnabled = !musicEnabled;
      clearTimeout(musicTimer);
      if (musicEnabled) {
        if (!getAudio()) { musicEnabled = false; return; }
        await audioContext.resume();
        playBirthdayMusic();
      } else if (audioContext) {
        await audioContext.close();
        audioContext = null;
        musicGain = null;
      }
    } catch { musicEnabled = false; }
    finally { updateSoundButton(); }
  });

  function letterText() {
    const paragraphs = [...document.querySelectorAll('#letter-body p')].map(p => p.textContent);
    return ['Happy Birthday, Agyeiwaa', '', 'Dear Agyeiwaa,', '', ...paragraphs.flatMap(p => [p, '']), 'With so much love,', 'Ebenezer', '', 'P.S. The world got a good one when it got you.'].join('\n');
  }
  function saveLetter() {
    const blob = new Blob([letterText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'For-Agyeiwaa-with-love-from-Ebenezer.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#final-status').textContent = 'A little letter to keep, for whenever you need a smile.';
  }
  $('#save-letter').addEventListener('click', saveLetter);
  $('#share').addEventListener('click', async () => {
    const data = { title: 'Happy Birthday, Agyeiwaa', text: letterText() };
    // A local file URL is not usable by the recipient. Share the letter itself.
    if (/^https?:$/.test(location.protocol)) data.url = location.href;
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
        $('#final-status').textContent = 'A little birthday love, passed along.';
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url ? `${data.text}\n\n${data.url}` : data.text);
        $('#final-status').textContent = 'The birthday letter is copied and ready to share.';
      } else saveLetter();
    } catch (error) {
      if (error.name !== 'AbortError') $('#final-status').textContent = 'Sharing is unavailable here. Keep the letter with the download button.';
    }
  });
  $('#celebrate').addEventListener('click', () => {
    celebrate(); playChime();
    $('#final-status').textContent = 'One more little celebration, just for you.';
  });
  function restart() {
    clearTimeout(openingTimer);
    openingTimer = null;
    furthestStep = 0;
    candleOut = false;
    $('#cake-scene').classList.remove('blown');
    $('#cake-art').setAttribute('aria-label', 'A pink heart-shaped birthday cake with cherries, bows, and one lit candle');
    $('#candle-controls').hidden = false;
    $('#cake-next').hidden = true;
    $('#cake-subtitle').textContent = 'The big, beautiful, only-you-know kind of wish.';
    $('#cake-status').textContent = '';
    $('#final-status').textContent = '';
    $('#confetti-layer').replaceChildren();
    $('.opening').classList.remove('is-opening');
    $('#open-envelope').disabled = false;
    document.querySelectorAll('[data-note]').forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      button.querySelector('.note-reveal').hidden = true;
      button.querySelector('.note-preview').hidden = false;
    });
    showStep(0);
  }
  $('#restart').addEventListener('click', restart);
  $('.wordmark').addEventListener('click', event => { event.preventDefault(); restart(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMicrophone();
      if (musicEnabled && audioContext) audioContext.suspend().catch(() => {});
    } else if (musicEnabled && audioContext) audioContext.resume().catch(() => {});
  });
  window.addEventListener('pagehide', () => {
    stopMicrophone(); clearTimeout(musicTimer);
    if (audioContext) audioContext.close().catch(() => {});
  });
  showStep(0, false);
})();
