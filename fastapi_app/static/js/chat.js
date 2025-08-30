(() => {
  const elChat = document.getElementById("chat");
  const elForm = document.getElementById("chat-form");
  const elInput = document.getElementById("chat-text");
  const sendBtn = document.getElementById("chat-send");
  const planBtn = document.getElementById("plan-btn");
  const transcript = [];
  const history = [];

  function addMsg(role, text) {
    const row = document.createElement("div");
    row.className = `msg-row ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    elChat.appendChild(row);
    elChat.scrollTop = elChat.scrollHeight;
  }

  const greeting = "Hi, I’m your calm breathing companion. How was your day?";
  addMsg("assistant", greeting);
  history.push({ role: "assistant", content: greeting });

  function extractPlanJson(text) {
    const tag = "PLAN_JSON:";
    const idx = text.indexOf(tag);
    if (idx === -1) return null;
    const after = text.slice(idx + tag.length);
    const start = after.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    let started = false;
    let jsonStr = "";
    for (let c of after.slice(start)) {
      if (c === "{") {
        depth++;
        started = true;
      }
      if (started) jsonStr += c;
      if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  function disableChat() {
    if (elInput) elInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (planBtn) planBtn.disabled = true;
  }

  async function send(text) {
    addMsg("user", text);
    addMsg("assistant", "…");
    transcript.push(text);
    history.push({ role: "user", content: text });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const last = elChat.querySelector(
        ".msg-row.assistant:last-child .bubble"
      );
      const reply = data.reply || "Sorry, I could not respond.";
      if (last) last.textContent = reply;
      transcript.push(reply);
      history.push({ role: "assistant", content: reply });
      const plan = extractPlanJson(reply);
      if (plan) {
        try {
          const meta = storeAndConfirm(plan);
          disableChat();
          setTimeout(() => applyPlan({ breathing: meta }), 800);
        } catch {}
      }
    } catch (err) {
      const last = elChat.querySelector(
        ".msg-row.assistant:last-child .bubble"
      );
      if (last) last.textContent = "Connection error. Try again.";
    }
  }

  elForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (elInput.value || "").trim();
    if (!text) return;
    elInput.value = "";
    send(text);
  });

  async function applyPlan(plan) {
    const b = plan.breathing || plan;
    const t = b.timing || {};
    try {
      if (b.type === "4 point") {
        await fetch("/api/patterns/box", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inhale: Number(t.inhale) || 4,
            hold1: Number(t.hold) || 4,
            exhale: Number(t.exhale) || 4,
            hold2: Number(t.hold_after_exhale) || 4,
          }),
        });
        window.location.href = "/box";
        return;
      }
      if (b.type === "3 point") {
        await fetch("/api/patterns/three", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inhale: Number(t.inhale) || 4,
            hold: Number(t.hold) || 0,
            exhale: Number(t.exhale) || 4,
          }),
        });
        window.location.href = "/circle";
        return;
      }
      await fetch("/api/patterns/two", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inhale: Number(t.inhale) || 4,
          exhale: Number(t.exhale) || 4,
        }),
      });
      window.location.href = "/circle";
    } catch (e) {
      addMsg(
        "assistant",
        "Couldn’t apply the plan. Please try again or adjust durations manually."
      );
    }
  }

  function cycleFrom(b) {
    const t = b.timing || {};
    function n(v) {
      const num = Number(v);
      return Number.isFinite(num)
        ? Number.isInteger(num)
          ? String(num)
          : String(num)
        : "0";
    }
    if (b.type === "4 point")
      return `${n(t.inhale)}-${n(t.hold)}-${n(t.exhale)}-${n(
        t.hold_after_exhale
      )}`;
    if (b.type === "3 point")
      return `${n(t.inhale)}-${n(t.hold)}-${n(t.exhale)}`;
    return `${n(t.inhale)}-${n(t.exhale)}`;
  }

  function storeAndConfirm(breathingObj) {
    const b = breathingObj;
    const meta = {
      emotion: b.emotion || "",
      pattern:
        b.pattern ||
        (b.type === "4 point"
          ? "Box breathing"
          : b.type === "3 point"
          ? "Inhale-Hold-Exhale"
          : "Equal breathing"),
      type: b.type || "2 point",
      timing: b.timing || {},
      cycle: cycleFrom(b),
      quote: (b.quote || "").trim(),
    };
    try {
      sessionStorage.setItem("breathingPlan", JSON.stringify(meta));
    } catch {}
    if (meta.emotion) {
      addMsg("assistant", `It sounds like you’re feeling ${meta.emotion}.`);
    }
    addMsg(
      "assistant",
      `Let’s do ${meta.pattern} — cycle ${meta.cycle}. I’ll set that up now.`
    );
    return meta;
  }

  planBtn?.addEventListener("click", async () => {
    addMsg("assistant", "Let me summarize and pick a pattern for you…");
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript.slice(-10) }),
      });
      const data = await res.json();
      function cycleFrom(b) {
        const t = b.timing || {};
        function n(v) {
          const num = Number(v);
          return Number.isFinite(num)
            ? Number.isInteger(num)
              ? String(num)
              : String(num)
            : "0";
        }
        if (b.type === "4 point")
          return `${n(t.inhale)}-${n(t.hold)}-${n(t.exhale)}-${n(
            t.hold_after_exhale
          )}`;
        if (b.type === "3 point")
          return `${n(t.inhale)}-${n(t.hold)}-${n(t.exhale)}`;
        return `${n(t.inhale)}-${n(t.exhale)}`;
      }

      function storeAndConfirm(breathingObj) {
        const b = breathingObj;
        const meta = {
          emotion: b.emotion || "",
          pattern:
            b.pattern ||
            (b.type === "4 point"
              ? "Box breathing"
              : b.type === "3 point"
              ? "Inhale-Hold-Exhale"
              : "Equal breathing"),
          type: b.type || "2 point",
          timing: b.timing || {},
          cycle: cycleFrom(b),
        };
        try {
          sessionStorage.setItem("breathingPlan", JSON.stringify(meta));
        } catch {}
        if (meta.emotion) {
          addMsg("assistant", `It sounds like you’re feeling ${meta.emotion}.`);
        }
        addMsg(
          "assistant",
          `Let’s do ${meta.pattern} — cycle ${meta.cycle}. I’ll set that up now.`
        );
        return meta;
      }

      if (data.result) {
        try {
          const parsed = JSON.parse(data.result);
          const b = parsed.breathing || parsed;
          const meta = storeAndConfirm(b);
          setTimeout(() => {
            applyPlan({ breathing: meta });
          }, 900);
        } catch (e) {
          addMsg(
            "assistant",
            "I had trouble reading the plan. Let’s go with a gentle 4-4-4-4 for now."
          );
          const b = {
            emotion: "Calm / Relaxed",
            pattern: "Box breathing",
            type: "4 point",
            timing: { inhale: 4, hold: 4, exhale: 4, hold_after_exhale: 4 },
          };
          storeAndConfirm(b);
          setTimeout(() => applyPlan({ breathing: b }), 900);
        }
      } else if (data.breathing) {
        const b = data.breathing;
        storeAndConfirm(b);
        setTimeout(() => applyPlan({ breathing: b }), 900);
      } else {
        addMsg(
          "assistant",
          "I couldn’t generate a plan. Let’s try a calming 4-4-4-4."
        );
        const b = {
          emotion: "Calm / Relaxed",
          pattern: "Box breathing",
          type: "4 point",
          timing: { inhale: 4, hold: 4, exhale: 4, hold_after_exhale: 4 },
        };
        storeAndConfirm(b);
        setTimeout(() => applyPlan({ breathing: b }), 900);
      }
    } catch (e) {
      addMsg(
        "assistant",
        "Network hiccup while preparing your plan. Please try again."
      );
    }
  });
})();
