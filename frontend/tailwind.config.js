/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 600: "#0369A1", 700: "#075985" },
        accent: { 500: "#06B6D4" },
      },
    },
  },
  plugins: [],
};