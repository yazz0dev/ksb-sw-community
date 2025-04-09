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
        },
        success: {
          light: '#bbf7d0',    // green-200
          DEFAULT: '#22c55e',  // green-500
          dark: '#15803d',     // green-700
          text: '#166534',     // text on success background
        },
        error: {
          light: '#fecaca',    // red-200
          DEFAULT: '#ef4444',  // red-500
          dark: '#b91c1c',     // red-700
          text: '#991b1b',     // text on error background
        },
        warning: {
          light: '#fef08a',    // yellow-200
          DEFAULT: '#eab308',  // yellow-500
          dark: '#a16207',     // yellow-700
          text: '#854d0e',     // text on warning background
        },
        neutral: {
          light: '#f1f5f9',    // slate-100
          DEFAULT: '#e2e8f0',  // slate-200
          dark: '#64748b',     // slate-500
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
      },
      spacing: {
        // Add explicit padding utilities if needed
        '3': '0.75rem',     // p-3, px-3, py-3
        '4': '1rem',        // p-4, px-4, py-4
        '5': '1.25rem',     // p-5, px-5, py-5
        '6': '1.5rem',      // p-6, px-6, py-6
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // Add forms plugin
  ],
}