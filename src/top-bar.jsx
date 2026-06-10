import { useState, useRef, useEffect } from "react";
import { weekParts } from "./weeks.js";
import { IconGear, IconHistory, IconInbox, IconTag } from "./icons.jsx";
import { TYPE, CONTROL } from "./tokens.js";

/* ─── top bar: search, navigation, week history popover, settings ─── */
export default function TopBar({ t, fonts, query, setQuery, searching, selectedWeek, cur, weeksDesc, goToWeek, onOpenSettings, inboxCount, onCapture, tagOptions, tagFilter, onTagFilter }) {
  const [histOpen, setHistOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capture, setCapture] = useState("");
  const captureRef = useRef(null);
  useEffect(() => { if (captureOpen) captureRef.current?.focus(); }, [captureOpen]);
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
      {/* tag filter — pick a tag as the search, no typing needed */}
      {tagOptions?.length > 0 && (
        <span style={{ position: "relative" }}>
          <button onClick={() => setTagsOpen((o) => !o)}
            title={tagFilter ? "Tag filter active" : "Filter by tag"}
            style={{
              width: CONTROL.h + 4, height: CONTROL.h + 4,
              borderRadius: CONTROL.radius, cursor: "pointer",
              border: `1px solid ${t.border}`, background: t.surface,
              color: tagFilter
                ? (tagOptions.find((tg) => tg.color === tagFilter)?.hex || t.accentText2)
                : t.textMuted,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
            <IconTag size={15} filled={!!tagFilter} dashed={!tagFilter} />
          </button>
          {tagsOpen && (
            <>
              <div onClick={() => setTagsOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: `${CONTROL.h + 8}px`, left: 0, zIndex: 41,
                width: "190px", maxHeight: "320px", overflowY: "auto",
                background: t.popover, border: `1px solid ${t.border}`,
                borderRadius: 6, padding: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              }}>
                {tagOptions.map((tg) => {
                  const active = tagFilter === tg.color;
                  return (
                    <button key={tg.color}
                      onClick={() => { onTagFilter(active ? null : tg.color); setTagsOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        width: "100%", textAlign: "left", cursor: "pointer",
                        border: "none", borderRadius: CONTROL.radiusSm,
                        padding: "6px 8px", marginBottom: "1px",
                        background: active ? t.accentSoft : "transparent",
                        fontFamily: fonts.body, fontSize: TYPE.body,
                        color: active ? t.accentText2 : t.textMuted,
                        fontWeight: active ? 600 : 400,
                      }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%",
                        background: tg.hex, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tg.name}</span>
                      {active && <span>✕</span>}
                    </button>
                  );
                })}
                {tagFilter && (
                  <button onClick={() => { onTagFilter(null); setTagsOpen(false); }}
                    style={{
                      width: "100%", textAlign: "center", cursor: "pointer",
                      border: "none", background: "transparent", padding: "6px 8px",
                      fontFamily: fonts.body, fontSize: TYPE.label, color: t.danger,
                    }}>clear filter</button>
                )}
              </div>
            </>
          )}
        </span>
      )}

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

        {/* quick capture — zero decisions, lands in the inbox to sort later */}
        <span style={{ position: "relative" }}>
          <button style={navBtn(captureOpen)} onClick={() => setCaptureOpen((o) => !o)}
            title="Quick capture — no week, no tag, no decisions">
            <IconInbox size={14} />
            {inboxCount > 0 ? `inbox (${inboxCount})` : "inbox"}
          </button>
          {captureOpen && (
            <>
              <div onClick={() => setCaptureOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: `${CONTROL.h + 8}px`, right: 0, zIndex: 41,
                width: "min(280px, 86vw)", padding: "10px",
                background: t.popover, border: `1px solid ${t.border}`,
                borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              }}>
                <input
                  ref={captureRef}
                  value={capture}
                  onChange={(e) => setCapture(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && capture.trim()) {
                      onCapture(capture.trim());
                      setCapture("");
                    }
                    if (e.key === "Escape") setCaptureOpen(false);
                  }}
                  placeholder="get it out of your head…"
                  style={{
                    width: "100%", padding: "7px 10px", borderRadius: CONTROL.radiusSm,
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontFamily: fonts.body, fontSize: TYPE.body,
                    outline: "none", color: t.text, boxSizing: "border-box",
                  }}
                />
                <div style={{
                  fontFamily: fonts.body, fontSize: TYPE.caption,
                  color: t.textFaint, marginTop: "6px",
                }}>
                  enter to add — keep going, sort it out later
                </div>
              </div>
            </>
          )}
        </span>

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
