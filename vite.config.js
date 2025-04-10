import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Adjust as needed
      manifest: {
        name: 'KSB MCA Software Community',
        short_name: 'KSB Community',
        description: 'KSB MCA Software Community Portal', // Add your description
        theme_color: '#ffffff', // Choose your theme color
        icons: [
          {
            src: 'pwa-192x192.png', // Create these icons in /public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Create these icons in /public
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Create these icons in /public
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Add a maskable icon
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate Firebase into its own chunk
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          // Separate html2canvas into its own chunk
          if (id.includes('node_modules/html2canvas')) {
            return 'html2canvas';
          }
          // Separate other large vendor libs if needed
          // if (id.includes('node_modules/some-other-large-lib')) {
          //   return 'other-large-lib';
          // }
        }
      }
    }
  }
})
