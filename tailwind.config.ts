import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Inter",
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
        "card-2": "hsl(var(--card-2))",
        border: "hsl(var(--border))",
        muted: { DEFAULT: "hsl(var(--card-2))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "#0A84FF", soft: "hsl(var(--accent-soft))" },
        positive: "#30D158",
        danger: "#FF453A",
        warning: "#FF9F0A",
        series: {
          1: "var(--s1)",
          2: "var(--s2)",
          3: "var(--s3)",
          4: "var(--s4)",
          5: "var(--s5)",
          6: "var(--s6)",
        },
      },
      borderRadius: { xl: "14px", "2xl": "16px", "3xl": "20px", "4xl": "24px" },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
