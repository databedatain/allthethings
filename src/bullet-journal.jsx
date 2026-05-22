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

const STORAGE_KEY = "bullet-journal-data";

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  return `${mo} ${d.getDate()}`;
};

const hexToRgba = (hex, a) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/* ─── tiny icons ─── */
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
    <rect x="8.5" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 6.5v3M8 6.5v3M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUndo = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5.5h5a3 3 0 010 6H6M3 5.5L5.5 3M3 5.5L5.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconQuestion = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 5.5a1.5 1.5 0 012.9.5c0 1-1.4 1-1.4 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
  </svg>
);
const IconStar = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
    <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.6l1.4-6.3L2.9 9l6.4-.6z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─── task row ─── */
function TaskRow({ task, fonts, starColor, onStatusChange, onDelete, onToggleStar, onUpdateQuestion, isQExpanded, onToggleQ }) {
  const isHold = task.status === "hold";
  const isStar = !!task.starred;
  const hasQ = task.questionWho || task.questionText;

  const bg = isStar
    ? hexToRgba(starColor, 0.14)
    : isHold
    ? "rgba(120,120,120,0.09)"
    : "rgba(255,255,255,0.45)";
  const border = isStar
    ? `1px solid ${hexToRgba(starColor, 0.55)}`
    : isHold
    ? "1px dashed rgba(120,120,120,0.45)"
    : "1px solid rgba(0,0,0,0.06)";

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "9px 11px", borderRadius: isQExpanded ? "6px 6px 0 0" : "6px",
        background: bg, border, borderBottom: isQExpanded ? "none" : undefined,
        transition: "all 0.2s ease",
      }}>
        {/* checkbox / done */}
        <button onClick={() => onStatusChange(task.id, "done")} title="Mark done"
          style={{
            width: "22px", height: "22px", borderRadius: "4px", cursor: "pointer",
            border: "1.5px solid #5e8a7d", background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#5e8a7d", flexShrink: 0, padding: 0,
          }}>
          <span style={{ opacity: 0.25 }}><IconCheck /></span>
        </button>

        {/* text */}
        <span style={{
          flex: 1, fontFamily: fonts.body, fontSize: "15px",
          color: isHold ? "#777" : "#2c2c2c", lineHeight: 1.4,
          fontStyle: isHold ? "italic" : "normal",
        }}>
          {task.text}
          {isHold && <span style={{ fontSize: "11px", marginLeft: "8px", opacity: 0.65 }}>⏸ on hold</span>}
        </span>

        {/* date */}
        <span style={{
          fontFamily: fonts.heading, fontSize: "13px",
          color: "#999", flexShrink: 0, whiteSpace: "nowrap",
        }}>{formatDate(task.created)}</span>

        {/* star toggle */}
        <button onClick={() => onToggleStar(task.id)} title={isStar ? "Unstar" : "Star"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: isStar ? starColor : "#ccc", display: "flex", alignItems: "center",
          }}>
          <IconStar filled={isStar} />
        </button>

        {/* question toggle */}
        <button onClick={() => onToggleQ(task.id)}
          title={isQExpanded ? "Collapse question" : "Add/view question"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: hasQ ? "#6a8dba" : "#ccc", display: "flex", alignItems: "center",
            fontWeight: hasQ ? "bold" : "normal",
          }}>
          <IconQuestion />
        </button>

        {/* hold toggle */}
        <button onClick={() => onStatusChange(task.id, isHold ? "active" : "hold")}
          title={isHold ? "Resume" : "Put on hold"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: isHold ? "#888" : "#bbb", display: "flex", alignItems: "center",
          }}>
          {isHold ? <IconUndo /> : <IconPause />}
        </button>

        {/* delete */}
        <button onClick={() => onDelete(task.id)} title="Remove"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: "#ccc", display: "flex", alignItems: "center",
          }}>
          <IconTrash />
        </button>
      </div>

      {/* collapsible question panel */}
      {isQExpanded && (
        <div style={{
          padding: "10px 14px 12px", borderRadius: "0 0 6px 6px",
          background: "rgba(106,141,186,0.06)",
          border: "1px solid rgba(106,141,186,0.15)", borderTop: "none",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.heading, fontSize: "14px",
              color: "#6a8dba", flexShrink: 0, width: "36px",
            }}>who</label>
            <input
              value={task.questionWho || ""}
              onChange={(e) => onUpdateQuestion(task.id, "questionWho", e.target.value)}
              placeholder="person or team…"
              style={{
                flex: 1, padding: "5px 8px", borderRadius: "4px",
                border: "1px solid rgba(106,141,186,0.2)",
                background: "rgba(255,255,255,0.6)",
                fontFamily: fonts.body, fontSize: "13px",
                outline: "none", color: "#2c2c2c",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.heading, fontSize: "14px",
              color: "#6a8dba", flexShrink: 0, width: "36px", paddingTop: "4px",
            }}>ask</label>
            <textarea
              value={task.questionText || ""}
              onChange={(e) => onUpdateQuestion(task.id, "questionText", e.target.value)}
              placeholder="what do you need to find out…"
              rows={2}
              style={{
                flex: 1, padding: "5px 8px", borderRadius: "4px",
                border: "1px solid rgba(106,141,186,0.2)",
                background: "rgba(255,255,255,0.6)",
                fontFamily: fonts.body, fontSize: "13px",
                outline: "none", color: "#2c2c2c", resize: "vertical",
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
function DoneRow({ task, fonts, onRestore, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "7px 12px", borderRadius: "5px",
      background: "rgba(94,138,125,0.06)",
    }}>
      <span style={{
        width: "22px", height: "22px", borderRadius: "4px",
        background: "#5e8a7d", display: "flex", alignItems: "center",
        justifyContent: "center", color: "#fff", flexShrink: 0,
      }}><IconCheck /></span>
      <span style={{
        flex: 1, fontFamily: fonts.body, fontSize: "14px",
        color: "#999", textDecoration: "line-through",
        textDecorationColor: "rgba(0,0,0,0.15)",
      }}>{task.text}</span>
      <span style={{
        fontFamily: fonts.heading, fontSize: "12px", color: "#bbb",
      }}>{formatDate(task.created)}</span>
      <button onClick={() => onRestore(task.id)} title="Restore"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "4px", color: "#aaa", display: "flex", alignItems: "center",
        }}><IconUndo /></button>
      <button onClick={() => onDelete(task.id)} title="Remove"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "4px", color: "#ccc", display: "flex", alignItems: "center",
        }}><IconTrash /></button>
    </div>
  );
}

