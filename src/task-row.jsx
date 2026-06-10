import { useState } from "react";
import ColorPicker from "./color-picker.jsx";
import { IconCheck, IconPause, IconPlus, IconTrash, IconUndo, IconQuestion, IconStar, IconGrip, IconNote, IconPeople, IconArrowUp, IconTarget } from "./icons.jsx";
import { rgba, rowFill, getIntensity, resolveColor, colorToken } from "./theme.js";
import { TYPE, CONTROL } from "./tokens.js";

const formatDate = (ts) => {
  const d = new Date(ts);
  const mo = d.toLocaleString("default", { month: "short" });
  return `${mo} ${d.getDate()}`;
};

/* ─── task row ─── */
export function TaskRow({ task, t, fonts, colors, tags, drag, isOver, ui, intensity, confirmKey, onEdit, onSetColor, onStatusChange, onDelete, onToggleStar, onCreateTag, onPatch, onAddSubtask, onPatchSubtask, onRemoveSubtask, onPromoteSubtask, onSetMeeting, isExpanded, onToggleDetail, isFocused, onToggleFocus, isSpotlit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const isHold = task.status === "hold";
  const isStar = !!task.starred;
  // a task is a meeting when its tag is meeting-flavored
  const isMeeting = tags?.find((tg) => tg.color === task.color)?.kind === "meeting";
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.done).length;
  const hasDetail = !!(task.questionWho || task.questionText || task.note ||
    subs.length || isMeeting);

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
  const starOutline = [
    isStar ? `inset 0 0 0 2px ${t.star}` : null,
    isSpotlit ? `0 0 0 3px ${t.accent}` : null,
  ].filter(Boolean).join(", ") || undefined;

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
    <div id={`bj-task-${task.id}`} data-bj-task={task.id} style={{ display: "flex", flexDirection: "column" }}>
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
          borderRadius: isExpanded ? "6px 6px 0 0" : "6px",
          background: tint, border,
          boxShadow: starOutline,
          borderBottom: isExpanded ? "none" : undefined,
          borderTop: isOver ? `2px solid ${t.accent}` : undefined,
          transition: "background 0.15s ease",
          position: "relative",
        }}>
        {/* drag handle */}
        {drag.enabled && (
          <span style={{ color: t.textFaint, cursor: "grab", display: "flex", flexShrink: 0 }}>
            <IconGrip size={ui.grip} />
          </span>
        )}

        {/* checkbox — click to complete */}
        <button onClick={(e) => onStatusChange(task.id, "done", { x: e.clientX, y: e.clientY })} title="Mark done"
          style={{
            width: `${ui.checkbox}px`, height: `${ui.checkbox}px`,
            borderRadius: "4px", cursor: "pointer",
            border: `1.5px solid ${t.textFaint}`, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: t.accent, flexShrink: 0, padding: 0,
          }} />

        {/* meeting marker */}
        {isMeeting && (
          <span title="Meeting" style={{ color: t.question, display: "flex", flexShrink: 0, marginLeft: "2px" }}>
            <IconPeople size={ui.icon} />
          </span>
        )}

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
            const dot = Math.max(10, Math.round(ui.taskFont * 0.55));
            return (
              <button onClick={toggle}
                title={tagOnTask ? `Tag: ${tagOnTask.name}` : task.color ? "Tag colour" : "Add tag"}
                className={task.color ? undefined : "bj-row-action"}
                style={{
                  width: dot, height: dot, borderRadius: "50%", padding: 0,
                  cursor: "pointer", flexShrink: 0,
                  background: task.color ? taskColor : "transparent",
                  border: task.color
                    ? `1px solid ${rgba(taskColor, 0.7)}`
                    : `1.5px dashed ${t.textFaint}`,
                }} />
            );
          }}
        />

        {/* sub-checklist progress */}
        {subs.length > 0 && (
          <span title={`${subsDone} of ${subs.length} done`}
            style={{
              fontFamily: fonts.body, fontSize: `${Math.max(10, ui.date - 2)}px`,
              color: t.textMuted, border: `1px solid ${t.border}`,
              borderRadius: CONTROL.pill, padding: "0 7px",
              flexShrink: 0, whiteSpace: "nowrap",
            }}>{subsDone}/{subs.length}</span>
        )}

        {/* rollover age — gentle visibility for tasks that keep moving on */}
        {(task.rolled || 0) >= 2 && (
          <span title={`rolled over ${task.rolled} weeks`}
            style={{
              fontFamily: fonts.body, fontSize: `${Math.max(10, ui.date - 2)}px`,
              color: task.rolled >= 4 ? t.textMuted : t.textFaint,
              flexShrink: 0, whiteSpace: "nowrap",
            }}>↻{task.rolled}w</span>
        )}

        {/* date — present on hover, out of the way otherwise */}
        <span className="bj-row-action" style={{
          fontFamily: fonts.body, fontSize: `${ui.date}px`,
          color: t.textMuted, flexShrink: 0, whiteSpace: "nowrap", marginRight: "4px",
        }}>{formatDate(task.created)}</span>

        {/* detail toggle — visible when the task carries notes/subtasks/meeting */}
        <button onClick={() => onToggleDetail(task.id)}
          title={isExpanded ? "Collapse details" : "Notes, action items, meeting"}
          className={hasDetail ? undefined : "bj-row-action"}
          style={{ ...iconBtn, color: hasDetail ? t.question : t.textFaint }}>
          <IconNote size={ui.icon} />
        </button>

        {/* today's focus — a set target stays visible like a set star */}
        {onToggleFocus && (
          <button onClick={() => onToggleFocus(task.id)}
            title={isFocused ? "Remove from today's focus" : "Add to today's focus (up to 3)"}
            className={isFocused ? undefined : "bj-row-action"}
            style={{ ...iconBtn, color: isFocused ? t.accentText2 : t.textFaint }}>
            <IconTarget size={ui.icon} />
          </button>
        )}

        {/* star toggle — a set star stays visible; an empty one hides until hover */}
        <button onClick={() => onToggleStar(task.id)} title={isStar ? "Unstar" : "Star"}
          className={isStar ? undefined : "bj-row-action"}
          style={{ ...iconBtn, color: isStar ? t.star : t.textFaint }}>
          <IconStar filled={isStar} size={ui.star} />
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

        {/* progress along the bottom edge */}
        {subs.length > 0 && (
          <span style={{
            position: "absolute", left: 0, bottom: 0, height: "2px",
            width: `${Math.round((subsDone / subs.length) * 100)}%`,
            background: t.accent, borderRadius: "0 0 0 6px",
            transition: "width 0.2s ease", pointerEvents: "none",
          }} />
        )}
      </div>

      {/* collapsible detail panel */}
      {isExpanded && (
        <TaskDetailPanel task={task} t={t} fonts={fonts} ui={ui}
          isMeeting={isMeeting} onSetMeeting={onSetMeeting}
          onPatch={onPatch} onAddSubtask={onAddSubtask}
          onPatchSubtask={onPatchSubtask} onRemoveSubtask={onRemoveSubtask}
          onPromoteSubtask={onPromoteSubtask} />
      )}
    </div>
  );
}

