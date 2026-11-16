import { LoadingManager } from "three";

export function createLoadingState(canvas) {
  const screen = document.getElementById("loading-screen");
  const message = document.getElementById("loading-message");
  const progress = document.getElementById("loading-progress");
  const fill = document.getElementById("loading-progress-fill");
  const percent = document.getElementById("loading-percent");
  const retry = document.getElementById("loading-retry");
  let value = 0;
  let ready = false;
  let failed = false;
  let finished = false;

  function setProgress(next) {
    // Loading can discover more assets while parsing the model. Keep the bar
    // moving forward and reserve the final portion for the first rendered frame.
    value = Math.max(value, next);
    progress.setAttribute("aria-valuenow", String(value));
    fill.style.width = `${value}%`;
    percent.textContent = `${value}%`;
  }

  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (!failed) setProgress(Math.round((loaded / total) * 94));
  };
  manager.onLoad = () => {
    if (failed) return;
    ready = true;
    message.textContent = "Preparing scene…";
  };
  manager.onError = () => {
    failed = true;
    canvas.setAttribute("aria-busy", "false");
    document.getElementById("loading-progress-group").hidden = true;
    message.textContent = "Unable to load your chair. Please try again.";
    percent.hidden = true;
    retry.hidden = false;
  };
  retry.addEventListener("click", () => window.location.reload());

  return {
    manager,
    setStage(text) {
      if (!failed && !ready) message.textContent = text;
    },
    finish() {
      if (!ready || failed || finished) return false;
      finished = true;
      setProgress(100);
      message.textContent = "Ready";
      canvas.setAttribute("aria-busy", "false");
      screen.classList.add("is-ready");
      // Allow the entrance transition to finish without delaying the viewer.
      window.setTimeout(() => {
        screen.hidden = true;
      }, 250);
      return true;
    },
  };
}
