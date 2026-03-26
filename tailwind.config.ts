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
      keyframes: {
        ghostGlowPulseDark: {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(56, 189, 248, 0.3), 0 0 2px rgba(15, 23, 42, 0.25)",
          },
          "50%": {
            boxShadow:
              "0 0 20px rgba(56, 189, 248, 0.7), 0 0 2px rgba(15, 23, 42, 0.25)",
          },
        },
        ghostGlowPulseLight: {
          "0%, 100%": {
            boxShadow:
              "0 0 18px rgba(14, 165, 233, 0.3), 0 0 2px rgba(15, 23, 42, 0.15)",
          },
          "50%": {
            boxShadow:
              "0 0 18px rgba(14, 165, 233, 0.7), 0 0 2px rgba(15, 23, 42, 0.15)",
          },
        },
      },
      animation: {
        "ghost-glow-pulse-dark":
          "ghostGlowPulseDark 2s ease-in-out infinite",
        "ghost-glow-pulse-light":
          "ghostGlowPulseLight 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
