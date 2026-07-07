/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        material: {
          brass: "#b8860b",
          copper: "#b06a3a",
          kansa: "#8a8a6d",
        },
        brand: {
          orange: "#F97316",
          "orange-dark": "#EA580C",
          red: "#E11D48",
          "red-dark": "#BE123C",
          yellow: "#F59E0B",
          "yellow-dark": "#D97706",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 12px -2px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 4px 16px -4px rgba(15, 23, 42, 0.1), 0 2px 6px -2px rgba(15, 23, 42, 0.06)",
        sheet: "0 -8px 40px -8px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};
