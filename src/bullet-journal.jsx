import { useState, useEffect, useCallback, useRef } from "react";
import {
  defaultData,
  migrate,
  rollIncompletes,
  withSampleWeeks,
  currentWeekKey,
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
import { buildTheme, colorToken, presetBg, PRESETS, getPalette } from "./theme.js";
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

  const theme = data ? buildTheme(data.theme) : buildTheme({});

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

  const changeStatus = (id, status) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, status };
        const cur = currentWeekKey();
        if (status !== "done" && next.week < cur) next.week = cur;
        return next;
      }),
    }));

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

  const updateQuestion = (id, field, value) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    }));

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
  const searching = query.trim().length > 0;

  // done section: open by default in past weeks, closed elsewhere; manual
  // toggles per week override the default
  const showDone = doneOpen.has(selectedWeek) ? doneOpen.get(selectedWeek) : isPast;
  const toggleShowDone = () =>
    setDoneOpen((prev) => {
      const next = new Map(prev);
      next.set(selectedWeek, !showDone);
      return next;
    });

  const weekSet = new Set(data.tasks.map((x) => x.week));
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

  const inView = isEverything
    ? data.tasks
    : data.tasks.filter((x) => x.week === selectedWeek);
  const activeTasks = inView.filter((x) => x.status === "active").sort(cmp);
  const holdTasks = inView.filter((x) => x.status === "hold").sort(cmp);
  const doneTasks = inView.filter((x) => x.status === "done");

  const clearDone = () =>
    update((d) => ({
      ...d,
      tasks: d.tasks.filter((x) => {
        if (x.status !== "done") return true;
        return x.week !== selectedWeek;
      }),
    }));

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

  // search results
  const q = query.trim().toLowerCase();
  const taskHits = searching
    ? data.tasks.filter((x) => x.text.toLowerCase().includes(q))
    : [];
  const noteHits = searching
    ? Object.entries(data.weekNotes).filter(([, v]) => v && v.toLowerCase().includes(q))
    : [];
  const scratchpadHit = searching && (data.scratchpad || "").toLowerCase().includes(q);

  const goToWeek = (wk) => { setSelectedWeek(wk); setQuery(""); };

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
    <div className="bj-root">
      <TopBar t={t} fonts={fonts} query={query} setQuery={setQuery}
        searching={searching} selectedWeek={selectedWeek} cur={cur}
        weeksDesc={weeksDesc} goToWeek={goToWeek}
        onOpenSettings={() => setSettingsOpen(true)} />

      {settingsOpen && (
        <SettingsDrawer t={t} fonts={fonts} data={data} fontName={fontName}
          paletteColors={paletteColors} confirmKey={confirmKey}
          onClose={() => setSettingsOpen(false)}
          actions={{
            setThemeKey, applyPreset, selectPalette, setDensity, setBarIntensity, setTaskFont,
            setHeadingFont, setBodyFont, addTag, removeTag, setTagName, setTagColor,
            onFontFile, resetFont, loadSamples, armOrRun,
            restoreFromTrash, deleteForever, emptyTrash, exportData, onImportFile,
          }} />
      )}

      {/* ─── main ─── */}
      <main className="bj-main">
        {searching ? (
          /* ── search results ── */
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
              color: t.text, margin: "0 0 14px", lineHeight: 1.1 }}>
              search · “{query.trim()}”
            </h1>
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
                    <button key={x.id} onClick={() => goToWeek(x.week)}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: "6px", padding: "8px 11px",
                        fontFamily: fonts.body, fontSize: TYPE.body, color: t.text,
                        display: "flex", justifyContent: "space-between", gap: "10px",
                      }}>
                      <span>{x.text}</span>
                      <span style={{ fontFamily: fonts.body, fontSize: TYPE.label,
                        color: t.textMuted, whiteSpace: "nowrap" }}>
                        {x.week === cur ? "this week" : weekLabel(x.week, true)}
                        {x.status === "done" ? " · done" : x.status === "hold" ? " · hold" : ""}
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
              goToWeek(x.week);
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
                {undoBtn("Undo", undo)}
                {undoBtn("Redo", redo)}
                {sortBar}
              </div>
            </div>

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
                  ui={ui} intensity={data.barIntensity || "medium"}
                  isOver={dragEnabled && overId === x.id && dragId !== x.id}
                  onEdit={editTask} onSetColor={setTaskColor}
                  onStatusChange={changeStatus} onDelete={armedDelete}
                  onToggleStar={toggleStar} onCreateTag={createTagInline} onUpdateQuestion={updateQuestion}
                  confirmKey={confirmKey}
                  isQExpanded={expandedQ.has(x.id)} onToggleQ={toggleQ}/>
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
                        ui={ui} intensity={data.barIntensity || "medium"}
                        isOver={dragEnabled && overId === x.id && dragId !== x.id}
                        onEdit={editTask} onSetColor={setTaskColor}
                        onStatusChange={changeStatus} onDelete={armedDelete}
                        onToggleStar={toggleStar} onCreateTag={createTagInline} onUpdateQuestion={updateQuestion}
                        confirmKey={confirmKey}
                        isQExpanded={expandedQ.has(x.id)} onToggleQ={toggleQ}/>
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
                  label={`done (${doneTasks.length})`}
                  extra={!showDone && !isEverything && (
                    <span onClick={(e) => { e.stopPropagation(); clearDone(); }}
                      style={{ fontFamily: fonts.body, fontSize: TYPE.label, marginLeft: "8px", color: t.danger }}
                      title="Clear done in this week">
                      clear
                    </span>
                  )} />
                {showDone && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {doneTasks.map((x) => (
                      <DoneRow key={x.id} task={x} t={t} fonts={fonts} ui={ui}
                        confirmKey={confirmKey}
                        onRestore={(id) => changeStatus(id, "active")}
                        onDelete={armedDelete}/>
                    ))}
                    {!isEverything && (
                      <button onClick={clearDone} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: fonts.body, fontSize: TYPE.body,
                        color: t.danger, padding: "8px 0 0", textAlign: "left",
                      }}>clear done in this week</button>
                    )}
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
