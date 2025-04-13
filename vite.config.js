import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwind(),
        autoprefixer(),
      ],
    },
  },
  plugins: [
    vue(),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false // Set to false to avoid opening automatically
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // Update paths if necessary, make sure logo exists
      includeAssets: ['favicon.ico', 'robots.txt', 'src/assets/logo.png'], 
      manifest: {
        name: 'KSB Tech Community',
        short_name: 'KSB Tech',
        description: 'KSB Software Community Platform for Events & Learning',
        theme_color: '#0ea5e9', // Match --color-primary
        background_color: '#ffffff', // Match --color-surface
        display: 'standalone',
        icons: [
           {
             src: 'src/assets/logo.png', // Adjust path if needed
             sizes: '192x192',
             type: 'image/png',
           },
           {
             src: 'src/assets/logo.png', // Adjust path if needed
             sizes: '512x512',
             type: 'image/png',
           },
            {
             src: 'src/assets/logo.png', // Adjust path if needed - Maskable icon
             sizes: '512x512',
             type: 'image/png',
             purpose: 'maskable'
           }
        ],
        start_url: '/',
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Cache Google Fonts (if used)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache Firestore requests
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst', // Use NetworkFirst for data to prioritize freshness
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }, // 1 day
              networkTimeoutSeconds: 10, // Timeout for network request
              cacheableResponse: { statuses: [0, 200] },
            },
          },
           // Cache Firebase Storage images (adjust pattern if needed)
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2015', // Keep ES2015 for broader compatibility if needed
    rollupOptions: {
      output: {
        manualChunks: {
          // Adjust chunking strategy as needed
          'firebase-essentials': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-components': ['@vuepic/vue-datepicker', 'luxon'], // Group UI/Date libs
          'pdf-lib': ['jspdf', 'jspdf-autotable'],
          // Vendor chunk for other node_modules
          'vendor': ['vue', 'vue-router', 'vuex', 'dompurify', 'marked'], 
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Keep warning limit reasonable
    sourcemap: false, // Disable sourcemaps for production for smaller builds
  },
});