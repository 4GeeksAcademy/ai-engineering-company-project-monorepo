/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./app/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 400: "#67e8f9", 500: "#22d3ee", 600: "#0891b2" } } } },
  plugins: [],
};
