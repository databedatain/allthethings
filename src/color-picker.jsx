import { useState } from "react";
import { NEUTRALS, shades, bgShades } from "./theme.js";

/* Inline swatch trigger that opens a palette popover. `value` is a hex string
 * or null ("none"). `colors` is the active palette's base colours. variant="bg"
 * offers mode-appropriate background shades. */
export default function ColorPicker({ value, onChange, allowNone, variant, colors, t }) {
  const [open, setOpen] = useState(false);
  const none = `linear-gradient(45deg, transparent 47%, ${t.textFaint} 47%, ${t.textFaint} 53%, transparent 53%)`;
  const columnShades = (c) => (variant === "bg" ? bgShades(c, t.dark) : shades(c));

  const Cell = ({ color }) => {
    const selected = (value || null) === (color || null);
    return (
      <button
        onClick={() => { onChange(color); setOpen(false); }}
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

  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Pick colour"
        style={{
          width: 20, height: 20, borderRadius: 4, padding: 0, cursor: "pointer",
          border: `1px solid ${t.border}`,
          background: value || (t.dark ? "#3a3a3f" : "#fff"),
          backgroundImage: value ? "none" : none,
        }}
      />
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: "absolute", top: 26, right: 0, zIndex: 41,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {allowNone && <Cell color={null} />}
              {NEUTRALS.map((c) => <Cell key={c} color={c} />)}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(colors || []).map((c) => (
                <div key={c} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {columnShades(c).map((s) => <Cell key={s} color={s} />)}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
