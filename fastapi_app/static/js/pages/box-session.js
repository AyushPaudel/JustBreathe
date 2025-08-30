(function () {
  const startBtn = document.getElementById("startBtn");
  const counterEl = document.getElementById("cycleCount");
  const mount = document.getElementById("mount");
  let active = false;
  let cycles = 0;

  function updateCounter() {
    if (counterEl) counterEl.textContent = `${cycles}/5`;
  }

  const obs = new MutationObserver(() => {
    const root = mount.querySelector(".bb-root");
    if (!root) return;
    root.addEventListener("bb:phase", (e) => {
      if (!active) return;
      if (e.detail && e.detail.phase === "inhale") {
        cycles += 1;
        updateCounter();
        if (cycles >= 5) {
          active = false;
          const p = window._bbPlayer;
          if (p && p.stop) p.stop();
        }
      }
    });
    obs.disconnect();
  });
  obs.observe(mount, { childList: true, subtree: true });

  startBtn &&
    startBtn.addEventListener("click", () => {
      cycles = 0;
      updateCounter();
      active = true;
      const p = window._bbPlayer;
      if (p && p.start) p.start();
    });
})();
