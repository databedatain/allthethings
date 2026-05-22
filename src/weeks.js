/* Week-bucket helpers, schema migration, incomplete-roll, and sample data. */

import { THEME_DEFAULTS } from "./theme.js";

export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d;
}

export function weekKey(date) {
  const m = mondayOf(date);
  const mo = String(m.getMonth() + 1).padStart(2, "0");
  const da = String(m.getDate()).padStart(2, "0");
  return `${m.getFullYear()}-${mo}-${da}`;
}

export function currentWeekKey() {
  return weekKey(new Date());
}

// `full` forces the month onto both ends (e.g. "May 4 – May 10"); otherwise
// the trailing month is dropped when both dates share it.
export function weekLabel(key, full) {
  const { left, right, sameMonth } = weekParts(key);
  const tail = full || !sameMonth ? right : right.split(" ")[1];
  return `${left} – ${tail}`;
}

// Month/day on each side of the range, for hyphen-aligned rendering.
export function weekParts(key) {
  const mon = new Date(`${key}T00:00:00`);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const opt = { month: "short", day: "numeric" };
  return {
    left: mon.toLocaleDateString("default", opt),
    right: sun.toLocaleDateString("default", opt),
    sameMonth: mon.getMonth() === sun.getMonth(),
  };
}

export const SPACING_DEFAULTS = {
  taskGap: 6,
  padY: 4,
  padX: 4,
  btnPad: 3,
  taskFont: 18,
};

export function defaultData() {
  return {
    schemaVersion: 5,
    tasks: [],
    trash: [],
    weekNotes: {},
    sortMode: "custom",
    sortOrder: "oldest",
    nextId: 1,
    theme: { ...THEME_DEFAULTS },
    spacing: { ...SPACING_DEFAULTS },
    sampleLoaded: false,
  };
}

// Bring any older snapshot up to schema v3.
export function migrate(data) {
  if (!data) return defaultData();
  let d = data;

  if (!d.schemaVersion || d.schemaVersion < 2) {
    const tasks = (d.tasks || []).map((t) => ({
      ...t,
      week: weekKey(t.created),
      starred: false,
    }));
    d = {
      schemaVersion: 2,
      tasks,
      weekNotes: d.notes ? { [currentWeekKey()]: d.notes } : {},
      sortOrder: d.sortOrder || "oldest",
      nextId: d.nextId || tasks.length + 1,
      starColor: "#EFB900",
      sampleLoaded: false,
    };
  }

  if (d.schemaVersion < 3) {
    const tasks = [...(d.tasks || [])]
      .sort((a, b) => a.created - b.created)
      .map((t, i) => ({ ...t, order: i }));
    d = {
      schemaVersion: 3,
      tasks,
      weekNotes: d.weekNotes || {},
      weekNoteColors: {},
      sortMode: "custom",
      sortOrder: d.sortOrder || "oldest",
      nextId: d.nextId || tasks.length + 1,
      theme: {
        mode: "light",
        highlight: THEME_DEFAULTS.highlight,
        star: d.starColor || THEME_DEFAULTS.star,
        hold: THEME_DEFAULTS.hold,
      },
      sampleLoaded: d.sampleLoaded || false,
    };
  }

  if (d.schemaVersion < 4) {
    d = {
      ...d,
      schemaVersion: 4,
      tasks: d.tasks.map((x) => ({ ...x, color: x.color ?? null })),
      spacing: { ...SPACING_DEFAULTS },
    };
    delete d.weekNoteColors;
  }

  if (d.schemaVersion < 5) {
    d = {
      ...d,
      schemaVersion: 5,
      trash: [],
      theme: { ...THEME_DEFAULTS, ...d.theme },
    };
  }

  return d;
}

// Move every not-done task out of past weeks into the current week (in place,
// not copied). Idempotent: safe to run on every load.
export function rollIncompletes(data) {
  const cur = currentWeekKey();
  let changed = false;
  const tasks = data.tasks.map((t) => {
    if (t.status !== "done" && t.week < cur) {
      changed = true;
      return { ...t, week: cur };
    }
    return t;
  });
  return changed ? { ...data, tasks } : data;
}

// Test fixture: 4 prior weeks of tasks + notes. Idempotent per week — a
// sample week is only (re)added when it currently holds no tasks, so the
// button can restore a week the user emptied without duplicating others.
export function withSampleWeeks(data) {
  const base = mondayOf(new Date());
  let id = data.nextId;
  let order = data.tasks.reduce((m, t) => Math.max(m, t.order ?? 0), 0) + 1;
  const tasks = [...data.tasks];
  const weekNotes = { ...data.weekNotes };
  const existingWeeks = new Set(data.tasks.map((tk) => tk.week));
  const weeks = [
    {
      back: 4,
      note: "Sample week — quarter kickoff, mostly admin.",
      items: [
        ["Sample: file Q1 expense report", "done"],
        ["Sample: book dentist appointment", "done"],
        ["Sample: draft onboarding doc", "active"],
      ],
    },
    {
      back: 3,
      note: "Sample week — blocked on the vendor for half of it.",
      items: [
        ["Sample: review PR #210", "done"],
        ["Sample: follow up with vendor", "hold"],
        ["Sample: plan team offsite", "active"],
      ],
    },
    {
      back: 2,
      note: "Sample week — shipped the landing page.",
      items: [
        ["Sample: ship landing page", "done"],
        ["Sample: write retro notes", "done"],
      ],
    },
    {
      back: 1,
      note: "Sample week — demo went well.",
      items: [
        ["Sample: prep client demo", "done"],
        ["Sample: email recap to the team", "active"],
        ["Sample: order new monitor", "active", true],
      ],
    },
  ];
  for (const w of weeks) {
    const m = new Date(base);
    m.setDate(m.getDate() - w.back * 7);
    const key = weekKey(m);
    if (existingWeeks.has(key)) continue;
    weekNotes[key] = w.note;
    w.items.forEach(([text, status, starred], i) => {
      const created = new Date(m);
      created.setDate(created.getDate() + i);
      tasks.push({
        id: id++,
        text,
        status,
        created: created.getTime(),
        week: key,
        starred: !!starred,
        color: null,
        order: order++,
      });
    });
  }
  return { ...data, tasks, weekNotes, nextId: id, sampleLoaded: true };
}
