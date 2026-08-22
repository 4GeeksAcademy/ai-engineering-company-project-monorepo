import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F6E5C",
          dark: "#0B4F42",
          light: "#E6F4F1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
