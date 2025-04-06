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
        primary: { // Updated primary color palette to warmer tones
          extraLight: '#fff7ed',  // orange-50
          light: '#fed7aa',   // orange-200
          DEFAULT: '#f97316',   // orange-500
          dark: '#ea580c',    // orange-600
        },
        secondary: { // Updated secondary color palette to warmer grays/beiges
          light: '#f5f5f4',  // gray-100
          DEFAULT: '#e0e0e0',  // gray-200
          dark: '#d4d4d4',   // gray-300
        },
        // Semantic colors - unchanged
        background: '#f5f5f4', // gray-100 - using secondary light for background
        surface: '#ffffff',     // white
        border: '#e0e0e0',     // gray-200 - using secondary DEFAULT for border
        text: {
          primary: '#374151',   // gray-700 - slightly darker for better readability on warmer backgrounds
          secondary: '#6b7280', // gray-500 - unchanged
          onPrimary: '#ffffff', // white (for text on primary color bg)
          disabled: '#9ca3af', // gray-400 - muted color for disabled text
        },
        // State colors - semantic colors remain mostly unchanged
        success: {
          light: '#dcfce7',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
          text: '#14532d'
        },
        danger: {
          extraLight: '#fee2e2',
          light: '#fecaca',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          text: '#7f1d1d'
        },
        warning: {
          extraLight: '#fef9c3',
          light: '#fef08a',
          DEFAULT: '#eab308',
          dark: '#ca8a04',
          text: '#713f12'
        },
        info: { // Still using gray shades for info, but adjusted to secondary palette
          light: '#f5f5f4', // secondary light
          DEFAULT: '#717171', // gray-500 - slightly darker info color
          dark: '#4a4a4a', // gray-700 - even darker for contrast
          text: '#272727'  // gray-900 - darkest for info text
        },
        neutral: { // Added neutral color for muted elements
          light: '#f5f5f5',
          DEFAULT: '#d4d4d4',
          dark: '#a8a8a8',
          extraDark: '#444444'
        },
      },
      extend: { // Keeping existing keyframes and animations, placing them under extend
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          }
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out forwards',
        },
        spacing: { // Example of adding custom spacing if needed, can remove if not used
          '72': '18rem',
          '84': '21rem',
          '96': '24rem',
        },
        // Example of extending border width, can remove or add more as needed
        borderWidth: {
          DEFAULT: '1px',
          '0': '0',
          '2': '2px',
          '3': '3px',
          '4': '4px',
          '6': '6px',
          '8': '8px',
        }
      }
    },
  },
  plugins: [],
}
