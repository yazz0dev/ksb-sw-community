/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", // This pattern should cover all your component files
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          extraLight: 'var(--color-primary-extraLight)',
          light: 'var(--color-primary-light)',
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          text: 'var(--color-primary-text)',
        },
        secondary: {
          light: 'var(--color-secondary-light)',
          DEFAULT: 'var(--color-secondary)',
          dark: 'var(--color-secondary-dark)',
          text: 'var(--color-secondary-text)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled: 'var(--color-text-disabled)',
        },
        surface: 'var(--color-surface)',
        'surface-variant': 'var(--color-surface-variant)', // Added variant
        'surface-hover': 'var(--color-surface-hover)',     // Added hover
        'surface-disabled': 'var(--color-surface-disabled)', // Added disabled
        background: 'var(--color-background)',
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        info: {
          light: 'var(--color-info-light)',
          DEFAULT: 'var(--color-info)',
          dark: 'var(--color-info-dark)',
        },
        success: {
          extraLight: 'var(--color-success-extraLight)', // Added extraLight
          light: 'var(--color-success-light)',
          DEFAULT: 'var(--color-success)',
          dark: 'var(--color-success-dark)',
          text: 'var(--color-success-text)', // Added text
        },
        error: {
          extraLight: 'var(--color-error-extraLight)', // Added extraLight
          light: 'var(--color-error-light)',
          DEFAULT: 'var(--color-error)',
          dark: 'var(--color-error-dark)',
          text: 'var(--color-error-text)', // Added text
        },
        warning: {
          extraLight: 'var(--color-warning-extraLight)', // Added extraLight
          light: 'var(--color-warning-light)',
          DEFAULT: 'var(--color-warning)',
          dark: 'var(--color-warning-dark)',
          text: 'var(--color-warning-text)', // Added text
        },
        neutral: {
          extraLight: 'var(--color-neutral-extraLight)',
          light: 'var(--color-neutral-light)',
          DEFAULT: 'var(--color-neutral)',
          dark: 'var(--color-neutral-dark)',
        },
        // Define specific state text colors if needed, otherwise they inherit
        'info-text': 'var(--color-info-dark)',
        'error-text': 'var(--color-error-dark)', // Often dark text on light bg
        'warning-text': 'var(--color-warning-dark)', // Often dark text on light bg
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      // Extend typography for prose styles if you use markdown rendering
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.text.secondary'),
            '--tw-prose-headings': theme('colors.text.primary'),
            '--tw-prose-lead': theme('colors.text.secondary'),
            '--tw-prose-links': theme('colors.primary.DEFAULT'),
            '--tw-prose-bold': theme('colors.text.primary'),
            '--tw-prose-counters': theme('colors.text.secondary'),
            '--tw-prose-bullets': theme('colors.text.disabled'),
            '--tw-prose-hr': theme('colors.border.DEFAULT'),
            '--tw-prose-quotes': theme('colors.text.primary'),
            '--tw-prose-quote-borders': theme('colors.primary.light'),
            '--tw-prose-captions': theme('colors.text.disabled'),
            '--tw-prose-code': theme('colors.primary.dark'),
            '--tw-prose-pre-code': theme('colors.neutral.light'),
            '--tw-prose-pre-bg': theme('colors.neutral.dark'),
            '--tw-prose-th-borders': theme('colors.border.DEFAULT'),
            '--tw-prose-td-borders': theme('colors.border.light'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'), 
  ],
}