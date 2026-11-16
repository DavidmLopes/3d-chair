export function createInteractionHint(controls) {
  const hint = document.getElementById("interaction-hint");
  if (window.matchMedia("(pointer: coarse)").matches) {
    hint.textContent = "Drag to rotate · Pinch to zoom";
  }

  function dismiss() {
    hint.classList.add("is-dismissed");
    controls.removeEventListener("start", dismiss);
  }

  controls.addEventListener("start", dismiss);

  return {
    show() {
      hint.hidden = false;
    },
  };
}
