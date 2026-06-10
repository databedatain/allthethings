import { useState, useEffect, useRef } from "react";
import ColorPicker from "./color-picker.jsx";
import { IconSun, IconMoon, IconUndo, IconX, IconPeople } from "./icons.jsx";
import { PRESETS, PALETTES, ROW_INTENSITIES, PRESENCES, getPalette, resolveColor } from "./theme.js";
import { DENSITIES, MAX_TAGS } from "./weeks.js";
import { FONTS } from "./font.js";
import { TYPE, SP, CONTROL } from "./tokens.js";

/* ─── palette dropdown ─── */
function PaletteSelect({ t, fonts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = getPalette(value);
  const dots = (cols) => (
    <span style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          width: "10px", height: "10px", borderRadius: "2px", background: c,
        }} />
      ))}
    </span>
  );
  const rowStyle = (active) => ({
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: SP.sm, cursor: "pointer",
    borderRadius: CONTROL.radiusSm, padding: "4px 8px",
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
    border: "none", background: active ? t.accentSoft : "transparent",
  });
  return (
    <span style={{ position: "relative", display: "block" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ ...rowStyle(false), border: `1px solid ${t.border}`, background: t.surface }}>
        <span>{current.name}</span>
        {dots(current.colors)}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{
            position: "absolute", top: "34px", left: 0, right: 0, zIndex: 61,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}>
            {PALETTES.map((p) => (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                style={rowStyle(p.id === value)}>
                <span>{p.name}</span>
                {dots(p.colors)}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}

/* ─── font dropdown (previews each option in its own typeface) ─── */
function FontSelect({ value, onChange, hasCustom, t }) {
  const [open, setOpen] = useState(false);
  const opts = FONTS.map((f) => ({ id: f.id, label: f.label, stack: f.stack }));
  if (hasCustom) opts.push({ id: "custom", label: "Custom", stack: "'BJCustom', sans-serif" });
  const current = opts.find((o) => o.id === value) || opts[0];
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "120px", textAlign: "left", cursor: "pointer",
        border: `1px solid ${t.border}`, background: t.surface,
        borderRadius: CONTROL.radiusSm, padding: "4px 8px",
        fontFamily: current.stack, fontSize: TYPE.label, color: t.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{current.label}</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{
            position: "absolute", top: "30px", right: 0, zIndex: 61,
            background: t.popover, border: `1px solid ${t.border}`,
            borderRadius: 6, padding: 4, minWidth: "150px",
            maxHeight: "264px", overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}>
            {opts.map((o) => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                  border: "none", borderRadius: CONTROL.radiusSm, padding: "5px 8px",
                  background: o.id === value ? t.accentSoft : "transparent",
                  fontFamily: o.stack, fontSize: TYPE.body,
                  color: o.id === value ? t.accentText2 : t.text,
                }}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </span>
  );
}

/* ─── settings slide-over: appearance, tags, fonts, data, trash ─── */
export default function SettingsDrawer({ t, fonts, data, fontName, paletteColors, confirmKey, onClose, actions }) {
  const {
    setThemeKey, applyPreset, selectPalette, setDensity, setBarIntensity, setColorPresence, setWrapText, setTaskFont,
    setHeadingFont, setBodyFont, addTag, removeTag, setTagName, setTagColor, setTagKind,
    onFontFile, resetFont, loadSamples, armOrRun,
    restoreFromTrash, deleteForever, emptyTrash, exportData, onImportFile,
  } = actions;
  const [trashOpen, setTrashOpen] = useState(false);
  const importRef = useRef(null);

  // the page behind the drawer must not scroll (matters on mobile)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const divider = { height: "1px", background: t.divider, margin: `${SP.sm}px 0` };
  const settingRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
  };
  const linkBtn = {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontFamily: fonts.body, fontSize: TYPE.label, color: t.question,
    textAlign: "left",
  };
  const segBtn = (active) => ({
    flex: 1, cursor: "pointer", height: CONTROL.hSm,
    border: `1px solid ${t.border}`,
    background: active ? t.accent : "transparent",
    color: active ? t.accentText : t.textMuted,
    fontFamily: fonts.body, fontSize: TYPE.caption,
  });

  return (
    <>
      <div className="bj-drawer-backdrop" onClick={onClose} />
      <div className="bj-drawer" style={{ background: t.popover, borderLeft: `1px solid ${t.border}` }}>
        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: SP.md,
        }}>
          <span style={{ fontFamily: fonts.heading, fontSize: TYPE.title, color: t.text }}>
            settings
          </span>
          <button onClick={onClose} title="Close"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: t.textMuted, padding: "4px", display: "flex",
            }}>
            <IconX size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* appearance + palette side by side */}
          <div style={{ display: "flex", gap: "6px", alignItems: "stretch" }}>
            <button
              onClick={() => setThemeKey("mode", t.dark ? "light" : "dark")}
              title={t.dark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 26, flexShrink: 0,
                cursor: "pointer", padding: 0,
                border: `1px solid ${t.border}`, background: t.surface,
                borderRadius: 5,
                color: t.textMuted, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
              {t.dark ? <IconSun size={13} /> : <IconMoon size={13} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <PaletteSelect t={t} fonts={fonts} value={data.palette}
                onChange={selectPalette} />
            </div>
          </div>
          {/* theme — presets set highlight/star/hold; the fine-tune pickers
              below override the active preset's individual colours */}
          <div>
            <div style={{ ...settingRow, marginBottom: SP.xs }}>theme</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.xs }}>
              {PRESETS.filter((p) => p.palette === data.palette).map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)} title={p.name}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "flex-start", gap: "5px",
                    cursor: "pointer", borderRadius: CONTROL.radiusSm,
                    border: `1px solid ${t.border}`, background: t.surface,
                    padding: "4px 6px", fontFamily: fonts.body,
                    fontSize: TYPE.caption, color: t.textMuted,
                  }}>
                  <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                    {[p.highlight, p.star, p.hold].map((c, i) => (
                      <span key={i} style={{
                        width: "9px", height: "9px", borderRadius: "50%",
                        background: c, display: "inline-block", flexShrink: 0,
                      }} />
                    ))}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap" }}>{p.name}</span>
                </button>
              ))}
            </div>
            {/* fine-tune: indented + accent rule signals these belong to the
                active preset and override its individual colours */}
            <div style={{
              marginTop: SP.sm, paddingTop: SP.sm, paddingLeft: SP.sm,
              borderTop: `1px solid ${t.divider}`,
              borderLeft: `2px solid ${t.accentBorder}`,
              display: "flex", flexDirection: "column", gap: SP.sm,
            }}>
              <div style={{ ...settingRow, color: t.textFaint }}>fine-tune</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                columnGap: SP.md, rowGap: SP.sm }}>
                <div style={settingRow}>
                  <span>highlight</span>
                  <ColorPicker value={data.theme.highlight} t={t} colors={paletteColors}
                    align="left" size={16}
                    onChange={(c) => c && setThemeKey("highlight", c)} />
                </div>
                <div style={settingRow}>
                  <span>star</span>
                  <ColorPicker value={data.theme.star} t={t} colors={paletteColors}
                    align="left" size={16}
                    onChange={(c) => c && setThemeKey("star", c)} />
                </div>
                <div style={settingRow}>
                  <span>hold</span>
                  <ColorPicker value={data.theme.hold} t={t} colors={paletteColors}
                    align="left" size={16}
                    onChange={(c) => c && setThemeKey("hold", c)} />
                </div>
                <div style={settingRow}>
                  <span>background</span>
                  <ColorPicker
                    value={(t.dark ? data.theme.bgDark : data.theme.bgLight) || null}
                    t={t} colors={paletteColors} allowNone variant="bg"
                    align="left" size={16}
                    onChange={(c) => setThemeKey(t.dark ? "bgDark" : "bgLight", c)} />
                </div>
                <div style={settingRow}>
                  <span>task bg</span>
                  <ColorPicker
                    value={(t.dark ? data.theme.taskBgDark : data.theme.taskBgLight) || null}
                    t={t} colors={paletteColors} allowNone variant="bg"
                    align="left" size={16}
                    onChange={(c) => setThemeKey(t.dark ? "taskBgDark" : "taskBgLight", c)} />
                </div>
                <div style={settingRow}>
                  <span>done</span>
                  <ColorPicker
                    value={(t.dark ? data.theme.doneDark : data.theme.doneLight) || null}
                    t={t} colors={paletteColors} allowNone variant="bg"
                    align="left" size={16}
                    onChange={(c) => setThemeKey(t.dark ? "doneDark" : "doneLight", c)} />
                </div>
              </div>
            </div>
          </div>
          {/* tags */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>
              <span>tags ({(data.tags || []).length}/{MAX_TAGS})</span>
            </div>
            {(data.tags || []).map((tag) => (
              <div key={tag.color} style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "4px",
              }}>
                <ColorPicker value={resolveColor(tag.color, paletteColors)} t={t} colors={paletteColors} size={16}
                  align="left"
                  onChange={(c) => c && c !== resolveColor(tag.color, paletteColors) && setTagColor(tag.color, c)} />
                <button
                  onClick={() => setTagKind(tag.color, tag.kind === "meeting" ? null : "meeting")}
                  title={tag.kind === "meeting"
                    ? "Meeting tag — applying it makes a task a meeting"
                    : "Mark as the meeting tag"}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    color: tag.kind === "meeting" ? t.question : t.textFaint, display: "flex",
                  }}>
                  <IconPeople size={14} />
                </button>
                <input
                  value={tag.name}
                  onChange={(e) => setTagName(tag.color, e.target.value)}
                  placeholder="name…"
                  maxLength={25}
                  style={{
                    flex: 1, minWidth: 0, padding: "3px 7px", borderRadius: 4,
                    border: `1px solid ${t.border}`, background: t.surface,
                    fontFamily: fonts.body, fontSize: TYPE.label, color: t.text, outline: "none",
                  }}
                />
                <button
                  onClick={() => armOrRun(`tag:${tag.color}`, () => removeTag(tag.color))}
                  title={confirmKey === `tag:${tag.color}` ? "Click again to remove" : "Remove tag"}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, color: t.danger,
                    fontFamily: fonts.body,
                    fontSize: confirmKey === `tag:${tag.color}` ? TYPE.caption : TYPE.label,
                    fontWeight: confirmKey === `tag:${tag.color}` ? 700 : 400,
                  }}>
                  {confirmKey === `tag:${tag.color}` ? "sure?" : "✕"}
                </button>
              </div>
            ))}
            {(data.tags || []).length < MAX_TAGS && (
              <button onClick={addTag} style={{ ...linkBtn }}>
                + add tag
              </button>
            )}
          </div>
          {/* spacing density */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>spacing</div>
            <div style={{ display: "flex" }}>
              {DENSITIES.map((dn, i) => (
                <button key={dn.id} onClick={() => setDensity(dn.id)}
                  style={{
                    ...segBtn(data.density === dn.id),
                    borderRadius: i === 0 ? "5px 0 0 5px"
                      : i === DENSITIES.length - 1 ? "0 5px 5px 0" : 0,
                    borderLeft: i === 0 ? `1px solid ${t.border}` : "none",
                  }}>{dn.id}</button>
              ))}
            </div>
          </div>
          {/* row tint intensity */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>bar colour</div>
            <div style={{ display: "flex" }}>
              {ROW_INTENSITIES.map((s, i) => (
                <button key={s.id} onClick={() => setBarIntensity(s.id)}
                  style={{
                    ...segBtn((data.barIntensity || "medium") === s.id),
                    borderRadius: i === 0 ? "5px 0 0 5px"
                      : i === ROW_INTENSITIES.length - 1 ? "0 5px 5px 0" : 0,
                    borderLeft: i === 0 ? `1px solid ${t.border}` : "none",
                  }}>{s.id}</button>
              ))}
            </div>
          </div>
          {/* text wrap */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>text wrap</div>
            <div style={{ display: "flex" }}>
              {[false, true].map((on, i) => (
                <button key={String(on)} onClick={() => setWrapText(on)}
                  title={on ? "Rows grow to fit their text" : "Rows stay one line; hover to read the rest"}
                  style={{
                    ...segBtn(!!data.wrapText === on),
                    borderRadius: i === 0 ? "5px 0 0 5px" : "0 5px 5px 0",
                    borderLeft: i === 0 ? `1px solid ${t.border}` : "none",
                  }}>{on ? "wrap" : "one line"}</button>
              ))}
            </div>
          </div>
          {/* colour presence */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>colour presence</div>
            <div style={{ display: "flex" }}>
              {PRESENCES.map((p, i) => (
                <button key={p} onClick={() => setColorPresence(p)}
                  style={{
                    ...segBtn((data.colorPresence || "full") === p),
                    borderRadius: i === 0 ? "5px 0 0 5px"
                      : i === PRESENCES.length - 1 ? "0 5px 5px 0" : 0,
                    borderLeft: i === 0 ? `1px solid ${t.border}` : "none",
                  }}>{p}</button>
              ))}
            </div>
          </div>
          {/* fonts */}
          <div>
            <div style={{ ...settingRow, marginBottom: "5px" }}>fonts</div>
            <div style={{ ...settingRow, marginBottom: "5px" }}>
              <span>headings</span>
              <FontSelect value={data.headingFont} onChange={setHeadingFont}
                hasCustom={!!fontName} t={t} />
            </div>
            <div style={{ ...settingRow, marginBottom: "5px" }}>
              <span>body</span>
              <FontSelect value={data.bodyFont} onChange={setBodyFont}
                hasCustom={!!fontName} t={t} />
            </div>
            <div style={{ ...settingRow, marginBottom: "5px" }}>
              <span>custom file</span>
              <label style={{ ...linkBtn, cursor: "pointer", display: "flex",
                alignItems: "center", gap: "4px" }}>
                <span style={{ color: t.textMuted, fontSize: TYPE.label, maxWidth: "84px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fontName || "import…"}
                </span>
                ✎
                <input type="file" accept=".otf,.ttf,font/otf,font/ttf"
                  onChange={onFontFile} style={{ display: "none" }} />
              </label>
            </div>
            {fontName && (
              <button onClick={resetFont}
                style={{ ...linkBtn, color: t.danger, marginBottom: "5px" }}>
                remove custom font
              </button>
            )}
            <div style={{ ...settingRow, gap: "8px" }}>
              <span style={{ flexShrink: 0 }}>text size</span>
              <input type="range" min={12} max={30} value={data.taskFont}
                onChange={(e) => setTaskFont(Number(e.target.value))}
                style={{ flex: 1, minWidth: 0, accentColor: t.accent }} />
              <span style={{ width: "22px", textAlign: "right" }}>{data.taskFont}</span>
            </div>
          </div>
          {/* data backup */}
          <div>
            <div style={{ ...settingRow, marginBottom: "4px" }}>data</div>
            <button onClick={exportData} style={{ ...linkBtn, display: "block", marginBottom: "4px" }}>
              ↓ download backup
            </button>
            <button onClick={() => armOrRun("import", () => importRef.current?.click())}
              style={{
                ...linkBtn, display: "block",
                color: confirmKey === "import" ? t.danger : t.question,
                fontWeight: confirmKey === "import" ? 700 : 400,
              }}>
              {confirmKey === "import" ? "replaces everything — sure?" : "↑ restore from file…"}
            </button>
            <input ref={importRef} type="file" accept=".json,application/json"
              onChange={onImportFile} style={{ display: "none" }} />
          </div>
          <button onClick={loadSamples} style={{ ...linkBtn }}>
            + load sample weeks
          </button>
        </div>

        <div style={divider} />

        {/* trash bin */}
        <button onClick={() => setTrashOpen((o) => !o)} style={{
          display: "flex", alignItems: "center", gap: "6px",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: SP.xs, fontFamily: fonts.body, fontSize: TYPE.body, color: t.textMuted,
        }}>
          <span style={{
            display: "inline-block",
            transform: trashOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>▸</span>
          🗑 trash ({data.trash.length})
        </button>
        {trashOpen && (
          <div style={{ padding: "6px 4px 4px", display: "flex",
            flexDirection: "column", gap: "5px" }}>
            {data.trash.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: TYPE.label,
                color: t.textFaint, textAlign: "center" }}>empty</div>
            )}
            {data.trash.map((x) => (
              <div key={x.id} style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontFamily: fonts.body, fontSize: TYPE.label, color: t.textMuted,
              }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{x.text}</span>
                <button onClick={() => restoreFromTrash(x.id)} title="Restore"
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: "2px", color: t.question, display: "flex" }}>
                  <IconUndo />
                </button>
                <button onClick={() => armOrRun(`forever:${x.id}`, () => deleteForever(x.id))}
                  title={confirmKey === `forever:${x.id}` ? "Click again to delete forever" : "Delete forever"}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: 0, color: t.danger, fontFamily: fonts.body,
                    fontSize: confirmKey === `forever:${x.id}` ? TYPE.caption : TYPE.label,
                    fontWeight: confirmKey === `forever:${x.id}` ? 700 : 400 }}>
                  {confirmKey === `forever:${x.id}` ? "sure?" : "✕"}
                </button>
              </div>
            ))}
            {data.trash.length > 0 && (
              <button onClick={() => armOrRun("empty", emptyTrash)}
                style={{ ...linkBtn, color: t.danger, textAlign: "center",
                  marginTop: "2px", fontWeight: confirmKey === "empty" ? 700 : 400 }}>
                {confirmKey === "empty" ? "click again to empty" : "empty trash"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
