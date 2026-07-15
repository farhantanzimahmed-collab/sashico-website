import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#000000",
          white: "#FFFFFF",
          cream: "#F5F0E8",
          gray: {
            50:  "#FAFAFA",
            100: "#F0F0F0",
            200: "#D8D8D8",
            300: "#B8B8B8",
            400: "#888888",
            500: "#606060",
            600: "#404040",
            700: "#282828",
            800: "#181818",
            900: "#111111",
          },
        },
      },
      fontFamily: {
        display: ["'Times New Roman'", "Georgia", "Times", "serif"],
        serif:   ["'Times New Roman'", "Georgia", "Times", "serif"],
        sans:    ["'Times New Roman'", "Georgia", "Times", "serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        "display-sm":  ["3rem",   { lineHeight: "0.95", letterSpacing: "-0.01em" }],
        "display-md":  ["5rem",   { lineHeight: "0.92", letterSpacing: "-0.01em" }],
        "display-lg":  ["8rem",   { lineHeight: "0.90", letterSpacing: "-0.02em" }],
        "display-xl":  ["12rem",  { lineHeight: "0.88", letterSpacing: "-0.02em" }],
        "display-2xl": ["16rem",  { lineHeight: "0.86", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        "sm":  "4px",
        "md":  "8px",
        "lg":  "8px",
        "xl":  "12px",
        "2xl": "16px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        "36": "9rem",
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
      screens: {
        "2xl": "1400px",
      },
      animation: {
        "marquee":        "marqueeScroll 40s linear infinite",
        "fade-up":        "fadeUp 0.6s ease-out forwards",
        "fade-in":        "fadeIn 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.4s ease-out forwards",
        "slide-down":     "slideDown 0.3s ease-out forwards",
      },
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
      },
      boxShadow: {
        "card": "0 1px 4px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
