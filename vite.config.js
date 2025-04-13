import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path'; 
import { fileURLToPath, URL } from 'url'; 

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)) 
    }
  },
  plugins: [
    vue(),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'src/assets/logo.png'], 
      manifest: {
        name: 'KSB Tech Community',
        short_name: 'KSB Tech',
        description: 'KSB Software Community Platform for Events & Learning',
        theme_color: '#0ea5e9', 
        background_color: '#ffffff', 
        display: 'standalone',
        icons: [
           {
             src: 'src/assets/logo.png', 
             sizes: '192x192',
             type: 'image/png',
           },
           {
             src: 'src/assets/logo.png', 
             sizes: '512x512',
             type: 'image/png',
           },
            {
             src: 'src/assets/logo.png', 
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
  optimizeDeps: {
    include: ['@chakra-ui/vue-next']
  },
  build: {
    target: 'es2015', 
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-essentials': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'chakra': ['@chakra-ui/vue-next'],
          'ui-components': ['@vuepic/vue-datepicker', 'luxon'], 
          'pdf-lib': ['jspdf', 'jspdf-autotable'],
          'vendor': ['vue', 'vue-router', 'vuex', 'dompurify', 'marked'], 
        }
      }
    },
    chunkSizeWarningLimit: 1000, 
    sourcemap: false, 
  },
});