/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: "#16a34a",
        panel: "#0f172a",
        panelMuted: "#111827",
      },
    },
  },
  plugins: [],
};
