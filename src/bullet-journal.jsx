import { useState, useEffect, useCallback, useRef } from "react";
import {
  defaultData,
  migrate,
  rollIncompletes,
  withSampleWeeks,
  currentWeekKey,
  weekLabel,
  weekParts,
  DENSITIES,
  getDensity,
  MAX_TAGS,
} from "./weeks.js";
import {
  loadFont,
  saveFont,
  clearFont,
  applyFont,
  removeFontStyle,
  FONTS,
  fontStack,
  loadCatalogFonts,
} from "./font.js";
import { buildTheme, rgba, presetBg, PRESETS, PALETTES, getPalette } from "./theme.js";
import { TYPE, SP, CONTROL } from "./tokens.js";
import ColorPicker from "./color-picker.jsx";

const STORAGE_KEY = "bullet-journal-data";

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  return `${mo} ${d.getDate()}`;
};

/* ─── tiny icons ─── */
const IconCheck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPause = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
    <rect x="8.5" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
  </svg>
);
const IconPlus = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconTrash = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 6.5v3M8 6.5v3M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUndo = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3 5.5h5a3 3 0 010 6H6M3 5.5L5.5 3M3 5.5L5.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconQuestion = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 5.5a1.5 1.5 0 012.9.5c0 1-1.4 1-1.4 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
  </svg>
);
const IconStar = ({ filled, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
    <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.6l1.4-6.3L2.9 9l6.4-.6z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconGrip = ({ size = 17 }) => (
  <svg width={Math.round(size * 0.647)} height={size} viewBox="0 0 11 17" fill="currentColor">
    <circle cx="3.5" cy="3" r="1.5"/><circle cx="7.5" cy="3" r="1.5"/>
    <circle cx="3.5" cy="8.5" r="1.5"/><circle cx="7.5" cy="8.5" r="1.5"/>
    <circle cx="3.5" cy="14" r="1.5"/><circle cx="7.5" cy="14" r="1.5"/>
  </svg>
);
const IconSun = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="21.5"/>
      <line x1="2.5" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="21.5" y2="12"/>
      <line x1="4.7" y1="4.7" x2="6.4" y2="6.4"/>
      <line x1="17.6" y1="17.6" x2="19.3" y2="19.3"/>
      <line x1="4.7" y1="19.3" x2="6.4" y2="17.6"/>
      <line x1="17.6" y1="6.4" x2="19.3" y2="4.7"/>
    </g>
  </svg>
);
const IconMoon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 14.5A8 8 0 119.5 4 6 6 0 0020 14.5z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

/* ─── task row ─── */
function TaskRow({ task, t, fonts, colors, tags, drag, isOver, ui, confirmKey, onEdit, onSetColor, onStatusChange, onDelete, onToggleStar, onCreateTag, onUpdateQuestion, isQExpanded, onToggleQ }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const isHold = task.status === "hold";
  const isStar = !!task.starred;
  const hasQ = task.questionWho || task.questionText;
  const tagOnTask = tags?.find((tg) => tg.color === task.color && tg.name?.trim());

  // tag (task.color) or hold owns the row tint; star is just the bold outline
  const tint = task.color
    ? rgba(task.color, t.dark ? 0.22 : 0.16)
    : isHold ? t.holdTint : t.surface;
  const border = task.color
    ? `1px solid ${rgba(task.color, 0.5)}`
    : isHold ? `1px dashed ${t.holdBorder}`
    : `1px solid ${t.border}`;
  const starOutline = isStar ? `inset 0 0 0 2px ${t.star}` : undefined;

  const commit = () => {
    const v = draft.trim();
    if (v && v !== task.text) onEdit(task.id, v);
    setEditing(false);
  };
  const startEdit = () => { setDraft(task.text); setEditing(true); };

  const iconBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: `${ui.btnPad}px`, display: "flex", alignItems: "center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        draggable={drag.enabled && !editing}
        onDragStart={() => drag.onStart(task.id)}
        onDragOver={(e) => { if (drag.enabled) { e.preventDefault(); drag.onOver(task.id); } }}
        onDrop={(e) => { if (drag.enabled) { e.preventDefault(); drag.onDrop(task.id); } }}
        onDragEnd={() => drag.onEnd()}
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: `${ui.padY}px ${ui.padX}px`,
          borderRadius: isQExpanded ? "6px 6px 0 0" : "6px",
          background: tint, border,
          boxShadow: starOutline,
          borderBottom: isQExpanded ? "none" : undefined,
          borderTop: isOver ? `2px solid ${t.accent}` : undefined,
          transition: "background 0.15s ease",
        }}>
        {/* drag handle */}
        {drag.enabled && (
          <span style={{ color: t.textFaint, cursor: "grab", display: "flex", flexShrink: 0 }}>
            <IconGrip size={ui.grip} />
          </span>
        )}

        {/* checkbox — click to complete */}
        <button onClick={() => onStatusChange(task.id, "done")} title="Mark done"
          style={{
            width: `${ui.checkbox}px`, height: `${ui.checkbox}px`,
            borderRadius: "4px", cursor: "pointer",
            border: `1.5px solid ${t.textFaint}`, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.accent, flexShrink: 0, padding: 0,
          }}>
          <span style={{ opacity: 0.32 }}><IconCheck size={ui.innerCheck} /></span>
        </button>

        {/* text (click to edit) */}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(task.text); setEditing(false); }
            }}
            style={{
              flex: 1, fontFamily: fonts.body, fontSize: `${ui.taskFont}px`,
              padding: "2px 5px", borderRadius: "3px",
              border: `1px solid ${t.accentBorder}`, background: t.surface,
              color: t.text, outline: "none",
            }}
          />
        ) : (
          <span onClick={startEdit} title="Click to edit"
            style={{
              flex: 1, fontFamily: fonts.body, fontSize: `${ui.taskFont}px`,
              color: isHold ? t.holdText : t.text, lineHeight: 1.35,
              fontStyle: isHold ? "italic" : "normal", cursor: "text",
              marginLeft: "4px",
            }}>
            {task.text}
            {isHold && <span style={{ fontSize: `${Math.round(ui.taskFont * 0.72)}px`, marginLeft: "8px", opacity: 0.7 }}>⏸ on hold</span>}
          </span>
        )}

        {/* tag pill — merged colour-picker trigger and tag badge */}
        <ColorPicker
          value={task.color || null} t={t} colors={colors} allowNone
          tags={tags} onCreateTag={onCreateTag}
          onChange={(c) => onSetColor(task.id, c)}
          renderTrigger={(toggle) => {
            const pillFont = `${Math.max(10, ui.taskFont - 5)}px`;
            const padding = "1px 8px";
            const radius = CONTROL.pill;
            if (tagOnTask) {
              return (
                <button onClick={toggle} title={`Tag: ${tagOnTask.name}`}
                  style={{
                    fontFamily: fonts.body, fontSize: pillFont, padding, borderRadius: radius,
                    background: rgba(tagOnTask.color, t.dark ? 0.28 : 0.18),
                    color: t.text,
                    border: `1px solid ${rgba(tagOnTask.color, 0.55)}`,
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}>{tagOnTask.name}</button>
              );
            }
            if (task.color) {
              return (
                <button onClick={toggle} title="Tag colour (click to rename)"
                  style={{
                    fontFamily: fonts.body, fontSize: pillFont, padding, borderRadius: radius,
                    background: rgba(task.color, t.dark ? 0.28 : 0.18),
                    color: t.textMuted,
                    border: `1px solid ${rgba(task.color, 0.55)}`,
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}>—</button>
              );
            }
            return (
              <button onClick={toggle} title="Add tag"
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding, borderRadius: radius,
                  background: "transparent", color: t.textFaint,
                  border: `1px dashed ${t.border}`,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>tag</button>
            );
          }}
        />

        {/* date */}
        <span style={{
          fontFamily: fonts.body, fontSize: `${ui.date}px`,
          color: t.textMuted, flexShrink: 0, whiteSpace: "nowrap", marginRight: "4px",
        }}>{formatDate(task.created)}</span>

        {/* star toggle */}
        <button onClick={() => onToggleStar(task.id)} title={isStar ? "Unstar" : "Star"}
          style={{ ...iconBtn, color: isStar ? t.star : t.textFaint }}>
          <IconStar filled={isStar} size={ui.star} />
        </button>

        {/* question toggle */}
        <button onClick={() => onToggleQ(task.id)}
          title={isQExpanded ? "Collapse question" : "Add/view question"}
          style={{ ...iconBtn, color: hasQ ? t.question : t.textFaint }}>
          <IconQuestion size={ui.icon} />
        </button>

        {/* hold toggle */}
        <button onClick={() => onStatusChange(task.id, isHold ? "active" : "hold")}
          title={isHold ? "Resume" : "Put on hold"}
          style={{ ...iconBtn, color: isHold ? t.holdText : t.textFaint }}>
          {isHold ? <IconUndo size={ui.icon} /> : <IconPause size={ui.icon} />}
        </button>

        {/* delete */}
        <button onClick={() => onDelete(task.id)}
          title={confirmKey === `del:${task.id}` ? "Click again to remove" : "Move to trash"}
          style={{
            ...iconBtn,
            color: confirmKey === `del:${task.id}` ? t.danger : t.textFaint,
            fontFamily: fonts.body,
            fontSize: confirmKey === `del:${task.id}` ? TYPE.caption : undefined,
            fontWeight: confirmKey === `del:${task.id}` ? 700 : undefined,
          }}>
          {confirmKey === `del:${task.id}` ? "sure?" : <IconTrash size={ui.icon} />}
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
              fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
              color: t.question, flexShrink: 0, width: "40px",
            }}>who</label>
            <input
              value={task.questionWho || ""}
              onChange={(e) => onUpdateQuestion(task.id, "questionWho", e.target.value)}
              placeholder="person or team…"
              style={{
                flex: 1, padding: "6px 9px", borderRadius: "4px",
                border: `1px solid ${t.border}`, background: t.surface,
                fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
                outline: "none", color: t.text,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
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
                fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
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
function DoneRow({ task, t, fonts, ui, confirmKey, onRestore, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "9px",
      padding: `${Math.max(2, ui.padY - 1)}px ${ui.padX + 6}px`, borderRadius: "5px",
      background: t.accentSoft,
    }}>
      {/* checked box — uncheck to move back to active */}
      <button onClick={() => onRestore(task.id)} title="Uncheck — move back to active"
        style={{
          width: `${ui.checkbox}px`, height: `${ui.checkbox}px`, borderRadius: "4px",
          background: t.accent, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: t.accentText, flexShrink: 0, padding: 0,
        }}><IconCheck size={ui.doneCheck} /></button>
      <span style={{
        flex: 1, fontFamily: fonts.body, fontSize: `${Math.round(ui.taskFont * 0.92)}px`,
        color: t.textMuted, textDecoration: "line-through",
        textDecorationColor: t.textFaint,
      }}>{task.text}</span>
      <span style={{
        fontFamily: fonts.heading, fontSize: `${Math.round(ui.date * 0.94)}px`, color: t.textFaint,
      }}>{formatDate(task.created)}</span>
      <button onClick={() => onDelete(task.id)}
        title={confirmKey === `del:${task.id}` ? "Click again to remove" : "Move to trash"}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "3px",
          color: confirmKey === `del:${task.id}` ? t.danger : t.textFaint,
          display: "flex", alignItems: "center",
          fontFamily: fonts.body,
          fontSize: confirmKey === `del:${task.id}` ? TYPE.caption : undefined,
          fontWeight: confirmKey === `del:${task.id}` ? 700 : undefined,
        }}>
        {confirmKey === `del:${task.id}` ? "sure?" : <IconTrash size={ui.icon} />}
      </button>
    </div>
  );
}

