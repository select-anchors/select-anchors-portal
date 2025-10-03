/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",   // safe if you add pages later
    "./src/**/*.{js,jsx,ts,tsx}",     // safe if you use /src
  ],
  theme: {
    extend: {
      colors: {
        "brand-green": "#2f4f4f",
        "brand-olive": "#4A5E48",
      },
      boxShadow: {
        card: "0 8px 20px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
      },
      // Optional: if you want utility classes that map to your loaded fonts
      fontFamily: {
        norwester: ['var(--font-norwester)', 'system-ui', 'sans-serif'],
        league: ['var(--font-league)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