/* ─── done row ─── */
export function DoneRow({ task, t, fonts, ui, tags, confirmKey, onRestore, onDelete, isExpanded, onToggleDetail, panelProps }) {
  const isMeeting = tags?.find((tg) => tg.color === task.color)?.kind === "meeting";
  const hasDetail = !!(task.questionWho || task.questionText || task.note ||
    task.subtasks?.length || isMeeting);
  return (
    <div data-bj-task={task.id} style={{ display: "flex", flexDirection: "column" }}>
    <div className="bj-row" style={{
      display: "flex", alignItems: "center", gap: "9px",
      padding: `${Math.max(2, ui.padY - 1)}px ${ui.padX + 6}px`,
      borderRadius: isExpanded ? "4px 4px 0 0" : CONTROL.radiusSm,
      background: t.doneFill || t.accentSoft,
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
      {onToggleDetail && (
        <button onClick={() => onToggleDetail(task.id)}
          title={isExpanded ? "Collapse details" : "Notes, action items"}
          className={hasDetail ? undefined : "bj-row-action"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "3px",
            color: hasDetail ? t.question : t.textFaint,
            display: "flex", alignItems: "center",
          }}>
          <IconNote size={ui.icon} />
        </button>
      )}
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
    {isExpanded && panelProps && (
      <TaskDetailPanel task={task} t={t} fonts={fonts} ui={ui}
        isMeeting={isMeeting} {...panelProps} />
    )}
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
            const dot = Math.max(10, Math.round(ui.taskFont * 0.55));
            return (
              <button onClick={toggle}
                title={tagOnDraft ? `Tag: ${tagOnDraft.name}` : draft.color ? "Tag colour" : "Add tag"}
                style={{
                  width: dot, height: dot, borderRadius: "50%", padding: 0,
                  cursor: "pointer", flexShrink: 0,
                  background: draft.color ? draftColor : "transparent",
                  border: draft.color
                    ? `1px solid ${rgba(draftColor, 0.7)}`
                    : `1.5px dashed ${t.textFaint}`,
                }} />
            );
          }}
        />

        {/* question */}
        <button onClick={() => onChange({ showQ: !draft.showQ })}
          title={draft.showQ ? "Hide question" : "Add question"}
          style={{ ...iconBtn, color: hasQ ? t.question : t.textFaint }}>
          <IconQuestion size={ui.icon} />
        </button>

        {/* star */}
        <button onClick={() => onChange({ starred: !isStar })}
          title={isStar ? "Unstar" : "Star"}
          style={{ ...iconBtn, color: isStar ? t.star : t.textFaint }}>
          <IconStar filled={isStar} size={ui.star} />
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


/* ─── per-task detail panel: note, then trigger pills for the optional
 * sections — meeting | action items | questions. A meeting is the same task
 * wearing the meeting tag: attendees appear and the checklist relabels in
 * spirit (it's always "action items" now). */
export function TaskDetailPanel({ task, t, fonts, ui, isMeeting, onSetMeeting, onPatch, onAddSubtask, onPatchSubtask, onRemoveSubtask, onPromoteSubtask }) {
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.done).length;
  const hasQ = !!(task.questionWho || task.questionText);
  const [subDraft, setSubDraft] = useState("");
  // sections with content start open; empty ones wait behind their pill
  const [showActions, setShowActions] = useState(subs.length > 0);
  const [showQ, setShowQ] = useState(hasQ);

  const label = {
    fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
    color: t.question, flexShrink: 0, width: "40px",
  };
  const field = {
    flex: 1, padding: "6px 9px", borderRadius: "4px",
    border: `1px solid ${t.border}`, background: t.surface,
    fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
    outline: "none", color: t.text,
  };
  const ghostBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: "2px", display: "flex", alignItems: "center",
  };
  const pill = (active) => ({
    fontFamily: fonts.body, fontSize: `${ui.qLabel}px`,
    padding: "3px 10px", borderRadius: CONTROL.pill, cursor: "pointer",
    border: `1px solid ${active ? t.question : t.border}`,
    background: active ? t.surface : "transparent",
    color: active ? t.question : t.textMuted,
    display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
  });
  const section = {
    borderTop: `1px solid ${t.divider}`,
    paddingTop: "8px", marginTop: "2px",
    display: "flex", flexDirection: "column", gap: "7px",
  };

  const commitSub = () => {
    const v = subDraft.trim();
    if (!v) return;
    onAddSubtask(task.id, v);
    if (!showActions) setShowActions(true);
    setSubDraft("");
  };

  const subCheck = Math.max(12, Math.round(ui.checkbox * 0.75));
  const pct = subs.length ? Math.round((subsDone / subs.length) * 100) : 0;

  return (
    <div style={{
      padding: "9px 12px 11px", borderRadius: "0 0 6px 6px",
      background: t.accentSoft,
      border: `1px solid ${t.border}`, borderTop: "none",
      display: "flex", flexDirection: "column", gap: "8px",
    }}>
      {/* note / minutes — the panel's core, always visible */}
      <div style={{ display: "flex", gap: "8px" }}>
        <label style={{ ...label, paddingTop: "4px" }}>{isMeeting ? "minutes" : "note"}</label>
        <textarea
          value={task.note || ""}
          onChange={(e) => onPatch(task.id, { note: e.target.value })}
          placeholder={isMeeting ? "what was discussed…" : "anything worth keeping…"}
          rows={2}
          style={{ ...field, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
        />
      </div>

      {/* section triggers */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button onClick={() => onSetMeeting(task.id, !isMeeting)}
          title={isMeeting ? "Back to a plain task (removes the meeting tag)" : "Make this a meeting (applies the meeting tag)"}
          style={pill(isMeeting)}>
          <IconPeople size={ui.qLabel} />
          meeting
        </button>
        <button onClick={() => setShowActions((o) => !o)}
          title="Action items"
          style={pill(showActions)}>
          <IconCheck size={ui.qLabel} />
          action items
          {subs.length > 0 && (
            <span style={{ color: t.textMuted }}>{subsDone}/{subs.length}</span>
          )}
        </button>
        <button onClick={() => setShowQ((o) => !o)}
          title="Who to ask, what to ask"
          style={pill(showQ)}>
          <IconQuestion size={ui.qLabel} />
          questions
          {hasQ && !showQ && (
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: t.question, display: "inline-block",
            }} />
          )}
        </button>
      </div>

      {/* meeting: attendees */}
      {isMeeting && (
        <div style={{ ...section, flexDirection: "row", alignItems: "center", gap: "8px" }}>
          <label style={label}>with</label>
          <input
            value={task.meeting?.attendees || ""}
            onChange={(e) => onPatch(task.id, { meeting: { ...task.meeting, attendees: e.target.value } })}
            placeholder="who's present…"
            style={field}
          />
        </div>
      )}

      {/* action items */}
      {showActions && (
        <div style={section}>
          {subs.length > 0 && (
            <div title={`${subsDone} of ${subs.length} done`} style={{
              height: "4px", borderRadius: "2px", background: t.border,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${pct}%`, background: t.accent,
                borderRadius: "2px", transition: "width 0.2s ease",
              }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {subs.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <button onClick={() => onPatchSubtask(task.id, s.id, { done: !s.done })}
                  title={s.done ? "Uncheck" : "Mark done"}
                  style={{
                    width: `${subCheck}px`, height: `${subCheck}px`,
                    borderRadius: "3px", cursor: "pointer", flexShrink: 0, padding: 0,
                    border: s.done ? "none" : `1.5px solid ${t.textFaint}`,
                    background: s.done ? t.accent : "transparent",
                    color: t.accentText, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>
                  {s.done && <IconCheck size={subCheck - 4} />}
                </button>
                <input
                  value={s.text}
                  onChange={(e) => onPatchSubtask(task.id, s.id, { text: e.target.value })}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
                    color: s.done ? t.textMuted : t.text,
                    textDecoration: s.done ? "line-through" : "none",
                    textDecorationColor: t.textFaint, padding: "2px 0",
                  }}
                />
                <button onClick={() => onPromoteSubtask(task.id, s.id)}
                  title="Promote to its own task (this week)"
                  style={{ ...ghostBtn, color: t.textFaint }}>
                  <IconArrowUp size={ui.qLabel} />
                </button>
                <button onClick={() => onRemoveSubtask(task.id, s.id)} title="Remove"
                  style={{ ...ghostBtn, color: t.textFaint, fontFamily: fonts.body,
                    fontSize: `${ui.qLabel}px` }}>
                  ✕
                </button>
              </div>
            ))}
            {/* add row */}
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{
                width: `${subCheck}px`, height: `${subCheck}px`, flexShrink: 0,
                borderRadius: "3px", border: `1.5px dashed ${t.border}`,
              }} />
              <input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitSub(); }}
                onBlur={commitSub}
                placeholder="add an action item…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontFamily: fonts.body, fontSize: `${ui.qInput}px`,
                  color: t.text, padding: "2px 0",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* questions: who / ask */}
      {showQ && (
        <div style={section}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={label}>who</label>
            <input
              value={task.questionWho || ""}
              onChange={(e) => onPatch(task.id, { questionWho: e.target.value })}
              placeholder="person or team…"
              style={field}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{ ...label, paddingTop: "4px" }}>ask</label>
            <textarea
              value={task.questionText || ""}
              onChange={(e) => onPatch(task.id, { questionText: e.target.value })}
              placeholder="what do you need to find out…"
              rows={2}
              style={{ ...field, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
