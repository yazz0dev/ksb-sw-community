import { defineConfig } from 'vite';
import type { UserConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import type { VitePWAOptions } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';

// Add proper PWA types
interface PwaManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface RuntimeCaching {
  urlPattern: RegExp;
  handler: 'CacheFirst' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
  options: {
    cacheName: string;
    expiration?: {
      maxEntries?: number;
      maxAgeSeconds?: number;
    };
    networkTimeoutSeconds?: number;
    cacheableResponse?: {
      statuses: number[];
    };
  };
}

// Type the config
const config: UserConfig = {
  publicDir: 'public', // Ensure static assets (e.g., OneSignalSDKWorker.js) are served from /public
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml', 'logo.png', 'OneSignalSDKWorker.js'],
      manifest: {
        name: 'KSB Tech Community',
        short_name: 'KSB Tech',
        description: 'KSB Software Community Platform for Events & Learning',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png', // Fixed path - remove the space
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png', // Fixed path - remove the space
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/logo.png', // Fixed path - remove the space
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ] as PwaManifestIcon[],
        start_url: '/'
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache OneSignal files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3000000,
        // Add OneSignal to navigateFallbackDenylist to prevent conflicts
        navigateFallbackDenylist: [/^\/OneSignalSDKWorker\.js$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      // Change from injectManifest to generateSW strategy
      strategies: 'generateSW'
    } as VitePWAOptions)
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        {
          name: 'load-js-files-as-jsx',
          setup(build) {
            build.onLoad({ filter: /\.js$/ }, async () => ({
              loader: 'jsx'
            }));
          }
        }
      ]
    }
  },
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-essentials': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-components': ['@vuepic/vue-datepicker', 'luxon'],
          'pdf-libs': ['jspdf', 'jspdf-autotable'], // Correctly group jspdf and its plugin
          vendor: ['vue', 'vue-router', 'dompurify', 'marked']
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://instagram.fcok10-1.fna.fbcdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
};

export default defineConfig(config);