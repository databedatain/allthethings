/* Storage backend selection.
 *
 * The bullet-journal component expects an async `window.storage` API (it was
 * originally handed one by the Claude artifact runtime). Which one it gets
 * depends on where the app is being served from:
 *
 *   GitHub Pages / dev  — localStorage, per browser, no account needed.
 *   Apps Script /exec   — the bound Google Sheet, so the same journal follows
 *                         you between phone and laptop.
 *
 * Nothing above this file knows the difference.
 */

import { isAppsScript, createSheetStorage } from "./storage-sheet.js";
import { mountSyncIndicator } from "./sync-indicator.js";

if (isAppsScript()) {
  const indicator = mountSyncIndicator();
  const storage = createSheetStorage((status) => indicator.update(status));
  indicator.bind(storage);
  window.storage = storage;
} else {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}
