import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-jakarta)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        editorial: ["var(--font-editorial)", "Newsreader", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.04)",
        shell: "0 10px 35px -5px rgba(15, 23, 42, 0.08), 0 30px 60px -12px rgba(37, 99, 235, 0.09)",
      },
    },
  },
  plugins: [],
};

export default config;
