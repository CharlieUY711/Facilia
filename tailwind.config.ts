import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FACILIA / ODDY brand palette — from Manual de Marca v1.0
        navy: {
          DEFAULT: "#0B2A61",
          50: "#EAF0FB",
          100: "#CBD9F0",
          300: "#5D7FB8",
          500: "#0B2A61",
          700: "#081F49",
          900: "#051531",
        },
        orange: {
          DEFAULT: "#D97400",
          50: "#FDF3E6",
          100: "#FBE2C0",
          300: "#EFA855",
          500: "#D97400",
          700: "#A85900",
        },
        blue: {
          DEFAULT: "#0169F5",
          50: "#E6F0FE",
          100: "#C0DBFD",
          300: "#5A9EF9",
          500: "#0169F5",
          700: "#0150BD",
        },
        ink: "#0B1220",
        paper: "#FBFBFA",
      },
      fontFamily: {
        display: ["var(--font-poppins)", "Poppins", "sans-serif"],
        body: ["var(--font-body)", "Liberation Sans", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(11, 42, 97, 0.25)",
        card: "0 2px 12px rgba(11, 42, 97, 0.08)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out both",
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