/* ─── main ─── */
export default function BulletJournal() {
  const [data, setData] = useState(null);
  const [input, setInput] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [expandedQ, setExpandedQ] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(currentWeekKey());
  const [fontName, setFontName] = useState(null);
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

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    const cur = currentWeekKey();
    update((d) => ({
      ...d,
      tasks: [...d.tasks, {
        id: d.nextId, text, status: "active",
        created: Date.now(), week: cur, starred: false,
      }],
      nextId: d.nextId + 1,
    }));
    setInput("");
    inputRef.current?.focus();
  };

  const changeStatus = (id, status) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, status };
        const cur = currentWeekKey();
        if (status !== "done" && next.week < cur) next.week = cur;
        return next;
      }),
    }));

  const deleteTask = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));

  const toggleStar = (id) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)),
    }));

  const setWeekNote = (key, notes) =>
    update((d) => ({ ...d, weekNotes: { ...d.weekNotes, [key]: notes } }));

  const toggleSort = () =>
    update((d) => ({ ...d, sortOrder: d.sortOrder === "oldest" ? "newest" : "oldest" }));

  const setStarColor = (c) => update((d) => ({ ...d, starColor: c }));

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
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
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
        fontFamily: "'Caveat', cursive", fontSize: "22px", color: "#999" }}>
        loading journal…
      </div>
    );
  }

  const fonts = {
    heading: fontName ? "'BJCustom', cursive" : "'Caveat', cursive",
    body: fontName ? "'BJCustom', sans-serif" : "'Karla', sans-serif",
  };

  const cur = currentWeekKey();
  const isEverything = selectedWeek === "everything";
  const isCurrent = selectedWeek === cur;
  const canAdd = isCurrent || isEverything;

  const weekSet = new Set(data.tasks.map((t) => t.week));
  weekSet.add(cur);
  const weeksDesc = [...weekSet].sort().reverse();

  const inView = isEverything
    ? data.tasks
    : data.tasks.filter((t) => t.week === selectedWeek);

  const activeTasks = inView
    .filter((t) => t.status === "active" || t.status === "hold")
    .sort((a, b) => {
      if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
      return data.sortOrder === "oldest" ? a.created - b.created : b.created - a.created;
    });
  const doneTasks = inView.filter((t) => t.status === "done");

  const clearDone = () =>
    update((d) => ({
      ...d,
      tasks: d.tasks.filter((t) => {
        if (t.status !== "done") return true;
        return isEverything ? false : t.week !== selectedWeek;
      }),
    }));

  const navBtn = (active) => ({
    display: "block", width: "100%", textAlign: "left",
    background: active ? "rgba(94,138,125,0.16)" : "transparent",
    border: "none", cursor: "pointer", borderRadius: "5px",
    padding: "6px 9px", marginBottom: "2px",
    fontFamily: fonts.body, fontSize: "13px",
    color: active ? "#3a5c52" : "#8a8275",
    fontWeight: active ? 600 : 400,
  });
  const divider = { height: "1px", background: "rgba(0,0,0,0.07)", margin: "8px 4px" };
  const linkBtn = {
    display: "inline-block", background: "none", border: "none", cursor: "pointer",
    padding: 0, fontFamily: fonts.heading, fontSize: "14px", color: "#6a8dba",
    textAlign: "left",
  };
  const settingLabel = {
    fontFamily: fonts.heading, fontSize: "14px", color: "#b0a898",
    display: "block", marginBottom: "3px",
  };

  return (
    <div className="bj-root">
      {/* ─── sidebar ─── */}
      <aside className="bj-sidebar">
        <button style={navBtn(isEverything)} onClick={() => setSelectedWeek("everything")}>
          ★ everything
        </button>
        <div style={divider} />
        {weeksDesc.map((wk) => (
          <button key={wk} style={navBtn(selectedWeek === wk)} onClick={() => setSelectedWeek(wk)}>
            {wk === cur ? "this week" : weekLabel(wk)}
          </button>
        ))}
        <div style={divider} />
        <div style={{ padding: "2px 4px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <label>
            <span style={settingLabel}>star colour</span>
            <input type="color" value={data.starColor}
              onChange={(e) => setStarColor(e.target.value)}
              style={{ width: "100%", height: "26px", border: "none",
                background: "none", cursor: "pointer", padding: 0 }} />
          </label>
          <div>
            <span style={settingLabel}>journal font</span>
            <label style={{ ...linkBtn, cursor: "pointer" }}>
              {fontName ? "change font…" : "import .otf/.ttf…"}
              <input type="file" accept=".otf,.ttf,font/otf,font/ttf"
                onChange={onFontFile} style={{ display: "none" }} />
            </label>
            {fontName && (
              <div style={{ fontFamily: fonts.body, fontSize: "11px", color: "#999", marginTop: "3px" }}>
                {fontName}{" "}
                <button onClick={resetFont}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: 0, color: "#d4a0a0", fontSize: "11px" }}>reset</button>
              </div>
            )}
          </div>
          {!data.sampleLoaded && (
            <button onClick={loadSamples} style={{ ...linkBtn, color: "#6a8dba" }}>
              + load sample weeks
            </button>
          )}
        </div>
      </aside>

      {/* ─── main ─── */}
      <main className="bj-main">
        {/* header (one line) */}
        <div style={{ marginBottom: "14px" }}>
          {isEverything ? (
            <h1 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600,
              color: "#2c2c2c", margin: 0, lineHeight: 1.1 }}>everything</h1>
          ) : (
            <h1 style={{ fontFamily: fonts.heading, fontSize: "26px", fontWeight: 600,
              color: "#2c2c2c", margin: 0, lineHeight: 1.1,
              display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
              {isCurrent ? "this week" : weekLabel(selectedWeek)}
              <span style={{ fontFamily: fonts.heading, fontSize: "15px",
                color: "#b0a898", fontWeight: 400 }}>
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
                flex: 1, padding: "9px 13px", borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(255,255,255,0.6)",
                fontFamily: fonts.body, fontSize: "15px",
                outline: "none", color: "#2c2c2c",
              }}
            />
            <button onClick={addTask} style={{
              width: "38px", height: "38px", borderRadius: "6px",
              border: "none", background: "#5e8a7d", color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}><IconPlus /></button>
          </div>
        )}

        {/* sort control */}
        {activeTasks.length > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
            <button onClick={toggleSort} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: fonts.heading, fontSize: "13px",
              color: "#b0a898", padding: "2px 0",
            }}>
              {data.sortOrder === "oldest" ? "↑ oldest first" : "↓ newest first"}
            </button>
          </div>
        )}

        {/* active tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {activeTasks.length === 0 && (
            <div style={{
              textAlign: "center", padding: "28px 0",
              fontFamily: fonts.heading, fontSize: "18px", color: "#ccc",
            }}>
              {canAdd ? "nothing here yet — add a task above" : "no open tasks this week"}
            </div>
          )}
          {activeTasks.map((t) => (
            <TaskRow key={t.id} task={t} fonts={fonts} starColor={data.starColor}
              onStatusChange={changeStatus} onDelete={deleteTask}
              onToggleStar={toggleStar} onUpdateQuestion={updateQuestion}
              isQExpanded={expandedQ.has(t.id)} onToggleQ={toggleQ}/>
          ))}
        </div>

        {/* done section */}
        {doneTasks.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <button onClick={() => setShowDone(!showDone)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: fonts.heading, fontSize: "16px",
              color: "#b0a898", padding: "0 0 8px 0",
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
                  style={{ fontSize: "12px", marginLeft: "8px", color: "#d4a0a0" }}
                  title="Clear done in this view">
                  clear
                </span>
              )}
            </button>
            {showDone && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {doneTasks.map((t) => (
                  <DoneRow key={t.id} task={t} fonts={fonts}
                    onRestore={(id) => changeStatus(id, "active")}
                    onDelete={deleteTask}/>
                ))}
                <button onClick={clearDone} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: fonts.heading, fontSize: "13px",
                  color: "#d4a0a0", padding: "8px 0 0", textAlign: "left",
                }}>clear done in this view</button>
              </div>
            )}
          </div>
        )}

        {/* notes (per week) */}
        {!isEverything && (
          <>
            <div style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", margin: "0 0 12px" }} />
            <div>
              <label style={{
                fontFamily: fonts.heading, fontSize: "18px",
                color: "#b0a898", display: "block", marginBottom: "6px",
              }}>notes</label>
              <textarea
                value={data.weekNotes[selectedWeek] || ""}
                onChange={(e) => setWeekNote(selectedWeek, e.target.value)}
                placeholder="jot anything down…"
                rows={5}
                style={{
                  width: "100%", padding: "11px 13px", borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.5)",
                  fontFamily: fonts.body, fontSize: "14px",
                  color: "#2c2c2c", outline: "none", resize: "vertical",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
