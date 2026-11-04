import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: "#7D9D8B",
        matcha: "#98B2A0",
        cream: "#FDFBF7",
        paper: "#F7F4EE",
        mocha: "#1F1E1B",
        obsidian: "#2B2925",
        ink: "#3A3833",
        sakura: "#F4C2C8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        aura: "0 0 40px rgba(125,157,139,.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
