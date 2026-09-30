/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 400: "#67e8f9", 500: "#22d3ee", 600: "#0891b2" } },
      animation: {
        "fade-up": "fade-up .6s ease-out both",
        "fade-in": "fade-in .6s ease-out both",
        "counter": "counter-in .8s ease-out .4s both",
      },
      keyframes: {
        "fade-up":  { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "fade-in":  { from: { opacity: 0 }, to: { opacity: 1 } },
        "counter-in": { from: { opacity: 0, transform: "scale(.5)" }, to: { opacity: 1, transform: "scale(1)" } },
      },
    },
  },
  plugins: []
};
