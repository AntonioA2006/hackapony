/** @type {import('tailwindcss').Config} */
// Estructura del sistema de referencia (bordes finos, tipografía ligera) con paleta propia del proyecto.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "agua": lienzo frío claro, azul profundo para texto, un azul de acción y colores con significado.
        canvas: "#f5f9fc",
        card: "#ffffff",
        line: "#e1e8ef",
        muted: "#c9d5e0",
        ash: "#94a3b4",
        warm: "#556678", // texto secundario (pizarra)
        ink: "#0b2338", // azul marino casi negro
        soot: "#12324f", // superficies oscuras / botón secundario
        sky: "#d6ecf8", // fondo del resaltado
        cyan: { DEFAULT: "#0b84c6", edge: "#086c9f" }, // azul agua: acción principal y enlaces
        // Semánticos (prioridad / estado)
        critical: "#d9483b",
        high: "#ee8a2e",
        medium: "#e9b230",
        low: "#7fa3bf",
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
