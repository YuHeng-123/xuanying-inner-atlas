import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#070b12",
        amber: {
          400: "#fbbf24",
        },
        rose: {
          500: "#f43f5e",
        },
        emerald: {
          400: "#34d399",
        },
      },
      boxShadow: {
        amber: "0 0 40px rgba(251, 191, 36, 0.16)",
        rose: "0 0 40px rgba(244, 63, 94, 0.16)",
        emerald: "0 0 40px rgba(52, 211, 153, 0.16)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
