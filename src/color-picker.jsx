import { useState } from "react";
import { NEUTRALS, shades, bgShades } from "./theme.js";

/* Inline swatch trigger that opens a palette popover. `value` is a hex string
 * or null ("none"). `colors` is the active palette's base colours.
 * variant="bg" offers mode-appropriate background shades.
 * `tags` (optional) renders a named-tags section at the top; clicking a tag
 * applies its colour. `onCreateTag(color, name)` enables an inline rename
 * affordance when the current colour isn't already a tag. */
export default function ColorPicker({
  value, onChange, allowNone, variant, colors, size = 20, t, tags, onCreateTag,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const none = `linear-gradient(45deg, transparent 47%, ${t.textFaint} 47%, ${t.textFaint} 53%, transparent 53%)`;
  const columnShades = (c) => (variant === "bg" ? bgShades(c, t.dark) : shades(c));
  const namedTags = tags?.filter((tg) => tg.name && tg.name.trim()) || [];
  const tagMatch = tags?.find((tg) => tg.color === value && tg.name?.trim());
  const canName = !!(value && onCreateTag && !tagMatch);

  const close = () => { setOpen(false); setDraft(""); };

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

  const submitName = () => {
    const name = draft.trim();
    if (name) onCreateTag(value, name);
    close();
  };

  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Pick colour"
        style={{
          width: size, height: size, borderRadius: 4, padding: 0, cursor: "pointer",
          border: `1px solid ${t.border}`,
          background: value || (t.dark ? "#3a3a3f" : "#fff"),
          backgroundImage: value ? "none" : none,
        }}
      />
      {open && (
        <>
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: "absolute", top: 26, right: 0, zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            fontFamily: "inherit",
          }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {allowNone && <Cell color={null} />}
              {NEUTRALS.map((c) => <Cell key={c} color={c} />)}
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
                  placeholder="name this colour…"
                  style={{
                    flex: 1, minWidth: 0, padding: "3px 6px", borderRadius: 4,
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontSize: 12, color: t.text, outline: "none",
                  }}
                />
                <button onClick={submitName}
                  disabled={!draft.trim()}
                  style={{
                    background: t.accent, color: t.accentText, border: "none",
                    borderRadius: 4, padding: "3px 7px", cursor: "pointer",
                    fontSize: 11, opacity: draft.trim() ? 1 : 0.4,
                  }}>save</button>
              </div>
            )}
          </div>
        </>
      )}
    </span>
  );
}
