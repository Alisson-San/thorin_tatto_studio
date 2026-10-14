import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#070606",
        surface: "#120D0E",
        wine: {
          DEFAULT: "#6B141A",
          dark: "#38080C",
          light: "#991B24",
        },
        ember: {
          DEFAULT: "#EA580C",
          bright: "#FF7A00",
          gold: "#F59E0B",
        },
      },
      fontFamily: {
        gothic: ["var(--font-gothic)", "serif"],
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
