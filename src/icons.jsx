/* ─── tiny icons ─── */
export const IconCheck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconPause = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
    <rect x="8.5" y="2" width="2.5" height="10" rx="1" fill="currentColor"/>
  </svg>
);
export const IconPlus = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
export const IconTrash = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 6.5v3M8 6.5v3M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconUndo = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3 5.5h5a3 3 0 010 6H6M3 5.5L5.5 3M3 5.5L5.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconQuestion = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 5.5a1.5 1.5 0 012.9.5c0 1-1.4 1-1.4 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
  </svg>
);
export const IconStar = ({ filled, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
    <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.6l1.4-6.3L2.9 9l6.4-.6z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconGrip = ({ size = 17 }) => (
  <svg width={Math.round(size * 0.647)} height={size} viewBox="0 0 11 17" fill="currentColor">
    <circle cx="3.5" cy="3" r="1.5"/><circle cx="7.5" cy="3" r="1.5"/>
    <circle cx="3.5" cy="8.5" r="1.5"/><circle cx="7.5" cy="8.5" r="1.5"/>
    <circle cx="3.5" cy="14" r="1.5"/><circle cx="7.5" cy="14" r="1.5"/>
  </svg>
);
export const IconSun = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="21.5"/>
      <line x1="2.5" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="21.5" y2="12"/>
      <line x1="4.7" y1="4.7" x2="6.4" y2="6.4"/>
      <line x1="17.6" y1="17.6" x2="19.3" y2="19.3"/>
      <line x1="4.7" y1="19.3" x2="6.4" y2="17.6"/>
      <line x1="17.6" y1="6.4" x2="19.3" y2="4.7"/>
    </g>
  </svg>
);
export const IconMoon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 14.5A8 8 0 119.5 4 6 6 0 0020 14.5z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);
export const IconGear = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2.8l1.2 2.6a7 7 0 012.4 1l2.8-.7 1.9 3.3-1.9 2.1a7 7 0 010 1.8l1.9 2.1-1.9 3.3-2.8-.7a7 7 0 01-2.4 1L12 21.2l-1.2-2.6a7 7 0 01-2.4-1l-2.8.7-1.9-3.3 1.9-2.1a7 7 0 010-1.8L3.7 9l1.9-3.3 2.8.7a7 7 0 012.4-1z"
      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
export const IconHistory = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-6 2.7L4 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconX = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
export const IconNote = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
export const IconPeople = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="5.5" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.8 13c.5-2.4 1.9-3.6 3.7-3.6S8.7 10.6 9.2 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="11" cy="5.6" r="1.8" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M10.8 9.5c1.9 0 3 1.1 3.4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
export const IconArrowUp = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M7 11.5V2.5M3.5 6L7 2.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export const IconTarget = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="1" fill="currentColor"/>
  </svg>
);
export const IconInbox = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 9.5V12a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 12V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 9.5h3.2l1 1.6h3.6l1-1.6H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 2v5M5.8 5L8 7.2 10.2 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
