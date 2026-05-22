/* Custom-font storage. The font file lives only in this browser (IndexedDB) —
 * it is never committed to the repo and never served to visitors. */

const DB_NAME = "bj-fonts";
const STORE = "fonts";
const KEY = "user-font";
const FAMILY = "BJCustom";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFont(blob, name) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, name }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFont() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearFont() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function applyFont(blob) {
  const url = URL.createObjectURL(blob);
  let el = document.getElementById("bj-custom-font");
  if (!el) {
    el = document.createElement("style");
    el.id = "bj-custom-font";
    document.head.appendChild(el);
  }
  el.textContent = `@font-face { font-family: '${FAMILY}'; src: url(${url}); font-display: swap; }`;
}

export function removeFontStyle() {
  const el = document.getElementById("bj-custom-font");
  if (el) el.textContent = "";
}

/* ── font catalogue ── */
// `google` is the css2 family query fragment; absent = web-safe (no load).
export const FONTS = [
  { id: "caveat",       label: "Caveat",       stack: "'Caveat', cursive",                   google: "Caveat:wght@400;600" },
  { id: "karla",        label: "Karla",        stack: "'Karla', sans-serif",                 google: "Karla:ital,wght@0,400;0,500;1,400" },
  { id: "system",       label: "System Sans",  stack: "system-ui, -apple-system, sans-serif" },
  { id: "serif",        label: "Serif",        stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono",         label: "Mono",         stack: "ui-monospace, 'Courier New', monospace" },
  { id: "inter",        label: "Inter",        stack: "'Inter', sans-serif",                 google: "Inter:wght@400;500;600" },
  { id: "lora",         label: "Lora",         stack: "'Lora', serif",                       google: "Lora:ital,wght@0,400;0,600;1,400" },
  { id: "merriweather", label: "Merriweather", stack: "'Merriweather', serif",               google: "Merriweather:wght@400;700" },
  { id: "nunito",       label: "Nunito",       stack: "'Nunito', sans-serif",                google: "Nunito:wght@400;600;700" },
  { id: "spacemono",    label: "Space Mono",   stack: "'Space Mono', monospace",             google: "Space+Mono:wght@400;700" },
  { id: "patrick",      label: "Patrick Hand", stack: "'Patrick Hand', cursive",             google: "Patrick+Hand" },
  { id: "fraunces",     label: "Fraunces",     stack: "'Fraunces', serif",                   google: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400" },
];

export function fontStack(id, hasCustom) {
  if (id === "custom") return hasCustom ? "'BJCustom', sans-serif" : "'Karla', sans-serif";
  const f = FONTS.find((x) => x.id === id);
  return f ? f.stack : "'Karla', sans-serif";
}

let catalogLoaded = false;
export function loadCatalogFonts() {
  if (catalogLoaded) return;
  catalogLoaded = true;
  const families = FONTS.filter((f) => f.google).map((f) => `family=${f.google}`).join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}
