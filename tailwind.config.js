/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#8b5cf6', // purple-500
          DEFAULT: '#7c3aed', // purple-600
          dark: '#6d28d9', // purple-700
          text: '#ffffff',  // text color on primary background
        },
        secondary: {
          light: '#fde68a', // amber-200
          DEFAULT: '#fcd34d', // amber-300
          dark: '#fbbf24', // amber-400
        },
        // Add missing color variables used in your components
        text: {
          primary: '#1e293b',   // slate-800 for headings
          secondary: '#475569', // slate-600 for labels
          disabled: '#94a3b8',  // slate-400 for numbers/disabled
        },
        surface: {
          DEFAULT: '#ffffff',   // card/container backgrounds
          hover: '#f8fafc',     // slate-50 for hover state
        },
        border: '#e2e8f0',      // slate-200 for borders
        info: {
          light: '#dbeafe',     // blue-100 background
          dark: '#2563eb',      // blue-600 text
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
} 