import { useState } from "react";
import ColorPicker from "./color-picker.jsx";
import { IconCheck, IconPause, IconPlus, IconTrash, IconUndo, IconQuestion, IconStar, IconGrip } from "./icons.jsx";
import { rgba, rowFill, getIntensity, resolveColor, colorToken } from "./theme.js";
import { TYPE, CONTROL } from "./tokens.js";

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  return `${mo} ${d.getDate()}`;
};

/* ─── task row ─── */
export function TaskRow({ task, t, fonts, colors, tags, drag, isOver, ui, intensity, confirmKey, onEdit, onSetColor, onStatusChange, onDelete, onToggleStar, onCreateTag, onUpdateQuestion, isQExpanded, onToggleQ }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const isHold = task.status === "hold";
  const isStar = !!task.starred;
  const hasQ = task.questionWho || task.questionText;
  const tagOnTask = tags?.find((tg) => tg.color === task.color && tg.name?.trim());
  // tokens resolve to a concrete hex against the active palette for display.
  // resolvedTags feeds the (hex-based) ColorPicker its tag shortcuts.
  const taskColor = resolveColor(task.color, colors);
  const resolvedTags = tags?.map((tg) => ({ ...tg, color: resolveColor(tg.color, colors) }));

  // tag (task.color) or hold owns the row tint; star is just the bold outline
  const tint = task.color
    ? rowFill(taskColor, t.dark, intensity)
    : isHold ? t.holdFill : t.rowBase;
  const border = task.color
    ? `1px solid ${rgba(taskColor, getIntensity(intensity).borderA)}`
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
        className="bj-row"
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
          value={taskColor} t={t} colors={colors} allowNone
          tags={resolvedTags} onCreateTag={onCreateTag}
          onChange={(c) => onSetColor(task.id, c)}
          renderTrigger={(toggle) => {
            const pillFont = `${Math.max(10, ui.taskFont - 5)}px`;
            const padding = "1px 8px";
            const radius = CONTROL.pill;
            if (tagOnTask) {
              const tagHex = resolveColor(tagOnTask.color, colors);
              return (
                <button onClick={toggle} title={`Tag: ${tagOnTask.name}`}
                  style={{
                    fontFamily: fonts.body, fontSize: pillFont, padding, borderRadius: radius,
                    background: rgba(tagHex, t.dark ? 0.28 : 0.18),
                    color: t.text,
                    border: `1px solid ${rgba(tagHex, 0.55)}`,
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                  }}>{tagOnTask.name}</button>
              );
            }
            if (task.color) {
              return (
                <button onClick={toggle} title="Tag colour (click to rename)"
                  style={{
                    fontFamily: fonts.body, fontSize: pillFont, padding, borderRadius: radius,
                    background: rgba(taskColor, t.dark ? 0.28 : 0.18),
                    color: t.textMuted,
                    border: `1px solid ${rgba(taskColor, 0.55)}`,
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

        {/* rollover age — gentle visibility for tasks that keep moving on */}
        {(task.rolled || 0) >= 2 && (
          <span title={`rolled over ${task.rolled} weeks`}
            style={{
              fontFamily: fonts.body, fontSize: `${Math.max(10, ui.date - 2)}px`,
              color: task.rolled >= 4 ? t.textMuted : t.textFaint,
              flexShrink: 0, whiteSpace: "nowrap",
            }}>↻{task.rolled}w</span>
        )}

        {/* date */}
        <span style={{
          fontFamily: fonts.body, fontSize: `${ui.date}px`,
          color: t.textMuted, flexShrink: 0, whiteSpace: "nowrap", marginRight: "4px",
        }}>{formatDate(task.created)}</span>

        {/* star toggle — a set star stays visible; an empty one hides until hover */}
        <button onClick={() => onToggleStar(task.id)} title={isStar ? "Unstar" : "Star"}
          className={isStar ? undefined : "bj-row-action"}
          style={{ ...iconBtn, color: isStar ? t.star : t.textFaint }}>
          <IconStar filled={isStar} size={ui.star} />
        </button>

        {/* question toggle — visible when a question exists */}
        <button onClick={() => onToggleQ(task.id)}
          title={isQExpanded ? "Collapse question" : "Add/view question"}
          className={hasQ ? undefined : "bj-row-action"}
          style={{ ...iconBtn, color: hasQ ? t.question : t.textFaint }}>
          <IconQuestion size={ui.icon} />
        </button>

        {/* hold toggle — visible while on hold (resume affordance) */}
        <button onClick={() => onStatusChange(task.id, isHold ? "active" : "hold")}
          title={isHold ? "Resume" : "Put on hold"}
          className={isHold ? undefined : "bj-row-action"}
          style={{ ...iconBtn, color: isHold ? t.holdText : t.textFaint }}>
          {isHold ? <IconUndo size={ui.icon} /> : <IconPause size={ui.icon} />}
        </button>

        {/* delete — always secondary; stays revealed while the confirm is armed */}
        <button onClick={() => onDelete(task.id)}
          title={confirmKey === `del:${task.id}` ? "Click again to remove" : "Move to trash"}
          className={`bj-row-action${confirmKey === `del:${task.id}` ? " is-armed" : ""}`}
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
export function DoneRow({ task, t, fonts, ui, confirmKey, onRestore, onDelete }) {
  return (
    <div className="bj-row" style={{
      display: "flex", alignItems: "center", gap: "9px",
      padding: `${Math.max(2, ui.padY - 1)}px ${ui.padX + 6}px`, borderRadius: CONTROL.radiusSm,
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
        fontFamily: fonts.body, fontSize: `${Math.round(ui.date * 0.94)}px`, color: t.textFaint,
      }}>{formatDate(task.created)}</span>
      <button onClick={() => onDelete(task.id)}
        title={confirmKey === `del:${task.id}` ? "Click again to remove" : "Move to trash"}
        className={`bj-row-action${confirmKey === `del:${task.id}` ? " is-armed" : ""}`}
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

/* ─── add-task row (looks like a task row, with a + commit and inline controls) ─── */
export function AddTaskRow({ t, fonts, colors, tags, ui, intensity, draft, onChange, onCommit, onReset, onCreateTag, inputRef, dragEnabled }) {
  const isHold = draft.status === "hold";
  const isStar = !!draft.starred;
  const hasQ = draft.questionWho || draft.questionText;
  const tagOnDraft = tags?.find((tg) => tg.color === draft.color && tg.name?.trim());
  const draftColor = resolveColor(draft.color, colors);
  const resolvedTags = tags?.map((tg) => ({ ...tg, color: resolveColor(tg.color, colors) }));
  const hasContent = !!(draft.text || draft.color || draft.starred ||
    draft.status === "hold" || draft.questionWho || draft.questionText || draft.showQ);

  const tint = draft.color
    ? rowFill(draftColor, t.dark, intensity)
    : isHold ? t.holdFill : t.rowBase;
  const border = draft.color
    ? `1px solid ${rgba(draftColor, getIntensity(intensity).borderA)}`
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
          value={draftColor} t={t} colors={colors} allowNone
          tags={resolvedTags} onCreateTag={onCreateTag}
          onChange={(c) => onChange({ color: colorToken(c, colors) })}
          renderTrigger={(toggle) => {
            if (tagOnDraft) {
              const tagHex = resolveColor(tagOnDraft.color, colors);
              return (
              <button onClick={toggle} title={`Tag: ${tagOnDraft.name}`}
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding: pillPad, borderRadius: pillRadius,
                  background: rgba(tagHex, t.dark ? 0.28 : 0.18),
                  color: t.text,
                  border: `1px solid ${rgba(tagHex, 0.55)}`,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>{tagOnDraft.name}</button>
            );
            }
            if (draft.color) return (
              <button onClick={toggle} title="Tag colour (click to rename)"
                style={{
                  fontFamily: fonts.body, fontSize: pillFont, padding: pillPad, borderRadius: pillRadius,
                  background: rgba(draftColor, t.dark ? 0.28 : 0.18),
                  color: t.textMuted,
                  border: `1px solid ${rgba(draftColor, 0.55)}`,
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

