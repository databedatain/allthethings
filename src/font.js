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
