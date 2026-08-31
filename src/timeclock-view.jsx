import { useState, useEffect, useMemo } from "react";
import { currentWeekKey, weekKey, todayKey } from "./weeks.js";
import { TYPE, SP, CONTROL } from "./tokens.js";
import {
  allSessions,
  applyTimeInput,
  dayKeyOf,
  dayLabel,
  durationOf,
  formatDuration,
  formatStopwatch,
  formatTimeOfDay,
  timeInputValue,
  totalsByDay,
  totalsByLabel,
} from "./clock.js";

/* ─── timeclock: one button to start, one to stop, and an honest log ───
 *
 * The clock is deliberately separate from tasks — most of what eats a day
 * never becomes a task — but a session can point at one, so "where did the
 * week go" and "what was I meant to be doing" can be read side by side.
 *
 * Everything here is editable after the fact. Forgetting to clock out is the
 * normal case, not the exception, so a wrong entry has to be a five-second fix
 * rather than a reason to distrust the whole log. */

// A month of scrollback: enough to reconstruct an invoice, short enough to read.
const DAYS_SHOWN = 30;

export default function TimeclockView({
  data, t, fonts, onClockIn, onClockOut, onEditSession, onDeleteSession,
  onAddSession, onOpenTask,
}) {
  const clock = data.clock || { running: null, sessions: [] };
  const running = clock.running;
  const runningId = running ? running.id : null;

  const [now, setNow] = useState(() => Date.now());
  const [label, setLabel] = useState("");
  const [taskId, setTaskId] = useState("");
  const [editing, setEditing] = useState(null);

  // Only tick while something is actually running.
  useEffect(() => {
    if (runningId == null) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningId]);

  const cur = currentWeekKey();
  const todayK = todayKey();
  const taskById = useMemo(
    () => new Map((data.tasks || []).map((x) => [x.id, x])),
    [data.tasks],
  );

  // What a session is called: its own label, else the task it points at.
  const nameOf = (s) => {
    const own = (s.label || "").trim();
    if (own) return own;
    const task = s.taskId == null ? null : taskById.get(s.taskId);
    return task ? task.text : "";
  };

  const sessions = allSessions(clock);
  const dayTotals = totalsByDay(sessions, now);
  const todayTotal = dayTotals.get(todayK) || 0;
  const weekSessions = sessions.filter((s) => weekKey(s.start) === cur);
  const weekTotal = weekSessions.reduce((sum, s) => sum + durationOf(s, now), 0);
  const weekByLabel = totalsByLabel(weekSessions, now, nameOf);

  // Sessions are newest-first, so days come out in descending order already.
  const days = [];
  const byDay = new Map();
  for (const s of sessions) {
    const key = dayKeyOf(s.start);
    if (!byDay.has(key)) {
      byDay.set(key, []);
      days.push(key);
    }
    byDay.get(key).push(s);
  }
  const shown = days.slice(0, DAYS_SHOWN);

  // Anything open enough to still be worth clocking against.
  const taskOptions = (data.tasks || [])
    .filter((x) => x.status !== "done" && (x.week === cur || !x.week))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  /* ─── styles ─── */

  const card = {
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: CONTROL.radius, padding: `${SP.lg}px`,
  };
  const field = {
    padding: "7px 12px", borderRadius: CONTROL.radius,
    border: `1px solid ${t.border}`, background: t.surfaceAlt,
    fontFamily: fonts.body, fontSize: TYPE.body,
    color: t.text, outline: "none", boxSizing: "border-box",
  };
  const bigButton = (danger) => ({
    cursor: "pointer", border: "none", borderRadius: CONTROL.radius,
    padding: "10px 20px", whiteSpace: "nowrap",
    background: danger ? t.holdFill : t.accent,
    color: danger ? t.holdText : t.accentText,
    fontFamily: fonts.body, fontSize: TYPE.body, fontWeight: 600,
  });
  const smallButton = (tone) => ({
    cursor: "pointer", borderRadius: CONTROL.radiusSm,
    border: `1px solid ${t.border}`, background: "transparent",
    padding: "4px 9px", height: CONTROL.hSm,
    fontFamily: fonts.body, fontSize: TYPE.label,
    color: tone === "danger" ? t.danger : t.textMuted,
  });
  const sectionHead = {
    fontFamily: fonts.heading, fontSize: TYPE.heading,
    color: t.textMuted, marginBottom: `${SP.xs + 2}px`,
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    gap: `${SP.md}px`,
  };
  const rowButton = {
    width: "100%", textAlign: "left", cursor: "pointer",
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: CONTROL.radius, padding: "7px 11px",
    fontFamily: fonts.body, fontSize: TYPE.body, color: t.text,
    display: "flex", alignItems: "baseline", gap: `${SP.md}px`,
  };
  const editLabel = {
    fontFamily: fonts.body, fontSize: TYPE.caption,
    color: t.textFaint, display: "block", marginBottom: "3px",
  };

  /* ─── session editing ─── */

  const setStart = (s, value) => {
    const next = applyTimeInput(s.start, value);
    if (next == null) return;
    // Refuse a start after its own end rather than silently making it negative.
    if (s.end != null && next >= s.end) return;
    onEditSession(s.id, { start: next });
  };

  const setEnd = (s, value) => {
    if (s.end == null) return;
    let next = applyTimeInput(s.end, value);
    if (next == null) return;
    // An end before the start means the shift ran past midnight.
    if (next <= s.start) next += 24 * 60 * 60 * 1000;
    onEditSession(s.id, { end: next });
  };

  const sessionEditor = (s) => (
    <div style={{
      ...card, padding: `${SP.md}px`, marginTop: "5px",
      background: t.surfaceAlt,
      display: "flex", flexWrap: "wrap", gap: `${SP.md}px`, alignItems: "flex-end",
    }}>
      <div style={{ flex: "1 1 190px" }}>
        <label style={editLabel}>what</label>
        <input
          value={s.label || ""}
          onChange={(e) => onEditSession(s.id, { label: e.target.value })}
          placeholder={nameOf(s) || "untitled"}
          style={{ ...field, width: "100%" }}
        />
      </div>
      <div>
        <label style={editLabel}>from</label>
        <input type="time" value={timeInputValue(s.start)}
          onChange={(e) => setStart(s, e.target.value)} style={field} />
      </div>
      <div>
        <label style={editLabel}>to</label>
        {s.end == null ? (
          <div style={{ ...field, color: t.textFaint }}>still running</div>
        ) : (
          <input type="time" value={timeInputValue(s.end)}
            onChange={(e) => setEnd(s, e.target.value)} style={field} />
        )}
      </div>
      <div style={{ display: "flex", gap: `${SP.sm}px`, marginLeft: "auto" }}>
        {s.taskId != null && taskById.has(s.taskId) && (
          <button style={smallButton()} onClick={() => onOpenTask(taskById.get(s.taskId))}>
            open task
          </button>
        )}
        <button style={smallButton("danger")}
          onClick={() => { setEditing(null); onDeleteSession(s.id); }}>
          delete
        </button>
      </div>
    </div>
  );

  const sessionRow = (s) => {
    const open = s.end == null;
    return (
      <div key={s.id}>
        <button onClick={() => setEditing(editing === s.id ? null : s.id)}
          title="Edit this entry"
          style={{
            ...rowButton,
            borderColor: open ? t.accentBorder : t.border,
            background: open ? t.accentSoft : t.surface,
          }}>
          <span style={{ color: t.textMuted, fontSize: TYPE.label, whiteSpace: "nowrap" }}>
            {formatTimeOfDay(s.start)} – {open ? "now" : formatTimeOfDay(s.end)}
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", color: nameOf(s) ? t.text : t.textFaint }}>
            {nameOf(s) || "untitled"}
          </span>
          <span style={{ whiteSpace: "nowrap", fontWeight: 600,
            color: open ? t.accentText2 : t.textMuted }}>
            {open ? formatStopwatch(durationOf(s, now)) : formatDuration(durationOf(s, now))}
          </span>
        </button>
        {editing === s.id && sessionEditor(s)}
      </div>
    );
  };

  /* ─── render ─── */

  return (
    <div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
        color: t.text, margin: `0 0 ${SP.lg - 2}px`, lineHeight: 1.1,
        display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
        timeclock
        <span style={{ fontFamily: fonts.heading, fontSize: TYPE.heading,
          color: t.textMuted, fontWeight: 400 }}>
          {formatDuration(todayTotal)} today · {formatDuration(weekTotal)} this week
        </span>
      </h1>

      {/* the clock itself */}
      {running ? (
        <div style={{ ...card, borderColor: t.accentBorder, background: t.accentSoft,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: `${SP.lg}px`, flexWrap: "wrap", marginBottom: `${SP.xl}px` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted }}>
              on the clock since {formatTimeOfDay(running.start)}
              {nameOf(running) ? ` · ${nameOf(running)}` : ""}
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 40, fontWeight: 600,
              color: t.accentText2, lineHeight: 1.15,
              fontVariantNumeric: "tabular-nums" }}>
              {formatStopwatch(durationOf(running, now))}
            </div>
          </div>
          <button style={bigButton(true)} onClick={onClockOut}>clock out</button>
        </div>
      ) : (
        <div style={{ ...card, display: "flex", gap: `${SP.md}px`, flexWrap: "wrap",
          alignItems: "center", marginBottom: `${SP.xl}px` }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              onClockIn(label.trim(), taskId === "" ? null : Number(taskId));
              setLabel("");
              setTaskId("");
            }}
            placeholder="what are you working on?"
            style={{ ...field, flex: "1 1 220px" }}
          />
          {taskOptions.length > 0 && (
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)}
              title="Attach this session to a task"
              style={{ ...field, flex: "0 1 200px", cursor: "pointer" }}>
              <option value="">no task</option>
              {taskOptions.map((x) => (
                <option key={x.id} value={x.id}>{x.text}</option>
              ))}
            </select>
          )}
          <button style={bigButton(false)}
            onClick={() => {
              onClockIn(label.trim(), taskId === "" ? null : Number(taskId));
              setLabel("");
              setTaskId("");
            }}>
            clock in
          </button>
        </div>
      )}

      {/* where this week went */}
      {weekByLabel.length > 0 && (
        <div style={{ marginBottom: `${SP.xl}px` }}>
          <div style={sectionHead}>
            <span>this week</span>
            <span style={{ fontSize: TYPE.label }}>{formatDuration(weekTotal)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {weekByLabel.map(([name, ms]) => (
              <div key={name} style={{
                display: "flex", alignItems: "baseline", gap: `${SP.md}px`,
                fontFamily: fonts.body, fontSize: TYPE.body, color: t.text,
                padding: "3px 0",
              }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                {/* a proportional rule, so the week reads at a glance */}
                <span aria-hidden="true" style={{
                  flex: "0 0 90px", height: "5px", borderRadius: CONTROL.pill,
                  background: t.divider, overflow: "hidden",
                }}>
                  <span style={{
                    display: "block", height: "100%", borderRadius: CONTROL.pill,
                    width: `${weekTotal ? Math.max(4, (ms / weekTotal) * 100) : 0}%`,
                    background: t.accent,
                  }} />
                </span>
                <span style={{ color: t.textMuted, whiteSpace: "nowrap",
                  minWidth: "56px", textAlign: "right" }}>
                  {formatDuration(ms)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* the log */}
      <div style={sectionHead}>
        <span>entries</span>
        <button style={smallButton()} onClick={() => setEditing(onAddSession())}
          title="Log time you forgot to clock">
          + add entry
        </button>
      </div>

      {shown.length === 0 ? (
        <div style={{ fontFamily: fonts.heading, fontSize: TYPE.title, color: t.textFaint }}>
          clock in and your hours collect here
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: `${SP.lg}px` }}>
          {shown.map((key) => (
            <div key={key}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                gap: `${SP.md}px`, marginBottom: "5px",
                fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
              }}>
                <span>{dayLabel(key, todayK)}</span>
                <span>{formatDuration(dayTotals.get(key) || 0)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {byDay.get(key).map(sessionRow)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
