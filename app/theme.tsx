const oklch = (
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
) =>
  `oklch(${lightness} ${chroma} ${hue}${
    alpha == null ? "" : `/ ${alpha * 100}%`
  })`;
const lightDark = (light: string, dark: string) =>
  `light-dark(${light}, ${dark})`;

const primitives = {
  orange: {
    50: oklch(0.98, 0.016, 73.684),
    100: oklch(0.954, 0.038, 75.164),
    200: oklch(0.901, 0.076, 70.697),
    300: oklch(0.837, 0.128, 66.29),
    400: oklch(0.75, 0.183, 55.934),
    500: oklch(0.705, 0.213, 47.604),
    600: oklch(0.646, 0.222, 41.116),
    700: oklch(0.553, 0.195, 38.402),
    800: oklch(0.47, 0.157, 37.304),
    900: oklch(0.408, 0.123, 38.172),
    950: oklch(0.266, 0.079, 36.259),
  },
  emerald: {
    50: oklch(0.979, 0.021, 166.113),
    100: oklch(0.95, 0.052, 163.051),
    200: oklch(0.905, 0.093, 164.15),
    300: oklch(0.845, 0.143, 164.978),
    400: oklch(0.765, 0.177, 163.223),
    500: oklch(0.696, 0.17, 162.48),
    600: oklch(0.596, 0.145, 163.225),
    700: oklch(0.508, 0.118, 165.612),
    800: oklch(0.432, 0.095, 166.913),
    900: oklch(0.378, 0.077, 168.94),
    950: oklch(0.262, 0.051, 172.552),
  },
  sky: {
    50: oklch(0.977, 0.013, 236.62),
    100: oklch(0.951, 0.026, 236.824),
    200: oklch(0.901, 0.058, 230.902),
    300: oklch(0.828, 0.111, 230.318),
    400: oklch(0.746, 0.16, 232.661),
    500: oklch(0.685, 0.169, 237.323),
    600: oklch(0.588, 0.158, 241.966),
    700: oklch(0.5, 0.134, 242.749),
    800: oklch(0.443, 0.11, 240.79),
    900: oklch(0.391, 0.09, 240.876),
    950: oklch(0.293, 0.066, 243.157),
  },
  fuchsia: {
    50: oklch(0.977, 0.017, 320.058),
    100: oklch(0.952, 0.037, 318.852),
    200: oklch(0.903, 0.076, 319.62),
    300: oklch(0.833, 0.145, 321.434),
    400: oklch(0.74, 0.238, 322.16),
    500: oklch(0.667, 0.295, 322.15),
    600: oklch(0.591, 0.293, 322.896),
    700: oklch(0.518, 0.253, 323.949),
    800: oklch(0.452, 0.211, 324.591),
    900: oklch(0.401, 0.17, 325.612),
    950: oklch(0.293, 0.136, 325.661),
  },
  rose: {
    50: oklch(0.969, 0.015, 12.422),
    100: oklch(0.941, 0.03, 12.58),
    200: oklch(0.892, 0.058, 10.001),
    300: oklch(0.81, 0.117, 11.638),
    400: oklch(0.712, 0.194, 13.428),
    500: oklch(0.645, 0.246, 16.439),
    600: oklch(0.586, 0.253, 17.585),
    700: oklch(0.514, 0.222, 16.935),
    800: oklch(0.455, 0.188, 13.697),
    900: oklch(0.41, 0.159, 10.272),
    950: oklch(0.271, 0.105, 12.094),
  },
  stone: {
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
  },
};

export const system = {
  black: "#000",
  white: "#fff",
  neutral: primitives.stone,
  primary: primitives.fuchsia,
  success: primitives.emerald,
  destructive: primitives.rose,
  warning: primitives.orange,
  info: primitives.sky,
  shadow: {
    default: `0px 2px 2px ${oklch(0, 0, 0, 0.07)}, 0px 4px 4px ${oklch(
      0,
      0,
      0,
      0.15
    )}`,
  },
};

export const CSS_VARIABLES = {
  "--c-bg-dark": lightDark(system.neutral[300], system.neutral[950]),
  "--c-bg": lightDark(system.neutral[200], system.neutral[900]),
  "--c-bg-light": lightDark(system.neutral[100], system.neutral[800]),
  "--c-border": lightDark(system.neutral[300], system.neutral[700]),
  "--c-text": lightDark(system.neutral[950], system.neutral[200]),
  "--c-text-alt": system.neutral[50],
  "--c-text-muted": lightDark(system.neutral[700], system.neutral[400]),
  "--c-primary": system.primary[700],
  "--c-success": system.success[700],
  "--c-danger": system.destructive[800],
  "--c-warning": system.warning[800],
  "--c-info": system.info[700],
  "--shadow": system.shadow.default,

  "--c-page-background": lightDark(system.neutral[200], system.neutral[800]),

  "--c-button-default-background": lightDark(
    system.neutral[950],
    system.neutral[50]
  ),
  "--c-button-default-hover-background": lightDark(
    system.neutral[600],
    system.neutral[400]
  ),
  "--c-button-default-disabled-background": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
  "--c-button-default-text": lightDark(system.neutral[50], system.neutral[950]),
  "--c-button-default-disabled-text": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-primary-background": lightDark(
    system.primary[700],
    system.primary[700]
  ),
  "--c-button-primary-hover-background": lightDark(
    system.primary[500],
    system.primary[900]
  ),
  "--c-button-primary-disabled-background": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
  "--c-button-primary-text": lightDark(system.neutral[50], system.neutral[50]),
  "--c-button-primary-disabled-text": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-secondary-background": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-secondary-border": lightDark(
    system.neutral[400],
    system.neutral[600]
  ),
  "--c-button-secondary-hover-background": lightDark(
    system.neutral[200],
    system.neutral[800]
  ),
  "--c-button-secondary-disabled-background": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
  "--c-button-secondary-text": lightDark(
    system.neutral[900],
    system.neutral[100]
  ),
  "--c-button-secondary-disabled-text": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-success-background": lightDark(
    system.success[700],
    system.success[700]
  ),
  "--c-button-success-hover-background": lightDark(
    system.success[500],
    system.success[900]
  ),
  "--c-button-success-disabled-background": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
  "--c-button-success-text": lightDark(system.neutral[50], system.neutral[50]),
  "--c-button-success-disabled-text": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-destructive-background": lightDark(
    system.destructive[800],
    system.destructive[800]
  ),
  "--c-button-destructive-hover-background": lightDark(
    system.destructive[700],
    system.destructive[900]
  ),
  "--c-button-destructive-disabled-background": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
  "--c-button-destructive-text": lightDark(
    system.neutral[50],
    system.neutral[50]
  ),
  "--c-button-destructive-disabled-text": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-ghost-hover-background": lightDark(
    system.neutral[300],
    system.neutral[700]
  ),
  "--c-button-ghost-text": lightDark(system.neutral[950], system.neutral[50]),
  "--c-button-ghost-disabled-text": lightDark(
    system.neutral[700],
    system.neutral[300]
  ),
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
