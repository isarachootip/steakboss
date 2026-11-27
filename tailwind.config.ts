import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sb: {
          bg: "#0b0a09",
          bgDeep: "#070606",
          panel: "#161412",
          panel2: "#211d19",
          line: "#332c22",
          ink: "#f8f3e8",
          mute: "#b8ac99",
          gold: "#d4af37",
          gold2: "#f0cf70",
          inkOnGold: "#1a1205",
          pink: "#d4af37",
          pink2: "#f0cf70",
          orange: "#ff7d33",
          red: "#ef3b2d",
          ok: "#4cc38a",
        },
      },
      fontFamily: {
        display: ["var(--font-kanit)", "sans-serif"],
        sans: ["var(--font-sarabun)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
