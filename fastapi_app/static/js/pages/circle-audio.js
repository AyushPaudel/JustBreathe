(function () {
  const settingsBtn = document.getElementById("audioSettingsBtn");
  const panel = document.getElementById("audioPanel");
  const assistOn = document.getElementById("assistOn");
  const volMaster = document.getElementById("volMaster");
  const volBg = document.getElementById("volBg");

  let engine = window.createAudioEngine ? window.createAudioEngine() : null;
  if (engine) {
    engine
      .loadBackground("/static/audio/birds-chirping-calm.mp3")
      .catch(() => {});
    engine
      .loadAssistance(
        "/static/audio/breath-in.mp3",
        "/static/audio/breath-out.mp3"
      )
      .catch(() => {});
    engine.autoStartOnFirstGesture(document.body);
    if (volMaster)
      engine.setMasterVolume(Math.max(0.05, Number(volMaster.value)));
    if (volBg) engine.setBackgroundVolume(Math.max(0.05, Number(volBg.value)));
    engine.setAssistVolume(assistOn && assistOn.checked ? 0.2 : 0.1);
    window._circleEngine = engine;
  }

  settingsBtn &&
    settingsBtn.addEventListener("click", () => {
      if (!panel) return;
      const open = panel.getAttribute("aria-hidden") !== "false";
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    });
  volMaster &&
    volMaster.addEventListener(
      "input",
      () => engine && engine.setMasterVolume(Number(volMaster.value))
    );
  volBg &&
    volBg.addEventListener(
      "input",
      () => engine && engine.setBackgroundVolume(Number(volBg.value))
    );
  assistOn &&
    assistOn.addEventListener(
      "change",
      () => engine && engine.setAssistVolume(assistOn.checked ? 0.2 : 0.0)
    );
})();
