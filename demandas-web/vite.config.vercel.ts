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
        // Force new hash generation - v0.6.3 (fix salvandoArquivo)
        entryFileNames: `assets/[name]-[hash]-v063.js`,
        chunkFileNames: `assets/[name]-[hash]-v063.js`,
        assetFileNames: `assets/[name]-[hash]-v063.[ext]`,
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
