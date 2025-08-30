(async () => {
  const el = document.getElementById("planMeta");
  const elQ = document.getElementById("planQuote");
  function setMeta(name, cycle) {
    if (!el) return;
    el.textContent = name && cycle ? `${name} — cycle ${cycle}` : "";
  }
  function n(v) {
    const num = Number(v);
    return Number.isFinite(num) ? String(num) : "0";
  }
  const stored = sessionStorage.getItem("breathingPlan");
  if (stored) {
    try {
      const meta = JSON.parse(stored);
      setMeta(meta.pattern || "Breathing", meta.cycle || "");
      if (elQ && meta.quote) elQ.textContent = `“${meta.quote}”`;
      return;
    } catch {}
  }
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    if (cfg.variant === "three" && cfg.pattern_three)
      setMeta(
        "Inhale-Hold-Exhale",
        `${n(cfg.pattern_three.inhale)}-${n(cfg.pattern_three.hold)}-${n(
          cfg.pattern_three.exhale
        )}`
      );
    else if (cfg.variant === "two" && cfg.pattern_two)
      setMeta(
        "Equal breathing",
        `${n(cfg.pattern_two.inhale)}-${n(cfg.pattern_two.exhale)}`
      );
    else if (cfg.pattern)
      setMeta(
        "Box breathing",
        `${n(cfg.pattern.inhale)}-${n(cfg.pattern.hold1)}-${n(
          cfg.pattern.exhale
        )}-${n(cfg.pattern.hold2)}`
      );
  } catch {}
})();
