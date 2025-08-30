(function () {
  const form = document.getElementById("deepFocusForm");
  const card = document.getElementById("deepFocusCard");
  const expand = card?.querySelector(".expand");
  const task = document.getElementById("dfTask");
  const noise = document.getElementById("dfNoise");

  // Home should always use the default background — ensure no deep-focus class leaks here.
  try {
    document.body.classList.remove("bg-relaxing");
  } catch {}

  function toggleOpen(force) {
    const isOpen = card?.classList.contains("is-open");
    const next = typeof force === "boolean" ? force : !isOpen;
    if (!card || !expand) return;
    card.classList.toggle("is-open", next);
    card.setAttribute("aria-expanded", String(next));
    expand.setAttribute("aria-hidden", String(!next));
    if (next) {
      task?.focus();
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  card?.addEventListener("click", (e) => {
    const target = e.target;
    if (target.closest && target.closest("form")) return;
    toggleOpen();
  });
  card?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  });

  const LAST_NOISE_KEY = "df:lastNoise";
  try {
    const saved = localStorage.getItem(LAST_NOISE_KEY);
    if (saved && noise?.querySelector(`option[value="${CSS.escape(saved)}"]`)) {
      noise.value = saved;
    }
  } catch {}

  noise?.addEventListener("change", () => {
    try {
      localStorage.setItem(LAST_NOISE_KEY, noise.value);
    } catch {}
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = encodeURIComponent(task.value.trim());
    const n = encodeURIComponent(noise.value);
    if (!t) return;
    try {
      localStorage.setItem(LAST_NOISE_KEY, noise.value);
    } catch {}
    window.location.href = `/deep-focus?task=${t}&noise=${n}`;
  });
})();
