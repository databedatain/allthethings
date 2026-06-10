import { useState, useEffect, useCallback, useRef } from "react";
import {
  defaultData,
  migrate,
  rollIncompletes,
  withSampleWeeks,
  currentWeekKey,
  todayKey,
  weekLabel,
  getDensity,
  MAX_TAGS,
  SCHEMA_VERSION,
} from "./weeks.js";
import {
  loadFont,
  saveFont,
  clearFont,
  applyFont,
  removeFontStyle,
  fontStack,
  loadCatalogFonts,
} from "./font.js";
import { buildTheme, colorToken, resolveColor, rgba, presetBg, PRESETS, getPalette } from "./theme.js";
import { TYPE, SP, CONTROL } from "./tokens.js";
import { TaskRow, DoneRow, AddTaskRow } from "./task-row.jsx";
import TopBar from "./top-bar.jsx";
import SettingsDrawer from "./settings-drawer.jsx";
import NotesView from "./notes-view.jsx";

const STORAGE_KEY = "bullet-journal-data";
// Pre-migration / pre-import safety net: the untouched previous snapshot.
const BACKUP_KEY = "bullet-journal-backup";

/* ─── collapsible section header ─── */
function SectionToggle({ t, fonts, open, onToggle, label, extra }) {
  return (
    <button onClick={onToggle} style={{
      background: "none", border: "none", cursor: "pointer",
      fontFamily: fonts.heading, fontSize: TYPE.heading,
      color: t.textMuted, padding: `0 0 ${SP.sm}px 0`,
      display: "flex", alignItems: "center", gap: "6px",
    }}>
      <span style={{
        display: "inline-block",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}>▸</span>
      {label}
      {extra}
    </button>
  );
}

/* ─── main ─── */
export default function BulletJournal() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({
    text: "", color: null, starred: false, status: "active",
    questionWho: "", questionText: "", showQ: false,
  });
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [doneOpen, setDoneOpen] = useState(() => new Map());
  const [showHold, setShowHold] = useState(true);
  const [expandedQ, setExpandedQ] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey());
  const [fontName, setFontName] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);
  const [burst, setBurst] = useState(null);
  const [spotlightId, setSpotlightId] = useState(null);
  const [showInbox, setShowInbox] = useState(true);
  const burstTimer = useRef(null);
  const spotTimer = useRef(null);
  const saveTimer = useRef(null);
  const inputRef = useRef(null);
  const confirmTimer = useRef(null);
  const history = useRef({ past: [], future: [] });

  // load
  useEffect(() => {
    loadCatalogFonts();
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        const raw = result ? JSON.parse(result.value) : null;
        // about to upgrade an older snapshot — keep its exact bytes recoverable
        if (raw && (raw.schemaVersion || 0) < SCHEMA_VERSION) {
          try { await window.storage.set(BACKUP_KEY, result.value); } catch {}
        }
        setData(rollIncompletes(migrate(raw)));
      } catch {
        setData(defaultData());
      }
      try {
        const f = await loadFont();
        if (f) { applyFont(f.blob); setFontName(f.name); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // save (debounced)
  const save = useCallback((d) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(d)); } catch {}
    }, 400);
  }, []);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      const h = history.current;
      h.past.push(prev);
      if (h.past.length > 80) h.past.shift();
      h.future = [];
      save(next);
      return next;
    });
  }, [save]);

  const undo = useCallback(() => {
    setData((cur) => {
      const h = history.current;
      if (!h.past.length) return cur;
      h.future.unshift(cur);
      const prev = h.past.pop();
      save(prev);
      return prev;
    });
  }, [save]);

  const redo = useCallback(() => {
    setData((cur) => {
      const h = history.current;
      if (!h.future.length) return cur;
      h.past.push(cur);
      const next = h.future.shift();
      save(next);
      return next;
    });
  }, [save]);

  // keyboard undo / redo (ignored while typing in a field) + ESC to close panels
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "Escape") {
        if (settingsOpen) { setSettingsOpen(false); e.preventDefault(); }
        else setExpandedQ((p) => (p.size ? new Set() : p));
        return;
      }
      if (tag === "input" || tag === "textarea") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, settingsOpen]);

  // clicking away from an open detail panel closes it; clicks inside the
  // expanded row (or inside popover overlays) keep it open
  useEffect(() => {
    const onDown = (e) => {
      setExpandedQ((prev) => {
        if (!prev.size) return prev;
        if (e.target.closest?.("[data-bj-keep-open]")) return prev;
        const host = e.target.closest?.("[data-bj-task]");
        if (host && prev.has(Number(host.getAttribute("data-bj-task")))) return prev;
        return new Set();
      });
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const theme = data ? buildTheme(data.theme, data.colorPresence || "full") : buildTheme({});

  // keep the page background in sync with the theme
  useEffect(() => {
    document.body.style.background = theme.bg;
  }, [theme.bg]);

  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const commitDraft = () => {
    const text = draft.text.trim();
    if (!text) return;
    const cur = currentWeekKey();
    const { color, starred, status, questionWho, questionText } = draft;
    update((d) => {
      const maxOrder = d.tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
      return {
        ...d,
        tasks: [...d.tasks, {
          id: d.nextId, text, status, created: Date.now(),
          week: cur, starred, color,
          ...(questionWho ? { questionWho } : {}),
          ...(questionText ? { questionText } : {}),
          order: maxOrder + 1,
        }],
        nextId: d.nextId + 1,
      };
    });
    setDraft({ text: "", color: null, starred: false, status: "active",
      questionWho: "", questionText: "", showQ: false });
    inputRef.current?.focus();
  };

  const changeStatus = (id, status, at) => {
    // celebration is transient UI, fired before the row leaves the list
    if (status === "done" && at) {
      clearTimeout(burstTimer.current);
      setBurst({ key: Date.now(), x: at.x, y: at.y });
      burstTimer.current = setTimeout(() => setBurst(null), 600);
    }
    update((d) => {
      const today = todayKey();
      const target = d.tasks.find((x) => x.id === id);
      let doneLog = d.doneLog || {};
      if (target && status === "done" && target.status !== "done") {
        doneLog = { ...doneLog, [today]: (doneLog[today] || 0) + 1 };
      } else if (target && status !== "done" && target.status === "done") {
        doneLog = { ...doneLog, [today]: Math.max(0, (doneLog[today] || 0) - 1) };
      }
      return {
        ...d,
        doneLog,
        tasks: d.tasks.map((x) => {
          if (x.id !== id) return x;
          const next = { ...x, status };
          const cur = currentWeekKey();
          if (status !== "done" && next.week && next.week < cur) next.week = cur;
          return next;
        }),
      };
    });
  };

  const editTask = (id, text) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, text } : x)),
    }));

  const setTaskColor = (id, color) =>
    update((d) => {
      const token = colorToken(color, getPalette(d.palette).colors);
      return { ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, color: token } : x)) };
    });

  const deleteTask = (id) =>
    update((d) => {
      const task = d.tasks.find((x) => x.id === id);
      if (!task) return d;
      return {
        ...d,
        tasks: d.tasks.filter((x) => x.id !== id),
        trash: [task, ...d.trash].slice(0, 60),
      };
    });

  const restoreFromTrash = (id) =>
    update((d) => {
      const task = d.trash.find((x) => x.id === id);
      if (!task) return d;
      return {
        ...d,
        trash: d.trash.filter((x) => x.id !== id),
        tasks: [...d.tasks, task],
      };
    });

  const deleteForever = (id) =>
    update((d) => ({ ...d, trash: d.trash.filter((x) => x.id !== id) }));

  const emptyTrash = () => update((d) => ({ ...d, trash: [] }));

  // two-step confirm: first click arms `key`, second click within 3s runs it
  const armOrRun = (key, action) => {
    clearTimeout(confirmTimer.current);
    if (confirmKey === key) {
      setConfirmKey(null);
      action();
    } else {
      setConfirmKey(key);
      confirmTimer.current = setTimeout(() => setConfirmKey(null), 3000);
    }
  };
  const armedDelete = (id) => armOrRun(`del:${id}`, () => deleteTask(id));

  // quick capture: no week, no tag, no decisions — triage later
  const addToInbox = (text) =>
    update((d) => {
      const maxOrder = d.tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
      return {
        ...d,
        tasks: [...d.tasks, {
          id: d.nextId, text, status: "active", created: Date.now(),
          week: null, starred: false, color: null, order: maxOrder + 1,
        }],
        nextId: d.nextId + 1,
      };
    });

  // today's focus: up to three task ids, stamped with today — a stale stamp
  // simply reads as empty, so the strip resets itself each morning
  const toggleFocus = (id) =>
    update((d) => {
      const today = todayKey();
      const ids = d.focus?.date === today ? d.focus.ids : [];
      const next = ids.includes(id) ? ids.filter((x) => x !== id)
        : ids.length >= 3 ? ids : [...ids, id];
      if (next === ids) return d;
      return { ...d, focus: { date: today, ids: next } };
    });

  const toggleStar = (id) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, starred: !x.starred } : x)),
    }));

  const setWeekNote = (key, notes) =>
    update((d) => ({ ...d, weekNotes: { ...d.weekNotes, [key]: notes } }));

  const setScratchpad = (text) => update((d) => ({ ...d, scratchpad: text }));

  const setSortMode = (mode) => update((d) => ({ ...d, sortMode: mode }));
  // click the date control: switch to date sort, or flip direction if already on it
  const clickDateSort = () =>
    update((d) => d.sortMode !== "date"
      ? { ...d, sortMode: "date" }
      : { ...d, sortOrder: d.sortOrder === "oldest" ? "newest" : "oldest" });

  const setThemeKey = (key, value) =>
    update((d) => ({ ...d, theme: { ...d.theme, [key]: value } }));

  const presetTheme = (base, p) => {
    const pb = presetBg(p.highlight);
    return {
      ...base,
      highlight: p.highlight, star: p.star, hold: p.hold,
      bgLight: pb.light, bgDark: pb.dark,
    };
  };

  const applyPreset = (p) =>
    update((d) => ({ ...d, theme: presetTheme(d.theme, p) }));

  const selectPalette = (id) =>
    update((d) => {
      // Recover any literal hex that matches the palette we're *leaving*: it was
      // almost certainly a palette pick that got frozen as a literal (picked
      // under old code, or migrated while a different palette was active). Re-
      // tokenising it against the outgoing palette lets it shift from here on.
      const out = getPalette(d.palette).colors;
      const fix = (c) =>
        typeof c === "string" && !c.startsWith("slot:") ? colorToken(c, out) : c;
      const tags = (d.tags || []).map((t) => ({ ...t, color: fix(t.color) }));
      const tasks = d.tasks.map((x) => ({ ...x, color: fix(x.color) }));
      const trash = (d.trash || []).map((x) => ({ ...x, color: fix(x.color) }));
      const first = PRESETS.find((p) => p.palette === id);
      return {
        ...d,
        tags, tasks, trash,
        palette: id,
        theme: first ? presetTheme(d.theme, first) : d.theme,
      };
    });

  const setDensity = (id) =>
    update((d) => ({ ...d, density: id, taskFont: getDensity(id).taskFont }));

  const setBarIntensity = (id) => update((d) => ({ ...d, barIntensity: id }));
  const setColorPresence = (id) => update((d) => ({ ...d, colorPresence: id }));
  const setWrapText = (on) => update((d) => ({ ...d, wrapText: !!on }));
  const setCompactRows = (id) => update((d) => ({ ...d, compactRows: id }));

  const setTaskFont = (value) => update((d) => ({ ...d, taskFont: value }));

  const setHeadingFont = (id) => update((d) => ({ ...d, headingFont: id }));
  const setBodyFont = (id) => update((d) => ({ ...d, bodyFont: id }));

  // tag editor: add, rename, recolor (propagating to tagged tasks), remove
  const addTag = () =>
    update((d) => {
      if ((d.tags?.length || 0) >= MAX_TAGS) return d;
      const used = new Set((d.tags || []).map((t) => t.color));
      const pal = getPalette(d.palette).colors;
      // pick the first palette slot not already taken by a tag
      const color = pal.map((_, i) => `slot:${i}`).find((tok) => !used.has(tok)) || "slot:0";
      return { ...d, tags: [...(d.tags || []), { color, name: "" }] };
    });
  const removeTag = (color) =>
    update((d) => ({ ...d, tags: (d.tags || []).filter((t) => t.color !== color) }));
  const setTagName = (color, name) =>
    update((d) => ({
      ...d,
      tags: (d.tags || []).map((t) => (t.color === color ? { ...t, name } : t)),
    }));
  const setTagColor = (oldColor, newColor) =>
    update((d) => {
      const token = colorToken(newColor, getPalette(d.palette).colors);
      return {
        ...d,
        tags: (d.tags || []).map((t) =>
          t.color === oldColor ? { ...t, color: token } : t
        ),
        tasks: d.tasks.map((x) =>
          x.color === oldColor ? { ...x, color: token } : x
        ),
      };
    });
  // inline naming from the per-task colour popover: creates a new tag
  const createTagInline = (color, name) =>
    update((d) => {
      if ((d.tags?.length || 0) >= MAX_TAGS) return d;
      const token = colorToken(color, getPalette(d.palette).colors);
      if ((d.tags || []).some((t) => t.color === token)) return d;
      return { ...d, tags: [...(d.tags || []), { color: token, name }] };
    });

  const loadSamples = () => update((d) => rollIncompletes(withSampleWeeks(d)));

  const toggleQ = (id) =>
    setExpandedQ((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const patchTask = (id, patch) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const addSubtask = (taskId, text) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === taskId
        ? { ...x, subtasks: [...(x.subtasks || []), { id: d.nextId, text, done: false }] }
        : x)),
      nextId: d.nextId + 1,
    }));

  const patchSubtask = (taskId, subId, patch) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === taskId
        ? { ...x, subtasks: (x.subtasks || []).map((s) => (s.id === subId ? { ...s, ...patch } : s)) }
        : x)),
    }));

  const removeSubtask = (taskId, subId) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === taskId
        ? { ...x, subtasks: (x.subtasks || []).filter((s) => s.id !== subId) }
        : x)),
    }));

  // meeting-ness rides on the meeting tag: turning it on applies that tag
  // (creating one on first use); turning it off just unTags the task
  const setMeeting = (taskId, on) =>
    update((d) => {
      if (!on) {
        return { ...d, tasks: d.tasks.map((x) => (x.id === taskId ? { ...x, color: null } : x)) };
      }
      let tags = d.tags || [];
      let mtag = tags.find((tg) => tg.kind === "meeting");
      if (!mtag) {
        const used = new Set(tags.map((tg) => tg.color));
        const pal = getPalette(d.palette).colors;
        const color = pal.map((_, i) => `slot:${i}`).find((tok) => !used.has(tok)) || "slot:0";
        mtag = { color, name: "meeting", kind: "meeting" };
        tags = [...tags, mtag];
      }
      return {
        ...d,
        tags,
        tasks: d.tasks.map((x) => (x.id === taskId
          ? { ...x, color: mtag.color, meeting: x.meeting || { attendees: "" } }
          : x)),
      };
    });

  const setTagKind = (color, kind) =>
    update((d) => ({
      ...d,
      tags: (d.tags || []).map((tg) =>
        tg.color === color ? { ...tg, kind: kind || undefined } : tg),
    }));

  // a meeting action item (or any sub-step) graduates into a real task in the
  // current week, inheriting the parent's colour — one update, one undo step
  const promoteSubtask = (taskId, subId) =>
    update((d) => {
      const parent = d.tasks.find((x) => x.id === taskId);
      const sub = parent?.subtasks?.find((s) => s.id === subId);
      if (!sub || !sub.text.trim()) return d;
      const maxOrder = d.tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
      return {
        ...d,
        tasks: d.tasks
          .map((x) => (x.id === taskId
            ? { ...x, subtasks: x.subtasks.filter((s) => s.id !== subId) }
            : x))
          .concat({
            id: d.nextId, text: sub.text.trim(), status: "active",
            created: Date.now(), week: currentWeekKey(), starred: false,
            color: parent.color ?? null, order: maxOrder + 1,
          }),
        nextId: d.nextId + 1,
      };
    });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bullet-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (!raw || !Array.isArray(raw.tasks)) return;
      // the data being replaced stays recoverable under the backup key
      try { await window.storage.set(BACKUP_KEY, JSON.stringify(data)); } catch {}
      update(() => rollIncompletes(migrate(raw)));
    } catch {}
  };

  const onFontFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = new Blob([await file.arrayBuffer()]);
      await saveFont(blob, file.name);
      applyFont(blob);
      setFontName(file.name);
    } catch {}
  };

  const resetFont = async () => {
    try { await clearFont(); } catch {}
    removeFontStyle();
    setFontName(null);
  };

  if (loading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0",
        fontFamily: "'Caveat', cursive", fontSize: TYPE.title, color: "#999" }}>
        loading journal…
      </div>
    );
  }

  const t = theme;
  const paletteColors = getPalette(data.palette).colors;

  // density-preset metrics + element sizes scaled to the text size
  const density = getDensity(data.density);
  const sc = data.taskFont / 16;
  const px = (n) => Math.round(n * sc);
  const ui = {
    taskGap: density.taskGap,
    padY: density.padY,
    padX: density.padX,
    btnPad: density.btnPad,
    taskFont: data.taskFont,
    checkbox: px(20),
    swatch: px(20),
    innerCheck: px(12),
    doneCheck: px(13),
    star: px(18),
    icon: px(16),
    grip: px(17),
    date: px(16),
    qLabel: px(14),
    qInput: px(15),
  };
  const fonts = {
    heading: fontStack(data.headingFont, !!fontName),
    body: fontStack(data.bodyFont, !!fontName),
  };

  const cur = currentWeekKey();
  const isEverything = selectedWeek === "everything";
  const isNotes = selectedWeek === "notes";
  const isCurrent = selectedWeek === cur;
  const isPast = !isCurrent && !isEverything && !isNotes;
  const canAdd = isCurrent || isEverything;
  const searching = query.trim().length > 0 || !!tagFilter;

  // done section: open by default in past weeks, closed elsewhere; manual
  // toggles per week override the default
  const showDone = doneOpen.has(selectedWeek) ? doneOpen.get(selectedWeek) : isPast;
  const toggleShowDone = () =>
    setDoneOpen((prev) => {
      const next = new Map(prev);
      next.set(selectedWeek, !showDone);
      return next;
    });

  const weekSet = new Set(data.tasks.filter((x) => x.week).map((x) => x.week));
  weekSet.add(cur);
  const weeksDesc = [...weekSet].sort().reverse();

  const byMode = (a, b) =>
    data.sortMode === "custom"
      ? (a.order ?? 0) - (b.order ?? 0)
      : data.sortOrder === "oldest"
      ? a.created - b.created
      : b.created - a.created;
  const cmp = (a, b) => {
    if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
    return byMode(a, b);
  };

  const inboxTasks = data.tasks.filter((x) => !x.week);
  const focusIds = data.focus?.date === todayKey() ? data.focus.ids : [];
  const focusSet = new Set(canAdd ? focusIds : []);
  const focusTasks = focusIds
    .map((id) => data.tasks.find((x) => x.id === id))
    .filter(Boolean);

  const inView = isEverything
    ? data.tasks.filter((x) => x.week)
    : data.tasks.filter((x) => x.week === selectedWeek);
  const activeTasks = inView.filter((x) => x.status === "active" && !focusSet.has(x.id)).sort(cmp);
  const holdTasks = inView.filter((x) => x.status === "hold" && !focusSet.has(x.id)).sort(cmp);
  const doneTasks = inView.filter((x) => x.status === "done" && !focusSet.has(x.id));
  const doneToday = (data.doneLog || {})[todayKey()] || 0;

  // decision paralysis breaker: chance picks, the ring shows where it landed
  const pickForMe = () => {
    const pool = [...focusTasks.filter((x) => x.status === "active"), ...activeTasks];
    if (!pool.length) return;
    const x = pool[Math.floor(Math.random() * pool.length)];
    clearTimeout(spotTimer.current);
    setSpotlightId(x.id);
    spotTimer.current = setTimeout(() => setSpotlightId(null), 3000);
    requestAnimationFrame(() =>
      document.getElementById(`bj-task-${x.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  // drag reorder within whichever list (active or hold) holds both rows
  const dragEnabled = data.sortMode === "custom" && !searching;
  const handleDrop = (targetId) => {
    if (dragId == null || dragId === targetId) return;
    const list = [activeTasks, holdTasks].find(
      (L) => L.some((x) => x.id === targetId) && L.some((x) => x.id === dragId)
    );
    if (!list) return;
    const ids = list.map((x) => x.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) =>
        orderMap.has(x.id) ? { ...x, order: orderMap.get(x.id) } : x
      ),
    }));
    setDragId(null);
    setOverId(null);
  };
  const drag = {
    enabled: dragEnabled,
    onStart: setDragId,
    onOver: setOverId,
    onDrop: handleDrop,
    onEnd: () => { setDragId(null); setOverId(null); },
  };

  // search results — typed text and/or a tag-chip filter (they AND together).
  // A tag's name also matches its tasks, so typing "meeting" finds the tagged.
  const q = query.trim().toLowerCase();
  const namedTags = (data.tags || []).filter((tg) => tg.name?.trim());
  const tagName = (c) => namedTags.find((tg) => tg.color === c)?.name || "";
  const taskHits = searching
    ? data.tasks.filter((x) => {
        if (tagFilter && x.color !== tagFilter) return false;
        if (!q) return true;
        return (
          x.text.toLowerCase().includes(q) ||
          (x.note || "").toLowerCase().includes(q) ||
          (x.questionWho || "").toLowerCase().includes(q) ||
          (x.questionText || "").toLowerCase().includes(q) ||
          (x.meeting?.attendees || "").toLowerCase().includes(q) ||
          (x.subtasks || []).some((s) => s.text.toLowerCase().includes(q))
        );
      })
    : [];
  const noteHits = q && !tagFilter
    ? Object.entries(data.weekNotes).filter(([, v]) => v && v.toLowerCase().includes(q))
    : [];
  const scratchpadHit = q.length > 0 && !tagFilter &&
    (data.scratchpad || "").toLowerCase().includes(q);

  const goToWeek = (wk) => { setSelectedWeek(wk); setQuery(""); setTagFilter(null); };

  // detail-panel handlers bundled for DoneRow's in-place panel
  const panelProps = {
    onSetMeeting: setMeeting, onPatch: patchTask, onAddSubtask: addSubtask,
    onPatchSubtask: patchSubtask, onRemoveSubtask: removeSubtask,
    onPromoteSubtask: promoteSubtask,
  };

  /* ── shared style helpers ── */
  const sortBtn = (active) => ({
    background: "none", border: "none", cursor: "pointer", padding: "2px 0",
    fontFamily: fonts.body, fontSize: TYPE.body,
    color: active ? t.accentText2 : t.textFaint,
    fontWeight: active ? 600 : 400,
  });

  const sortBar = (activeTasks.length + holdTasks.length) > 1 && (
    <div style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
      <button onClick={() => setSortMode("custom")}
        style={sortBtn(data.sortMode === "custom")}>
        ⠿ custom
      </button>
      <button onClick={clickDateSort}
        title="Sort by date — click again to flip"
        style={sortBtn(data.sortMode === "date")}>
        {data.sortOrder === "oldest" ? "↑ oldest first" : "↓ newest first"}
      </button>
    </div>
  );

  const undoBtn = (label, fn) => (
    <button onClick={fn} title={label}
      style={{
        width: CONTROL.h, height: CONTROL.h, borderRadius: CONTROL.radius,
        border: `1px solid ${t.border}`, background: t.surface,
        cursor: "pointer", color: t.textMuted, fontSize: TYPE.body,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{label === "Undo" ? "↶" : "↷"}</button>
  );

  return (
    <div className={`bj-root bj-compact-${data.compactRows || "auto"}`}>
      <TopBar t={t} fonts={fonts} query={query} setQuery={setQuery}
        searching={searching} selectedWeek={selectedWeek} cur={cur}
        weeksDesc={weeksDesc} goToWeek={goToWeek}
        inboxCount={inboxTasks.length} onCapture={addToInbox}
        tagOptions={namedTags.map((tg) => ({ ...tg, hex: resolveColor(tg.color, paletteColors) }))}
        tagFilter={tagFilter} onTagFilter={setTagFilter}
        onOpenSettings={() => setSettingsOpen(true)} />

      {settingsOpen && (
        <SettingsDrawer t={t} fonts={fonts} data={data} fontName={fontName}
          paletteColors={paletteColors} confirmKey={confirmKey}
          onClose={() => setSettingsOpen(false)}
          actions={{
            setThemeKey, applyPreset, selectPalette, setDensity, setBarIntensity, setColorPresence, setWrapText, setCompactRows, setTaskFont,
            setHeadingFont, setBodyFont, addTag, removeTag, setTagName, setTagColor, setTagKind,
            onFontFile, resetFont, loadSamples, armOrRun,
            restoreFromTrash, deleteForever, emptyTrash, exportData, onImportFile,
          }} />
      )}

      {burst && (
        <span key={burst.key} className="bj-burst"
          style={{ left: burst.x, top: burst.y }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <span key={a} style={{ "--a": `${a}deg`, background: t.celebrate }} />
          ))}
        </span>
      )}

      {/* ─── main ─── */}
      <main className="bj-main">
        {searching ? (
          /* ── search results ── */
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
              color: t.text, margin: "0 0 14px", lineHeight: 1.1 }}>
              search{q ? <> · “{query.trim()}”</> : tagFilter ? <> · {tagName(tagFilter) || "tag"}</> : null}
            </h1>
            {namedTags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                {namedTags.map((tg) => {
                  const hex = resolveColor(tg.color, paletteColors);
                  const active = tagFilter === tg.color;
                  return (
                    <button key={tg.color}
                      onClick={() => setTagFilter(active ? null : tg.color)}
                      title={active ? "Clear tag filter" : `Only ${tg.name}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        fontFamily: fonts.body, fontSize: TYPE.label,
                        padding: "3px 10px", borderRadius: CONTROL.pill, cursor: "pointer",
                        border: `1px solid ${active ? hex : t.border}`,
                        background: active ? rgba(hex, t.dark ? 0.28 : 0.16) : "transparent",
                        color: active ? t.text : t.textMuted,
                        fontWeight: active ? 600 : 400,
                      }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%",
                        background: hex, flexShrink: 0 }} />
                      {tg.name}
                    </button>
                  );
                })}
              </div>
            )}
            {taskHits.length === 0 && noteHits.length === 0 && !scratchpadHit && (
              <div style={{ fontFamily: fonts.heading, fontSize: TYPE.heading, color: t.textFaint }}>
                no matches
              </div>
            )}
            {taskHits.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: fonts.heading, fontSize: TYPE.heading,
                  color: t.textMuted, marginBottom: "6px" }}>
                  tasks ({taskHits.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {taskHits.map((x) => (
                    <button key={x.id} onClick={() => goToWeek(x.week || cur)}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: "6px", padding: "8px 11px",
                        fontFamily: fonts.body, fontSize: TYPE.body, color: t.text,
                        display: "flex", justifyContent: "space-between", gap: "10px",
                      }}>
                      <span>{x.text}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: TYPE.label,
                        color: t.textMuted, whiteSpace: "nowrap", display: "flex",
                        alignItems: "center", gap: "6px" }}>
                        {tagName(x.color) && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%",
                              background: resolveColor(x.color, paletteColors), flexShrink: 0 }} />
                            {tagName(x.color)}
                          </span>
                        )}
                        <span>
                          {!x.week ? "inbox" : x.week === cur ? "this week" : weekLabel(x.week, true)}
                          {x.status === "done" ? " · done" : x.status === "hold" ? " · hold" : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(noteHits.length > 0 || scratchpadHit) && (
              <div>
                <div style={{ fontFamily: fonts.heading, fontSize: TYPE.heading,
                  color: t.textMuted, marginBottom: "6px" }}>
                  notes ({noteHits.length + (scratchpadHit ? 1 : 0)})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {scratchpadHit && (
                    <button onClick={() => goToWeek("notes")}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: "6px", padding: "8px 11px",
                        fontFamily: fonts.body, fontSize: TYPE.body, color: t.textMuted,
                      }}>
                      <span style={{ fontFamily: fonts.body, fontSize: TYPE.body,
                        color: t.text }}>scratchpad</span>
                      {" — "}
                      {data.scratchpad.length > 90 ? data.scratchpad.slice(0, 90) + "…" : data.scratchpad}
                    </button>
                  )}
                  {noteHits.map(([wk, text]) => (
                    <button key={wk} onClick={() => goToWeek(wk)}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: "6px", padding: "8px 11px",
                        fontFamily: fonts.body, fontSize: TYPE.body, color: t.textMuted,
                      }}>
                      <span style={{ fontFamily: fonts.body, fontSize: TYPE.body,
                        color: t.text }}>
                        {wk === cur ? "this week" : weekLabel(wk, true)}
                      </span>
                      {" — "}
                      {text.length > 90 ? text.slice(0, 90) + "…" : text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isNotes ? (
          <NotesView data={data} t={t} fonts={fonts}
            onSetScratchpad={setScratchpad} goToWeek={goToWeek}
            onOpenTask={(x) => {
              goToWeek(x.week || cur);
              setExpandedQ((prev) => new Set(prev).add(x.id));
            }} />
        ) : (
          <>
            {/* header + undo/redo + inline add-task */}
            <div style={{
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              gap: "16px", flexWrap: "wrap", marginBottom: "14px",
            }}>
              {isEverything ? (
                <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
                  color: t.text, margin: 0, lineHeight: 1.1 }}>everything</h1>
              ) : (
                <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
                  color: t.text, margin: 0, lineHeight: 1.1,
                  display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  {isCurrent ? "this week" : weekLabel(selectedWeek, true)}
                  <span style={{ fontFamily: fonts.heading, fontSize: TYPE.heading,
                    color: t.textMuted, fontWeight: 400 }}>
                    {isCurrent ? weekLabel(selectedWeek) : "· past week"}
                  </span>
                </h1>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {doneToday > 0 && (
                  <span key={doneToday} className="bj-pop" title="Completed today"
                    style={{ fontFamily: fonts.body, fontSize: TYPE.body,
                      color: t.accentText2, fontWeight: 600, whiteSpace: "nowrap" }}>
                    ✓ {doneToday} today
                  </span>
                )}
                {(activeTasks.length + focusTasks.length) > 1 && (
                  <button onClick={pickForMe} title="Can't choose? Let chance pick one"
                    style={sortBtn(false)}>
                    🎲 pick
                  </button>
                )}
                {undoBtn("Undo", undo)}
                {undoBtn("Redo", redo)}
                {sortBar}
              </div>
            </div>

            {/* inbox — captured thoughts waiting for a home */}
            {canAdd && inboxTasks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <SectionToggle t={t} fonts={fonts} open={showInbox}
                  onToggle={() => setShowInbox(!showInbox)}
                  label={`inbox (${inboxTasks.length})`} />
                {showInbox && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {inboxTasks.map((x) => (
                      <div key={x.id} className="bj-row" style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: `${ui.padY}px ${ui.padX + 6}px`,
                        borderRadius: "6px", border: `1px dashed ${t.border}`,
                        background: t.rowBase,
                      }}>
                        <span style={{ flex: 1, fontFamily: fonts.body,
                          fontSize: `${ui.taskFont}px`, color: t.text }}>{x.text}</span>
                        <button onClick={() => patchTask(x.id, { week: cur })}
                          title="Move into this week"
                          style={{ background: "none", border: "none", cursor: "pointer",
                            fontFamily: fonts.body, fontSize: TYPE.label,
                            color: t.question, whiteSpace: "nowrap", padding: "2px 4px" }}>
                          → this week
                        </button>
                        <button onClick={() => armedDelete(x.id)}
                          title={confirmKey === `del:${x.id}` ? "Click again to remove" : "Move to trash"}
                          className={`bj-row-action${confirmKey === `del:${x.id}` ? " is-armed" : ""}`}
                          style={{ background: "none", border: "none", cursor: "pointer",
                            padding: "3px", color: confirmKey === `del:${x.id}` ? t.danger : t.textFaint,
                            display: "flex", alignItems: "center", fontFamily: fonts.body,
                            fontSize: confirmKey === `del:${x.id}` ? TYPE.caption : undefined,
                            fontWeight: confirmKey === `del:${x.id}` ? 700 : undefined }}>
                          {confirmKey === `del:${x.id}` ? "sure?" : "✕"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* today's focus — up to three, reset each morning */}
            {canAdd && focusTasks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  fontFamily: fonts.heading, fontSize: TYPE.heading,
                  color: t.textMuted, paddingBottom: SP.sm,
                }}>
                  ◎ today&apos;s focus
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: `${ui.taskGap}px` }}>
                  {focusTasks.map((x) => x.status === "done" ? (
                    <DoneRow key={x.id} task={x} t={t} fonts={fonts} ui={ui}
                      tags={data.tags} confirmKey={confirmKey} wrapText={!!data.wrapText}
                      onRestore={(id) => changeStatus(id, "active")}
                      onDelete={armedDelete}
                      isExpanded={expandedQ.has(x.id)} onToggleDetail={toggleQ}
                      panelProps={panelProps}/>
                  ) : (
                    <TaskRow key={x.id} task={x} t={t} fonts={fonts} colors={paletteColors} tags={data.tags} drag={drag}
                      ui={ui} intensity={data.barIntensity || "medium"} wrapText={!!data.wrapText}
                      isOver={false}
                      onEdit={editTask} onSetColor={setTaskColor}
                      onStatusChange={changeStatus} onDelete={armedDelete}
                      onToggleStar={toggleStar} onCreateTag={createTagInline}
                      onPatch={patchTask} onAddSubtask={addSubtask}
                      onPatchSubtask={patchSubtask} onRemoveSubtask={removeSubtask}
                      onPromoteSubtask={promoteSubtask} onSetMeeting={setMeeting}
                      confirmKey={confirmKey}
                      isExpanded={expandedQ.has(x.id)} onToggleDetail={toggleQ}
                      isFocused onToggleFocus={toggleFocus}
                      isSpotlit={spotlightId === x.id}/>
                  ))}
                </div>
              </div>
            )}

            {/* active tasks */}
            <div style={{ display: "flex", flexDirection: "column",
              gap: `${ui.taskGap}px`, marginBottom: "16px" }}>
              {canAdd && (
                <AddTaskRow t={t} fonts={fonts} colors={paletteColors} tags={data.tags}
                  ui={ui} intensity={data.barIntensity || "medium"} draft={draft} onChange={updateDraft} onCommit={commitDraft}
                  onReset={() => setDraft({ text: "", color: null, starred: false,
                    status: "active", questionWho: "", questionText: "", showQ: false })}
                  onCreateTag={createTagInline} inputRef={inputRef}
                  dragEnabled={dragEnabled}/>
              )}
              {activeTasks.length === 0 && holdTasks.length === 0 && !canAdd && (
                <div style={{
                  textAlign: "center", padding: "30px 0",
                  fontFamily: fonts.heading, fontSize: TYPE.title, color: t.textFaint,
                }}>
                  {(data.rolloutCounts?.[selectedWeek] || 0) > 0
                    ? `${data.rolloutCounts[selectedWeek]} task${data.rolloutCounts[selectedWeek] === 1 ? "" : "s"} rolled forward`
                    : "no open tasks this week"}
                </div>
              )}
              {activeTasks.map((x) => (
                <TaskRow key={x.id} task={x} t={t} fonts={fonts} colors={paletteColors} tags={data.tags} drag={drag}
                  ui={ui} intensity={data.barIntensity || "medium"} wrapText={!!data.wrapText}
                  isOver={dragEnabled && overId === x.id && dragId !== x.id}
                  onEdit={editTask} onSetColor={setTaskColor}
                  onStatusChange={changeStatus} onDelete={armedDelete}
                  onToggleStar={toggleStar} onCreateTag={createTagInline}
                  onPatch={patchTask} onAddSubtask={addSubtask}
                  onPatchSubtask={patchSubtask} onRemoveSubtask={removeSubtask}
                  onPromoteSubtask={promoteSubtask} onSetMeeting={setMeeting}
                  confirmKey={confirmKey}
                  isExpanded={expandedQ.has(x.id)} onToggleDetail={toggleQ}
                  isFocused={focusSet.has(x.id)}
                  onToggleFocus={canAdd ? toggleFocus : undefined}
                  isSpotlit={spotlightId === x.id}/>
              ))}
            </div>

            {/* on-hold section */}
            {holdTasks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <SectionToggle t={t} fonts={fonts} open={showHold}
                  onToggle={() => setShowHold(!showHold)}
                  label={`on hold (${holdTasks.length})`} />
                {showHold && (
                  <div style={{ display: "flex", flexDirection: "column",
                    gap: `${ui.taskGap}px` }}>
                    {holdTasks.map((x) => (
                      <TaskRow key={x.id} task={x} t={t} fonts={fonts} colors={paletteColors} tags={data.tags} drag={drag}
                        ui={ui} intensity={data.barIntensity || "medium"} wrapText={!!data.wrapText}
                        isOver={dragEnabled && overId === x.id && dragId !== x.id}
                        onEdit={editTask} onSetColor={setTaskColor}
                        onStatusChange={changeStatus} onDelete={armedDelete}
                        onToggleStar={toggleStar} onCreateTag={createTagInline}
                        onPatch={patchTask} onAddSubtask={addSubtask}
                        onPatchSubtask={patchSubtask} onRemoveSubtask={removeSubtask}
                        onPromoteSubtask={promoteSubtask} onSetMeeting={setMeeting}
                        confirmKey={confirmKey}
                        isExpanded={expandedQ.has(x.id)} onToggleDetail={toggleQ}
                        isFocused={focusSet.has(x.id)}
                        onToggleFocus={canAdd ? toggleFocus : undefined}
                        isSpotlit={spotlightId === x.id}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* done section */}
            {doneTasks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <SectionToggle t={t} fonts={fonts} open={showDone}
                  onToggle={toggleShowDone}
                  label={`done (${doneTasks.length})`} />
                {showDone && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {doneTasks.map((x) => (
                      <DoneRow key={x.id} task={x} t={t} fonts={fonts} ui={ui}
                        tags={data.tags} confirmKey={confirmKey} wrapText={!!data.wrapText}
                        onRestore={(id) => changeStatus(id, "active")}
                        onDelete={armedDelete}
                        isExpanded={expandedQ.has(x.id)} onToggleDetail={toggleQ}
                        panelProps={panelProps}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* notes (per week) */}
            {!isEverything && (
              <>
                <div style={{ borderTop: `1px dashed ${t.divider}`, margin: "0 0 12px" }} />
                <div>
                  <label style={{
                    fontFamily: fonts.heading, fontSize: TYPE.title, color: t.textMuted,
                    display: "block", marginBottom: "6px",
                  }}>notes</label>
                  <textarea
                    value={data.weekNotes[selectedWeek] || ""}
                    onChange={(e) => setWeekNote(selectedWeek, e.target.value)}
                    placeholder="jot anything down…"
                    rows={5}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "6px",
                      border: `1px solid ${t.border}`, background: t.surfaceAlt,
                      fontFamily: fonts.body, fontSize: TYPE.body,
                      color: t.text, outline: "none", resize: "vertical",
                      lineHeight: 1.6, boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
