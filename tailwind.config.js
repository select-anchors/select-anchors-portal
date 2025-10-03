/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // used in your header/logo and buttons
        "brand-green": "#2f4f4f",
      },
      boxShadow: {
        // optional: if you want to keep using "shadow-card"
        card: "0 8px 20px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
      },
      fontFamily: {
        // optional helpers if you want to reference in class form later
        norwester: ["var(--font-norwester)", "system-ui", "sans-serif"],
        league: ["var(--font-league)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
