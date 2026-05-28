import { useState } from "react";
import { NEUTRALS, shades, bgShades } from "./theme.js";

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
  const [draft, setDraft] = useState("");
  const [hexDraft, setHexDraft] = useState("");
  const none = `linear-gradient(45deg, transparent 47%, ${t.textFaint} 47%, ${t.textFaint} 53%, transparent 53%)`;
  const columnShades = (c) => (variant === "bg" ? bgShades(c, t.dark) : shades(c));
  const namedTags = tags?.filter((tg) => tg.name && tg.name.trim()) || [];
  const tagMatch = tags?.find((tg) => tg.color === value && tg.name?.trim());
  const canName = !!(value && onCreateTag && !tagMatch);

  const close = () => { setOpen(false); setDraft(""); };
  const toggle = () => {
    if (!open) {
      // sync the hex field to the current value when the popover opens
      setHexDraft(value && /^#[0-9a-f]{6}$/i.test(value) ? value : "");
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
          width: 17, height: 17, borderRadius: 3, padding: 0, cursor: "pointer",
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
        width: size, height: size, borderRadius: 4, padding: 0, cursor: "pointer",
        border: `1px solid ${t.border}`,
        background: value || (t.dark ? "#3a3a3f" : "#fff"),
        backgroundImage: value ? "none" : none,
      }}
    />
  );

  const popoverPos = align === "left" ? { left: 0 } : { right: 0 };

  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      {renderTrigger ? renderTrigger(toggle, open) : defaultTrigger}
      {open && (
        <>
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: "absolute", top: 26, ...popoverPos, zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            fontFamily: "inherit",
          }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
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
                  flex: 1, minWidth: 0, marginLeft: 4,
                  padding: "2px 6px", borderRadius: 3,
                  border: `1px solid ${t.border}`, background: t.surface,
                  fontSize: 11, color: t.text, outline: "none",
                  fontFamily: "ui-monospace, 'Courier New', monospace",
                }}
              />
            </div>
            {namedTags.length > 0 && (
              <div style={{
                marginBottom: 8, paddingBottom: 8,
                borderBottom: `1px solid ${t.border}`,
              }}>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>
                  tags
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {namedTags.map((tg) => (
                    <button key={tg.color + tg.name}
                      onClick={() => { onChange(tg.color); close(); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                        border: "none", padding: "3px 5px", borderRadius: 4,
                        background: value === tg.color ? t.accentSoft : "transparent",
                        fontSize: 13, color: t.text, textAlign: "left", width: "100%",
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
            <div style={{ display: "flex", gap: 4 }}>
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
                    flex: 1, minWidth: 0, padding: "3px 6px", borderRadius: 4,
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontSize: 12, color: t.text, outline: "none",
                  }}
                />
                <button onClick={submitName}
                  disabled={!draft.trim()}
                  title="Save tag"
                  style={{
                    background: t.accent, color: t.accentText, border: "none",
                    borderRadius: 4, padding: "3px 9px", cursor: "pointer",
                    fontSize: 14, fontWeight: 600,
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
