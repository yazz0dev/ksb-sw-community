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
          light: '#60a5fa', // blue-400
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb', // blue-600
          text: '#ffffff',  // text color on primary background
        },
        secondary: {
          light: '#f3f4f6', // gray-100
          DEFAULT: '#e5e7eb', // gray-200
          dark: '#d1d5db', // gray-300
        },
        // Add missing color variables used in your components
        text: {
          primary: '#111827',   // dark text for headings
          secondary: '#4b5563', // medium text for labels
          disabled: '#9ca3af',  // light text for numbers/disabled
        },
        surface: {
          DEFAULT: '#ffffff',   // card/container backgrounds
          hover: '#f9fafb',     // hover state for surface
        },
        border: '#e5e7eb',      // border color
        info: {
          light: '#e0f2fe',     // light blue background
          dark: '#0369a1',      // dark blue text
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