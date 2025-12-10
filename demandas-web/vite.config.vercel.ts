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
        // Force new hash generation - v0.6.3 (fix cache antigo e 404 login)
        entryFileNames: `assets/[name]-[hash]-v0632.js`,
        chunkFileNames: `assets/[name]-[hash]-v0632.js`,
        assetFileNames: `assets/[name]-[hash]-v0632.[ext]`,
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
