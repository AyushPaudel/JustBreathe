(function () {
  const mount = document.getElementById("mount");
  let player;

  const preset = document.getElementById("preset");
  const scale = document.getElementById("scale");
  const scaleVal = document.getElementById("scaleVal");
  const guide = document.getElementById("guide");
  const saveScale = document.getElementById("saveScale");
  const saveCustom = document.getElementById("saveCustom");

  const customBox = document.getElementById("custom-box");
  const customThree = document.getElementById("custom-three");
  const customTwo = document.getElementById("custom-two");
  const cIn = document.getElementById("c-inhale");
  const cH1 = document.getElementById("c-hold1");
  const cEx = document.getElementById("c-exhale");
  const cH2 = document.getElementById("c-hold2");
  const c3In = document.getElementById("c3-inhale");
  const c3H = document.getElementById("c3-hold");
  const c3Ex = document.getElementById("c3-exhale");
  const c2In = document.getElementById("c2-inhale");
  const c2Ex = document.getElementById("c2-exhale");

  async function getConfig() {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load config");
    return res.json();
  }

  function applyConfig(cfg) {
    const cycleSeconds = Number(cfg.cycle_seconds ?? 16);
    const boxScale = Number(cfg.box_scale ?? 1);
    const variant = cfg.variant || "box";

    if (scale) scale.value = String(boxScale);
    if (scaleVal) scaleVal.textContent = boxScale.toFixed(1);

    if (preset) {
      preset.value =
        variant === "three" ? "three" : variant === "two" ? "two" : "box";
    }

    if (!player) {
      player = window.createBoxBreathing(mount, {
        cycleSeconds,
        boxScale,
        showGuide: true,
        shape: variant === "box" ? "square" : "circle",
        showDot: variant === "box",
      });
    } else {
      player.setCycleSeconds(cycleSeconds);
      player.setBoxScale(boxScale);
      player.setShape(variant === "box" ? "square" : "circle");
      player.setShowDot(variant === "box");
    }

    if (variant === "box") {
      player.setVariant("box");
      const p = cfg.pattern || { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
      if (player.setBoxPhases) player.setBoxPhases(p);
    } else if (variant === "three") {
      const p = cfg.pattern_three || { inhale: 4, hold: 0, exhale: 4 };
      if (player.setVariant) player.setVariant("three");
      if (player.setPhases)
        player.setPhases({ inhale: p.inhale, hold: p.hold, exhale: p.exhale });
    } else {
      const p = cfg.pattern_two || { inhale: 4, exhale: 4 };
      if (player.setVariant) player.setVariant("two");
      if (player.setPhases)
        player.setPhases({ inhale: p.inhale, exhale: p.exhale });
    }

    if (variant === "box") {
      customBox.style.display = "flex";
      customThree.style.display = "none";
      customTwo.style.display = "none";
      const p = cfg.pattern || { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
      cIn.value = p.inhale;
      cH1.value = p.hold1;
      cEx.value = p.exhale;
      cH2.value = p.hold2;
    } else if (variant === "three") {
      customBox.style.display = "none";
      customThree.style.display = "flex";
      customTwo.style.display = "none";
      const p = cfg.pattern_three || { inhale: 4, hold: 0, exhale: 4 };
      c3In.value = p.inhale;
      c3H.value = p.hold;
      c3Ex.value = p.exhale;
    } else {
      customBox.style.display = "none";
      customThree.style.display = "none";
      customTwo.style.display = "flex";
      const p = cfg.pattern_two || { inhale: 4, exhale: 4 };
      c2In.value = p.inhale;
      c2Ex.value = p.exhale;
    }
  }

  preset &&
    preset.addEventListener("change", async () => {
      try {
        if (preset.value === "box") {
          await fetch("/api/patterns/box", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hold1: 4, inhale: 4, hold2: 4, exhale: 4 }),
          });
        } else if (preset.value === "three") {
          await fetch("/api/patterns/three", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inhale: 3, hold: 0, exhale: 3 }),
          });
        } else if (preset.value === "two") {
          await fetch("/api/patterns/two", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inhale: 4, exhale: 4 }),
          });
        }
        const cfg = await getConfig();
        applyConfig(cfg);
      } catch (e) {}
    });

  scale &&
    scale.addEventListener("input", () => {
      const v = Number(scale.value);
      scaleVal.textContent = v.toFixed(1);
      if (player) player.setBoxScale(v);
    });

  guide &&
    guide.addEventListener(
      "input",
      () => player && player.setShowGuide(guide.checked)
    );

  saveScale &&
    saveScale.addEventListener("click", async () => {
      try {
        const v = Number(scale.value);
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ box_scale: v }),
        });
        const cfg = await res.json();
        applyConfig(cfg);
      } catch (e) {}
    });

  saveCustom &&
    saveCustom.addEventListener("click", async () => {
      try {
        if (preset.value === "box") {
          await fetch("/api/patterns/box", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inhale: Number(cIn.value),
              hold1: Number(cH1.value),
              exhale: Number(cEx.value),
              hold2: Number(cH2.value),
            }),
          });
        } else if (preset.value === "three") {
          await fetch("/api/patterns/three", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inhale: Number(c3In.value),
              hold: Number(c3H.value),
              exhale: Number(c3Ex.value),
            }),
          });
        } else {
          await fetch("/api/patterns/two", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inhale: Number(c2In.value),
              exhale: Number(c2Ex.value),
            }),
          });
        }
        const cfg = await getConfig();
        applyConfig(cfg);
      } catch (e) {}
    });

  getConfig()
    .then(applyConfig)
    .catch(() => {
      applyConfig({
        cycle_seconds: 16,
        box_scale: 1,
        pattern: { hold1: 4, inhale: 4, hold2: 4, exhale: 4 },
        variant: "box",
      });
    });
})();
