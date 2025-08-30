(() => {
  const params = new URLSearchParams(location.search);
  const task = params.get("task") || "";
  const noise = params.get("noise") || "birds-chirping-calm.mp3";

  const label = document.getElementById("dfTaskLabel");
  const timer = document.getElementById("dfTimer");
  const btnStartStop = document.getElementById("dfStartStop");
  const btnPausePlay = document.getElementById("dfPausePlay");
  const btnReset = document.getElementById("dfReset");

  if (label) label.textContent = task ? decodeURIComponent(task) : "Focus";

  let running = false;
  let onBreak = false;
  let ms = 25 * 60 * 1000;
  let id = null;
  let isPaused = false;

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function setPhase(breakMode) {
    onBreak = breakMode;
    ms = (breakMode ? 5 : 25) * 60 * 1000;
    if (timer) timer.textContent = fmt(ms);
  }

  function updateUI() {
    const canPause = isPaused || !!id;
    if (btnStartStop)
      btnStartStop.textContent = id || isPaused ? "Stop" : "Start";
    if (btnPausePlay) {
      btnPausePlay.disabled = !canPause;
      btnPausePlay.textContent = isPaused ? "Play" : "Pause";
    }
  }

  function tick() {
    ms -= 1000;
    if (timer) timer.textContent = fmt(ms);
    if (ms <= 0) {
      clearInterval(id);
      id = null;
      running = false;
      isPaused = false;
      setPhase(!onBreak);
      start();
    }
  }

  function start() {
    if (running) return;
    running = true;
    if (!id) id = setInterval(tick, 1000);
    isPaused = false;
    updateUI();
  }

  function pause() {
    running = false;
    if (id) {
      clearInterval(id);
      id = null;
    }
    isPaused = true;
    updateUI();
  }

  function reset() {
    pause();
    setPhase(false);
    isPaused = false;
    updateUI();
  }

  function stopAll() {
    running = false;
    if (id) {
      clearInterval(id);
      id = null;
    }
    isPaused = false;
    setPhase(false);
    updateUI();
  }

  const audio = new Audio(`/static/audio/${noise}`);
  audio.loop = true;
  audio.volume = 0.4;
  const enableAudio = () => {
    audio.play().catch(() => {});
    document.removeEventListener("click", enableAudio);
  };
  document.addEventListener("click", enableAudio);

  btnStartStop?.addEventListener("click", () => {
    if (id || isPaused) {
      stopAll();
    } else {
      start();
    }
  });
  btnPausePlay?.addEventListener("click", () => {
    if (id) {
      pause();
    } else if (isPaused) {
      start();
    }
  });
  btnReset?.addEventListener("click", reset);

  setPhase(false);
  updateUI();
})();
