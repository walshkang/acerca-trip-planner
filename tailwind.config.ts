import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          surface: "#fbfaee",
          "surface-dim": "#dbdbcf",
          "surface-container": "#efeee3",
          "surface-container-low": "#f5f4e8",
          "surface-container-high": "#e9e9dd",
          "surface-container-highest": "#e4e3d7",
          "surface-container-lowest": "#ffffff",
          "surface-warm": "#fdfcf0",
          primary: "#003fa4",
          "primary-container": "#0054d6",
          "on-surface": "#1b1c15",
          "on-surface-variant": "#434654",
          "on-primary": "#ffffff",
          secondary: "#5f5e5c",
          "secondary-container": "#e5e2de",
          tertiary: "#454746",
          "tertiary-fixed": "#e2e3e1",
          outline: "#737686",
          "outline-variant": "#c3c6d7",
          error: "#ba1a1a",
        },
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
