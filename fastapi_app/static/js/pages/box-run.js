(async () => {
  const mount = document.getElementById("mount");
  if (!mount || !window.createBoxBreathing) return;

  async function getConfig() {
    try {
      const res = await fetch("/api/config");
      return await res.json();
    } catch {
      return {
        box_scale: 1,
        variant: "box",
        pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
      };
    }
  }

  const cfg = await getConfig();
  const cycleSeconds = Number(
    cfg.cycle_seconds ??
      (cfg.pattern
        ? cfg.pattern.inhale +
          cfg.pattern.hold1 +
          cfg.pattern.exhale +
          cfg.pattern.hold2
        : 16)
  );
  const boxScale = Number(cfg.box_scale ?? 1);

  const player = window.createBoxBreathing(mount, {
    cycleSeconds,
    boxScale,
    showGuide: true,
    shape: "square",
    showDot: true,
  });

  if (cfg.pattern && player.setBoxPhases) {
    player.setVariant && player.setVariant("box");
    player.setBoxPhases(cfg.pattern);
  }

  // Make accessible to other modules (audio + session)
  window._bbPlayer = player;
})();
