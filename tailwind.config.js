/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#2f4f4f",
          olive: "#4A5E48",
          red: "#C43D3D",
        },
      },
      borderRadius: { xl: "12px", "2xl": "16px" },
      fontFamily: {
        display: ["Norwester", "system-ui", "sans-serif"],
        sans: ["LeagueSpartan", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,.06)",
      },
    },
  },
  plugins: [],
};
