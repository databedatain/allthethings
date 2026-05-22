import { useState, useEffect, useCallback, useRef } from "react";
import {
  defaultData,
  migrate,
  rollIncompletes,
  withSampleWeeks,
  currentWeekKey,
  weekLabel,
} from "./weeks.js";
import {
  loadFont,
  saveFont,
  clearFont,
  applyFont,
  removeFontStyle,
} from "./font.js";
import { buildTheme } from "./theme.js";
import ColorPicker from "./color-picker.jsx";

const STORAGE_KEY = "bullet-journal-data";

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  return `${mo} ${d.getDate()}`;
};

/* ─── tiny icons ─── */
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
    <rect x="8.5" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
  </svg>
);
const IconPlus = () => (
  <svg width="19" height="19" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 6.5v3M8 6.5v3M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUndo = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
    <path d="M3 5.5h5a3 3 0 010 6H6M3 5.5L5.5 3M3 5.5L5.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconQuestion = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 5.5a1.5 1.5 0 012.9.5c0 1-1.4 1-1.4 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
  </svg>
);
const IconStar = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
    <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.6l1.4-6.3L2.9 9l6.4-.6z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconGrip = () => (
  <svg width="11" height="17" viewBox="0 0 11 17" fill="currentColor">
    <circle cx="3.5" cy="3" r="1.5"/><circle cx="7.5" cy="3" r="1.5"/>
    <circle cx="3.5" cy="8.5" r="1.5"/><circle cx="7.5" cy="8.5" r="1.5"/>
    <circle cx="3.5" cy="14" r="1.5"/><circle cx="7.5" cy="14" r="1.5"/>
  </svg>
);