/* ─── palette dropdown ─── */
function PaletteSelect({ t, fonts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = getPalette(value);
  const dots = (cols) => (
    <span style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          width: "10px", height: "10px", borderRadius: "2px", background: c,
        }} />
      ))}
    </span>
  );
  const rowStyle = (active) => ({
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: SP.sm, cursor: "pointer",
    borderRadius: CONTROL.radiusSm, padding: "4px 8px",
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
    border: "none", background: active ? t.accentSoft : "transparent",
  });
  return (
    <span style={{ position: "relative", display: "block" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ ...rowStyle(false), border: `1px solid ${t.border}`, background: t.surface }}>
        <span>{current.name}</span>
        {dots(current.colors)}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "34px", left: 0, right: 0, zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}>
            {PALETTES.map((p) => (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                style={rowStyle(p.id === value)}>
                <span>{p.name}</span>
                {dots(p.colors)}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}

/* ─── font dropdown (previews each option in its own typeface) ─── */
function FontSelect({ value, onChange, hasCustom, t }) {
  const [open, setOpen] = useState(false);
  const opts = FONTS.map((f) => ({ id: f.id, label: f.label, stack: f.stack }));
  if (hasCustom) opts.push({ id: "custom", label: "Custom", stack: "'BJCustom', sans-serif" });
  const current = opts.find((o) => o.id === value) || opts[0];
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "120px", textAlign: "left", cursor: "pointer",
        border: `1px solid ${t.border}`, background: t.surface,
        borderRadius: CONTROL.radiusSm, padding: "4px 8px",
        fontFamily: current.stack, fontSize: TYPE.label, color: t.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{current.label}</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "30px", right: 0, zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 4, minWidth: "150px",
            maxHeight: "264px", overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}>
            {opts.map((o) => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                  border: "none", borderRadius: CONTROL.radiusSm, padding: "5px 8px",
                  background: o.id === value ? t.accentSoft : "transparent",
                  fontFamily: o.stack, fontSize: TYPE.body,
                  color: o.id === value ? t.accentText2 : t.text,
                }}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}

/* ─── add-task row (looks like a task row, with a + commit and inline controls) ─── */
function AddTaskRow({ t, fonts, colors, tags, ui, draft, onChange, onCommit, onReset, onCreateTag, inputRef, dragEnabled }) {
  const isHold = draft.status === "hold";
  const isStar = !!draft.starred;
  const hasQ = draft.questionWho || draft.questionText;
  const tagOnDraft = tags?.find((tg) => tg.color === draft.color && tg.name?.trim());
  const hasContent = !!(draft.text || draft.color || draft.starred ||
    draft.status === "hold" || draft.questionWho || draft.questionText || draft.showQ);

  const tint = draft.color
    ? rgba(draft.color, t.dark ? 0.22 : 0.16)
    : isHold ? t.holdTint : t.surface;
  const border = draft.color
    ? `1px solid ${rgba(draft.color, 0.5)}`
    : isHold ? `1px dashed ${t.holdBorder}`
    : `1px dashed ${t.border}`;
  const starOutline = isStar ? `inset 0 0 0 2px ${t.star}` : undefined;

  const iconBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: `${ui.btnPad}px`, display: "flex", alignItems: "center",
  };
  const pillFont = `${Math.max(10, ui.taskFont - 5)}px`;
  const pillPad = "1px 8px";
  const pillRadius = CONTROL.pill;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: `${ui.padY}px ${ui.padX}px`,
        borderRadius: hasQ && draft.showQ ? "6px 6px 0 0" : "6px",
        background: tint, border,
        boxShadow: starOutline,
        borderBottom: hasQ && draft.showQ ? "none" : undefined,
      }}>
        {/* grip-column spacer for visual alignment with draggable task rows */}
        {dragEnabled && (
          <span style={{
            width: Math.round(ui.grip * 0.647), height: ui.grip,
            flexShrink: 0, visibility: "hidden",
          }} />
        )}

        {/* + commit */}
        <button onClick={onCommit} title="Add task"
          style={{
            width: ui.checkbox, height: ui.checkbox, borderRadius: 4, cursor: "pointer",
            border: "none", background: t.accent, color: t.accentText,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, padding: 0,
          }}>
          <IconPlus size={ui.doneCheck} />
        </button>

        {/* text input */}
        <input ref={inputRef} value={draft.text}
          onChange={(e) => onChange({ text: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") onCommit(); }}
          placeholder="add a task…"
          style={{
            flex: 1, fontFamily: fonts.body, fontSize: `${ui.taskFont}px`,
            background: "transparent", border: "none", outline: "none",
            color: isHold ? t.holdText : t.text,
            fontStyle: isHold ? "italic" : "normal",
            marginLeft: "4px", padding: "2px 5px",
          }}
        />

        {/* tag pill */}
        <ColorPicker
          value={draft.color || null} t={t} colors={colors} allowNone
          tags={tags} onCreateTag={onCreateTag}
          onChange={(c) => onChange({ color: c })}
          renderTrigger={(toggle) => {
            if (tagOnDraft) return (
              <button onClick={toggle} title={`Tag: ${tagOnDraft.name}`}
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding: pillPad, borderRadius: pillRadius,
                  background: rgba(tagOnDraft.color, t.dark ? 0.28 : 0.18),
                  color: t.text,
                  border: `1px solid ${rgba(tagOnDraft.color, 0.55)}`,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>{tagOnDraft.name}</button>
            );
            if (draft.color) return (
              <button onClick={toggle} title="Tag colour (click to rename)"
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding: pillPad, borderRadius: pillRadius,
                  background: rgba(draft.color, t.dark ? 0.28 : 0.18),
                  color: t.textMuted,
                  border: `1px solid ${rgba(draft.color, 0.55)}`,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>—</button>
            );
            return (
              <button onClick={toggle} title="Add tag"
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding: pillPad, borderRadius: pillRadius,
                  background: "transparent", color: t.textFaint,
                  border: `1px dashed ${t.border}`,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>tag</button>
            );
          }}
        />

        {/* star */}
        <button onClick={() => onChange({ starred: !isStar })}
          title={isStar ? "Unstar" : "Star"}
          style={{ ...iconBtn, color: isStar ? t.star : t.textFaint }}>
          <IconStar filled={isStar} size={ui.star} />
        </button>

        {/* question */}
        <button onClick={() => onChange({ showQ: !draft.showQ })}
          title={draft.showQ ? "Hide question" : "Add question"}
          style={{ ...iconBtn, color: hasQ ? t.question : t.textFaint }}>
          <IconQuestion size={ui.icon} />
        </button>

        {/* hold */}
        <button onClick={() => onChange({ status: isHold ? "active" : "hold" })}
          title={isHold ? "Resume" : "Put on hold"}
          style={{ ...iconBtn, color: isHold ? t.holdText : t.textFaint }}>
          {isHold ? <IconUndo size={ui.icon} /> : <IconPause size={ui.icon} />}
        </button>

        {/* clear-draft (aligns with the trash slot in task rows) */}
        <button onClick={onReset} title="Clear"
          style={{
            ...iconBtn, color: t.textFaint,
            visibility: hasContent ? "visible" : "hidden",
          }}>
          <IconTrash size={ui.icon} />
        </button>
      </div>

      {draft.showQ && (
        <div style={{
          padding: "9px 12px 11px", borderRadius: "0 0 6px 6px",
          background: t.accentSoft,
          border: `1px solid ${t.border}`, borderTop: "none",
          display: "flex", flexDirection: "column", gap: "7px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
              color: t.question, flexShrink: 0, width: "40px",
            }}>who</label>
            <input value={draft.questionWho}
              onChange={(e) => onChange({ questionWho: e.target.value })}
              placeholder="person or team…"
              style={{
                flex: 1, padding: "6px 9px", borderRadius: "4px",
                border: `1px solid ${t.border}`, background: t.surface,
                fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
                outline: "none", color: t.text,
              }}/>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{
              fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
              color: t.question, flexShrink: 0, width: "40px", paddingTop: "4px",
            }}>ask</label>
            <textarea value={draft.questionText}
              onChange={(e) => onChange({ questionText: e.target.value })}
              placeholder="what do you need to find out…"
              rows={2}
              style={{
                flex: 1, padding: "6px 9px", borderRadius: "4px",
                border: `1px solid ${t.border}`, background: t.surface,
                fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
                outline: "none", color: t.text, resize: "vertical",
                lineHeight: 1.5, boxSizing: "border-box",
              }}/>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [trashOpen, setTrashOpen] = useState(false);
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
        else if (trashOpen) { setTrashOpen(false); e.preventDefault(); }
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
  }, [undo, redo, settingsOpen, trashOpen]);

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
    update((d) => ({
      ...d,
      tasks: d.tasks.map((x) => (x.id === id ? { ...x, color } : x)),
    }));

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
      const first = PRESETS.find((p) => p.palette === id);
      return {
        ...d,
        palette: id,
        theme: first ? presetTheme(d.theme, first) : d.theme,
      };
    });

  const setDensity = (id) =>
    update((d) => ({ ...d, density: id, taskFont: getDensity(id).taskFont }));

  const setTaskFont = (value) => update((d) => ({ ...d, taskFont: value }));

  const setHeadingFont = (id) => update((d) => ({ ...d, headingFont: id }));
  const setBodyFont = (id) => update((d) => ({ ...d, bodyFont: id }));

  // tag editor: add, rename, recolor (propagating to tagged tasks), remove
  const addTag = () =>
    update((d) => {
      if ((d.tags?.length || 0) >= MAX_TAGS) return d;
      const used = new Set((d.tags || []).map((t) => t.color));
      const pal = getPalette(d.palette).colors;
      const color = pal.find((c) => !used.has(c)) || pal[0];
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
    update((d) => ({
      ...d,
      tags: (d.tags || []).map((t) =>
        t.color === oldColor ? { ...t, color: newColor } : t
      ),
      tasks: d.tasks.map((x) =>
        x.color === oldColor ? { ...x, color: newColor } : x
      ),
    }));
  // inline naming from the per-task colour popover: creates a new tag
  const createTagInline = (color, name) =>
    update((d) => {
      if ((d.tags?.length || 0) >= MAX_TAGS) return d;
      if ((d.tags || []).some((t) => t.color === color)) return d;
      return { ...d, tags: [...(d.tags || []), { color, name }] };
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
  const isCurrent = selectedWeek === cur;
  const isPast = !isCurrent && !isEverything;
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

  const goToWeek = (wk) => { setSelectedWeek(wk); setQuery(""); };

  /* ── shared style helpers ── */
  const navBtn = (active) => ({
    width: "100%", textAlign: "center",
    background: active ? t.accentSoft : "transparent",
    border: "none", cursor: "pointer", borderRadius: CONTROL.radius,
    padding: "7px 10px", marginBottom: "2px",
    fontFamily: fonts.body, fontSize: TYPE.body,
    color: active ? t.accentText2 : t.textMuted,
    fontWeight: active ? 600 : 400,
  });
  const divider = { height: "1px", background: t.divider, margin: `${SP.sm}px ${SP.xs}px` };
  const settingRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
  };
  const linkBtn = {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.question,
    textAlign: "left",
  };
  const segBtn = (active) => ({
    flex: 1, cursor: "pointer", height: CONTROL.hSm,
    border: `1px solid ${t.border}`,
    background: active ? t.accent : "transparent",
    color: active ? t.accentText : t.textMuted,
    fontFamily: fonts.body, fontSize: TYPE.caption,
  });
  const panelToggle = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    width: "100%", background: "none", border: "none", cursor: "pointer",
    padding: SP.xs, fontFamily: fonts.body, fontSize: TYPE.body, color: t.textMuted,
  };
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
      {/* ─── sidebar ─── */}
      <aside className="bj-sidebar">
        <div className="bj-sidebar-top">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search…"
            style={{
              width: "100%", padding: "7px 10px", borderRadius: CONTROL.radius,
              border: `1px solid ${t.border}`, background: t.surface,
              fontFamily: fonts.body, fontSize: TYPE.body,
              outline: "none", color: t.text, marginBottom: SP.sm,
              boxSizing: "border-box", textAlign: "center",
            }}
          />
          <button style={navBtn(isEverything && !searching)}
            onClick={() => goToWeek("everything")}>
            ★ everything
          </button>
          <div style={divider} />
        </div>
        <div className="bj-sidebar-weeks">
          {weeksDesc.map((wk) => {
            const active = selectedWeek === wk && !searching;
            if (wk === cur) {
              return (
                <button key={wk} style={navBtn(active)} onClick={() => goToWeek(wk)}>
                  this week
                </button>
              );
            }
            const p = weekParts(wk);
            return (
              <button key={wk} onClick={() => goToWeek(wk)}
                style={{ ...navBtn(active), display: "flex", alignItems: "baseline" }}>
                <span style={{ flex: 1, textAlign: "right" }}>{p.left}</span>
                <span style={{ padding: "0 5px", flexShrink: 0 }}>–</span>
                <span style={{ flex: 1, textAlign: "left" }}>{p.right}</span>
              </button>
            );
          })}
        </div>
        <div className="bj-sidebar-bottom">
          <div style={divider} />

        {/* settings panel */}
        <button onClick={() => setSettingsOpen((o) => !o)} style={panelToggle}>
          <span style={{
            display: "inline-block",
            transform: settingsOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>▸</span>
          ⚙ settings
        </button>
        {settingsOpen && (
          <div style={{
            padding: "8px 4px 4px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            {/* appearance + palette side by side */}
            <div style={{ display: "flex", gap: "6px", alignItems: "stretch" }}>
              <button
                onClick={() => setThemeKey("mode", t.dark ? "light" : "dark")}
                title={t.dark ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  width: 26, flexShrink: 0,
                  cursor: "pointer", padding: 0,
                  border: `1px solid ${t.border}`, background: t.surface,
                  borderRadius: 5,
                  color: t.textMuted, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                {t.dark ? <IconSun size={13} /> : <IconMoon size={13} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PaletteSelect t={t} fonts={fonts} value={data.palette}
                  onChange={selectPalette} />
              </div>
            </div>
            {/* theme — presets set highlight/star/hold; the fine-tune pickers
                below override the active preset's individual colours */}
            <div>
              <div style={{ ...settingRow, marginBottom: SP.xs }}>theme</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.xs }}>
                {PRESETS.filter((p) => p.palette === data.palette).map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p)} title={p.name}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "flex-start", gap: "5px",
                      cursor: "pointer", borderRadius: CONTROL.radiusSm,
                      border: `1px solid ${t.border}`, background: t.surface,
                      padding: "4px 6px", fontFamily: fonts.body,
                      fontSize: TYPE.caption, color: t.textMuted,
                    }}>
                    <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                      {[p.highlight, p.star, p.hold].map((c, i) => (
                        <span key={i} style={{
                          width: "9px", height: "9px", borderRadius: "50%",
                          background: c, display: "inline-block", flexShrink: 0,
                        }} />
                      ))}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" }}>{p.name}</span>
                  </button>
                ))}
              </div>
              {/* fine-tune: indented + accent rule signals these belong to the
                  active preset and override its individual colours */}
              <div style={{
                marginTop: SP.sm, paddingTop: SP.sm, paddingLeft: SP.sm,
                borderTop: `1px solid ${t.divider}`,
                borderLeft: `2px solid ${t.accentBorder}`,
                display: "flex", flexDirection: "column", gap: SP.sm,
              }}>
                <div style={{ ...settingRow, color: t.textFaint }}>fine-tune</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                  columnGap: SP.md, rowGap: SP.sm }}>
                  <div style={settingRow}>
                    <span>highlight</span>
                    <ColorPicker value={data.theme.highlight} t={t} colors={paletteColors}
                      align="left" size={16}
                      onChange={(c) => c && setThemeKey("highlight", c)} />
                  </div>
                  <div style={settingRow}>
                    <span>star</span>
                    <ColorPicker value={data.theme.star} t={t} colors={paletteColors}
                      align="left" size={16}
                      onChange={(c) => c && setThemeKey("star", c)} />
                  </div>
                  <div style={settingRow}>
                    <span>hold</span>
                    <ColorPicker value={data.theme.hold} t={t} colors={paletteColors}
                      align="left" size={16}
                      onChange={(c) => c && setThemeKey("hold", c)} />
                  </div>
                  <div style={settingRow}>
                    <span>background</span>
                    <ColorPicker
                      value={(t.dark ? data.theme.bgDark : data.theme.bgLight) || null}
                      t={t} colors={paletteColors} allowNone variant="bg"
                      align="left" size={16}
                      onChange={(c) => setThemeKey(t.dark ? "bgDark" : "bgLight", c)} />
                  </div>
                </div>
              </div>
            </div>
            {/* tags */}
            <div>
              <div style={{ ...settingRow, marginBottom: "4px" }}>
                <span>tags ({(data.tags || []).length}/{MAX_TAGS})</span>
              </div>
              {(data.tags || []).map((tag) => (
                <div key={tag.color} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  marginBottom: "4px",
                }}>
                  <ColorPicker value={tag.color} t={t} colors={paletteColors} size={16}
                    align="left"
                    onChange={(c) => c && c !== tag.color && setTagColor(tag.color, c)} />
                  <input
                    value={tag.name}
                    onChange={(e) => setTagName(tag.color, e.target.value)}
                    placeholder="name…"
                    maxLength={25}
                    style={{
                      flex: 1, minWidth: 0, padding: "3px 7px", borderRadius: 4,
                      border: `1px solid ${t.border}`, background: t.surface,
                      fontFamily: fonts.body, fontSize: TYPE.label, color: t.text, outline: "none",
                    }}
                  />
                  <button
                    onClick={() => armOrRun(`tag:${tag.color}`, () => removeTag(tag.color))}
                    title={confirmKey === `tag:${tag.color}` ? "Click again to remove" : "Remove tag"}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 0, color: t.danger,
                      fontFamily: fonts.body,
                      fontSize: confirmKey === `tag:${tag.color}` ? TYPE.caption : TYPE.label,
                      fontWeight: confirmKey === `tag:${tag.color}` ? 700 : 400,
                    }}>
                    {confirmKey === `tag:${tag.color}` ? "sure?" : "✕"}
                  </button>
                </div>
              ))}
              {(data.tags || []).length < MAX_TAGS && (
                <button onClick={addTag} style={{ ...linkBtn }}>
                  + add tag
                </button>
              )}
            </div>
            {/* spacing density */}
            <div>
              <div style={{ ...settingRow, marginBottom: "4px" }}>spacing</div>
              <div style={{ display: "flex" }}>
                {DENSITIES.map((dn, i) => (
                  <button key={dn.id} onClick={() => setDensity(dn.id)}
                    style={{
                      ...segBtn(data.density === dn.id),
                      borderRadius: i === 0 ? "5px 0 0 5px"
                        : i === DENSITIES.length - 1 ? "0 5px 5px 0" : 0,
                      borderLeft: i === 0 ? `1px solid ${t.border}` : "none",
                    }}>{dn.id}</button>
                ))}
              </div>
            </div>
            {/* fonts */}
            <div>
              <div style={{ ...settingRow, marginBottom: "5px" }}>fonts</div>
              <div style={{ ...settingRow, marginBottom: "5px" }}>
                <span>headings</span>
                <FontSelect value={data.headingFont} onChange={setHeadingFont}
                  hasCustom={!!fontName} t={t} />
              </div>
              <div style={{ ...settingRow, marginBottom: "5px" }}>
                <span>body</span>
                <FontSelect value={data.bodyFont} onChange={setBodyFont}
                  hasCustom={!!fontName} t={t} />
              </div>
              <div style={{ ...settingRow, marginBottom: "5px" }}>
                <span>custom file</span>
                <label style={{ ...linkBtn, cursor: "pointer", display: "flex",
                  alignItems: "center", gap: "4px" }}>
                  <span style={{ color: t.textMuted, fontSize: TYPE.label, maxWidth: "84px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fontName || "import…"}
                  </span>
                  ✎
                  <input type="file" accept=".otf,.ttf,font/otf,font/ttf"
                    onChange={onFontFile} style={{ display: "none" }} />
                </label>
              </div>
              {fontName && (
                <button onClick={resetFont}
                  style={{ ...linkBtn, color: t.danger, marginBottom: "5px" }}>
                  remove custom font
                </button>
              )}
              <div style={{ ...settingRow, gap: "8px" }}>
                <span style={{ flexShrink: 0 }}>text size</span>
                <input type="range" min={12} max={30} value={data.taskFont}
                  onChange={(e) => setTaskFont(Number(e.target.value))}
                  style={{ flex: 1, minWidth: 0, accentColor: t.accent }} />
                <span style={{ width: "22px", textAlign: "right" }}>{data.taskFont}</span>
              </div>
            </div>
            <button onClick={loadSamples} style={{ ...linkBtn }}>
              + load sample weeks
            </button>
          </div>
        )}

        {/* trash bin */}
        <button onClick={() => setTrashOpen((o) => !o)} style={panelToggle}>
          <span style={{
            display: "inline-block",
            transform: trashOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>▸</span>
          🗑 trash ({data.trash.length})
        </button>
        {trashOpen && (
          <div style={{ padding: "6px 4px 4px", display: "flex",
            flexDirection: "column", gap: "5px" }}>
            {data.trash.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: TYPE.label,
                color: t.textFaint, textAlign: "center" }}>empty</div>
            )}
            {data.trash.map((x) => (
              <div key={x.id} style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
              }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{x.text}</span>
                <button onClick={() => restoreFromTrash(x.id)} title="Restore"
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: "2px", color: t.question, display: "flex" }}>
                  <IconUndo />
                </button>
                <button onClick={() => armOrRun(`forever:${x.id}`, () => deleteForever(x.id))}
                  title={confirmKey === `forever:${x.id}` ? "Click again to delete forever" : "Delete forever"}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: 0, color: t.danger, fontFamily: fonts.body,
                    fontSize: confirmKey === `forever:${x.id}` ? TYPE.caption : TYPE.label,
                    fontWeight: confirmKey === `forever:${x.id}` ? 700 : 400 }}>
                  {confirmKey === `forever:${x.id}` ? "sure?" : "✕"}
                </button>
              </div>
            ))}
            {data.trash.length > 0 && (
              <button onClick={() => armOrRun("empty", emptyTrash)}
                style={{ ...linkBtn, color: t.danger, textAlign: "center",
                  marginTop: "2px", fontWeight: confirmKey === "empty" ? 700 : 400 }}>
                {confirmKey === "empty" ? "click again to empty" : "empty trash"}
              </button>
            )}
          </div>
        )}
        </div>
      </aside>

      {/* ─── main ─── */}
      <main className="bj-main">
        {searching ? (
          /* ── search results ── */
          <div>
            <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
              color: t.text, margin: "0 0 14px", lineHeight: 1.1 }}>
              search · “{query.trim()}”
            </h1>
            {taskHits.length === 0 && noteHits.length === 0 && (
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
            {noteHits.length > 0 && (
              <div>
                <div style={{ fontFamily: fonts.heading, fontSize: TYPE.heading,
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
                  ui={ui} draft={draft} onChange={updateDraft} onCommit={commitDraft}
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
                  ui={ui}
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
                        ui={ui}
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
