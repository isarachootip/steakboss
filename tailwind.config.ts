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
          bg: "#151211",
          bgDeep: "#100d0c",
          panel: "#1f1a18",
          panel2: "#2a2320",
          line: "#3b322e",
          ink: "#f7f0ea",
          mute: "#bcaea5",
          pink: "#ff6fb7",
          pink2: "#ff9fd0",
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
