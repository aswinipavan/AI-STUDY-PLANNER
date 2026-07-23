import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Tailwind v4: theme tokens are declared via @theme in globals.css
// This config only handles content scanning and plugins
const config = {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
