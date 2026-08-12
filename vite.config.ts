import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', dest: 'ffmpeg' },
        { src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', dest: 'ffmpeg' },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Studio 9060',
        short_name: 'Studio 9060',
        description: 'A private, offline photo booth in your pocket.',
        theme_color: '#f4f0e8',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
