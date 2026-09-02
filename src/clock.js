/* Timeclock helpers — day bucketing, duration maths, and the formatting the
 * timeclock view reads back to you.
 *
 * A session is {id, start, end, label, taskId}; `end` is absent while the
 * clock is still running. Sessions belong to the day they *started* on, so a
 * shift that runs past midnight stays one entry on one day instead of being
 * split in two — matching how you'd describe it out loud. */

export function dayKeyOf(ms) {
  const d = new Date(ms);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da}`;
}

export function dayLabel(key, todayK) {
  if (key === todayK) return "today";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKeyOf(yesterday.getTime())) return "yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Milliseconds on the clock for a session — open sessions run up to `now`. */
export function durationOf(session, now) {
  const end = session.end == null ? now : session.end;
  return Math.max(0, end - session.start);
}

/** Running stopwatch: 14:32 under an hour, 1:14:32 over it. */
export function formatStopwatch(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Settled totals: 1h 24m, 47m, 0m. */
export function formatDuration(ms) {
  const mins = Math.round(Math.max(0, ms) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatTimeOfDay(ms) {
  return new Date(ms)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase();
}

/** Value for an <input type="time">. */
export function timeInputValue(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Re-times `baseMs` to the "HH:MM" the user typed, keeping its date.
 * Returns null for an unparseable value so callers can ignore half-typed input.
 */
export function applyTimeInput(baseMs, value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  const d = new Date(baseMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Every session, newest first, with the running one included as still open. */
export function allSessions(clock) {
  const sessions = (clock && clock.sessions) || [];
  const running = clock && clock.running;
  const list = running ? [...sessions, running] : sessions;
  return [...list].sort((a, b) => b.start - a.start);
}

/** Sums `sessions` into a Map of day key -> milliseconds. */
export function totalsByDay(sessions, now) {
  const totals = new Map();
  for (const s of sessions) {
    const key = dayKeyOf(s.start);
    totals.set(key, (totals.get(key) || 0) + durationOf(s, now));
  }
  return totals;
}

/** Sums `sessions` by label (falling back to `untitled`), largest first. */
export function totalsByLabel(sessions, now, nameOf) {
  const totals = new Map();
  for (const s of sessions) {
    const name = nameOf(s) || "untitled";
    totals.set(name, (totals.get(name) || 0) + durationOf(s, now));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}
