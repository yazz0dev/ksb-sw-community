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
          extraLight: '#dbeafe', // blue-100
          light: '#60a5fa', // blue-400
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb', // blue-600
        },
        secondary: {
          light: '#f3f4f6', // gray-100 // Often used as bg
          DEFAULT: '#e5e7eb', // gray-200 // Often used as border
          dark: '#d1d5db', // gray-300
        },
        // Semantic colors
        background: '#f3f4f6', // gray-100
        surface: '#ffffff',     // white
        border: '#e5e7eb',     // gray-200
        text: {
          primary: '#1f2937',   // gray-800
          secondary: '#6b7280', // gray-500
          onPrimary: '#ffffff', // white (for text on primary color bg)
          // Add on-color variants as needed (e.g., onSurface, onSuccess)
        },
        // State colors (adjust shades as needed)
        success: {
          light: '#dcfce7', // green-100
          DEFAULT: '#22c55e', // green-500 (Used green-600 before, adjusting)
          dark: '#16a34a', // green-600 (Used green-700 before)
          text: '#14532d' // green-900 (Used green-800 before, more contrast)
        },
        danger: {
          extraLight: '#fee2e2', // red-100 (Used red-50/100 before)
          light: '#fecaca', // red-200 (Used red-100 border before)
          DEFAULT: '#ef4444', // red-500 (Used red-600 before)
          dark: '#dc2626', // red-600 (Used red-700 before)
          text: '#7f1d1d' // red-900 (Used red-700/800 before, more contrast)
        },
        warning: {
          extraLight: '#fef9c3', // yellow-50
          light: '#fef08a', // yellow-100/200
          DEFAULT: '#eab308', // yellow-500 (Used yellow-700/800 before)
          dark: '#ca8a04', // yellow-600
          text: '#713f12' // yellow-900 (Used yellow-700/800 before, more contrast)
        },
        info: { // For default/neutral status
          light: '#f3f4f6', // gray-100
          DEFAULT: '#6b7280', // gray-500
          dark: '#4b5563', // gray-600
          text: '#1f2937' // gray-800
        },
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