/* ─── task row ─── */
function TaskRow({ task, t, fonts, drag, isOver, onStatusChange, onDelete, onToggleStar, onUpdateQuestion, isQExpanded, onToggleQ }) {
  const isHold = task.status === "hold";
  const isStar = !!task.starred;
  const hasQ = task.questionWho || task.questionText;

  const bg = isStar ? t.starTint : isHold ? t.holdTint : t.surface;
  const border = isStar
    ? `1px solid ${t.starBorder}`
    : isHold
    ? `1px dashed ${t.holdBorder}`
    : `1px solid ${t.border}`;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        draggable={drag.enabled}
        onDragStart={() => drag.onStart(task.id)}
        onDragOver={(e) => { if (drag.enabled) { e.preventDefault(); drag.onOver(task.id); } }}
        onDrop={(e) => { if (drag.enabled) { e.preventDefault(); drag.onDrop(task.id); } }}
        onDragEnd={() => drag.onEnd()}
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "7px 10px", borderRadius: isQExpanded ? "6px 6px 0 0" : "6px",
          background: bg, border, borderBottom: isQExpanded ? "none" : undefined,
          borderTop: isOver ? `2px solid ${t.accent}` : border.startsWith("1px dashed") ? border : undefined,
          transition: "background 0.15s ease",
        }}>
        {/* drag handle */}
        {drag.enabled && (
          <span style={{ color: t.textFaint, cursor: "grab", display: "flex", flexShrink: 0 }}>
            <IconGrip />
          </span>
        )}

        {/* checkbox / done */}
        <button onClick={() => onStatusChange(task.id, "done")} title="Mark done"
          style={{
            width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer",
            border: `1.5px solid ${t.accent}`, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.accent, flexShrink: 0, padding: 0,
          }}>
          <span style={{ opacity: 0.28 }}><IconCheck /></span>
        </button>

        {/* text */}
        <span style={{
          flex: 1, fontFamily: fonts.body, fontSize: "18px",
          color: isHold ? t.holdText : t.text, lineHeight: 1.35,
          fontStyle: isHold ? "italic" : "normal",
        }}>
          {task.text}
          {isHold && <span style={{ fontSize: "13px", marginLeft: "8px", opacity: 0.7 }}>⏸ on hold</span>}
        </span>

        {/* date */}
        <span style={{
          fontFamily: fonts.heading, fontSize: "16px",
          color: t.textMuted, flexShrink: 0, whiteSpace: "nowrap",
        }}>{formatDate(task.created)}</span>

        {/* star toggle */}
        <button onClick={() => onToggleStar(task.id)} title={isStar ? "Unstar" : "Star"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "3px",
            color: isStar ? t.star : t.textFaint, display: "flex", alignItems: "center",
          }}>
          <IconStar filled={isStar} />
        </button>

        {/* question toggle */}
        <button onClick={() => onToggleQ(task.id)}
          title={isQExpanded ? "Collapse question" : "Add/view question"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "3px",
            color: hasQ ? t.question : t.textFaint, display: "flex", alignItems: "center",
          }}>
          <IconQuestion />
        </button>

        {/* hold toggle */}
        <button onClick={() => onStatusChange(task.id, isHold ? "active" : "hold")}
          title={isHold ? "Resume" : "Put on hold"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "3px",
            color: isHold ? t.holdText : t.textFaint, display: "flex", alignItems: "center",
          }}>
          {isHold ? <IconUndo /> : <IconPause />}
        </button>

        {/* delete */}
        <button onClick={() => onDelete(task.id)} title="Remove"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "3px",
            color: t.textFaint, display: "flex", alignItems: "center",
          }}>
          <IconTrash />
        </button>
      </div>

      {/* collapsible question panel */}
      {isQExpanded && (
        <div style={{
          padding: "9px 12px 11px", borderRadius: "0 0 6px 6px",
          background: t.accentSoft,
          border: `1px solid ${t.border}`, borderTop: "none",
          display: "flex", flexDirection: "column", gap: "7px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.heading, fontSize: "16px",
              color: t.question, flexShrink: 0, width: "40px",
            }}>who</label>
            <input
              value={task.questionWho || ""}
              onChange={(e) => onUpdateQuestion(task.id, "questionWho", e.target.value)}
              placeholder="person or team…"
              style={{
                flex: 1, padding: "6px 9px", borderRadius: "4px",
                border: `1px solid ${t.border}`, background: t.surface,
                fontFamily: fonts.body, fontSize: "15px",
                outline: "none", color: t.text,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.heading, fontSize: "16px",
              color: t.question, flexShrink: 0, width: "40px", paddingTop: "4px",
            }}>ask</label>
            <textarea
              value={task.questionText || ""}
              onChange={(e) => onUpdateQuestion(task.id, "questionText", e.target.value)}
              placeholder="what do you need to find out…"
              rows={2}
              style={{
                flex: 1, padding: "6px 9px", borderRadius: "4px",
                border: `1px solid ${t.border}`, background: t.surface,
                fontFamily: fonts.body, fontSize: "15px",
                outline: "none", color: t.text, resize: "vertical",
                lineHeight: 1.5, boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── done row ─── */
function DoneRow({ task, t, fonts, onRestore, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "9px",
      padding: "6px 10px", borderRadius: "5px",
      background: t.accentSoft,
    }}>
      <span style={{
        width: "24px", height: "24px", borderRadius: "4px",
        background: t.accent, display: "flex", alignItems: "center",
        justifyContent: "center", color: t.accentText, flexShrink: 0,
      }}><IconCheck /></span>
      <span style={{
        flex: 1, fontFamily: fonts.body, fontSize: "16px",
        color: t.textMuted, textDecoration: "line-through",
        textDecorationColor: t.textFaint,
      }}>{task.text}</span>
      <span style={{
        fontFamily: fonts.heading, fontSize: "15px", color: t.textFaint,
      }}>{formatDate(task.created)}</span>
      <button onClick={() => onRestore(task.id)} title="Restore"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "3px", color: t.textMuted, display: "flex", alignItems: "center",
        }}><IconUndo /></button>
      <button onClick={() => onDelete(task.id)} title="Remove"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "3px", color: t.textFaint, display: "flex", alignItems: "center",
        }}><IconTrash /></button>
    </div>
  );
}

