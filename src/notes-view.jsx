import { weekLabel, currentWeekKey } from "./weeks.js";
import { TYPE } from "./tokens.js";

/* ─── notes view: global scratchpad + every note in one place ───
 * The scratchpad is the zero-decision capture bucket; below it, week notes
 * and per-task notes are browsable in reverse-chronological order, each card
 * jumping back to where the note lives. */
export default function NotesView({ data, t, fonts, onSetScratchpad, goToWeek, onOpenTask }) {
  const cur = currentWeekKey();

  const weekNotes = Object.entries(data.weekNotes || {})
    .filter(([, v]) => v && v.trim())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  // tasks carrying any kind of note content (question fields now; free notes
  // and meeting notes once tasks grow them)
  const noteText = (x) =>
    [x.questionWho && `who: ${x.questionWho}`, x.questionText, x.note,
      x.meeting?.attendees && `with: ${x.meeting.attendees}`, x.meeting?.notes]
      .filter(Boolean).join(" · ");
  const taskNotes = (data.tasks || [])
    .filter((x) => x.questionWho || x.questionText || x.note ||
      x.meeting?.attendees || x.meeting?.notes)
    .sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : b.created - a.created));

  const sectionHead = {
    fontFamily: fonts.heading, fontSize: TYPE.heading,
    color: t.textMuted, marginBottom: "6px",
  };
  const card = {
    textAlign: "left", cursor: "pointer",
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: "6px", padding: "8px 11px",
    fontFamily: fonts.body, fontSize: TYPE.body, color: t.textMuted,
  };
  const weekTag = (wk) => (wk === cur ? "this week" : weekLabel(wk, true));
  const clip = (s, n = 140) => (s.length > n ? s.slice(0, n) + "…" : s);

  return (
    <div>
      <h1 style={{ fontFamily: fonts.heading, fontSize: TYPE.display, fontWeight: 600,
        color: t.text, margin: "0 0 14px", lineHeight: 1.1 }}>
        notes
      </h1>

      {/* scratchpad — always-there bucket, not tied to any week */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{
          fontFamily: fonts.heading, fontSize: TYPE.title, color: t.textMuted,
          display: "block", marginBottom: "6px",
        }}>scratchpad</label>
        <textarea
          value={data.scratchpad || ""}
          onChange={(e) => onSetScratchpad(e.target.value)}
          placeholder="anything, anytime — it doesn't need a home…"
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

      {/* week notes */}
      {weekNotes.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={sectionHead}>week notes ({weekNotes.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {weekNotes.map(([wk, text]) => (
              <button key={wk} onClick={() => goToWeek(wk)} style={card}
                title="Open this week">
                <span style={{ color: t.text }}>{weekTag(wk)}</span>
                {" — "}
                {clip(text)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* task notes */}
      {taskNotes.length > 0 && (
        <div>
          <div style={sectionHead}>task notes ({taskNotes.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {taskNotes.map((x) => (
              <button key={x.id} onClick={() => onOpenTask(x)} style={card}
                title="Open this task">
                <span style={{ display: "flex", justifyContent: "space-between",
                  gap: "10px", marginBottom: "2px" }}>
                  <span style={{ color: t.text }}>{x.text}</span>
                  <span style={{ fontSize: TYPE.label, whiteSpace: "nowrap" }}>
                    {weekTag(x.week)}
                  </span>
                </span>
                <span style={{ fontSize: TYPE.label }}>{clip(noteText(x))}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {weekNotes.length === 0 && taskNotes.length === 0 && (
        <div style={{ fontFamily: fonts.heading, fontSize: TYPE.heading, color: t.textFaint }}>
          week and task notes will collect here
        </div>
      )}
    </div>
  );
}
