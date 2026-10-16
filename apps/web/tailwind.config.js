/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        canvas: '#090D16',
        panel: '#0E1524',
        card: '#131D31',
        cardHover: '#18253E',
        borderSubtle: '#1E2B45',
      },
    },
  },
  plugins: [],
}
