const APP_THEME = {
  colors: {
    // TODO
  },
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
