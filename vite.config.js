import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import imagemin from 'vite-plugin-imagemin';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  plugins: [
    vue(),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      open: true
    }),
    {
      name: 'postcss',
      config: true,
    },
    imagemin({
      gifsicle: { optimizationLevel: 3 },
      mozjpeg: { quality: 75 },
      pngquant: { quality: [0.7, 0.8] },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
            active: false
          }
        ]
      },
      webp: { 
        quality: 75,
        method: 6 // highest quality compression
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'KSB Tech Community',
        short_name: 'KSB Tech',
        description: 'KSB Software Community Platform for Events & Learning',
        theme_color: '#0891b2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          // Add comprehensive icon set
        ],
        start_url: '/',
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-app': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
          'pdf-generation': ['jspdf', 'jspdf-autotable'],
          'date-handling': ['@vuepic/vue-datepicker', 'luxon']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  // Cache busting
  base: process.env.NODE_ENV === 'production' ? '/v1/' : '/',
});

