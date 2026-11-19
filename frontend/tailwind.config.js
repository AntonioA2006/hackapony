/** @type {import('tailwindcss').Config} */
// Estructura del sistema de referencia (bordes finos, tipografía ligera) con paleta propia del proyecto.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "agua": lienzo frío claro, azul profundo para texto, un azul de acción y colores con significado.
        canvas: "#f7fafc",
        card: "#ffffff",
        line: "#e4ebf2",
        muted: "#c5d2df",
        ash: "#8ea0b3",
        warm: "#526277",
        ink: "#142235",
        soot: "#0b1f33",
        sky: "#e7f2fc",
        tide: "#14b8a6",
        mist: "#38bdf8",
        cyan: { DEFAULT: "#1479e8", edge: "#0e5fbe" },
        // Semánticos (prioridad / estado)
        critical: "#d03b3b",
        high: "#ec835a",
        medium: "#fab219",
        low: "#94a3b4",
        ok: "#1e9e78",
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
