/* Theme tokens + colour utilities.
 *
 * - PALETTES: named sets of base ("100%") colours. The active palette feeds
 *   every colour-picker popover.
 * - PRESETS: highlight/star/hold combos, each belonging to a palette.
 * Three user-set base colours (highlight, star, hold) feed a light/dark
 * token map; lighter/darker shades are derived. */

export const NEUTRALS = ["#000000", "#465058", "#ffffff"];

export const PALETTES = [
  {
    id: "default",
    name: "Default",
    colors: [
      "#1e4a71", "#EFB900", "#E89D56", "#5C8BC3", "#bb5f6f",
      "#5fba77", "#8883BA", "#6CC6CB", "#a6afbb",
    ],
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: [
      "#2e3a59", "#6b5b95", "#88649e", "#b5838d", "#4a7c8c",
      "#9d8aa8", "#5d7b8a", "#c08497", "#8d99ae",
    ],
  },
  {
    id: "ember",
    name: "Ember",
    colors: [
      "#9c4a2f", "#d98e04", "#c96e3f", "#e3b23c", "#a13d2d",
      "#7d7c3a", "#d2a679", "#b5654a", "#a89b8c",
    ],
  },
  {
    id: "bloom",
    name: "Bloom",
    colors: [
      "#ef6f6c", "#f4c145", "#56a3d9", "#5fbf9f", "#9d8ec9",
      "#e08aa6", "#9cc457", "#5fc7c7", "#8896d8",
    ],
  },
];

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

// theme presets — each belongs to a palette; sets the three base colours.
// Four per palette; the first of each palette is its default preset.
export const PRESETS = [
  { id: "harbor", name: "Harbor", palette: "default", highlight: "#5C8BC3", star: "#6CC6CB", hold: "#a6afbb" },
  { id: "anchor", name: "Anchor", palette: "default", highlight: "#5fba77", star: "#EFB900", hold: "#a6afbb" },
  { id: "ink",    name: "Ink",    palette: "default", highlight: "#1e4a71", star: "#EFB900", hold: "#465058" },
  { id: "amber",  name: "Amber",  palette: "default", highlight: "#E89D56", star: "#EFB900", hold: "#a6afbb" },

  { id: "twilight", name: "Twilight", palette: "dusk", highlight: "#6b5b95", star: "#c08497", hold: "#8d99ae" },
  { id: "midnight", name: "Midnight", palette: "dusk", highlight: "#2e3a59", star: "#c08497", hold: "#5d7b8a" },
  { id: "heather",  name: "Heather",  palette: "dusk", highlight: "#88649e", star: "#b5838d", hold: "#9d8aa8" },
  { id: "tide",     name: "Tide",     palette: "dusk", highlight: "#4a7c8c", star: "#c08497", hold: "#8d99ae" },

  { id: "hearth", name: "Hearth", palette: "ember", highlight: "#9c4a2f", star: "#d98e04", hold: "#a89b8c" },
  { id: "clay",   name: "Clay",   palette: "ember", highlight: "#c96e3f", star: "#e3b23c", hold: "#a89b8c" },
  { id: "olive",  name: "Olive",  palette: "ember", highlight: "#7d7c3a", star: "#d98e04", hold: "#d2a679" },
  { id: "brick",  name: "Brick",  palette: "ember", highlight: "#a13d2d", star: "#e3b23c", hold: "#b5654a" },

  { id: "posy",   name: "Posy",   palette: "bloom", highlight: "#ef6f6c", star: "#f4c145", hold: "#8896d8" },
  { id: "meadow", name: "Meadow", palette: "bloom", highlight: "#5fbf9f", star: "#9cc457", hold: "#8896d8" },
  { id: "sky",    name: "Sky",    palette: "bloom", highlight: "#56a3d9", star: "#5fc7c7", hold: "#8896d8" },
  { id: "lilac",  name: "Lilac",  palette: "bloom", highlight: "#9d8ec9", star: "#e08aa6", hold: "#8896d8" },
];

export const THEME_DEFAULTS = {
  mode: "light",
  highlight: "#5fba77",
  star: "#EFB900",
  hold: "#a6afbb",
  bgLight: null,
  bgDark: null,
};

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r, g, b) {
  const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

export function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}

// perceived brightness, 0–1 (Rec. 601 luma)
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// pick a legible ink for text sitting on top of `hex` — dark text on light
// accents (gold/cyan), white on dark ones. One source of truth for accentText.
export function readableOn(hex) {
  return luminance(hex) > 0.6 ? "#1c1c1c" : "#ffffff";
}

