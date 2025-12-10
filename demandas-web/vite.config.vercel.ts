import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Force new hash generation - v0.6.3 (fix cache antigo e 404 login - force rebuild)
        entryFileNames: `assets/[name]-[hash]-v0634.js`,
        chunkFileNames: `assets/[name]-[hash]-v0634.js`,
        assetFileNames: `assets/[name]-[hash]-v0634.[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          utils: ['zustand', 'framer-motion']
        }
      }
    }
  }
})
