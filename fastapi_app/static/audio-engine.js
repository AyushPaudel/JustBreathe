// Lightweight Web Audio engine for breathing cues
// Exposes createAudioEngine() that returns controls for start/stop and volumes
(function () {
  function createNoiseNode(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    return noise;
  }

  function createTone(ctx, freq) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    return osc;
  }

  function createAudioEngine() {
    let ctx = null;
    let masterGain, assistGain, bgGain;
    let inhaleBuffer = null,
      exhaleBuffer = null;
    let inhaleSource = null,
      exhaleSource = null;
    let inhaleGain = null,
      exhaleGain = null;
    let inhaleLevel = 1.5,
      exhaleLevel = 1.5;
    let bgBuffer = null;
    let bgSource = null;
    let running = false;

    const state = {
      master: 1.0,
      assist: 0.0,
      background: 0.0,
    };

    function ensureContext() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      assistGain = ctx.createGain();
      bgGain = ctx.createGain();
      masterGain.gain.value = state.master;
      assistGain.gain.value = state.assist;
      bgGain.gain.value = state.background;

      // Per-sample gains to boost inhale/exhale loudness
      inhaleGain = ctx.createGain();
      exhaleGain = ctx.createGain();
      inhaleGain.gain.value = inhaleLevel;
      exhaleGain.gain.value = exhaleLevel;
      // Route to assistance mix
      inhaleGain.connect(assistGain);
      exhaleGain.connect(assistGain);

      // Mix to destination
      assistGain.connect(masterGain);
      bgGain.connect(masterGain);
      masterGain.connect(ctx.destination);
    }

    async function loadBackground(url) {
      ensureContext();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      bgBuffer = await ctx.decodeAudioData(arr);
      // If running, (re)start background
      if (running) startBackground();
    }

    async function loadAssistance(inhaleUrl, exhaleUrl) {
      ensureContext();
      const [a, b] = await Promise.all([
        fetch(inhaleUrl).then((r) => r.arrayBuffer()),
        fetch(exhaleUrl).then((r) => r.arrayBuffer()),
      ]);
      inhaleBuffer = await ctx.decodeAudioData(a);
      exhaleBuffer = await ctx.decodeAudioData(b);
    }

    function startBackground() {
      if (!ctx || !bgBuffer) return;
      // Stop existing instance if any
      if (bgSource) {
        try {
          bgSource.stop();
        } catch {}
        try {
          bgSource.disconnect();
        } catch {}
      }
      bgSource = ctx.createBufferSource();
      bgSource.buffer = bgBuffer;
      bgSource.loop = true;
      bgSource.connect(bgGain);
      try {
        bgSource.start();
      } catch {}
    }

    function start() {
      ensureContext();
      if (running) return;
      // resume for iOS
      if (ctx.state === "suspended") ctx.resume();
      // start background if available
      // background track
      if (bgBuffer) startBackground();
      running = true;
    }

    function stop() {
      if (!ctx || !running) return;
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      running = false;
    }

    function setMasterVolume(v) {
      state.master = Math.max(0, Math.min(1, Number(v)));
      if (!ctx) return;
      masterGain.gain.setTargetAtTime(state.master, ctx.currentTime, 0.02);
    }

    function setAssistVolume(v) {
      state.assist = Math.max(0, Math.min(1, Number(v)));
      if (!ctx) return;
      assistGain.gain.setTargetAtTime(state.assist, ctx.currentTime, 0.02);
    }

    function setBackgroundVolume(v) {
      state.background = Math.max(0, Math.min(1, Number(v)));
      if (!ctx) return;
      bgGain.gain.setTargetAtTime(state.background, ctx.currentTime, 0.02);
    }

    function stopOneShot(which) {
      try {
        which && which.stop();
      } catch {}
    }

    function startOneShot(buffer, seconds, destGain) {
      if (!buffer) return null;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      // Fit playback to phase if duration provided
      if (seconds && seconds > 0.05 && buffer.duration > 0.05) {
        const rate = Math.min(4, Math.max(0.25, buffer.duration / seconds));
        src.playbackRate.value = rate;
      }
      src.connect(destGain || assistGain);
      try {
        src.start();
      } catch {}
      return src;
    }

    // Called when phase changes: trigger assistance audio
    function onPhase(phase, seconds) {
      if (!ctx || !running) return;
      if (phase === "inhale") {
        stopOneShot(inhaleSource);
        inhaleSource = startOneShot(inhaleBuffer, seconds, inhaleGain);
      } else if (phase === "exhale") {
        stopOneShot(exhaleSource);
        exhaleSource = startOneShot(exhaleBuffer, seconds, exhaleGain);
      }
    }

    return {
      start,
      stop,
      setMasterVolume,
      setAssistVolume,
      setBackgroundVolume,
      // backward compatibility alias
      setGuideVolume: setAssistVolume,
      loadBackground,
      loadAssistance,
      onPhase,
      setInhaleLevel(v) {
        inhaleLevel = Math.max(0, Number(v) || 0);
        if (inhaleGain) inhaleGain.gain.value = inhaleLevel;
      },
      setExhaleLevel(v) {
        exhaleLevel = Math.max(0, Number(v) || 0);
        if (exhaleGain) exhaleGain.gain.value = exhaleLevel;
      },
      autoStartOnFirstGesture(target) {
        const el = target || document;
        const fire = () => {
          try {
            start();
          } catch {}
          cleanup();
        };
        const cleanup = () => {
          types.forEach((t) => el.removeEventListener(t, fire));
        };
        const types = [
          "pointerdown",
          "click",
          "touchstart",
          "keydown",
          "pointerup",
          "pointermove",
        ];
        types.forEach((t) => el.addEventListener(t, fire, { once: true }));
      },
      get context() {
        return ctx;
      },
    };
  }

  window.createAudioEngine = createAudioEngine;
})();
