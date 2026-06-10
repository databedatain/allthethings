import { useState } from "react";
import { weekParts } from "./weeks.js";
import { IconGear, IconHistory } from "./icons.jsx";
import { TYPE, CONTROL } from "./tokens.js";

/* ─── top bar: search, navigation, week history popover, settings ─── */
export default function TopBar({ t, fonts, query, setQuery, searching, selectedWeek, cur, weeksDesc, goToWeek, onOpenSettings }) {
  const [histOpen, setHistOpen] = useState(false);
  const isEverything = selectedWeek === "everything" && !searching;
  const isCurrent = selectedWeek === cur && !searching;
  const isNotes = selectedWeek === "notes" && !searching;
  const isPast = !searching && selectedWeek !== cur &&
    selectedWeek !== "everything" && selectedWeek !== "notes";

  const navBtn = (active) => ({
    background: active ? t.accentSoft : "transparent",
    border: "none", cursor: "pointer", borderRadius: CONTROL.radius,
    padding: "7px 10px", whiteSpace: "nowrap",
    fontFamily: fonts.body, fontSize: TYPE.body,
    color: active ? t.accentText2 : t.textMuted,
    fontWeight: active ? 600 : 400,
    display: "flex", alignItems: "center", gap: "6px",
  });

  const pastWeeks = weeksDesc.filter((wk) => wk !== cur);

  return (
    <div className="bj-topbar">
      <input
        className="bj-topbar-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search…"
        style={{
          padding: "7px 12px", borderRadius: CONTROL.radius,
          border: `1px solid ${t.border}`, background: t.surface,
          fontFamily: fonts.body, fontSize: TYPE.body,
          outline: "none", color: t.text, boxSizing: "border-box",
        }}
      />
      <div className="bj-topbar-nav">
        <button style={navBtn(isCurrent)} onClick={() => goToWeek(cur)}>
          this week
        </button>
        <button style={navBtn(isEverything)} onClick={() => goToWeek("everything")}>
          ★ everything
        </button>
        <button style={navBtn(isNotes)} onClick={() => goToWeek("notes")}>
          ✎ notes
        </button>

        {/* week history — jump to any past week */}
        <span style={{ position: "relative" }}>
          <button style={navBtn(isPast || histOpen)} onClick={() => setHistOpen((o) => !o)}
            title="Browse past weeks">
            <IconHistory size={14} />
            history
          </button>
          {histOpen && (
            <>
              <div onClick={() => setHistOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: `${CONTROL.h + 8}px`, right: 0, zIndex: 41,
                width: "216px", maxHeight: "320px", overflowY: "auto",
                background: t.popover, border: `1px solid ${t.border}`,
                borderRadius: 6, padding: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              }}>
                {pastWeeks.length === 0 && (
                  <div style={{
                    fontFamily: fonts.body, fontSize: TYPE.label,
                    color: t.textFaint, textAlign: "center", padding: "10px 0",
                  }}>no past weeks yet</div>
                )}
                {pastWeeks.map((wk) => {
                  const p = weekParts(wk);
                  const active = selectedWeek === wk && !searching;
                  return (
                    <button key={wk}
                      onClick={() => { goToWeek(wk); setHistOpen(false); }}
                      style={{
                        ...navBtn(active), width: "100%",
                        display: "flex", alignItems: "baseline", gap: 0,
                        padding: "6px 10px", marginBottom: "1px",
                      }}>
                      <span style={{ flex: 1, textAlign: "right" }}>{p.left}</span>
                      <span style={{ padding: "0 5px", flexShrink: 0 }}>–</span>
                      <span style={{ flex: 1, textAlign: "left" }}>{p.right}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </span>

        <button onClick={onOpenSettings} title="Settings"
          style={{
            width: CONTROL.h + 4, height: CONTROL.h + 4,
            borderRadius: CONTROL.radius, cursor: "pointer",
            border: `1px solid ${t.border}`, background: t.surface,
            color: t.textMuted, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
          <IconGear size={16} />
        </button>
      </div>
    </div>
  );
}
