(function () {
  const settingsBtn = document.getElementById("audioSettingsBtn");
  const panel = document.getElementById("audioPanel");
  const assistOn = document.getElementById("assistOn");
  const volMaster = document.getElementById("volMaster");
  const volBg = document.getElementById("volBg");
  let engine = null;
  let playerRoot = null;

  function ensureEngine() {
    if (!engine) engine = window.createAudioEngine();
    return engine;
  }

  function attachPhaseEvents(player) {
    try {
      playerRoot = player && player.getRoot ? player.getRoot() : null;
      if (!playerRoot) return;
      playerRoot.addEventListener("bb:phase", (e) => {
        if (!engine) return;
        engine.onPhase(e.detail.phase, e.detail.seconds);
      });
    } catch {}
  }

  const mount = document.getElementById("mount");
  const obs = new MutationObserver(() => {
    if (
      window.createBoxBreathing &&
      mount.firstChild &&
      mount.firstChild.classList &&
      mount.firstChild.classList.contains("bb-root")
    ) {
      // no-op; player will dispatch events
    }
  });
  obs.observe(mount, { childList: true });

  if (!window._bbFactoryWrapped) {
    window._bbFactoryWrapped = true;
    const orig = window.createBoxBreathing;
    window.createBoxBreathing = function (mount, opts) {
      const player = orig(mount, opts);
      attachPhaseEvents(player);
      window._bbPlayer = player;
      if (player && player.stop) {
        player.stop();
      }
      return player;
    };
  }

  settingsBtn &&
    settingsBtn.addEventListener("click", () => {
      const open = panel.getAttribute("aria-hidden") !== "false";
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    });

  const eng = ensureEngine();
  eng.loadBackground("/static/audio/birds-chirping-calm.mp3").catch(() => {});
  eng
    .loadAssistance(
      "/static/audio/breath-in.mp3",
      "/static/audio/breath-out.mp3"
    )
    .catch(() => {});
  eng.autoStartOnFirstGesture(document.body);

  if (volMaster) eng.setMasterVolume(Math.max(0.05, Number(volMaster.value)));
  if (volBg) eng.setBackgroundVolume(Math.max(0.05, Number(volBg.value)));
  eng.setAssistVolume(assistOn && assistOn.checked ? 0.2 : 0.1);

  volMaster &&
    volMaster.addEventListener("input", () => {
      const eng = ensureEngine();
      eng.setMasterVolume(Number(volMaster.value));
    });
  volBg &&
    volBg.addEventListener("input", () => {
      const eng = ensureEngine();
      eng.setBackgroundVolume(Number(volBg.value));
    });
  assistOn &&
    assistOn.addEventListener("change", () => {
      const eng = ensureEngine();
      eng.setAssistVolume(assistOn.checked ? 0.2 : 0.0);
    });
})();
