/* Static design primitives — the non-scaling half of the system.
 *
 * Principle: content scales with the user's text-size preference; chrome does
 * not. These tokens are fixed px and feed the app's chrome (page titles,
 * section headers, sidebar nav/settings, sort bar, search results, empty
 * states). Anything embedded in a task row keeps scaling via the ui.px()
 * helper in bullet-journal.jsx.
 *
 * Colour-derived tokens live in buildTheme (theme.js); these are geometry and
 * type only, so they import nowhere and are safe to share everywhere. */

// Type scale — fixed px. Six steps replace the ~13 near-duplicate sizes the
// app had grown. Reserve the handwriting face (fonts.heading) for
// display/title/heading; route label/caption to fonts.body (Caveat is
// illegible at 11–13px).
export const TYPE = {
  display: 32, // page titles (h1)
  title:   22, // notes header, empty states
  heading: 19, // section headers (on hold / done / search subsections)
  body:    15, // default UI text, inputs, nav, search results
  label:   13, // setting labels, secondary metadata
  caption: 11, // confirm "sure?", hints, hex input
};

// Spacing scale.
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Control geometry — heights and radii shared across buttons/inputs/selects.
export const CONTROL = { h: 28, hSm: 24, radius: 6, radiusSm: 4, pill: 999 };
