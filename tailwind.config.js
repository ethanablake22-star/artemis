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
        // Carbon-black base palette (replaces the blue-tinted artemis scale)
        artemis: {
          950: '#080808',
          900: '#0f0f0f',
          850: '#141414',
          800: '#191919',
          750: '#1e1e1e',
          700: '#242424',
          600: '#2d2d2d',
          500: '#3a3a3a',
          400: '#525252',
          300: '#6b6b6b',
          200: '#9a9a9a',
          100: '#c8c8c8',
          accent: {
            DEFAULT: '#A87941', // Bronze accent
            hover: '#CD8E3F',
            subtle: 'rgba(168, 121, 65, 0.12)',
            glow: 'rgba(168, 121, 65, 0.28)',
          },
          gold: '#A87941',
        },
        // Bronze scale — primary / positive / financial accent
        bronze: {
          50:  '#fdf7e8',
          100: '#f8e8bc',
          200: '#f0ce84',
          300: '#e8b04a',
          400: '#d4951f',  // Bright bronze/gold
          500: '#a87941',  // Mid bronze (main primary)
          600: '#8b5e1a',  // Deep bronze
          700: '#6b430f',  // Dark bronze
          800: '#4a2e08',  // Very dark bronze
          900: '#2d1a02',  // Near-black bronze
          950: '#180d00',  // Carbon bronze
        },
        // Silver scale — secondary / navigation / info accent
        silver: {
          50:  '#f4f4f4',
          100: '#e8e8e8',
          200: '#c8c8c8',  // Classic silver
          300: '#a8a8a8',  // Silver
          400: '#888888',  // Mid silver
          500: '#6b6b6b',  // Dark silver
          600: '#525252',
          700: '#3a3a3a',
          800: '#262626',
          900: '#161616',
          950: '#0a0a0a',
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
