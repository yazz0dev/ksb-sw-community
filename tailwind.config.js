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
          light: '#06b6d4', // Teal 500 (from main.css --color-primary-light)
          DEFAULT: '#0891b2', // Teal 600 (from main.css --color-primary)
          dark: '#0e7490', // Teal 700 (from main.css --color-primary-dark)
          text: '#ffffff', // (from main.css --color-primary-text)
        },
        secondary: {
          light: '#fb923c', // Orange 400 (from main.css --color-secondary-light)
          DEFAULT: '#f97316', // Orange 500 (from main.css --color-secondary)
          dark: '#ea580c', // Orange 600 (from main.css --color-secondary-dark)
        },
        text: {
          primary: '#1e293b',   // Slate 800 (from main.css --color-text-primary)
          secondary: '#475569', // Slate 600 (from main.css --color-text-secondary)
          disabled: '#94a3b8',  // Slate 400 (from main.css --color-text-disabled)
        },
        surface: {
          DEFAULT: '#ffffff',   // (from main.css --color-surface)
          hover: '#f8fafc',     // Slate 50 (from main.css --color-surface-hover)
        },
        border: '#e2e8f0',      // Slate 200 (from main.css --color-border)
        info: {
          light: '#cffafe',     // Cyan 100 (from main.css --color-info-light)
          DEFAULT: '#0891b2',   // Cyan 600 (from main.css --color-info-dark) - Assuming DEFAULT is the dark text color
          dark: '#0e7490',      // Adding a darker shade if needed
          text: '#0e7490',      // Text color on info-light background
        },
        success: {
          light: '#bbf7d0',    // Green 200 (from main.css --color-success-light)
          DEFAULT: '#22c55e',  // Green 500 (from main.css --color-success)
          dark: '#15803d',     // Green 700 (from main.css --color-success-dark)
          text: '#166534',     // (from main.css --color-success-text)
        },
        error: {
          light: '#fecaca',    // Red 200 (from main.css --color-error-light)
          DEFAULT: '#ef4444',  // Red 500 (from main.css --color-error)
          dark: '#b91c1c',     // Red 700 (from main.css --color-error-dark)
          text: '#991b1b',     // (from main.css --color-error-text)
        },
        warning: {
          light: '#fef08a',    // Yellow 200 (from main.css --color-warning-light)
          DEFAULT: '#eab308',  // Yellow 500 (from main.css --color-warning)
          dark: '#a16207',     // Yellow 700 (from main.css --color-warning-dark)
          text: '#854d0e',     // (from main.css --color-warning-text)
        },
        neutral: {
          light: '#f1f5f9',    // Slate 100 (from main.css --color-neutral-light)
          DEFAULT: '#e2e8f0',  // Slate 200 (from main.css --color-neutral)
          dark: '#64748b',     // Slate 500 (from main.css --color-neutral-dark)
        }
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.text.secondary'),
            h1: { color: theme('colors.text.primary') },
            h2: { color: theme('colors.text.primary') },
            h3: { color: theme('colors.text.primary') },
            h4: { color: theme('colors.text.primary') },
            strong: { color: theme('colors.text.primary') },
            a: {
              color: theme('colors.primary.DEFAULT'),
              '&:hover': {
                color: theme('colors.primary.dark'),
              },
            },
            // Add more styles as needed
          },
        },
      }),
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
    }, // Added missing closing brace for extend
  },
  plugins: [
    require('@tailwindcss/forms'), // Add forms plugin
    require('@tailwindcss/typography'), // Add typography plugin
  ],
}
