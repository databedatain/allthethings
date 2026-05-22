/* Theme tokens + colour utilities. Three user-set base colours (highlight,
 * star, hold) feed a light/dark token map; lighter/darker shades are derived. */

export const PALETTE = [
  "#1e4a71", "#EFB900", "#E89D56", "#5C8BC3", "#bb5f6f",
  "#5fba77", "#8883BA", "#6CC6CB", "#a6afbb",
];

export const NEUTRALS = ["#000000", "#465058", "#ffffff"];

export const THEME_DEFAULTS = {
  mode: "light",
  highlight: "#5fba77",
  star: "#EFB900",
  hold: "#a6afbb",
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

// base, +20% lighter, +40% lighter — the popover swatch column for one colour
export function shades(hex) {
  return [hex, lighten(hex, 0.2), lighten(hex, 0.4)];
}

export function buildTheme(cfg) {
  const { mode, highlight, star, hold } = { ...THEME_DEFAULTS, ...cfg };
  const dark = mode === "dark";
  return {
    mode,
    dark,
    bg: dark
      ? "linear-gradient(180deg, #24262b 0%, #1b1c20 100%)"
      : "linear-gradient(180deg, #faf8f4 0%, #f4f1eb 100%)",
    surface: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.55)",
    surfaceAlt: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
    panel: dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.6)",
    popover: dark ? "#2c2e33" : "#ffffff",
    text: dark ? "#e8e6e1" : "#2c2c2c",
    textMuted: dark ? "#9b958b" : "#8a8275",
    textFaint: dark ? "#62626a" : "#bdb8ad",
    border: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
    divider: dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    danger: dark ? "#cf9595" : "#cf9a9a",
    question: dark ? "#86a4cb" : "#6a8dba",
    accent: highlight,
    accentText: "#ffffff",
    accentSoft: rgba(highlight, dark ? 0.24 : 0.16),
    accentBorder: rgba(highlight, 0.5),
    accentText2: dark ? lighten(highlight, 0.25) : darken(highlight, 0.18),
    star,
    starTint: rgba(star, dark ? 0.22 : 0.16),
    starBorder: rgba(star, 0.55),
    hold,
    holdTint: rgba(hold, dark ? 0.18 : 0.15),
    holdBorder: rgba(hold, 0.5),
    holdText: dark ? lighten(hold, 0.3) : darken(hold, 0.28),
  };
}
