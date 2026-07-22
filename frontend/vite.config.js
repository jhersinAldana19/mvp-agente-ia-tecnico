import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon-tecport.webp', 'apple-touch-icon.png'],
      manifest: {
        name: 'SOFIA | Agente IA Técnico TECPORT',
        short_name: 'SOFIA',
        description: 'Agente IA Técnico de TECPORT',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F6F8',
        theme_color: '#003558',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
})