// base, +20% lighter, +40% lighter — the popover swatch column for one colour
export const SHADE_STEPS = [0, 0.2, 0.4];
export function shades(hex) {
  return SHADE_STEPS.map((a) => (a ? lighten(hex, a) : hex));
}

// solid fill for a tagged task row. Replaces the old rgba() wash: painting the
// tint as an opaque colour (rather than compositing a low-alpha layer through
// the translucent surface + gradient) keeps the colour true instead of
// double-diluting it into mush. Light mode lightens toward a pale card; dark
// mode darkens toward a deep one — both keep body text legible on top.
export function rowFill(hex, dark) {
  return dark ? darken(hex, 0.6) : lighten(hex, 0.78);
}

// Colour tokens. A stored colour (on a task or a tag) is either:
//   - "slot:N" / "slot:N:S" — palette slot N at shade S (0=base, 1/2=lighter,
//     matching the picker's shade column). Shifts when the palette changes.
//   - "#rrggbb" — a fixed colour (neutrals + custom picks) that never shifts.
//   - null — no colour.
// resolveColor turns a token into a concrete hex for display; colorToken does
// the reverse, classifying a picked hex as a palette shade or a fixed colour.
export function resolveColor(token, paletteColors) {
  if (!token) return null;
  if (token.startsWith("slot:")) {
    const [i, s = 0] = token.slice(5).split(":").map(Number);
    const base = paletteColors[i];
    if (base == null) return null;
    return s ? lighten(base, SHADE_STEPS[s]) : base;
  }
  return token;
}

export function colorToken(hex, paletteColors) {
  if (!hex) return null;
  const h = hex.toLowerCase();
  for (let i = 0; i < paletteColors.length; i++) {
    for (let s = 0; s < SHADE_STEPS.length; s++) {
      const shade = s ? lighten(paletteColors[i], SHADE_STEPS[s]) : paletteColors[i];
      if (h === shade.toLowerCase()) return s ? `slot:${i}:${s}` : `slot:${i}`;
    }
  }
  return hex;
}

// background-suitable shades: very pale in light mode, very dark in dark mode
export function bgShades(hex, dark) {
  return dark
    ? [darken(hex, 0.72), darken(hex, 0.82), darken(hex, 0.9)]
    : [lighten(hex, 0.86), lighten(hex, 0.92), lighten(hex, 0.97)];
}

// a coherent light/dark background pair derived from a preset's highlight
export function presetBg(highlight) {
  return { light: lighten(highlight, 0.91), dark: darken(highlight, 0.87) };
}

export function buildTheme(cfg) {
  const { mode, highlight, star, hold, bgLight, bgDark } = { ...THEME_DEFAULTS, ...cfg };
  const dark = mode === "dark";
  const defaultBg = dark
    ? "linear-gradient(180deg, #24262b 0%, #1b1c20 100%)"
    : "linear-gradient(180deg, #faf8f4 0%, #f4f1eb 100%)";
  return {
    mode,
    dark,
    bg: (dark ? bgDark : bgLight) || defaultBg,
    surface: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.55)",
    surfaceAlt: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
    // solid task-row fills — uncoloured rows sit on an opaque card instead of
    // the translucent surface, so they read as deliberate rows, not glass.
    rowBase: dark ? "#2b2d33" : "#fffdf9",
    panel: dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.6)",
    popover: dark ? "#2c2e33" : "#ffffff",
    text: dark ? "#e8e6e1" : "#2c2c2c",
    textMuted: dark ? "#9b958b" : "#8a8275",
    // nudged stronger than before — textFaint carries real meaning (dates,
    // hints, placeholders) and the old values sat near the a11y floor.
    textFaint: dark ? "#79797f" : "#a39c8d",
    border: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
    divider: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    // more saturated so destructive actions actually read as destructive.
    danger: dark ? "#db8a84" : "#c1564f",
    question: dark ? "#86a4cb" : "#6a8dba",
    accent: highlight,
    accentText: readableOn(highlight),
    accentSoft: rgba(highlight, dark ? 0.24 : 0.16),
    accentBorder: rgba(highlight, 0.5),
    accentText2: dark ? lighten(highlight, 0.25) : darken(highlight, 0.18),
    star,
    starTint: rgba(star, dark ? 0.22 : 0.16),
    starBorder: rgba(star, 0.55),
    hold,
    holdTint: rgba(hold, dark ? 0.18 : 0.15),
    holdFill: dark ? darken(hold, 0.62) : lighten(hold, 0.82),
    holdBorder: rgba(hold, 0.5),
    holdText: dark ? lighten(hold, 0.3) : darken(hold, 0.28),
  };
}
