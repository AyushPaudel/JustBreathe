(function () {
  const preset = document.getElementById("preset");
  const go = document.getElementById("go");
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

  function onPresetChange() {
    const v = preset.value;
    customBox.style.display = v === "box" ? "flex" : "none";
    customThree.style.display = v === "three" ? "flex" : "none";
    customTwo.style.display = v === "two" ? "flex" : "none";
  }
  preset.addEventListener("change", onPresetChange);
  onPresetChange();

  go.addEventListener("click", async () => {
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
        window.location.href = "/box";
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
        window.location.href = "/circle";
      } else {
        await fetch("/api/patterns/two", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inhale: Number(c2In.value),
            exhale: Number(c2Ex.value),
          }),
        });
        window.location.href = "/circle";
      }
    } catch (e) {
      alert("Failed to save pattern");
    }
  });
})();
