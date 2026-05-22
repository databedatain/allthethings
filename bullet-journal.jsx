import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "bullet-journal-data";

const defaultData = () => ({
  tasks: [],
  notes: "",
  sortOrder: "oldest",
  nextId: 1,
});

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  const day = d.getDate();
  return `${mo} ${day}`;
};

const weekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("default", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(sun)}`;
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

/* ─── task row ─── */
function TaskRow({ task, onStatusChange, onDelete, onUpdateQuestion, isQExpanded, onToggleQ }) {
  const isHold = task.status === "hold";
  const hasQ = task.questionWho || task.questionText;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 12px", borderRadius: isQExpanded ? "6px 6px 0 0" : "6px",
        background: isHold ? "rgba(204,163,71,0.08)" : "rgba(255,255,255,0.45)",
        border: isHold ? "1px dashed rgba(204,163,71,0.4)" : "1px solid rgba(0,0,0,0.06)",
        borderBottom: isQExpanded ? "none" : undefined,
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
          flex: 1, fontFamily: "'Karla', sans-serif", fontSize: "15px",
          color: isHold ? "#8a7540" : "#2c2c2c", lineHeight: 1.4,
          fontStyle: isHold ? "italic" : "normal",
        }}>
          {task.text}
          {isHold && <span style={{ fontSize: "11px", marginLeft: "8px", opacity: 0.6 }}>⏸ on hold</span>}
        </span>

        {/* date */}
        <span style={{
          fontFamily: "'Caveat', cursive", fontSize: "13px",
          color: "#999", flexShrink: 0, whiteSpace: "nowrap",
        }}>{formatDate(task.created)}</span>

        {/* question toggle */}
        <button onClick={() => onToggleQ(task.id)}
          title={isQExpanded ? "Collapse question" : "Add/view question"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: isQExpanded ? "#6a8dba" : hasQ ? "#6a8dba" : "#ccc",
            display: "flex", alignItems: "center",
            fontWeight: hasQ ? "bold" : "normal",
          }}>
          <IconQuestion />
        </button>

        {/* hold toggle */}
        <button onClick={() => onStatusChange(task.id, isHold ? "active" : "hold")}
          title={isHold ? "Resume" : "Put on hold"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: isHold ? "#b8942e" : "#bbb", display: "flex", alignItems: "center",
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
              fontFamily: "'Caveat', cursive", fontSize: "14px",
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
                fontFamily: "'Karla', sans-serif", fontSize: "13px",
                outline: "none", color: "#2c2c2c",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{
              fontFamily: "'Caveat', cursive", fontSize: "14px",
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
                fontFamily: "'Karla', sans-serif", fontSize: "13px",
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
function DoneRow({ task, onRestore, onDelete }) {
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
        flex: 1, fontFamily: "'Karla', sans-serif", fontSize: "14px",
        color: "#999", textDecoration: "line-through",
        textDecorationColor: "rgba(0,0,0,0.15)",
      }}>{task.text}</span>
      <span style={{
        fontFamily: "'Caveat', cursive", fontSize: "12px", color: "#bbb",
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
  const [expandedQ, setExpandedQ] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);
  const inputRef = useRef(null);

  // load
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        setData(result ? JSON.parse(result.value) : defaultData());
      } catch {
        setData(defaultData());
      }
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
    update((d) => ({
      ...d,
      tasks: [...d.tasks, { id: d.nextId, text, status: "active", created: Date.now() }],
      nextId: d.nextId + 1,
    }));
    setInput("");
    inputRef.current?.focus();
  };

  const changeStatus = (id, status) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));

  const deleteTask = (id) =>
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));

  const setNotes = (notes) => update((d) => ({ ...d, notes }));

  const toggleSort = () =>
    update((d) => ({ ...d, sortOrder: d.sortOrder === "oldest" ? "newest" : "oldest" }));

  const clearDone = () =>
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.status !== "done") }));

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

  if (loading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0",
        fontFamily: "'Caveat', cursive", fontSize: "22px", color: "#999" }}>
        loading journal…
      </div>
    );
  }

  const activeTasks = data.tasks
    .filter((t) => t.status === "active" || t.status === "hold")
    .sort((a, b) =>
      data.sortOrder === "oldest" ? a.created - b.created : b.created - a.created
    );
  const doneTasks = data.tasks.filter((t) => t.status === "done");

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Karla:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet"/>
      <div style={{
        maxWidth: "560px", margin: "0 auto", padding: "32px 20px 48px",
        fontFamily: "'Karla', sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #faf8f4 0%, #f4f1eb 100%)",
      }}>
        {/* header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{
            fontFamily: "'Caveat', cursive", fontSize: "36px", fontWeight: 600,
            color: "#2c2c2c", margin: 0, lineHeight: 1.1,
          }}>this week</h1>
          <span style={{
            fontFamily: "'Caveat', cursive", fontSize: "16px", color: "#b0a898",
          }}>{weekRange()}</span>
        </div>

        {/* add task */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "24px",
        }}>
          <input ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="add a task…"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.1)",
              background: "rgba(255,255,255,0.6)",
              fontFamily: "'Karla', sans-serif", fontSize: "15px",
              outline: "none", color: "#2c2c2c",
            }}
          />
          <button onClick={addTask} style={{
            width: "40px", height: "40px", borderRadius: "6px",
            border: "none", background: "#5e8a7d", color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}><IconPlus /></button>
        </div>

        {/* sort control */}
        {activeTasks.length > 1 && (
          <div style={{
            display: "flex", justifyContent: "flex-end", marginBottom: "8px",
          }}>
            <button onClick={toggleSort} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Caveat', cursive", fontSize: "13px",
              color: "#b0a898", padding: "2px 0",
            }}>
              {data.sortOrder === "oldest" ? "↑ oldest first" : "↓ newest first"}
            </button>
          </div>
        )}

        {/* active tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px" }}>
          {activeTasks.length === 0 && (
            <div style={{
              textAlign: "center", padding: "32px 0",
              fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#ccc",
            }}>
              nothing here yet — add a task above
            </div>
          )}
          {activeTasks.map((t) => (
            <TaskRow key={t.id} task={t} onStatusChange={changeStatus} onDelete={deleteTask}
              onUpdateQuestion={updateQuestion}
              isQExpanded={expandedQ.has(t.id)}
              onToggleQ={toggleQ}/>
          ))}
        </div>

        {/* done section */}
        {doneTasks.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <button onClick={() => setShowDone(!showDone)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Caveat', cursive", fontSize: "16px",
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
                  title="Clear all done">
                  clear
                </span>
              )}
            </button>
            {showDone && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {doneTasks.map((t) => (
                  <DoneRow key={t.id} task={t}
                    onRestore={(id) => changeStatus(id, "active")}
                    onDelete={deleteTask}/>
                ))}
                <button onClick={clearDone} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Caveat', cursive", fontSize: "13px",
                  color: "#d4a0a0", padding: "8px 0 0", textAlign: "left",
                }}>clear all done</button>
              </div>
            )}
          </div>
        )}

        {/* divider */}
        <div style={{
          borderTop: "1px dashed rgba(0,0,0,0.1)", margin: "0 0 20px",
        }} />

        {/* notes */}
        <div>
          <label style={{
            fontFamily: "'Caveat', cursive", fontSize: "18px",
            color: "#b0a898", display: "block", marginBottom: "8px",
          }}>notes</label>
          <textarea
            value={data.notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="jot anything down…"
            rows={5}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.5)",
              fontFamily: "'Karla', sans-serif", fontSize: "14px",
              color: "#2c2c2c", outline: "none", resize: "vertical",
              lineHeight: 1.6, boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </>
  );
}
