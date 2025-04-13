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
          light: 'var(--color-success-light)',
          DEFAULT: 'var(--color-success)',
          dark: 'var(--color-success-dark)',
        },
        error: {
          light: 'var(--color-error-light)',
          DEFAULT: 'var(--color-error)',
          dark: 'var(--color-error-dark)',
        },
        warning: {
          light: 'var(--color-warning-light)',
          DEFAULT: 'var(--color-warning)',
          dark: 'var(--color-warning-dark)',
        },
        neutral: {
          extraLight: 'var(--color-neutral-extraLight)',
          light: 'var(--color-neutral-light)',
          DEFAULT: 'var(--color-neutral)',
          dark: 'var(--color-neutral-dark)',
        },
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
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
