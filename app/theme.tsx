const stone = {
  50: "oklch(98.5% 0.001 106.423)",
  100: "oklch(97% 0.001 106.424)",
  200: "oklch(92.3% 0.003 48.717)",
  300: "oklch(86.9% 0.005 56.366)",
  400: "oklch(70.9% 0.01 56.259)",
  500: "oklch(55.3% 0.013 58.071)",
  600: "oklch(44.4% 0.011 73.639)",
  700: "oklch(37.4% 0.01 67.558)",
  800: "oklch(26.8% 0.007 34.298)",
  900: "oklch(21.6% 0.006 56.043)",
  950: "oklch(14.7% 0.004 49.25)",
};
export const CSS_VARIABLES = {
  "--c-bg-dark": `light-dark(${stone[300]}, ${stone[950]})`,
  "--c-bg": `light-dark(${stone[200]}, ${stone[900]})`,
  "--c-bg-light": `light-dark(${stone[100]}, ${stone[800]})`,
  "--c-border": `light-dark(${stone[300]}, oklch(from var(--c-bg-light) calc(l + 0.05) c h))`,
  "--c-text": `light-dark(${stone[900]}, ${stone[200]})`,
  "--c-text-alt": stone[50],
  "--c-text-muted": `light-dark(${stone[700]}, ${stone[400]})`,
  "--c-primary": "oklch(0.52 0.18 339.7)",
  "--c-secondary": "oklch(0.52 0.18 279.88)",
  "--c-success": "oklch(0.48 0.18 142)",
  "--c-danger": "oklch(0.48 0.18 25)",
  "--c-warning": "oklch(0.48 0.18 90)",
  "--c-info": "oklch(0.48 0.18 252)",
  "--shadow": "0px 2px 2px oklch(0 0 0 / 7%), 0px 4px 4px oklch(0 0 0 / 15%)",
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
