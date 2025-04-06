/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Updated Warm Palette ---
        primary: { // Orange-based primary
          extraLight: '#fff7ed',  // orange-50
          light: '#fed7aa',   // orange-200
          DEFAULT: '#f97316',   // orange-500
          dark: '#ea580c',    // orange-600
          text: '#ffffff',      // White text on primary bg
        },
        secondary: { // Warmer grays/beiges
          extraLight: '#fafaf9', // stone-50 (slightly warmer than gray)
          light: '#f5f5f4',   // stone-100
          DEFAULT: '#e7e5e4',   // stone-200
          dark: '#d6d3d1',    // stone-300
          hover: '#f5f5f4'   // stone-100 for hover on white surface
        },
        background: '#fafaf9', // stone-50 (Warm light background)
        surface: '#ffffff',     // white (For cards, modals, etc.)
        'surface-variant': '#f5f5f4', // stone-100 (Slightly off-white variant)
        'surface-hover': '#f5f5f4', // stone-100 (Hover effect on surface)
        'surface-disabled': '#e7e5e4', // stone-200 (Disabled background)
        border: '#e7e5e4',     // stone-200 (Primary border color)
        'border-light': '#f5f5f4', // stone-100 (Lighter border variant)
        text: {
          primary: '#292524',   // stone-800 (Darker text for contrast)
          secondary: '#78716c', // stone-500 (Medium emphasis text)
          disabled: '#a8a29e', // stone-400 (Muted/disabled text)
          onPrimary: '#ffffff', // White text on primary color bg
          placeholder: '#a8a29e', // stone-400 for placeholders
        },
        // --- Semantic State Colors ---
        success: {
          extraLight: '#f0fdf4', // green-50
          light: '#dcfce7',   // green-100
          DEFAULT: '#22c55e',   // green-500
          dark: '#16a34a',    // green-600
          text: '#14532d'     // green-900
        },
        error: { // Renamed from danger
          extraLight: '#fff1f2', // rose-50
          light: '#ffe4e6',   // rose-100
          DEFAULT: '#f43f5e',   // rose-500
          dark: '#e11d48',    // rose-600
          text: '#881337'     // rose-900
        },
        warning: {
          extraLight: '#fffbeb', // amber-50
          light: '#fef3c7',   // amber-100
          DEFAULT: '#f59e0b',   // amber-500
          dark: '#d97706',    // amber-600
          text: '#78350f'     // amber-900
        },
        info: { // Using a muted blue for info
          extraLight: '#f0f9ff', // sky-50
          light: '#e0f2fe',   // sky-100
          DEFAULT: '#38bdf8',   // sky-400
          dark: '#0ea5e9',    // sky-500
          text: '#075985'     // sky-800
        },
        neutral: { // For general muted/secondary elements
          extraLight: '#f5f5f4', // stone-100
          light: '#e7e5e4',   // stone-200
          DEFAULT: '#d6d3d1',   // stone-300
          dark: '#a8a29e',    // stone-400
          text: '#57534e'     // stone-600
        },
      },
      // Keep existing keyframes and animations under extend
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      spacing: { // Example spacing extensions (keep or remove as needed)
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderWidth: { // Example border width extensions (keep or remove as needed)
        DEFAULT: '1px',
        '0': '0',
        '2': '2px',
        '3': '3px',
        '4': '4px',
        '6': '6px',
        '8': '8px',
      },
      // Add prose styles for TransparencyView markdown
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.text.secondary'),
            a: {
              color: theme('colors.primary.DEFAULT'),
              '&:hover': {
                color: theme('colors.primary.dark'),
              },
              textDecoration: 'none',
            },
            h1: { color: theme('colors.text.primary') },
            h2: { color: theme('colors.text.primary') },
            h3: { color: theme('colors.text.primary') },
            h4: { color: theme('colors.text.primary') },
            strong: { color: theme('colors.text.primary') },
            code: {
              color: theme('colors.primary.dark'),
              backgroundColor: theme('colors.primary.extraLight'),
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '500',
             },
            pre: {
              color: theme('colors.text.secondary'),
              backgroundColor: theme('colors.secondary.light'),
            },
             ul: { paddingLeft: '1.5em' }, // Adjust list padding if needed
             ol: { paddingLeft: '1.5em' },
             li: { marginTop: '0.5em', marginBottom: '0.5em' },
            'li > p': { marginTop: '0.25em', marginBottom: '0.25em' }, // Reduce space within list items if needed
            'li::marker': { color: theme('colors.text.disabled') },
            blockquote: {
              color: theme('colors.neutral.text'),
              borderLeftColor: theme('colors.neutral.DEFAULT'),
            },
          },
        },
        // Define size variants if needed, e.g., prose-sm
        sm: {
           css: {
               fontSize: '0.875rem', // text-sm
               lineHeight: '1.5rem',
               p: { marginTop: '0.75em', marginBottom: '0.75em' },
               h2: { fontSize: '1.125rem', marginTop: '1.5em', marginBottom: '0.75em' },
               h3: { fontSize: '1.05rem', marginTop: '1.25em', marginBottom: '0.5em' },
               h4: { fontSize: '1rem', marginTop: '1em', marginBottom: '0.5em' },
           }
        }
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add typography plugin
    require('@tailwindcss/forms'), // Add forms plugin for better defaults
  ],
}