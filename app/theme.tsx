const oklch = (
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
) =>
  `oklch(${lightness} ${chroma} ${hue}${
    alpha == null ? "" : `/ ${alpha * 100}%`
  })`;
const oklchRelative = (
  from: string,
  adjustments: {
    l?: string;
    c?: string;
    h?: string;
  }
) =>
  `oklch(from ${from} ${adjustments.l ?? "l"} ${adjustments.c ?? "c"} ${
    adjustments.h ?? "h"
  })`;
const lightDark = (light: string, dark: string) =>
  `light-dark(${light}, ${dark})`;

const stone = {
  50: oklch(0.985, 0.001, 106.423),
  100: oklch(0.97, 0.001, 106.424),
  200: oklch(0.923, 0.003, 48.717),
  300: oklch(0.869, 0.005, 56.366),
  400: oklch(0.709, 0.01, 56.259),
  500: oklch(0.553, 0.013, 58.071),
  600: oklch(0.444, 0.011, 73.639),
  700: oklch(0.374, 0.01, 67.558),
  800: oklch(0.268, 0.007, 34.298),
  900: oklch(0.216, 0.006, 56.043),
  950: oklch(0.147, 0.004, 49.25),
};

export const CSS_VARIABLES = {
  "--c-bg-dark": lightDark(stone[300], stone[950]),
  "--c-bg": lightDark(stone[200], stone[900]),
  "--c-bg-light": lightDark(stone[100], stone[800]),
  "--c-border": lightDark(
    stone[300],
    oklchRelative("var(--c-bg-light)", { l: "calc(l + 0.05)" })
  ),
  "--c-text": lightDark(stone[900], stone[200]),
  "--c-text-alt": stone[50],
  "--c-text-muted": lightDark(stone[700], stone[400]),
  "--c-primary": oklch(0.52, 0.18, 339.7),
  "--c-secondary": oklch(0.52, 0.18, 279.88),
  "--c-success": oklch(0.48, 0.18, 142),
  "--c-danger": oklch(0.48, 0.18, 25),
  "--c-warning": oklch(0.48, 0.18, 90),
  "--c-info": oklch(0.48, 0.18, 252),
  "--shadow": `0px 2px 2px ${oklch(0, 0, 0, 0.07)}, 0px 4px 4px ${oklch(
    0,
    0,
    0,
    0.15
  )}`,
} as const;

const APP_THEME = {
  v: (key: keyof typeof CSS_VARIABLES) => `var(${key})`,
  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    desktop: "1200px",
  },
} as const;

type AppTheme = typeof APP_THEME;

declare global {
  namespace FlowCss {
    interface Theme extends AppTheme {}
  }
}

export default APP_THEME;
