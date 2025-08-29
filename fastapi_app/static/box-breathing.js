/* Lightweight, self-contained box-breathing widget */
(function () {
  const STYLE_ID = "box-breathing-style";
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
  .bb-root{position:relative;--bb-time:16s;--bb-size:1;--bb-bg:#0f172a;--bb-bc:#fff;--bb-dot:1.2rem}
  .bb-box{position:relative;width:calc(min(45vmin, 230px)*var(--bb-size));max-width:100%;aspect-ratio:1/1;height:auto;border:2px solid var(--bb-bc);border-radius:0}
  .bb-box.bb-circle{border-radius:50%}
  .bb-fill{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(135deg,#38bdf8 0%,#6366f1 60%,var(--bb-bg) 100%);border-top:2px solid var(--bb-bc);animation:bb-fill var(--bb-time) infinite cubic-bezier(0.2,0,0.8,1);border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}
  .bb-dot{position:absolute;left:calc(0% + 1px);top:calc(100% - 1px);transform:translate(-50%,-50%);width:var(--bb-dot);height:var(--bb-dot);border-radius:999px;border:2px solid var(--bb-bc);background:var(--bb-bg);animation:bb-dot var(--bb-time) infinite linear;display:flex;align-items:center;justify-content:center;font:800 0.7em/1 monospace;color:#fff}
    .bb-guide{position:absolute;inset:0;display:grid}
    .bb-guide > *{grid-area:1/1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;opacity:0}
  .bb-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;color:#e2e8f0;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.4)}
    .bb-in{animation:bb-in var(--bb-time) infinite cubic-bezier(0.2,0,0.8,1)}
    .bb-hold{animation:bb-hold var(--bb-time) infinite cubic-bezier(0.2,0,0.8,1)}
    .bb-out{animation:bb-out var(--bb-time) infinite cubic-bezier(0.2,0,0.8,1)}
  /* Start with inhale instead of hold */
  @keyframes bb-fill{0%{height:0}25%{height:100%}50%{height:100%}75%{height:0}100%{height:0}}
  @keyframes bb-dot{0%{left:calc(0% + 1px);top:calc(100% - 1px)}25%{left:calc(0% + 1px);top:calc(0% + 1px)}50%{left:calc(100% - 1px);top:calc(0% + 1px)}75%{left:calc(100% - 1px);top:calc(100% - 1px)}100%{left:calc(0% + 1px);top:calc(100% - 1px)}}
  .bb-box.bb-circle .bb-dot{animation:bb-dot-circle var(--bb-time) infinite linear}
  @keyframes bb-dot-circle{0%{left:50%;top:100%}25%{left:0%;top:50%}50%{left:50%;top:0%}75%{left:100%;top:50%}100%{left:50%;top:100%}}
  /* Guide windows with small gaps to avoid overlap */
  /* inhale: ~3% - 23% */
  @keyframes bb-in{0%{opacity:0}3%{opacity:1}23%{opacity:1}24%{opacity:0}100%{opacity:0}}
  /* exhale: ~52% - 73% */
  @keyframes bb-out{0%{opacity:0}52%{opacity:1}73%{opacity:1}74%{opacity:0}100%{opacity:0}}
  /* holds: ~26% - 49% and ~76% - 99% */
  @keyframes bb-hold{0%{opacity:0}26%{opacity:1}49%{opacity:1}50%{opacity:0}76%{opacity:1}99%{opacity:1}100%{opacity:0}}
    @media (prefers-reduced-motion: reduce){.bb-fill,.bb-dot,.bb-in,.bb-out,.bb-hold{animation-duration:calc(var(--bb-time)*2)}}
    `;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createBoxBreathing(mount, opts = {}) {
    injectStyles();
    const options = {
      cycleSeconds: opts.cycleSeconds ?? 16,
      boxScale: opts.boxScale ?? 1,
      showGuide: opts.showGuide ?? true,
      shape: opts.shape || "square",
      showDot: opts.showDot !== undefined ? !!opts.showDot : true,
    };

    const root = document.createElement("div");
    root.className = "bb-root";
    root.style.setProperty("--bb-time", options.cycleSeconds + "s");
    root.style.setProperty("--bb-size", options.boxScale);

    const box = document.createElement("div");
    box.className = "bb-box";
    if (options.shape === "circle") box.classList.add("bb-circle");
    const fill = document.createElement("div");
    fill.className = "bb-fill";
    const dot = document.createElement("div");
    dot.className = "bb-dot";
    if (!options.showDot) dot.style.display = "none";

    const guide = document.createElement("div");
    guide.className = "bb-guide";
    guide.style.opacity = options.showGuide ? "1" : "0";
    const label = document.createElement("div");
    label.className = "bb-label";
    label.textContent = "";
    const gIn = document.createElement("div");
    gIn.className = "bb-in";
    gIn.textContent = "Inhale";
    const gHold = document.createElement("div");
    gHold.className = "bb-hold";
    gHold.textContent = "Hold";
    const gOut = document.createElement("div");
    gOut.className = "bb-out";
    gOut.textContent = "Exhale";

    guide.append(gIn, gHold, gOut);
    box.append(fill, dot, guide, label);
    root.append(box);
    mount.append(root);

    // simple mode state (two/three): JS-driven fill animation
    let simpleTimer1 = null;
    let simpleTimer2 = null;
    let simpleTimerLoop = null;
    let boxLabelTimers = [];
    let currentVariant = "box"; // 'box' | 'two' | 'three'
    let phases = null; // { inhale, exhale } or { inhale, hold, exhale }
    let boxPhases = null; // { inhale, hold1, exhale, hold2 }

    function clearSimpleTimers() {
      [simpleTimer1, simpleTimer2, simpleTimerLoop].forEach((t) => {
        if (t) clearTimeout(t);
      });
      simpleTimer1 = simpleTimer2 = simpleTimerLoop = null;
    }

    function clearBoxLabelTimers() {
      boxLabelTimers.forEach((t) => clearTimeout(t));
      boxLabelTimers = [];
    }

    function startBoxLabels() {
      if (!boxPhases) return;
      clearBoxLabelTimers();
      // Use JS-driven label cycles to prevent overlap; hide CSS guide labels
      guide.style.display = "none";
      const inh = Math.max(0, Number(boxPhases.inhale || 0)) * 1000;
      const h1 = Math.max(0, Number(boxPhases.hold1 || 0)) * 1000;
      const ex = Math.max(0, Number(boxPhases.exhale || 0)) * 1000;
      const h2 = Math.max(0, Number(boxPhases.hold2 || 0)) * 1000;

      function cycle() {
        // Inhale
        label.textContent = "Inhale";
        boxLabelTimers.push(
          setTimeout(() => {
            // Hold 1
            label.textContent = h1 > 0 ? "Hold" : "Inhale";
            boxLabelTimers.push(
              setTimeout(() => {
                // Exhale
                label.textContent = "Exhale";
                boxLabelTimers.push(
                  setTimeout(() => {
                    // Hold 2
                    label.textContent = h2 > 0 ? "Hold" : "Exhale";
                    boxLabelTimers.push(setTimeout(cycle, h2));
                  }, ex)
                );
              }, h1)
            );
          }, inh)
        );
      }
      cycle();
    }

    function startSimpleCycle() {
      if (!phases) return;
      clearSimpleTimers();
      // disable CSS keyframe animation for fill
      fill.style.animation = "none";
      // start from current height; default 0
      const inhale = Number(phases.inhale || 0);
      const exhale = Number(phases.exhale || 0);
      const hold = currentVariant === "three" ? Number(phases.hold || 0) : 0;

      function cycleOnce() {
        // Inhale: to 100%
        fill.style.transition = `height ${inhale}s cubic-bezier(0.2,0,0.8,1)`;
        // trigger reflow to apply transition when value changes
        void fill.offsetHeight;
        fill.style.height = "100%";

        // After inhale, optionally hold
        simpleTimer1 = setTimeout(() => {
          const afterHold = () => {
            // Exhale: back to 0%
            fill.style.transition = `height ${exhale}s cubic-bezier(0.2,0,0.8,1)`;
            void fill.offsetHeight;
            fill.style.height = "0%";

            // Loop after exhale
            simpleTimer2 = setTimeout(() => {
              if (currentVariant !== "box") cycleOnce();
            }, exhale * 1000);
          };

          if (hold > 0) {
            simpleTimerLoop = setTimeout(afterHold, hold * 1000);
          } else {
            afterHold();
          }
        }, inhale * 1000);
      }

      // initialize height to 0 for cycle start
      if (!fill.style.height) fill.style.height = "0%";
      cycleOnce();
    }

    return {
      setCycleSeconds(s) {
        options.cycleSeconds = s;
        root.style.setProperty("--bb-time", s + "s");
      },
      setBoxScale(s) {
        options.boxScale = s;
        root.style.setProperty("--bb-size", s);
      },
      setShowGuide(b) {
        options.showGuide = b;
        guide.style.opacity = b ? "1" : "0";
      },
      setShape(shape) {
        options.shape = shape;
        if (shape === "circle") box.classList.add("bb-circle");
        else box.classList.remove("bb-circle");
      },
      setShowDot(b) {
        options.showDot = !!b;
        dot.style.display = b ? "flex" : "none";
      },
      setVariant(variant) {
        currentVariant = variant;
        if (variant === "box") {
          clearSimpleTimers();
          clearBoxLabelTimers();
          // restore CSS animation
          fill.style.animation = "";
          // reset to baseline so CSS keyframes take over
          fill.style.transition = "";
          fill.style.height = "";
          // restart labels if durations provided
          if (boxPhases) startBoxLabels();
        } else {
          // ensure circle shape for non-box handled by caller via setShape
          clearBoxLabelTimers();
          guide.style.display = options.showGuide ? "grid" : "none";
          label.textContent = "";
          startSimpleCycle();
        }
      },
      setPhases(p, variant) {
        phases = p || phases;
        if (variant) this.setVariant(variant);
        if (currentVariant !== "box") startSimpleCycle();
      },
      setBoxPhases(p) {
        boxPhases = p || boxPhases;
        if (currentVariant === "box") startBoxLabels();
      },
    };
  }

  // expose globally
  window.createBoxBreathing = createBoxBreathing;
})();
