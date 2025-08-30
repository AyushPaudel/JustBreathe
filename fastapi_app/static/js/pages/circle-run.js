(function () {
  const circle = document.getElementById("breathingCircle");
  const label = document.getElementById("phaseLabel");
  let inhaleMs = 4000,
    holdMs = 0,
    exhaleMs = 4000;
  let timerId;
  let running = false;
  let cycles = 0;

  function updateCounter() {
    const el = document.getElementById("cycleCount");
    if (el) el.textContent = `${cycles}/5`;
  }

  function runCycle() {
    if (!running) return;
    if (label) label.textContent = "Inhale";
    circle.style.transition = `width ${inhaleMs}ms ease-in-out, height ${inhaleMs}ms ease-in-out, opacity 300ms ease`;
    circle.style.width = "200px";
    circle.style.height = "200px";
    circle.style.opacity = "0.9";
    const eng = window._circleEngine;
    if (eng && eng.onPhase) eng.onPhase("inhale", inhaleMs / 1000);
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (!running) return;
      if (holdMs > 0) {
        if (label) label.textContent = "Hold";
        setTimeout(startExhale, holdMs);
      } else {
        startExhale();
      }
    }, inhaleMs);
  }
  function startExhale() {
    if (!running) return;
    if (label) label.textContent = "Exhale";
    circle.style.transition = `width ${exhaleMs}ms ease-in-out, height ${exhaleMs}ms ease-in-out, opacity 300ms ease`;
    circle.style.width = "60px";
    circle.style.height = "60px";
    circle.style.opacity = "0.6";
    const eng = window._circleEngine;
    if (eng && eng.onPhase) eng.onPhase("exhale", exhaleMs / 1000);
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (!running) return;
      cycles += 1;
      updateCounter();
      if (cycles >= 5) {
        running = false;
        return;
      }
      runCycle();
    }, exhaleMs);
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      const cfg = await res.json();
      if (cfg.variant === "three" && cfg.pattern_three) {
        inhaleMs = Math.max(0, Number(cfg.pattern_three.inhale) || 0) * 1000;
        holdMs = Math.max(0, Number(cfg.pattern_three.hold) || 0) * 1000;
        exhaleMs = Math.max(0, Number(cfg.pattern_three.exhale) || 0) * 1000;
      } else if (cfg.variant === "two" && cfg.pattern_two) {
        inhaleMs = Math.max(0, Number(cfg.pattern_two.inhale) || 0) * 1000;
        holdMs = 0;
        exhaleMs = Math.max(0, Number(cfg.pattern_two.exhale) || 0) * 1000;
      } else if (cfg.pattern) {
        inhaleMs = Math.max(0, Number(cfg.pattern.inhale) || 0) * 1000;
        holdMs = 0;
        exhaleMs = Math.max(0, Number(cfg.pattern.exhale) || 0) * 1000;
      }
      clearTimeout(timerId);
      circle.style.width = "60px";
      circle.style.height = "60px";
      circle.style.opacity = "0.6";
    } catch (e) {
      inhaleMs = 4000;
      holdMs = 0;
      exhaleMs = 4000;
    }
  }
  loadConfig();

  const startBtn = document.getElementById("startBtn");
  startBtn &&
    startBtn.addEventListener("click", () => {
      cycles = 0;
      updateCounter();
      running = true;
      runCycle();
    });

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (prefersReduced && prefersReduced.matches) {
    clearTimeout(timerId);
    circle.style.transition = "none";
    circle.style.width = "110px";
    circle.style.height = "110px";
    circle.style.opacity = "0.8";
  }
})();
