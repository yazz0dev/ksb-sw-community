// Use CommonJS export style for wider compatibility, though ES modules often work too
module.exports = {
  plugins: {
    'tailwindcss/nesting': {}, // Recommended for Tailwind 4 nesting features
    'tailwindcss': {},
    'autoprefixer': {},
    // Conditionally add cssnano for production builds (optional)
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  },
}