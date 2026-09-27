/** Canonical Theme D (Clear Sky) tokens. Keep CSS :root, theme-color, and the web manifest in sync. */
export const THEME_PRIMARY = "#2563eb";
export const THEME_BACKGROUND = "#f5f8fc";
export const THEME_FOREGROUND = "#0f172a";
export const THEME_CARD = "#ffffff";
export const THEME_CARD_TINT = "#f0f5fb";
export const THEME_PRIMARY_FOREGROUND = "#ffffff";
export const THEME_SECONDARY = "#dbeafe";
export const THEME_MUTED = "#eef2f7";
export const THEME_MUTED_FOREGROUND = "#64748b";
export const THEME_BORDER = "#e2e8f0";
export const THEME_APPROVE = "#16a34a";
export const THEME_APPROVE_FOREGROUND = "#f0fdf4";
export const THEME_SWAP = "#d97706";
export const THEME_SWAP_FOREGROUND = "#422006";
export const THEME_DESTRUCTIVE = "#e11d48";
export const THEME_RING = "#2563eb";

export const THEME_TOKENS = {
  background: THEME_BACKGROUND,
  foreground: THEME_FOREGROUND,
  card: THEME_CARD,
  "card-tint": THEME_CARD_TINT,
  primary: THEME_PRIMARY,
  "primary-foreground": THEME_PRIMARY_FOREGROUND,
  secondary: THEME_SECONDARY,
  muted: THEME_MUTED,
  "muted-foreground": THEME_MUTED_FOREGROUND,
  border: THEME_BORDER,
  approve: THEME_APPROVE,
  "approve-foreground": THEME_APPROVE_FOREGROUND,
  swap: THEME_SWAP,
  "swap-foreground": THEME_SWAP_FOREGROUND,
  destructive: THEME_DESTRUCTIVE,
  ring: THEME_RING,
} as const;

/** Dark counterpart: invert canvas/ink, keep Clear Sky brand + semantic fills. */
export const THEME_DARK_BACKGROUND = THEME_FOREGROUND;
export const THEME_DARK_FOREGROUND = THEME_BACKGROUND;
export const THEME_DARK_CARD = "#1a2438";
export const THEME_DARK_CARD_TINT = "#152033";
export const THEME_DARK_SECONDARY = "#1e3a5f";
export const THEME_DARK_MUTED = "#1e293b";
export const THEME_DARK_MUTED_FOREGROUND = "#94a3b8";
export const THEME_DARK_BORDER = "#2d3b52";

export const THEME_DARK_TOKENS = {
  background: THEME_DARK_BACKGROUND,
  foreground: THEME_DARK_FOREGROUND,
  card: THEME_DARK_CARD,
  "card-tint": THEME_DARK_CARD_TINT,
  primary: THEME_PRIMARY,
  "primary-foreground": THEME_PRIMARY_FOREGROUND,
  secondary: THEME_DARK_SECONDARY,
  muted: THEME_DARK_MUTED,
  "muted-foreground": THEME_DARK_MUTED_FOREGROUND,
  border: THEME_DARK_BORDER,
  approve: THEME_APPROVE,
  "approve-foreground": THEME_APPROVE_FOREGROUND,
  swap: THEME_SWAP,
  "swap-foreground": THEME_SWAP_FOREGROUND,
  destructive: THEME_DESTRUCTIVE,
  ring: THEME_RING,
} as const;

/** Cos chef mark — same 3D chef as marketing favicon-squircle. HTML wordmark sits beside this PNG. */
export const BRAND_MARK_SRC = "/brand/mark-chef-bot-only.png";
export const BRAND_ICON_180_SRC = "/brand/icon-chef-bot-only-180.png";
export const BRAND_ICON_192_SRC = "/brand/icon-chef-bot-only-192.png";
export const BRAND_ICON_512_SRC = "/brand/icon-chef-bot-only-512.png";
export const BRAND_FAVICON_SRC = "/favicon.ico";

/** Spec sha256 for the Cos chef SoT PNGs (shared with marketing favicon-squircle). */
export const BRAND_SPEC_SHA256 = {
  mark: "9470e4078fce635e94c4985d6d1858739200211d5a7149360577d01e85f54a8f",
  icon180: "31f47190fb1779e5acacdf3d2ab002820904b4d329feb2053a5bb8826a31ea45",
  icon192: "4e8f8bd54f61bf4fa0622353f30bbd49f44f522fdf5f92377bdef76edc6018fe",
  icon512: "9470e4078fce635e94c4985d6d1858739200211d5a7149360577d01e85f54a8f",
} as const;
