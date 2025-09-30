/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { green: "#2f4f4f", olive: "#4A5E48", red: "#C43D3D" } },
      borderRadius: { 'xl': '12px' }
    }
  },
  plugins: []
};