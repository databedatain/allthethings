import { useState, useRef } from "react";
import { NEUTRALS, shades, bgShades } from "./theme.js";
import { TYPE, SP, CONTROL } from "./tokens.js";

const HEX_RE = /^#?[0-9a-f]{6}$/i;

/* Inline swatch trigger that opens a palette popover.
 *
 * Props:
 *   value, onChange, allowNone, variant, colors, size, t  — see below
 *   tags?, onCreateTag?  — render a named-tags section + inline name-this-color
 *   align?               — popover horizontal alignment: "right" (default) or "left"
 *   renderTrigger?       — `(toggle, open) => node` to replace the default swatch trigger
 */
export default function ColorPicker({
  value, onChange, allowNone, variant, colors, size = 20, t,
  tags, onCreateTag, align = "right", renderTrigger,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState("");
  const [hexDraft, setHexDraft] = useState("");
  const hostRef = useRef(null);
  const none = `linear-gradient(45deg, transparent 47%, ${t.textFaint} 47%, ${t.textFaint} 53%, transparent 53%)`;
  const columnShades = (c) => (variant === "bg" ? bgShades(c, t.dark) : shades(c));
  const namedTags = tags?.filter((tg) => tg.name && tg.name.trim()) || [];
  const tagMatch = tags?.find((tg) => tg.color === value && tg.name?.trim());
  const canName = !!(value && onCreateTag && !tagMatch);

  const close = () => { setOpen(false); setDraft(""); setHexDraft(""); };
  // the hex field is for *entering* a custom colour — it starts empty rather
  // than echoing the current selection, so a palette pick is never re-submitted
  // as a literal hex (which wouldn't shift with the palette).
  // The popover is fixed-positioned from the trigger's rect and clamped to the
  // viewport, so it can't run off-screen on small displays or near edges.
  const PANEL_W = 248;
  const PANEL_H = 320;
  const toggle = () => {
    if (!open && hostRef.current) {
      const r = hostRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(PANEL_W, vw - 16);
      let left = align === "left" ? r.left : r.right - w;
      left = Math.max(8, Math.min(left, vw - w - 8));
      let top = r.bottom + 6;
      if (top + PANEL_H > vh && r.top - PANEL_H - 6 > 8) top = r.top - PANEL_H - 6;
      top = Math.max(8, top);
      setPos({ left, top, maxWidth: w });
    }
    setOpen(!open);
  };

  const submitHex = () => {
    const raw = hexDraft.trim();
    if (!HEX_RE.test(raw)) return;
    const norm = "#" + raw.replace("#", "").toLowerCase();
    onChange(norm);
    close();
  };

  const submitName = () => {
    const name = draft.trim();
    if (name) onCreateTag(value, name);
    close();
  };

  const Cell = ({ color }) => {
    const selected = (value || null) === (color || null);
    return (
      <button
        onClick={() => { onChange(color); close(); }}
        title={color || "none"}
        style={{
          width: 17, height: 17, borderRadius: CONTROL.radiusSm, padding: 0, cursor: "pointer",
          border: selected ? `2px solid ${t.text}` : `1px solid ${t.border}`,
          background: color || (t.dark ? "#3a3a3f" : "#fff"),
          backgroundImage: color ? "none" : none,
        }}
      />
    );
  };

  const defaultTrigger = (
    <button
      onClick={toggle}
      title="Pick color"
      style={{
        width: size, height: size, borderRadius: CONTROL.radiusSm, padding: 0, cursor: "pointer",
        border: `1px solid ${t.border}`,
        background: value || (t.dark ? "#3a3a3f" : "#fff"),
        backgroundImage: value ? "none" : none,
      }}
    />
  );

  return (
    <span ref={hostRef} style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      {renderTrigger ? renderTrigger(toggle, open) : defaultTrigger}
      {open && (
        <>
          <div
            onClick={close}
            data-bj-keep-open=""
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: "fixed", top: pos?.top ?? 26, left: pos?.left ?? 8,
            maxWidth: pos?.maxWidth, maxHeight: "min(76vh, 360px)",
            overflowY: "auto", zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: CONTROL.radius, padding: SP.sm,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            fontFamily: "inherit",
          }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
              {allowNone && <Cell color={null} />}
              {NEUTRALS.map((c) => <Cell key={c} color={c} />)}
              <input
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitHex();
                  if (e.key === "Escape") close();
                }}
                onBlur={submitHex}
                placeholder="#hex"
                spellCheck={false}
                style={{
                  width: 80, marginLeft: 4,
                  padding: "2px 5px", borderRadius: CONTROL.radiusSm,
                  border: `1px solid ${t.border}`, background: t.surface,
                  fontSize: TYPE.caption, color: t.text, outline: "none",
                  fontFamily: "ui-monospace, 'Courier New', monospace",
                }}
              />
            </div>
            {namedTags.length > 0 && (
              <div style={{
                marginBottom: 8, paddingBottom: 8,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <div style={{ fontSize: TYPE.caption, color: t.textMuted, marginBottom: 4 }}>
                  tags
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {namedTags.map((tg) => (
                    <button key={tg.color + tg.name}
                      onClick={() => { onChange(tg.color); close(); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                        border: "none", padding: "3px 5px", borderRadius: CONTROL.radiusSm,
                        background: value === tg.color ? t.accentSoft : "transparent",
                        fontSize: TYPE.label, color: t.text, textAlign: "left", width: "100%",
                      }}>
                      <span style={{
                        width: 11, height: 11, borderRadius: "50%",
                        background: tg.color, flexShrink: 0,
                        border: `1px solid ${t.border}`,
                      }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis" }}>{tg.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(colors || []).map((c) => (
                <div key={c} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {columnShades(c).map((s) => <Cell key={s} color={s} />)}
                </div>
              ))}
            </div>
            {canName && (
              <div style={{
                marginTop: 8, paddingTop: 8,
                borderTop: `1px solid ${t.border}`,
                display: "flex", gap: 5, alignItems: "center",
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", background: value,
                  flexShrink: 0, border: `1px solid ${t.border}`,
                }} />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitName();
                    if (e.key === "Escape") close();
                  }}
                  placeholder="name this color…"
                  maxLength={25}
                  style={{
                    flex: 1, minWidth: 0, padding: "3px 6px", borderRadius: CONTROL.radiusSm,
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontSize: TYPE.caption, color: t.text, outline: "none",
                  }}
                />
                <button onClick={submitName}
                  disabled={!draft.trim()}
                  title="Save tag"
                  style={{
                    background: t.accent, color: t.accentText, border: "none",
                    borderRadius: CONTROL.radiusSm, padding: "3px 9px", cursor: "pointer",
                    fontSize: TYPE.label, fontWeight: 600,
                    opacity: draft.trim() ? 1 : 0.4,
                  }}>+</button>
              </div>
            )}
          </div>
        </>
      )}
    </span>
  );
}
