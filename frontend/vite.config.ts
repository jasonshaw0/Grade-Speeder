import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true, // Auto-open in browser after build
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React core into its own chunk (good for caching)
          'react-vendor': ['react', 'react-dom'],
          // PDF libraries will be in a separate lazy-loaded chunk automatically
        },
      },
    },
  },
})
