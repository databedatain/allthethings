/* Sync indicator for the Apps Script build.
 *
 * A networked journal that saves silently is a journal you cannot trust: you
 * need to know a write landed before closing the laptop. This is deliberately
 * plain DOM rather than React — it has to be able to report that saving is
 * broken even if the app above it is mid-render.
 *
 * It stays out of the way: nothing at all while things are fine, a brief
 * "saved", and only sticks around when something needs you.
 */

// Long enough that an ordinary quick save never flashes a spinner at you.
const SAVING_DELAY_MS = 700;
const SAVED_LINGER_MS = 1600;

export function mountSyncIndicator() {
  let target = null; // the storage object, once it exists — conflict buttons need it
  let showTimer = null;
  let hideTimer = null;

  const wrap = document.createElement("div");
  wrap.setAttribute("role", "status");
  wrap.setAttribute("aria-live", "polite");
  Object.assign(wrap.style, {
    position: "fixed",
    right: "max(12px, env(safe-area-inset-right))",
    bottom: "max(12px, env(safe-area-inset-bottom))",
    zIndex: "9999",
    display: "none",
    maxWidth: "min(320px, calc(100vw - 24px))",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "rgba(28,28,30,0.92)",
    color: "#f2f0ec",
    font: "13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif",
    boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
    backdropFilter: "blur(6px)",
  });

  const text = document.createElement("div");
  const actions = document.createElement("div");
  Object.assign(actions.style, { display: "none", gap: "8px", marginTop: "8px" });
  wrap.append(text, actions);

  const button = (label, onClick, tone) => {
    const b = document.createElement("button");
    b.textContent = label;
    Object.assign(b.style, {
      flex: "1",
      cursor: "pointer",
      padding: "5px 8px",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.22)",
      background: tone === "primary" ? "rgba(255,255,255,0.92)" : "transparent",
      color: tone === "primary" ? "#1c1c1e" : "#f2f0ec",
      font: "inherit",
      fontWeight: tone === "primary" ? "600" : "400",
    });
    b.addEventListener("click", onClick);
    return b;
  };

  const clearTimers = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    showTimer = null;
    hideTimer = null;
  };
  const hide = () => { wrap.style.display = "none"; };
  const show = (message, tone) => {
    text.textContent = message;
    wrap.style.color = tone === "warn" ? "#ffd9a0" : "#f2f0ec";
    wrap.style.display = "block";
  };

  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(wrap));
  if (document.body) document.body.appendChild(wrap);

  return {
    bind(storage) { target = storage; },

    update({ state, detail, conflict }) {
      clearTimers();
      actions.style.display = "none";
      actions.replaceChildren();

      if (state === "conflict" && conflict) {
        show("This journal changed somewhere else — another tab or device saved after this one loaded. Keeping both isn't possible; pick one.", "warn");
        actions.style.display = "flex";
        actions.append(
          button("Load theirs", () => target && target.resolveTakeTheirs(), "primary"),
          button("Keep mine", () => target && target.resolveKeepMine()),
        );
        return;
      }

      if (state === "retrying" || state === "offline") {
        show(detail || "Can't reach the sheet — your changes are saved locally and will sync when it's back.", "warn");
        return;
      }

      if (state === "saving") {
        // Only surface a save that is taking long enough to be worth noticing.
        showTimer = setTimeout(() => show("syncing…"), SAVING_DELAY_MS);
        return;
      }

      if (state === "saved") {
        show("saved");
        hideTimer = setTimeout(hide, SAVED_LINGER_MS);
        return;
      }

      hide(); // idle
    },
  };
}
