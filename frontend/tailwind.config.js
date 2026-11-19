/** @type {import('tailwindcss').Config} */
// Tokens del sistema de diseño (docs de referencia: lienzo de piedra cálido + un único acento cian).
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fafaf9",
        card: "#ffffff",
        line: "#e8e6e5",
        muted: "#d6d3d1",
        ash: "#a8a29e",
        warm: "#78716c",
        ink: "#0c0a09",
        soot: "#1c1917",
        sky: "#c1e1f7",
        cyan: { DEFAULT: "#3ba6f1", edge: "#3398e1" },
      },
      fontFamily: {
        display: ['"Inter Tight Variable"', '"Inter Tight"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Inter Variable"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["10px", { lineHeight: "2.3" }],
        body: ["14px", { lineHeight: "1.64", letterSpacing: "0.004em" }],
        "body-lg": ["16px", { lineHeight: "1.69", letterSpacing: "0.003em" }],
        subheading: ["20px", { lineHeight: "1.2", letterSpacing: "-0.005em" }],
        "heading-sm": ["32px", { lineHeight: "1.25", letterSpacing: "-0.025em" }],
        display: ["52px", { lineHeight: "1.12", letterSpacing: "-0.021em" }],
      },
      borderRadius: { input: "6px", card: "10px", feature: "16px" },
      boxShadow: {
        subtle: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
        card: "rgba(0, 0, 0, 0.05) 0px 4px 16px 0px",
        chip: "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px",
        float: "rgba(17, 12, 46, 0.12) 0px 12px 45px 0px",
      },
      maxWidth: { page: "1200px" },
    },
  },
  plugins: [],
};
