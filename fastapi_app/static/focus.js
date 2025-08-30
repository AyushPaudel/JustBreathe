(() => {
  const label = document.getElementById("sessionLabel");
  const timeLeft = document.getElementById("timeLeft");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const focusMin = document.getElementById("focusMin");
  const shortMin = document.getElementById("shortMin");
  const longMin = document.getElementById("longMin");
  const cyclesInput = document.getElementById("cycles");

  let timerId = null;
  let running = false;
  let onBreak = false;
  let cycleCount = 0;
  let remainingMs = 25 * 60 * 1000;

  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function setPhase(isBreak, init = false) {
    onBreak = isBreak;
    const totalMin = isBreak
      ? (cycleCount + 1) % Number(cyclesInput.value || 4) === 0
        ? Number(longMin.value || 15)
        : Number(shortMin.value || 5)
      : Number(focusMin.value || 25);
    remainingMs = totalMin * 60 * 1000;
    if (label) label.textContent = isBreak ? "Break" : "Focus";
    if (timeLeft) timeLeft.textContent = fmt(remainingMs);
    if (init) return;
  }

  function tick() {
    remainingMs -= 1000;
    if (timeLeft) timeLeft.textContent = fmt(remainingMs);
    if (remainingMs <= 0) {
      clearInterval(timerId);
      timerId = null;
      running = false;
      if (!onBreak) {
        // finished a focus block
        cycleCount += 1;
        setPhase(true);
      } else {
        setPhase(false);
      }
      start();
    }
  }

  function start() {
    if (running) return;
    running = true;
    if (!timerId) timerId = setInterval(tick, 1000);
  }

  function pause() {
    running = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function reset() {
    pause();
    cycleCount = 0;
    setPhase(false, true);
  }

  startBtn?.addEventListener("click", start);
  pauseBtn?.addEventListener("click", pause);
  resetBtn?.addEventListener("click", reset);

  // Initialize
  setPhase(false, true);
})();
