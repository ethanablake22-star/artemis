/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        artemis: {
          950: '#07090e',
          900: '#0d1117',
          850: '#131722',
          800: '#161b26',
          750: '#1c2331',
          700: '#222b3d',
          600: '#2e3a51',
          500: '#3d4d6b',
          400: '#5a6f96',
          300: '#8ba1c7',
          200: '#b8c7e0',
          100: '#e1e8f5',
          accent: {
            DEFAULT: '#38bdf8', // Cyan-blue accent
            hover: '#0ea5e9',
            subtle: 'rgba(56, 189, 248, 0.1)',
            glow: 'rgba(56, 189, 248, 0.25)',
          },
          gold: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
