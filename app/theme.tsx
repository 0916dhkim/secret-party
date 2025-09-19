export const CSS_VARIABLES = {
  "--c-bg-dark": "oklch(0.92 0.005 339.7)",
  "--c-bg": "oklch(0.96 0.005 339.7)",
  "--c-bg-light": "oklch(1 0.005 339.7)",
  "--c-border": "oklch(0.6 0.03 339.7)",
  "--c-text": "oklch(0.15 0.015 339.7)",
  "--c-text-alt": "oklch(1 0.015 339.7)",
  "--c-text-muted": "oklch(0.6 0.015 339.7)",
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
