import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'maplibre': ['maplibre-gl'],
          'framer-motion': ['framer-motion'],
          'lucide-react': ['lucide-react'],
          'crypto-js': ['crypto-js'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-components': ['react-hot-toast', 'framer-motion'],
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'], // Exclude maplibre-gl from optimization
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),    // ✅ call the function
        autoprefixer(),
      ],
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})