// vite.config.ts
import { defineConfig } from "file:///C:/Users/yazz/Desktop/projects/ksb-sw-community/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/yazz/Desktop/projects/ksb-sw-community/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/yazz/Desktop/projects/ksb-sw-community/node_modules/vite-plugin-pwa/dist/index.js";
import { fileURLToPath, URL } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/yazz/Desktop/projects/ksb-sw-community/vite.config.ts";
var config = {
  publicDir: "public",
  // Ensure static assets (e.g., OneSignalSDKWorker.js) are served from /public
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  plugins: [
    vue(),
    // Type assertion for TypeScript
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "src/assets/logo.png", "OneSignalSDKWorker.js"],
      manifest: {
        name: "KSB Tech Community",
        short_name: "KSB Tech",
        description: "KSB Software Community Platform for Events & Learning",
        theme_color: "#0ea5e9",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "src/assets/logo.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "src/assets/logo.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "src/assets/logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        start_url: "/"
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firestore-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-storage-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
    // Type assertion for TypeScript
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis"
      },
      plugins: [
        {
          name: "load-js-files-as-jsx",
          setup(build) {
            build.onLoad({ filter: /\.js$/ }, async () => ({
              loader: "jsx"
            }));
          }
        }
      ]
    }
  },
  build: {
    target: "es2015",
    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-essentials": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "ui-components": ["@vuepic/vue-datepicker", "luxon"],
          "pdf-lib": ["jspdf", "jspdf-autotable"],
          vendor: ["vue", "vue-router", "vuex", "dompurify", "marked"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3,
    sourcemap: false
  }
};
var vite_config_default = defineConfig(config);
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx5YXp6XFxcXERlc2t0b3BcXFxccHJvamVjdHNcXFxca3NiLXN3LWNvbW11bml0eVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxceWF6elxcXFxEZXNrdG9wXFxcXHByb2plY3RzXFxcXGtzYi1zdy1jb21tdW5pdHlcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3lhenovRGVza3RvcC9wcm9qZWN0cy9rc2Itc3ctY29tbXVuaXR5L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB0eXBlIHsgVXNlckNvbmZpZywgUGx1Z2luIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcbmltcG9ydCB0eXBlIHsgVml0ZVBXQU9wdGlvbnMgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ3VybCc7XHJcblxyXG4vLyBBZGQgcHJvcGVyIFBXQSB0eXBlc1xyXG5pbnRlcmZhY2UgUHdhTWFuaWZlc3RJY29uIHtcclxuICBzcmM6IHN0cmluZztcclxuICBzaXplczogc3RyaW5nO1xyXG4gIHR5cGU6IHN0cmluZztcclxuICBwdXJwb3NlPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUnVudGltZUNhY2hpbmcge1xyXG4gIHVybFBhdHRlcm46IFJlZ0V4cDtcclxuICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcgfCAnTmV0d29ya0ZpcnN0JyB8ICdOZXR3b3JrT25seScgfCAnU3RhbGVXaGlsZVJldmFsaWRhdGUnO1xyXG4gIG9wdGlvbnM6IHtcclxuICAgIGNhY2hlTmFtZTogc3RyaW5nO1xyXG4gICAgZXhwaXJhdGlvbj86IHtcclxuICAgICAgbWF4RW50cmllcz86IG51bWJlcjtcclxuICAgICAgbWF4QWdlU2Vjb25kcz86IG51bWJlcjtcclxuICAgIH07XHJcbiAgICBuZXR3b3JrVGltZW91dFNlY29uZHM/OiBudW1iZXI7XHJcbiAgICBjYWNoZWFibGVSZXNwb25zZT86IHtcclxuICAgICAgc3RhdHVzZXM6IG51bWJlcltdO1xyXG4gICAgfTtcclxuICB9O1xyXG59XHJcblxyXG4vLyBUeXBlIHRoZSBjb25maWdcclxuY29uc3QgY29uZmlnOiBVc2VyQ29uZmlnID0ge1xyXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsIC8vIEVuc3VyZSBzdGF0aWMgYXNzZXRzIChlLmcuLCBPbmVTaWduYWxTREtXb3JrZXIuanMpIGFyZSBzZXJ2ZWQgZnJvbSAvcHVibGljXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgIH1cclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHZ1ZSgpLC8vIFR5cGUgYXNzZXJ0aW9uIGZvciBUeXBlU2NyaXB0XHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAncm9ib3RzLnR4dCcsICdzcmMvYXNzZXRzL2xvZ28ucG5nJywgJ09uZVNpZ25hbFNES1dvcmtlci5qcyddLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdLU0IgVGVjaCBDb21tdW5pdHknLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdLU0IgVGVjaCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdLU0IgU29mdHdhcmUgQ29tbXVuaXR5IFBsYXRmb3JtIGZvciBFdmVudHMgJiBMZWFybmluZycsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMGVhNWU5JyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3NyYy9hc3NldHMvbG9nby5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAnc3JjL2Fzc2V0cy9sb2dvLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdzcmMvYXNzZXRzL2xvZ28ucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdtYXNrYWJsZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICBdIGFzIFB3YU1hbmlmZXN0SWNvbltdLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nXHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxyXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZm9udHNcXC5nb29nbGVhcGlzXFwuY29tXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgfSxcclxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ3N0YXRpY1xcLmNvbVxcLy4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dzdGF0aWMtZm9udHMtY2FjaGUnLFxyXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9LFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvZmlyZXN0b3JlXFwuZ29vZ2xlYXBpc1xcLmNvbVxcLy4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZmlyZXN0b3JlLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwMCwgbWF4QWdlU2Vjb25kczogMjQgKiA2MCAqIDYwIH0sXHJcbiAgICAgICAgICAgICAgbmV0d29ya1RpbWVvdXRTZWNvbmRzOiAxMCxcclxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZpcmViYXNlc3RvcmFnZVxcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdmaXJlYmFzZS1zdG9yYWdlLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDUwLCBtYXhBZ2VTZWNvbmRzOiAzMCAqIDI0ICogNjAgKiA2MCB9LFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0gYXMgVml0ZVBXQU9wdGlvbnMpIC8vIFR5cGUgYXNzZXJ0aW9uIGZvciBUeXBlU2NyaXB0XHJcbiAgXSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgIGRlZmluZToge1xyXG4gICAgICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnbG9hZC1qcy1maWxlcy1hcy1qc3gnLFxyXG4gICAgICAgICAgc2V0dXAoYnVpbGQpIHtcclxuICAgICAgICAgICAgYnVpbGQub25Mb2FkKHsgZmlsdGVyOiAvXFwuanMkLyB9LCBhc3luYyAoKSA9PiAoe1xyXG4gICAgICAgICAgICAgIGxvYWRlcjogJ2pzeCdcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHRhcmdldDogJ2VzMjAxNScsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ2ZpcmViYXNlLWVzc2VudGlhbHMnOiBbJ2ZpcmViYXNlL2FwcCcsICdmaXJlYmFzZS9hdXRoJywgJ2ZpcmViYXNlL2ZpcmVzdG9yZSddLFxyXG4gICAgICAgICAgJ3VpLWNvbXBvbmVudHMnOiBbJ0B2dWVwaWMvdnVlLWRhdGVwaWNrZXInLCAnbHV4b24nXSxcclxuICAgICAgICAgICdwZGYtbGliJzogWydqc3BkZicsICdqc3BkZi1hdXRvdGFibGUnXSxcclxuICAgICAgICAgIHZlbmRvcjogWyd2dWUnLCAndnVlLXJvdXRlcicsICd2dWV4JywgJ2RvbXB1cmlmeScsICdtYXJrZWQnXVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgIHNvdXJjZW1hcDogZmFsc2VcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoY29uZmlnKTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQTJVLFNBQVMsb0JBQW9C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