/* ─── main ─── */
export default function BulletJournal() {
  const [data, setData] = useState(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [expandedQ, setExpandedQ] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey());
  const [fontName, setFontName] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const saveTimer = useRef(null);
  const inputRef = useRef(null);

  // load
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        const raw = result ? JSON.parse(result.value) : null;
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
      save(next);
      return next;
    });
  }, [save]);

  const theme = data ? buildTheme(data.theme) : buildTheme({});

  // keep the page background in sync with the theme
  useEffect(() => {
    document.body.style.background = theme.bg;
  }, [theme.bg]);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const cur = currentWeekKey();
    update((d) => {
      const maxOrder = d.tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
      return {
        ...d,
        tasks: [...d.tasks, {
          id: d.nextId, text, status: "active",
          created: Date.now(), week: cur, starred: false, order: maxOrder + 1,
        }],
        nextId: d.nextId + 1,
      };
    });
    setInput("");
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

  const deleteTask = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));

  const toggleStar = (id) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, starred: !x.starred } : x)),
    }));

  const setWeekNote = (key, notes) =>
    update((d) => ({ ...d, weekNotes: { ...d.weekNotes, [key]: notes } }));

  const setWeekNoteColor = (key, color) =>
    update((d) => ({ ...d, weekNoteColors: { ...d.weekNoteColors, [key]: color } }));

  const setSortMode = (mode) => update((d) => ({ ...d, sortMode: mode }));
  const toggleSortOrder = () =>
    update((d) => ({ ...d, sortOrder: d.sortOrder === "oldest" ? "newest" : "oldest" }));

  const setThemeKey = (key, value) =>
    update((d) => ({ ...d, theme: { ...d.theme, [key]: value } }));

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
        fontFamily: "'Caveat', cursive", fontSize: "26px", color: "#999" }}>
        loading journal…
      </div>
    );
  }

  const t = theme;
  const fonts = {
    heading: fontName ? "'BJCustom', cursive" : "'Caveat', cursive",
    body: fontName ? "'BJCustom', sans-serif" : "'Karla', sans-serif",
  };

  const cur = currentWeekKey();
  const isEverything = selectedWeek === "everything";
  const isCurrent = selectedWeek === cur;
  const canAdd = isCurrent || isEverything;
  const searching = query.trim().length > 0;

  const weekSet = new Set(data.tasks.map((x) => x.week));
  weekSet.add(cur);
  const weeksDesc = [...weekSet].sort().reverse();

  // active-task ordering: starred first, hold last, then sort mode
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
  const sortActive = (list) => {
    const nonHold = list.filter((x) => x.status !== "hold").sort(cmp);
    const hold = list.filter((x) => x.status === "hold").sort(cmp);
    return [...nonHold, ...hold];
  };

  const inView = isEverything
    ? data.tasks
    : data.tasks.filter((x) => x.week === selectedWeek);
  const activeTasks = sortActive(
    inView.filter((x) => x.status === "active" || x.status === "hold")
  );
  const doneTasks = inView.filter((x) => x.status === "done");

  const clearDone = () =>
    update((d) => ({
      ...d,
      tasks: d.tasks.filter((x) => {
        if (x.status !== "done") return true;
        return isEverything ? false : x.week !== selectedWeek;
      }),
    }));

  // drag reorder within the visible active list
  const dragEnabled = data.sortMode === "custom" && !searching;
  const handleDrop = (targetId) => {
    if (dragId == null || dragId === targetId) return;
    const ids = activeTasks.map((x) => x.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
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
    ? Object.entries(data.weekNotes).filter(
        ([, v]) => v && v.toLowerCase().includes(q)
      )
    : [];

  const goToWeek = (wk) => { setSelectedWeek(wk); setQuery(""); };

  /* ── shared style helpers ── */
  const navBtn = (active) => ({
    display: "block", width: "100%", textAlign: "left",
    background: active ? t.accentSoft : "transparent",
    border: "none", cursor: "pointer", borderRadius: "5px",
    padding: "7px 10px", marginBottom: "2px",
    fontFamily: fonts.body, fontSize: "15px",
    color: active ? t.accentText2 : t.textMuted,
    fontWeight: active ? 600 : 400,
  });
  const divider = { height: "1px", background: t.divider, margin: "9px 4px" };
  const settingRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontFamily: fonts.body, fontSize: "14px", color: t.textMuted,
  };
  const linkBtn = {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontFamily: fonts.body, fontSize: "14px", color: t.question,
    textAlign: "left",
  };

  const segBtn = (active) => ({
    flex: 1, cursor: "pointer", padding: "4px 0",
    border: `1px solid ${t.border}`,
    background: active ? t.accent : "transparent",
    color: active ? t.accentText : t.textMuted,
    fontFamily: fonts.body, fontSize: "13px",
  });

  return (
    <div className="bj-root">
      {/* ─── sidebar ─── */}
      <aside className="bj-sidebar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          style={{
            width: "100%", padding: "7px 10px", borderRadius: "6px",
            border: `1px solid ${t.border}`, background: t.surface,
            fontFamily: fonts.body, fontSize: "14px",
            outline: "none", color: t.text, marginBottom: "8px",
          }}
        />
        <button style={navBtn(isEverything && !searching)}
          onClick={() => goToWeek("everything")}>
          ★ everything
        </button>
        <div style={divider} />
        {weeksDesc.map((wk) => (
          <button key={wk} style={navBtn(selectedWeek === wk && !searching)}
            onClick={() => goToWeek(wk)}>
            {wk === cur ? "this week" : weekLabel(wk)}
          </button>
        ))}
        <div style={divider} />

        {/* settings panel */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            fontFamily: fonts.heading, fontSize: "17px", color: t.textMuted,
          }}>
          <span style={{
            display: "inline-block",
            transform: settingsOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>▸</span>
          ⚙ settings
        </button>
        {settingsOpen && (
          <div style={{
            padding: "8px 4px 4px", display: "flex",
            flexDirection: "column", gap: "11px",
          }}>
            {/* light / dark */}
            <div>
              <div style={{ ...settingRow, marginBottom: "4px" }}>appearance</div>
              <div style={{ display: "flex" }}>
                <button style={{ ...segBtn(!t.dark), borderRadius: "5px 0 0 5px" }}
                  onClick={() => setThemeKey("mode", "light")}>light</button>
                <button style={{ ...segBtn(t.dark), borderRadius: "0 5px 5px 0", borderLeft: "none" }}
                  onClick={() => setThemeKey("mode", "dark")}>dark</button>
              </div>
            </div>
            {/* colour pickers */}
            <div style={settingRow}>
              <span>UI Highlight</span>
              <ColorPicker value={data.theme.highlight} t={t}
                onChange={(c) => c && setThemeKey("highlight", c)} />
            </div>
            <div style={settingRow}>
              <span>Star Color</span>
              <ColorPicker value={data.theme.star} t={t}
                onChange={(c) => c && setThemeKey("star", c)} />
            </div>
            <div style={settingRow}>
              <span>Hold Color</span>
              <ColorPicker value={data.theme.hold} t={t}
                onChange={(c) => c && setThemeKey("hold", c)} />
            </div>
            {/* font */}
            <div style={settingRow}>
              <span>font</span>
              <label style={{ ...linkBtn, cursor: "pointer", display: "flex",
                alignItems: "center", gap: "4px" }}>
                <span style={{ color: t.textMuted, fontSize: "13px" }}>
                  {fontName || "default"}
                </span>
                ✎
                <input type="file" accept=".otf,.ttf,font/otf,font/ttf"
                  onChange={onFontFile} style={{ display: "none" }} />
              </label>
            </div>
            {fontName && (
              <button onClick={resetFont} style={{ ...linkBtn, color: t.danger }}>
                reset font to default
              </button>
            )}
            {!data.sampleLoaded && (
              <button onClick={loadSamples} style={{ ...linkBtn }}>
                + load sample weeks
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ─── main ─── */}
      <main className="bj-main">
        {searching ? (
          /* ── search results ── */
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "32px", fontWeight: 600,
              color: t.text, margin: "0 0 14px", lineHeight: 1.1 }}>
              search · “{query.trim()}”
            </h1>
            {taskHits.length === 0 && noteHits.length === 0 && (
              <div style={{ fontFamily: fonts.heading, fontSize: "20px", color: t.textFaint }}>
                no matches
              </div>
            )}
            {taskHits.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: fonts.heading, fontSize: "19px",
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
                        fontFamily: fonts.body, fontSize: "16px", color: t.text,
                        display: "flex", justifyContent: "space-between", gap: "10px",
                      }}>
                      <span>{x.text}</span>
                      <span style={{ fontFamily: fonts.heading, fontSize: "14px",
                        color: t.textMuted, whiteSpace: "nowrap" }}>
                        {x.week === cur ? "this week" : weekLabel(x.week)}
                        {x.status === "done" ? " · done" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {noteHits.length > 0 && (
              <div>
                <div style={{ fontFamily: fonts.heading, fontSize: "19px",
                  color: t.textMuted, marginBottom: "6px" }}>
                  notes ({noteHits.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {noteHits.map(([wk, text]) => (
                    <button key={wk} onClick={() => goToWeek(wk)}
                      style={{
                        textAlign: "left", cursor: "pointer",
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: "6px", padding: "8px 11px",
                        fontFamily: fonts.body, fontSize: "15px", color: t.textMuted,
                      }}>
                      <span style={{ fontFamily: fonts.heading, fontSize: "15px",
                        color: t.text }}>
                        {wk === cur ? "this week" : weekLabel(wk)}
                      </span>
                      {" — "}
                      {text.length > 90 ? text.slice(0, 90) + "…" : text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* header (one line) */}
            <div style={{ marginBottom: "14px" }}>
              {isEverything ? (
                <h1 style={{ fontFamily: fonts.heading, fontSize: "32px", fontWeight: 600,
                  color: t.text, margin: 0, lineHeight: 1.1 }}>everything</h1>
              ) : (
                <h1 style={{ fontFamily: fonts.heading, fontSize: "32px", fontWeight: 600,
                  color: t.text, margin: 0, lineHeight: 1.1,
                  display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  {isCurrent ? "this week" : weekLabel(selectedWeek)}
                  <span style={{ fontFamily: fonts.heading, fontSize: "18px",
                    color: t.textMuted, fontWeight: 400 }}>
                    {isCurrent ? weekLabel(selectedWeek) : "· past week"}
                  </span>
                </h1>
              )}
            </div>

            {/* add task */}
            {canAdd && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input ref={inputRef} value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="add a task…"
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: "6px",
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontFamily: fonts.body, fontSize: "18px",
                    outline: "none", color: t.text,
                  }}
                />
                <button onClick={addTask} style={{
                  width: "44px", height: "44px", borderRadius: "6px",
                  border: "none", background: t.accent, color: t.accentText,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}><IconPlus /></button>
              </div>
            )}

            {/* sort control */}
            {activeTasks.length > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end",
                gap: "12px", marginBottom: "7px" }}>
                <button onClick={() => setSortMode(data.sortMode === "custom" ? "date" : "custom")}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: fonts.heading, fontSize: "16px",
                    color: t.textMuted, padding: "2px 0",
                  }}>
                  {data.sortMode === "custom" ? "⠿ custom order" : "↕ by date"}
                </button>
                {data.sortMode === "date" && (
                  <button onClick={toggleSortOrder} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: fonts.heading, fontSize: "16px",
                    color: t.textMuted, padding: "2px 0",
                  }}>
                    {data.sortOrder === "oldest" ? "↑ oldest first" : "↓ newest first"}
                  </button>
                )}
              </div>
            )}

            {/* active tasks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              {activeTasks.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "30px 0",
                  fontFamily: fonts.heading, fontSize: "21px", color: t.textFaint,
                }}>
                  {canAdd ? "nothing here yet — add a task above" : "no open tasks this week"}
                </div>
              )}
              {activeTasks.map((x) => (
                <TaskRow key={x.id} task={x} t={t} fonts={fonts} drag={drag}
                  isOver={dragEnabled && overId === x.id && dragId !== x.id}
                  onStatusChange={changeStatus} onDelete={deleteTask}
                  onToggleStar={toggleStar} onUpdateQuestion={updateQuestion}
                  isQExpanded={expandedQ.has(x.id)} onToggleQ={toggleQ}/>
              ))}
            </div>

            {/* done section */}
            {doneTasks.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <button onClick={() => setShowDone(!showDone)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: fonts.heading, fontSize: "19px",
                  color: t.textMuted, padding: "0 0 8px 0",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{
                    display: "inline-block",
                    transform: showDone ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}>▸</span>
                  done ({doneTasks.length})
                  {!showDone && (
                    <span onClick={(e) => { e.stopPropagation(); clearDone(); }}
                      style={{ fontSize: "14px", marginLeft: "8px", color: t.danger }}
                      title="Clear done in this view">
                      clear
                    </span>
                  )}
                </button>
                {showDone && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {doneTasks.map((x) => (
                      <DoneRow key={x.id} task={x} t={t} fonts={fonts}
                        onRestore={(id) => changeStatus(id, "active")}
                        onDelete={deleteTask}/>
                    ))}
                    <button onClick={clearDone} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontFamily: fonts.heading, fontSize: "15px",
                      color: t.danger, padding: "8px 0 0", textAlign: "left",
                    }}>clear done in this view</button>
                  </div>
                )}
              </div>
            )}

            {/* notes (per week) */}
            {!isEverything && (
              <>
                <div style={{ borderTop: `1px dashed ${t.divider}`, margin: "0 0 12px" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center",
                    gap: "8px", marginBottom: "6px" }}>
                    <label style={{
                      fontFamily: fonts.heading, fontSize: "22px", color: t.textMuted,
                    }}>notes</label>
                    <ColorPicker value={data.weekNoteColors[selectedWeek] || null} t={t}
                      allowNone
                      onChange={(c) => setWeekNoteColor(selectedWeek, c)} />
                  </div>
                  <textarea
                    value={data.weekNotes[selectedWeek] || ""}
                    onChange={(e) => setWeekNote(selectedWeek, e.target.value)}
                    placeholder="jot anything down…"
                    rows={5}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "6px",
                      border: `1px solid ${t.border}`,
                      background: data.weekNoteColors[selectedWeek] || t.surfaceAlt,
                      fontFamily: fonts.body, fontSize: "17px",
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
