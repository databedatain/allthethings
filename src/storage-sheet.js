/* Apps Script storage backend.
 *
 * Same `{get, set}` contract as the localStorage shim, but every value round
 * trips through google.script.run into the bound spreadsheet. Three things make
 * that safe enough to trust a journal to:
 *
 *   1. Writes are queued, coalesced and serialised. The app saves on a 400ms
 *      debounce; a Sheets round trip is slower than that, so unqueued writes
 *      would overlap and land out of order.
 *   2. Every write is mirrored to localStorage first and only cleared once the
 *      server confirms it. Close the tab mid-save, lose the network, hit a
 *      quota — the write is replayed on next load instead of vanishing.
 *   3. Each write carries the revision it was based on. If another tab or
 *      device moved the journal on in the meantime the server refuses, and we
 *      ask rather than silently clobbering a day's work.
 */

const PENDING_KEY = "atr-sync:pending";
const mirrorKey = (key) => `atr-sync:mirror:${key}`;

// A Sheets write is ~0.5-2s. Past this we assume the call is lost, not slow.
const CALL_TIMEOUT_MS = 30000;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 30000];

export function isAppsScript() {
  return typeof google !== "undefined" && !!google.script && !!google.script.run;
}

function call(name, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new Error(`${name} timed out`));
    }, CALL_TIMEOUT_MS);
    const done = (fn) => (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(result);
    };
    google.script.run
      .withSuccessHandler(done(resolve))
      .withFailureHandler(done(reject))[name](...args);
  });
}

/* ─── local mirror: what we know, and what we still owe the server ─── */

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota — the queue still works, it just can't survive a reload */
  }
};

export function createSheetStorage(onStatus = () => {}) {
  const revs = new Map(); // key -> last revision the server confirmed
  let pending = new Map(Object.entries(readJSON(PENDING_KEY, {}))); // key -> value owed
  let running = false;
  let attempt = 0;
  let conflict = null; // {key, mine, theirs, rev}

  // A pending write is only meaningful alongside the revision it was based on,
  // which the mirror carries.
  for (const key of pending.keys()) {
    const mirror = readJSON(mirrorKey(key), null);
    if (mirror && typeof mirror.rev === "number") revs.set(key, mirror.rev);
  }

  const persistPending = () =>
    writeJSON(PENDING_KEY, Object.fromEntries(pending));

  const status = (state, detail) => onStatus({ state, detail, conflict });

  async function flush() {
    if (running || conflict) return;
    running = true;
    try {
      while (pending.size && !conflict) {
        const [key, value] = pending.entries().next().value;
        status("saving");
        let result;
        try {
          const base = revs.has(key) ? revs.get(key) : null;
          result = await call("saveState", key, value, base);
          attempt = 0;
        } catch (err) {
          // Network blip, sleeping laptop, Apps Script hiccup — keep the write
          // queued and come back to it. It is already safe in localStorage.
          const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
          attempt += 1;
          status("retrying", `${err && err.message ? err.message : "save failed"} — retrying`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        if (result && result.ok) {
          revs.set(key, result.rev);
          writeJSON(mirrorKey(key), { value, rev: result.rev });
          // Only clear the debt if nothing newer arrived while we were away.
          if (pending.get(key) === value) pending.delete(key);
          persistPending();
          continue;
        }

        if (result && result.conflict) {
          // A timed-out write can land server-side anyway; if what's stored is
          // exactly what we sent, that's our own write coming back, not a clash.
          if (result.value === value) {
            revs.set(key, result.rev);
            writeJSON(mirrorKey(key), { value, rev: result.rev });
            if (pending.get(key) === value) pending.delete(key);
            persistPending();
            continue;
          }
          conflict = { key, mine: value, theirs: result.value, rev: result.rev };
          status("conflict");
          return;
        }

        // Shouldn't happen; treat an unrecognised reply as a failure to retry.
        status("retrying", "unexpected reply from the sheet — retrying");
        await new Promise((r) => setTimeout(r, BACKOFF_MS[0]));
      }
      if (!conflict) status(pending.size ? "retrying" : "saved");
    } finally {
      running = false;
    }
  }

  const storage = {
    async get(key) {
      // Our own unflushed write is fresher than anything the server can say.
      if (pending.has(key)) {
        flush();
        return { value: pending.get(key) };
      }
      try {
        const result = await call("loadState", key);
        if (result && typeof result.rev === "number") revs.set(key, result.rev);
        if (result) writeJSON(mirrorKey(key), { value: result.value, rev: result.rev });
        status("idle");
        return result ? { value: result.value } : null;
      } catch (err) {
        // Offline at boot: show the last copy we hold rather than an empty
        // journal. Any later save still carries the mirrored revision, so the
        // server's conflict check keeps a stale copy from overwriting good data.
        const mirror = readJSON(mirrorKey(key), null);
        if (mirror && typeof mirror.value === "string") {
          if (typeof mirror.rev === "number") revs.set(key, mirror.rev);
          status("offline", "couldn't reach the sheet — showing your last local copy");
          return { value: mirror.value };
        }
        status("offline", "couldn't reach the sheet");
        throw err;
      }
    },

    async set(key, value) {
      pending.set(key, value);
      persistPending();
      const mirror = readJSON(mirrorKey(key), null);
      writeJSON(mirrorKey(key), { value, rev: mirror ? mirror.rev : null });
      status("saving");
      flush();
    },

    /* ─── conflict resolution, driven by the sync indicator ─── */

    // Take the other side: drop our queued write and reload onto their data.
    resolveTakeTheirs() {
      if (!conflict) return;
      const { key, theirs, rev } = conflict;
      pending.delete(key);
      persistPending();
      writeJSON(mirrorKey(key), { value: theirs, rev });
      revs.set(key, rev);
      conflict = null;
      location.reload();
    },

    // Keep this tab's version, overwriting theirs deliberately.
    async resolveKeepMine() {
      if (!conflict) return;
      const { key } = conflict;
      const value = pending.get(key);
      conflict = null;
      status("saving");
      try {
        const result = await call("saveState", key, value, "*");
        if (result && result.ok) {
          revs.set(key, result.rev);
          writeJSON(mirrorKey(key), { value, rev: result.rev });
          if (pending.get(key) === value) pending.delete(key);
          persistPending();
        }
      } catch {
        /* fall through to the retry loop */
      }
      flush();
    },
  };

  // Anything owed from a previous session goes out as soon as we load — on a
  // timeout so the caller has finished wiring up its status handler first.
  if (pending.size) setTimeout(flush, 0);

  return storage;
}
