/* Week-bucket helpers, schema migration, incomplete-roll, and sample data. */

import { THEME_DEFAULTS, getPalette, colorToken } from "./theme.js";

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

// Local-time day key, for day-scoped state (today's focus, done counts).
export function todayKey() {
  const d = new Date();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da}`;
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

// Named density presets. taskFont is a starting point — it stays mutable via
// the text-size slider after a preset is chosen.
export const DENSITIES = [
  { id: "cozy",    taskGap: 4,  padY: 4,  padX: 4,  btnPad: 2, taskFont: 16 },
  { id: "comfy",   taskGap: 7,  padY: 8,  padX: 11, btnPad: 4, taskFont: 19 },
  { id: "fluffy",  taskGap: 11, padY: 13, padX: 17, btnPad: 6, taskFont: 22 },
];

export function getDensity(id) {
  return DENSITIES.find((x) => x.id === id) || DENSITIES[0];
}

export const MAX_TAGS = 20;

export const SCHEMA_VERSION = 16;

export function defaultData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    trash: [],
    weekNotes: {},
    rolloutCounts: {},
    tags: [],
    sortMode: "custom",
    sortOrder: "oldest",
    barIntensity: "medium",
    scratchpad: "",
    focus: { date: "", ids: [] },
    doneLog: {},
    colorPresence: "full",
    wrapText: false,
    nextId: 1,
    theme: { ...THEME_DEFAULTS },
    palette: "default",
    density: "cozy",
    taskFont: 16,
    headingFont: "caveat",
    bodyFont: "karla",
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
      spacing: { taskGap: 6, padY: 4, padX: 4, btnPad: 3, taskFont: 18 },
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

  if (d.schemaVersion < 6) {
    d = { ...d, schemaVersion: 6, palette: d.palette || "default" };
  }

  if (d.schemaVersion < 7) {
    d = {
      ...d,
      schemaVersion: 7,
      density: "cozy",
      taskFont: d.spacing?.taskFont ?? 16,
    };
    delete d.spacing;
  }

  if (d.schemaVersion < 8) {
    const th = { ...(d.theme || {}) };
    const bgLight = th.bg ?? null;
    delete th.bg;
    d = { ...d, schemaVersion: 8, theme: { ...th, bgLight, bgDark: null } };
  }

  if (d.schemaVersion < 9) {
    d = {
      ...d,
      schemaVersion: 9,
      headingFont: d.headingFont || "caveat",
      bodyFont: d.bodyFont || "karla",
    };
  }

  if (d.schemaVersion < 10) {
    d = { ...d, schemaVersion: 10, rolloutCounts: d.rolloutCounts || {} };
  }

  if (d.schemaVersion < 11) {
    d = { ...d, schemaVersion: 11, tags: d.tags || [] };
  }

  // v12: colours become palette-relative tokens. Any stored hex that matches a
  // slot in the saved palette is rewritten to "slot:N" so it tracks future
  // palette changes; neutrals and custom hexes stay literal.
  if (d.schemaVersion < 12) {
    const pal = getPalette(d.palette || "default").colors;
    const tok = (c) => colorToken(c ?? null, pal);
    d = {
      ...d,
      schemaVersion: 12,
      tags: (d.tags || []).map((t) => ({ ...t, color: tok(t.color) })),
      tasks: (d.tasks || []).map((x) => ({ ...x, color: tok(x.color) })),
      trash: (d.trash || []).map((x) => ({ ...x, color: tok(x.color) })),
    };
  }

  // v13: colour tokens became shade-aware. Re-tokenise any literal hex that is
  // actually a lightened palette shade (frozen as a literal by the v12 pass, or
  // an unnamed colour picked from a shade swatch) so it shifts too. Existing
  // slot tokens and genuine custom hexes are left untouched.
  if (d.schemaVersion < 13) {
    const pal = getPalette(d.palette || "default").colors;
    const retok = (c) =>
      typeof c === "string" && !c.startsWith("slot:") ? colorToken(c, pal) : c;
    d = {
      ...d,
      schemaVersion: 13,
      tags: (d.tags || []).map((t) => ({ ...t, color: retok(t.color) })),
      tasks: (d.tasks || []).map((x) => ({ ...x, color: retok(x.color) })),
      trash: (d.trash || []).map((x) => ({ ...x, color: retok(x.color) })),
    };
  }

  // v14: formalize the Pass-2 lazy fields. Per-task additions (note, subtasks,
  // kind, meeting, rolled) stay lazy — absent means empty — so plain tasks
  // keep their exact stored shape.
  if (d.schemaVersion < 14) {
    d = {
      ...d,
      schemaVersion: 14,
      scratchpad: d.scratchpad || "",
      barIntensity: d.barIntensity || "medium",
    };
  }

  // v15: today's focus and the per-day done log. Inbox items are tasks with
  // week: null, so no task shape change.
  if (d.schemaVersion < 15) {
    d = {
      ...d,
      schemaVersion: 15,
      focus: d.focus || { date: "", ids: [] },
      doneLog: d.doneLog || {},
    };
  }

  // v16: meeting-ness moves from the task (kind: "meeting") onto a tag
  // (tag.kind: "meeting") — a task is a meeting when it wears a meeting tag.
  // Existing meeting tasks get the meeting tag applied (created if absent).
  // Also formalizes colorPresence.
  if (d.schemaVersion < 16) {
    let tags = d.tags || [];
    let tasks = d.tasks || [];
    if (tasks.some((x) => x.kind === "meeting") && !tags.some((tg) => tg.kind === "meeting")) {
      const first = tasks.find((x) => x.kind === "meeting");
      const owner = first.color && tags.find((tg) => tg.color === first.color);
      if (owner) {
        tags = tags.map((tg) => (tg === owner ? { ...tg, kind: "meeting" } : tg));
      } else {
        const used = new Set(tags.map((tg) => tg.color));
        const color = first.color ||
          Array.from({ length: 9 }, (_, i) => `slot:${i}`).find((tok) => !used.has(tok)) ||
          "slot:0";
        tags = [...tags, { color, name: "meeting", kind: "meeting" }];
      }
    }
    const mcolor = tags.find((tg) => tg.kind === "meeting")?.color;
    tasks = tasks.map((x) =>
      x.kind === "meeting" ? { ...x, color: mcolor || x.color, kind: undefined } : x);
    d = {
      ...d,
      schemaVersion: 16,
      tags,
      tasks,
      colorPresence: d.colorPresence || "full",
    };
  }

  return d;
}

// Move every not-done task out of past weeks into the current week (in place,
// not copied). Also tallies a per-week rollout count so past weeks can report
// how many tasks moved on. Idempotent: safe to run on every load.
export function rollIncompletes(data) {
  const cur = currentWeekKey();
  let changed = false;
  const counts = { ...(data.rolloutCounts || {}) };
  const tasks = data.tasks.map((t) => {
    if (t.status !== "done" && t.week && t.week < cur) {
      changed = true;
      counts[t.week] = (counts[t.week] || 0) + 1;
      // per-task age: add the weeks actually skipped, not just one per roll
      // event, so a task untouched across a long absence ages correctly
      const weeksBack = Math.round(
        (new Date(`${cur}T00:00:00`) - new Date(`${t.week}T00:00:00`)) / (7 * 864e5)
      );
      return { ...t, week: cur, rolled: (t.rolled || 0) + weeksBack };
    }
    return t;
  });
  return changed ? { ...data, tasks, rolloutCounts: counts } : data;
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
